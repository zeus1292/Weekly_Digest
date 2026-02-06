// Research API endpoint for Vercel
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";

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

  // Log environment status
  console.log("[ENV CHECK] OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "MISSING");
  console.log("[ENV CHECK] TAVILY_API_KEY:", process.env.TAVILY_API_KEY ? "SET" : "MISSING");
  console.log("[ENV CHECK] DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "MISSING");
  console.log("[ENV CHECK] LANGCHAIN_TRACING_V2:", process.env.LANGCHAIN_TRACING_V2 || "not set");
  console.log("[ENV CHECK] NODE_ENV:", process.env.NODE_ENV || "not set");

  return {
    ok: !!process.env.OPENAI_API_KEY,
    issues
  };
}

// Initialize LangSmith tracing
const LANGCHAIN_TRACING = process.env.LANGCHAIN_TRACING_V2 === "true";
if (LANGCHAIN_TRACING && process.env.LANGCHAIN_API_KEY) {
  process.env.LANGCHAIN_TRACING_V2 = "true";
  process.env.LANGCHAIN_API_KEY = process.env.LANGCHAIN_API_KEY;
  process.env.LANGCHAIN_PROJECT = process.env.LANGCHAIN_PROJECT || "research-lens";
  console.log("[LANGSMITH] Tracing enabled for project:", process.env.LANGCHAIN_PROJECT);
}

// Lazy imports to avoid cold start issues
let runResearchAgent: typeof import("../../server/agents/research-agent").runResearchAgent;
let searchRequestSchema: typeof import("../../shared/schema").searchRequestSchema;
let digestResponseSchema: typeof import("../../shared/schema").digestResponseSchema;

async function loadDependencies() {
  console.log("[INIT] Loading dependencies...");

  try {
    if (!runResearchAgent) {
      console.log("[INIT] Importing research-agent module...");
      const agentModule = await import("../../server/agents/research-agent");
      runResearchAgent = agentModule.runResearchAgent;
      console.log("[INIT] research-agent module loaded successfully");
    }
    if (!searchRequestSchema) {
      console.log("[INIT] Importing schema module...");
      const schemaModule = await import("../../shared/schema");
      searchRequestSchema = schemaModule.searchRequestSchema;
      digestResponseSchema = schemaModule.digestResponseSchema;
      console.log("[INIT] schema module loaded successfully");
    }
    console.log("[INIT] All dependencies loaded");
  } catch (error) {
    console.error("[INIT] Failed to load dependencies:", error);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  console.log(`[REQUEST] ${req.method} /api/research - Start`);

  // Only allow POST
  if (req.method !== "POST") {
    console.log("[REQUEST] Method not allowed:", req.method);
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
    // Load dependencies
    console.log("[REQUEST] Loading dependencies...");
    await loadDependencies();

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

    // Log full error details
    if (error instanceof Error) {
      console.error("[ERROR] Name:", error.name);
      console.error("[ERROR] Message:", error.message);
      console.error("[ERROR] Stack:", error.stack);
    }

    if (error instanceof z.ZodError) {
      console.error("[ERROR] Zod validation errors:", JSON.stringify(error.errors));
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
