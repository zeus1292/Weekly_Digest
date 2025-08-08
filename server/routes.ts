import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { searchRequestSchema, digestResponseSchema } from "@shared/schema";
import { ArxivService } from "./services/arxiv";
import { OpenAIService } from "./services/openai";

const arxivService = new ArxivService();
const openaiService = new OpenAIService();

export async function registerRoutes(app: Express): Promise<Server> {
  
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
