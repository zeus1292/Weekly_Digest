// Health check endpoint with detailed diagnostics
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log("[HEALTH] Health check requested");

  const envStatus = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "configured" : "MISSING",
    TAVILY_API_KEY: process.env.TAVILY_API_KEY ? "configured" : "MISSING",
    DATABASE_URL: process.env.DATABASE_URL ? "configured" : "not configured",
    LANGCHAIN_TRACING_V2: process.env.LANGCHAIN_TRACING_V2 || "not set",
    LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY ? "configured" : "not configured",
    LANGCHAIN_PROJECT: process.env.LANGCHAIN_PROJECT || "not set",
    NODE_ENV: process.env.NODE_ENV || "not set",
  };

  // Log all env status
  console.log("[HEALTH] Environment status:", JSON.stringify(envStatus, null, 2));

  const isHealthy = !!process.env.OPENAI_API_KEY;
  const issues: string[] = [];

  if (!process.env.OPENAI_API_KEY) {
    issues.push("OPENAI_API_KEY is required but not set");
  }
  if (!process.env.TAVILY_API_KEY) {
    issues.push("TAVILY_API_KEY is not set - article search will fail");
  }

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    services: {
      arxiv: "available",
      tavily: process.env.TAVILY_API_KEY ? "available" : "not configured",
      openai: process.env.OPENAI_API_KEY ? "available" : "MISSING - required",
      database: process.env.DATABASE_URL ? "available" : "not configured",
      langsmith: process.env.LANGCHAIN_API_KEY ? "available" : "not configured",
    },
    issues: issues.length > 0 ? issues : undefined,
    environment: process.env.NODE_ENV || "unknown",
  });
}
