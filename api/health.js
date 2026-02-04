// src/api/health.ts
function handler(req, res) {
  res.json({
    status: "healthy",
    services: {
      arxiv: "available",
      tavily: process.env.TAVILY_API_KEY ? "available" : "not configured",
      openai: process.env.OPENAI_API_KEY ? "available" : "not configured",
      database: process.env.DATABASE_URL ? "available" : "not configured"
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
export {
  handler as default
};
