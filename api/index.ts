// Vercel Serverless Function wrapper for Express app
import "../server/config";
import express from "express";
import session from "express-session";
import { registerRoutes } from "../server/routes";
import { authRouter } from "../server/auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware
const sessionSecret = process.env.SESSION_SECRET || "research-lens-prod-secret";
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Register auth routes
app.use("/api/auth", authRouter);

// Register API routes (this adds /api/research, /api/health, /api/history)
// Note: For Vercel, we need to handle routes directly
import { z } from "zod";
import { searchRequestSchema, digestResponseSchema } from "../shared/schema";
import { runResearchAgent } from "../server/agents/research-agent";
import { db, schema } from "../server/db";
import { eq, and, desc } from "drizzle-orm";

// Health check
app.get("/api/health", async (_req, res) => {
  res.json({
    status: "healthy",
    services: {
      arxiv: "available",
      tavily: process.env.TAVILY_API_KEY ? "available" : "not configured",
      openai: process.env.OPENAI_API_KEY ? "available" : "not configured",
      database: db ? "available" : "not configured",
    },
    timestamp: new Date().toISOString(),
  });
});

// Research endpoint
app.post("/api/research", async (req, res) => {
  try {
    const validatedData = searchRequestSchema.parse(req.body);
    const result = await runResearchAgent(
      validatedData.topic,
      validatedData.timeframeDays,
      validatedData.keywords
    );

    // Save to history if database available
    if (db) {
      try {
        const userId = req.session?.userId;
        const sessionId = req.session?.id;
        if (userId || sessionId) {
          await db.insert(schema.searchHistory).values({
            userId: userId || null,
            sessionId: !userId ? sessionId : null,
            topic: validatedData.topic,
            keywords: validatedData.keywords || null,
            timeframeDays: validatedData.timeframeDays,
            paperCount: result.papers.count,
            articleCount: result.articles.count,
            executiveSummary: {
              papers: result.papers.executiveSummary,
              articles: result.articles.executiveSummary,
            },
            results: result,
          });
        }
      } catch (e) {
        console.error("[API] History save error:", e);
      }
    }

    res.json(digestResponseSchema.parse(result));
  } catch (error) {
    console.error("[API] Research error:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid request parameters" });
      return;
    }
    res.status(500).json({ message: "Research failed. Please try again." });
  }
});

// History endpoints
app.get("/api/history", async (req, res) => {
  if (!db) {
    res.json({ items: [] });
    return;
  }

  const userId = req.session?.userId;
  const sessionId = req.session?.id;

  if (!userId && !sessionId) {
    res.json({ items: [] });
    return;
  }

  try {
    const whereCondition = userId
      ? eq(schema.searchHistory.userId, userId)
      : eq(schema.searchHistory.sessionId, sessionId!);

    const history = await db
      .select({
        id: schema.searchHistory.id,
        topic: schema.searchHistory.topic,
        keywords: schema.searchHistory.keywords,
        timeframeDays: schema.searchHistory.timeframeDays,
        paperCount: schema.searchHistory.paperCount,
        articleCount: schema.searchHistory.articleCount,
        createdAt: schema.searchHistory.createdAt,
      })
      .from(schema.searchHistory)
      .where(whereCondition)
      .orderBy(desc(schema.searchHistory.createdAt))
      .limit(50);

    res.json({
      items: history.map((item) => ({
        ...item,
        createdAt: item.createdAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[API] History error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default app;
