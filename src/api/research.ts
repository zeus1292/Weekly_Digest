// Research API endpoint for Vercel
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";

// Initialize LangSmith tracing
const LANGCHAIN_TRACING = process.env.LANGCHAIN_TRACING_V2 === "true";
if (LANGCHAIN_TRACING && process.env.LANGCHAIN_API_KEY) {
  process.env.LANGCHAIN_TRACING_V2 = "true";
  process.env.LANGCHAIN_API_KEY = process.env.LANGCHAIN_API_KEY;
  process.env.LANGCHAIN_PROJECT = process.env.LANGCHAIN_PROJECT || "research-lens";
}

// Lazy imports to avoid cold start issues
let runResearchAgent: typeof import("../../server/agents/research-agent").runResearchAgent;
let searchRequestSchema: typeof import("../../shared/schema").searchRequestSchema;
let digestResponseSchema: typeof import("../../shared/schema").digestResponseSchema;

async function loadDependencies() {
  if (!runResearchAgent) {
    const agentModule = await import("../../server/agents/research-agent");
    runResearchAgent = agentModule.runResearchAgent;
  }
  if (!searchRequestSchema) {
    const schemaModule = await import("../../shared/schema");
    searchRequestSchema = schemaModule.searchRequestSchema;
    digestResponseSchema = schemaModule.digestResponseSchema;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await loadDependencies();

    // Validate request
    const validatedData = searchRequestSchema.parse(req.body);
    console.log(`[API] Research request: topic="${validatedData.topic}"`);

    // Run research agent
    const result = await runResearchAgent(
      validatedData.topic,
      validatedData.timeframeDays,
      validatedData.keywords
    );

    // Validate and return response
    const response = digestResponseSchema.parse(result);
    res.status(200).json(response);
  } catch (error) {
    console.error("[API] Research error:", error);

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
    });
  }
}
