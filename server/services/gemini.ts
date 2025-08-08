import { GoogleGenAI } from "@google/genai";
import { Paper } from '@shared/schema';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || "" 
    });
  }

  async testConnection(): Promise<{ working: boolean; error?: string }> {
    try {
      // Make a simple test request to verify API key works
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "test",
      });
      
      if (response.text) {
        return { working: true };
      }
      return { working: false, error: "No response from Gemini" };
    } catch (error) {
      return { 
        working: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async summarizePaper(paper: Paper): Promise<Paper> {
    try {
      const systemPrompt = `You are a research paper analysis expert. 
Analyze the research paper and provide a structured summary in JSON format.
Respond with JSON in this format: 
{'keyFindings': 'string', 'methodology': 'string', 'significance': 'string'}`;

      const prompt = `
Please analyze this research paper and provide a structured summary.

Paper Title: ${paper.title}
Authors: ${paper.authors}
Abstract: ${paper.abstract}

Provide a summary with the following structure:
- keyFindings: Summarize the main discoveries, results, or contributions of this paper in 1-2 sentences
- methodology: Describe the approach, methods, or techniques used in the research in 1-2 sentences
- significance: Explain why this research matters and its potential impact or applications in 1-2 sentences

Focus on being concise, accurate, and highlighting practical implications.
`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              keyFindings: { type: "string" },
              methodology: { type: "string" },
              significance: { type: "string" },
            },
            required: ["keyFindings", "methodology", "significance"],
          },
        },
        contents: prompt,
      });

      const summaryContent = response.text;
      if (!summaryContent) {
        throw new Error('No summary content received from Gemini');
      }

      const summary = JSON.parse(summaryContent);
      
      return {
        ...paper,
        summary: {
          keyFindings: summary.keyFindings || "Summary not available",
          methodology: summary.methodology || "Methodology not available", 
          significance: summary.significance || "Significance not available"
        }
      };
    } catch (error) {
      console.error('Error summarizing paper with Gemini:', error);
      
      // Return paper with error summary rather than failing completely
      return {
        ...paper,
        summary: {
          keyFindings: "Unable to generate summary at this time",
          methodology: "Summary generation failed",
          significance: "Please refer to the abstract for details"
        }
      };
    }
  }

  async summarizeMultiplePapers(papers: Paper[]): Promise<Paper[]> {
    const summarizedPapers: Paper[] = [];
    
    // Process all papers (Gemini has generous free limits)
    const limitedPapers = papers;
    
    // Process papers sequentially with minimal throttling (Gemini has generous free limits)
    for (let i = 0; i < limitedPapers.length; i++) {
      const paper = limitedPapers[i];
      
      try {
        const summarized = await this.summarizePaper(paper);
        summarizedPapers.push(summarized);
        
        // Add minimal delay - Gemini has much higher free limits than OpenAI
        if (i < limitedPapers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to summarize paper ${paper.id}:`, error);
        
        // Add paper with error summary
        summarizedPapers.push({
          ...paper,
          summary: {
            keyFindings: "Summary unavailable due to API limits",
            methodology: "Please try again later",
            significance: "Refer to abstract for details"
          }
        });
      }
    }
    
    return summarizedPapers;
  }
}