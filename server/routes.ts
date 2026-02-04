import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { searchRequestSchema, digestResponseSchema, type DigestResponse } from "@shared/schema";
import { runResearchAgent } from "./agents/research-agent";
import { db, schema } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { authRouter, requireAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register auth routes
  app.use("/api/auth", authRouter);

  // Health check endpoint
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      res.json({
        status: "healthy",
        services: {
          arxiv: "available",
          tavily: process.env.TAVILY_API_KEY ? "available" : "not configured",
          openai: process.env.OPENAI_API_KEY ? "available" : "not configured",
          database: db ? "available" : "not configured (history/auth disabled)",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Main research endpoint - replaces /api/generate-digest
  app.post("/api/research", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = searchRequestSchema.parse(req.body);

      console.log(`[Routes] Research request: topic="${validatedData.topic}", days=${validatedData.timeframeDays}`);

      // Run the research agent
      const result = await runResearchAgent(
        validatedData.topic,
        validatedData.timeframeDays,
        validatedData.keywords
      );

      // Save to history if database is available and user is logged in or has a session
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
        } catch (historyError) {
          console.error("[Routes] Failed to save to history:", historyError);
          // Don't fail the request if history save fails
        }
      }

      // Validate and return response
      const validatedResponse = digestResponseSchema.parse(result);
      res.json(validatedResponse);
    } catch (error) {
      console.error("[Routes] Research error:", error);

      if (error instanceof z.ZodError) {
        const topicError = error.errors.find((e) => e.path.includes("topic"));
        if (topicError) {
          res.status(400).json({
            message: "Please enter a research topic to search for papers.",
          });
          return;
        }
        res.status(400).json({
          message: "Please check your search parameters and try again.",
        });
        return;
      }

      res.status(500).json({
        message: "We encountered a temporary issue. Please try again in a moment.",
      });
    }
  });

  // Legacy endpoint for backwards compatibility
  app.post("/api/generate-digest", async (req: Request, res: Response) => {
    // Redirect to new endpoint
    req.body.timeframeDays = req.body.days || 7;
    delete req.body.days;
    delete req.body.subdomain;

    // Forward to research endpoint
    const validatedData = searchRequestSchema.parse(req.body);
    const result = await runResearchAgent(
      validatedData.topic,
      validatedData.timeframeDays,
      validatedData.keywords
    );
    res.json(result);
  });

  // ============================================================================
  // HISTORY ENDPOINTS
  // ============================================================================

  // GET /api/history - Get user's search history
  app.get("/api/history", async (req: Request, res: Response) => {
    // Return empty if no database
    if (!db) {
      res.json({ items: [], message: "History disabled (no database configured)" });
      return;
    }

    try {
      const userId = req.session?.userId;
      const sessionId = req.session?.id;

      if (!userId && !sessionId) {
        res.json({ items: [] });
        return;
      }

      // Build query based on auth status
      let whereCondition;
      if (userId) {
        whereCondition = eq(schema.searchHistory.userId, userId);
      } else {
        whereCondition = eq(schema.searchHistory.sessionId, sessionId!);
      }

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
      console.error("[Routes] History fetch error:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // GET /api/history/:id - Get specific search result
  app.get("/api/history/:id", async (req: Request, res: Response) => {
    if (!db) {
      res.status(503).json({ error: "History disabled (no database configured)" });
      return;
    }

    try {
      const { id } = req.params;
      const userId = req.session?.userId;
      const sessionId = req.session?.id;

      if (!userId && !sessionId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      // Build query to ensure user owns this history item
      const [historyItem] = await db
        .select()
        .from(schema.searchHistory)
        .where(
          and(
            eq(schema.searchHistory.id, id),
            userId
              ? eq(schema.searchHistory.userId, userId)
              : eq(schema.searchHistory.sessionId, sessionId!)
          )
        )
        .limit(1);

      if (!historyItem) {
        res.status(404).json({ error: "History item not found" });
        return;
      }

      res.json({
        ...historyItem,
        createdAt: historyItem.createdAt?.toISOString(),
      });
    } catch (error) {
      console.error("[Routes] History item fetch error:", error);
      res.status(500).json({ error: "Failed to fetch history item" });
    }
  });

  // DELETE /api/history/:id - Delete history item
  app.delete("/api/history/:id", async (req: Request, res: Response) => {
    if (!db) {
      res.status(503).json({ error: "History disabled (no database configured)" });
      return;
    }

    try {
      const { id } = req.params;
      const userId = req.session?.userId;
      const sessionId = req.session?.id;

      if (!userId && !sessionId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      // Delete only if user owns this history item
      const result = await db
        .delete(schema.searchHistory)
        .where(
          and(
            eq(schema.searchHistory.id, id),
            userId
              ? eq(schema.searchHistory.userId, userId)
              : eq(schema.searchHistory.sessionId, sessionId!)
          )
        )
        .returning({ id: schema.searchHistory.id });

      if (result.length === 0) {
        res.status(404).json({ error: "History item not found" });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[Routes] History delete error:", error);
      res.status(500).json({ error: "Failed to delete history item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
