// Research API endpoint for Vercel
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";

// Static imports for Vercel file tracing
import { runResearchAgent } from "../server/agents/research-agent";
import { searchRequestSchema, digestResponseSchema } from "../shared/schema";

// Health check function to verify environment
function checkEnvironment(): { ok: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!process.env.OPENAI_API_KEY) {
    issues.push("OPENAI_API_KEY is not set");
  }
  if (!process.env.TAVILY_API_KEY) {
    issues.push("TAVILY_API_KEY is not set");
  }
  if (!process.env.DATABASE_URL) {
    issues.push("DATABASE_URL is not set (history will be disabled)");
  }

  console.log("[ENV CHECK] OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "MISSING");
  console.log("[ENV CHECK] TAVILY_API_KEY:", process.env.TAVILY_API_KEY ? "SET" : "MISSING");
  console.log("[ENV CHECK] DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "MISSING");
  console.log("[ENV CHECK] NODE_ENV:", process.env.NODE_ENV || "not set");

  return {
    ok: !!process.env.OPENAI_API_KEY,
    issues
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  console.log(`[REQUEST] ${req.method} /api/research - Start`);

  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Check environment first
  const envCheck = checkEnvironment();
  if (!envCheck.ok) {
    console.error("[REQUEST] Environment check failed:", envCheck.issues);
    res.status(503).json({
      message: "Service configuration error. Please contact support.",
      issues: envCheck.issues
    });
    return;
  }

  try {
    // Validate request
    console.log("[REQUEST] Validating request body:", JSON.stringify(req.body));
    const validatedData = searchRequestSchema.parse(req.body);
    console.log(`[REQUEST] Validated - topic="${validatedData.topic}", days=${validatedData.timeframeDays}`);

    // Run research agent
    console.log("[REQUEST] Starting research agent...");
    const result = await runResearchAgent(
      validatedData.topic,
      validatedData.timeframeDays,
      validatedData.keywords
    );
    console.log(`[REQUEST] Research complete - papers: ${result.papers?.count || 0}, articles: ${result.articles?.count || 0}`);

    // Validate and return response
    const response = digestResponseSchema.parse(result);
    const duration = Date.now() - startTime;
    console.log(`[REQUEST] Success - Duration: ${duration}ms`);

    res.status(200).json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[REQUEST] Error after ${duration}ms:`, error);

    if (error instanceof Error) {
      console.error("[ERROR] Name:", error.name);
      console.error("[ERROR] Message:", error.message);
      console.error("[ERROR] Stack:", error.stack);
    }

    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: "Please check your search parameters and try again.",
        errors: error.errors,
      });
      return;
    }

    res.status(500).json({
      message: "We encountered a temporary issue. Please try again in a moment.",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
  }
}
