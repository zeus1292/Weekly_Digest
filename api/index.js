// src/api/index.ts
function handler(req, res) {
  res.json({
    message: "Research Lens API",
    endpoints: {
      health: "/api/health",
      research: "/api/research (POST)"
    }
  });
}
export {
  handler as default
};
