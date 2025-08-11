import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { searchRequestSchema, digestResponseSchema, type DigestResponse } from "@shared/schema";
import { ArxivService } from "./services/arxiv";
import { GeminiService } from "./services/gemini";
import { TechCrunchService } from "./services/techcrunch";
import { GeminiTechCrunchService } from "./services/gemini-techcrunch";

const arxivService = new ArxivService();
const geminiService = new GeminiService();
const techcrunchService = new TechCrunchService();
const geminiTechCrunchService = new GeminiTechCrunchService();

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
      
      // Fetch papers from ArXiv and articles from TechCrunch in parallel
      const [papers, techcrunchArticles] = await Promise.all([
        arxivService.searchPapers(
          validatedData.topic,
          validatedData.keywords,
          validatedData.subdomain,
          validatedData.days || 7
        ),
        techcrunchService.searchArticles(
          validatedData.topic,
          validatedData.days || 7
        ).catch(error => {
          console.error('TechCrunch search failed:', error);
          return []; // Return empty array if TechCrunch fails
        })
      ]);

      console.log(`Found ${papers.length} papers from ArXiv and ${techcrunchArticles.length} articles from TechCrunch`);

      if (papers.length === 0 && techcrunchArticles.length === 0) {
        return res.json({
          topic: validatedData.topic,
          papers: [],
          techcrunchArticles: [],
          generatedDate: new Date().toISOString(),
          count: 0,
          techcrunchCount: 0,
        });
      }

      // Check Gemini API before processing
      const healthCheck = await geminiService.testConnection();
      if (!healthCheck.working) {
        // Return results without summaries if Gemini is not working
        const response: DigestResponse = {
          topic: validatedData.topic,
          papers: papers,
          techcrunchArticles: techcrunchArticles,
          generatedDate: new Date().toISOString(),
          count: papers.length,
          techcrunchCount: techcrunchArticles.length,
          warning: "AI summaries unavailable: " + healthCheck.error
        };
        return res.json(response);
      }

      // Generate summaries using Gemini in parallel
      const [summarizedPapers, summarizedArticles] = await Promise.all([
        papers.length > 0 ? geminiService.summarizeMultiplePapers(papers) : Promise.resolve([]),
        techcrunchArticles.length > 0 ? geminiTechCrunchService.generateSummaries(techcrunchArticles) : Promise.resolve([])
      ]);

      const response: DigestResponse = {
        topic: validatedData.topic,
        papers: summarizedPapers,
        techcrunchArticles: summarizedArticles,
        generatedDate: new Date().toISOString(),
        count: summarizedPapers.length,
        techcrunchCount: summarizedArticles.length,
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
