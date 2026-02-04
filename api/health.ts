// Simple health check endpoint
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    status: "healthy",
    services: {
      arxiv: "available",
      tavily: process.env.TAVILY_API_KEY ? "available" : "not configured",
      openai: process.env.OPENAI_API_KEY ? "available" : "not configured",
      database: process.env.DATABASE_URL ? "available" : "not configured",
    },
    timestamp: new Date().toISOString(),
  });
}
