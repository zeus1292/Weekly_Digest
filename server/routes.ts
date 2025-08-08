import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { searchRequestSchema, digestResponseSchema } from "@shared/schema";
import { ArxivService } from "./services/arxiv";
import { GeminiService } from "./services/gemini";

const arxivService = new ArxivService();
const geminiService = new GeminiService();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint for Gemini API
  app.get("/api/health", async (req, res) => {
    try {
      // Test Gemini connection with a simple request
      const testResult = await geminiService.testConnection();
      
      res.json({
        status: "healthy",
        services: {
          arxiv: "available",
          gemini: testResult.working ? "available" : "error",
          geminiError: testResult.error || null
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });



  // Generate weekly digest endpoint
  app.post("/api/generate-digest", async (req, res) => {
    try {
      // Validate request body
      const validatedData = searchRequestSchema.parse(req.body);
      
      // Fetch papers from ArXiv
      const papers = await arxivService.searchPapers(
        validatedData.topic,
        validatedData.keywords,
        validatedData.subdomain,
        validatedData.days || 7
      );

      if (papers.length === 0) {
        return res.json({
          topic: validatedData.topic,
          papers: [],
          generatedDate: new Date().toISOString(),
          count: 0,
        });
      }

      // Check Gemini API before processing
      const healthCheck = await geminiService.testConnection();
      if (!healthCheck.working) {
        // Return papers without summaries if Gemini is not working
        const response = {
          topic: validatedData.topic,
          papers: papers,
          generatedDate: new Date().toISOString(),
          count: papers.length,
          warning: "AI summaries unavailable: " + healthCheck.error
        };
        return res.json(response);
      }

      // Generate summaries using Gemini
      const summarizedPapers = await geminiService.summarizeMultiplePapers(papers);

      const response = {
        topic: validatedData.topic,
        papers: summarizedPapers,
        generatedDate: new Date().toISOString(),
        count: summarizedPapers.length,
      };

      // Validate response
      const validatedResponse = digestResponseSchema.parse(response);
      
      res.json(validatedResponse);
    } catch (error) {
      console.error('Error generating digest:', error);
      
      if (error instanceof z.ZodError) {
        const topicError = error.errors.find(e => e.path.includes('topic'));
        if (topicError) {
          return res.status(400).json({ 
            message: "Please enter a research topic to search for papers."
          });
        }
        return res.status(400).json({ 
          message: "Please check your search parameters and try again."
        });
      }
      
      res.status(500).json({ 
        message: "We encountered a temporary issue. Please try again in a moment."
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
