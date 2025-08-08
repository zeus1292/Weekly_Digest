import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { searchRequestSchema, digestResponseSchema } from "@shared/schema";
import { ArxivService } from "./services/arxiv";
import { OpenAIService } from "./services/openai";

const arxivService = new ArxivService();
const openaiService = new OpenAIService();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint for OpenAI API
  app.get("/api/health", async (req, res) => {
    try {
      // Test OpenAI connection with a simple request
      const testResult = await openaiService.testConnection();
      
      res.json({
        status: "healthy",
        services: {
          arxiv: "available",
          openai: testResult.working ? "available" : "error",
          openaiError: testResult.error || null
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
        validatedData.subdomain
      );

      if (papers.length === 0) {
        return res.json({
          topic: validatedData.topic,
          papers: [],
          generatedDate: new Date().toISOString(),
          count: 0,
        });
      }

      // Check OpenAI API before processing
      const healthCheck = await openaiService.testConnection();
      if (!healthCheck.working) {
        // Return papers without summaries if OpenAI is not working
        const response = {
          topic: validatedData.topic,
          papers: papers,
          generatedDate: new Date().toISOString(),
          count: papers.length,
          warning: "AI summaries unavailable: " + healthCheck.error
        };
        return res.json(response);
      }

      // Generate summaries using OpenAI
      const summarizedPapers = await openaiService.summarizeMultiplePapers(papers);

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
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate digest" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
