import OpenAI from "openai";
import { Paper } from '@shared/schema';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
    });
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
    
    // Process papers in batches to respect rate limits
    for (const paper of papers) {
      const summarized = await this.summarizePaper(paper);
      summarizedPapers.push(summarized);
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return summarizedPapers;
  }
}
