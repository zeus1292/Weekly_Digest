import OpenAI from "openai";
import { Paper } from '@shared/schema';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async testConnection(): Promise<{ working: boolean; error?: string }> {
    try {
      // Make a simple test request to verify API key works
      await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5,
      });
      return { working: true };
    } catch (error) {
      return { 
        working: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async summarizePaper(paper: Paper): Promise<Paper> {
    try {
      const prompt = `
Please analyze this research paper and provide a structured summary in JSON format.

Paper Title: ${paper.title}
Authors: ${paper.authors}
Abstract: ${paper.abstract}

Provide a summary with the following structure:
{
  "keyFindings": "Summarize the main discoveries, results, or contributions of this paper in 1-2 sentences",
  "methodology": "Describe the approach, methods, or techniques used in the research in 1-2 sentences", 
  "significance": "Explain why this research matters and its potential impact or applications in 1-2 sentences"
}

Focus on being concise, accurate, and highlighting practical implications.
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ 
          role: "user", 
          content: prompt 
        }],
        response_format: { type: "json_object" },
        max_tokens: 400,
        temperature: 0.3,
      });

      const summaryContent = response.choices[0].message.content;
      if (!summaryContent) {
        throw new Error('No summary content received from OpenAI');
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
      console.error('Error summarizing paper:', error);
      
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
    
    // Limit to 3 papers maximum to avoid rate limits
    const limitedPapers = papers.slice(0, 3);
    
    // Process papers sequentially with throttling to respect rate limits
    for (let i = 0; i < limitedPapers.length; i++) {
      const paper = limitedPapers[i];
      
      try {
        const summarized = await this.summarizePaper(paper);
        summarizedPapers.push(summarized);
        
        // Add 2-second delay between requests to avoid rate limits
        if (i < limitedPapers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Failed to summarize paper ${paper.id}:`, error);
        
        // Add paper with error summary
        summarizedPapers.push({
          ...paper,
          summary: {
            keyFindings: "Summary unavailable due to rate limits",
            methodology: "Please try again later",
            significance: "Refer to abstract for details"
          }
        });
      }
    }
    
    return summarizedPapers;
  }
}
