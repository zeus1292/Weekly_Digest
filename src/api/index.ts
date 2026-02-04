// Root API endpoint - redirects to health
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    message: "Research Lens API",
    endpoints: {
      health: "/api/health",
      research: "/api/research (POST)",
    },
  });
}
