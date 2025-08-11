import { GoogleGenAI } from "@google/genai";
import { Paper } from '@shared/schema';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || "" 
    });
  }

  // Validation function to check for potential hallucination indicators
  private validateSummary(summary: any, paper: Paper): boolean {
    if (!summary || typeof summary !== 'object') return false;
    
    // Check for common hallucination indicators
    const hallucinationIndicators = [
      'according to the study', 'the researchers found', 'the paper shows',
      'based on experiments', 'the authors conclude', 'results indicate'
    ];
    
    const summaryText = JSON.stringify(summary).toLowerCase();
    
    // If summary contains specific claims without evidence in the abstract, flag it
    const hasSpecificClaims = hallucinationIndicators.some(indicator => 
      summaryText.includes(indicator) && !paper.abstract.toLowerCase().includes(indicator.split(' ')[0])
    );
    
    return !hasSpecificClaims;
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
CRITICAL: Only analyze the provided content. Do NOT add information not present in the title, authors, or abstract.
If specific information is not available in the provided content, explicitly state "Not specified in the abstract" rather than inferring or making assumptions.
Respond with JSON in this format: 
{'keyFindings': 'string', 'methodology': 'string', 'significance': 'string'}`;

      const prompt = `
Please analyze ONLY the information provided below. Do NOT infer, assume, or add any information not explicitly stated.

Paper Title: ${paper.title}
Authors: ${paper.authors}
Abstract: ${paper.abstract}

Provide a summary with the following structure based ONLY on the provided content:
- keyFindings: Summarize the main discoveries, results, or contributions mentioned in the abstract in 1-2 sentences. If not clear, state "Findings not detailed in abstract"
- methodology: Describe the approach, methods, or techniques mentioned in the abstract in 1-2 sentences. If not specified, state "Methodology not specified in abstract"  
- significance: Explain the importance or applications mentioned in the abstract in 1-2 sentences. If not stated, derive only from what's explicitly mentioned

IMPORTANT: Stay strictly within the bounds of the provided information. Do not hallucinate or infer details not present.
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
          temperature: 0.1, // Lower temperature for more factual, less creative responses
          topP: 0.8
        },
        contents: prompt,
      });

      const summaryContent = response.text;
      if (!summaryContent) {
        throw new Error('No summary content received from Gemini');
      }

      const summary = JSON.parse(summaryContent);
      
      // Validate summary for potential hallucination
      if (!this.validateSummary(summary, paper)) {
        console.warn(`Potential hallucination detected for paper: ${paper.title}`);
        return {
          ...paper,
          summary: {
            keyFindings: "Analysis unavailable - please refer to the abstract",
            methodology: "Methodology details - please refer to the abstract",
            significance: "Significance assessment - please refer to the abstract"
          }
        };
      }
      
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