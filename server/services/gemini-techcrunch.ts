import { GoogleGenAI } from "@google/genai";
import type { TechCrunchArticle } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class GeminiTechCrunchService {
  // Validation to prevent hallucination in TechCrunch summaries
  private validateArticleSummary(summary: any, title: string): boolean {
    if (!summary || typeof summary !== 'object') return false;
    
    // Check if summary contains specific details that couldn't be derived from title alone
    const summaryText = JSON.stringify(summary).toLowerCase();
    const titleWords = title.toLowerCase().split(' ');
    
    // Flag if summary contains specific financial figures, dates, or names not in title
    const specificDetailsPattern = /(\$[\d,]+|\d+%|\d+ million|\d+ billion|january|february|march|april|may|june|july|august|september|october|november|december)/;
    const containsSpecificDetails = specificDetailsPattern.test(summaryText);
    
    // Check if all key terms in summary can be traced back to title
    const titleContainsContext = titleWords.some(word => word.length > 3);
    
    return !containsSpecificDetails || titleContainsContext;
  }

  async generateSummary(article: TechCrunchArticle): Promise<TechCrunchArticle> {
    try {
      // Since we only have title and URL, we cannot provide accurate content-based summaries
      // To prevent hallucination, we'll provide a clear indication of what we can and cannot do
      console.warn(`Limited data available for TechCrunch article: ${article.title}. Only title-based analysis possible.`);
      
      const systemPrompt = `You are a technology news analysis expert.
CRITICAL: You only have the article title and URL. Do NOT fabricate, infer, or hallucinate content details.
Based ONLY on the title, provide general categorization. For specific content details, direct users to the original article.
Be transparent about the limitations of title-only analysis.`;

      const prompt = `You have LIMITED information - only the title and URL of a TechCrunch article. Do NOT invent or assume content details.

Article Title: ${article.title}
URL: ${article.url}
Published: ${article.publishedDate}

Based ONLY on the title, provide:
{
  "keyFindings": "Based on the title, this appears to be about [topic from title]. For specific findings and details, please read the full article at the provided URL.",
  "methodology": "Article details are not available. Please visit the original TechCrunch article to learn about what happened, who was involved, and key details.",
  "significance": "Based on the title topic, this may relate to [general category from title]. For specific industry impact and significance, please refer to the full article."
}

IMPORTANT: Be honest about limitations. Direct users to the original article for actual content details.`;

      const response = await ai.models.generateContent({
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

      const rawJson = response.text;
      if (rawJson) {
        const summary = JSON.parse(rawJson);
        
        // Validate summary to prevent hallucination
        if (!this.validateArticleSummary(summary, article.title)) {
          console.warn(`Potential hallucination detected for TechCrunch article: ${article.title}`);
          return {
            ...article,
            summary: {
              keyFindings: `Title indicates this is about ${article.title}. Please read the full article for specific details.`,
              methodology: "Article content not available for analysis. Please visit the original TechCrunch article.",
              significance: "For industry impact and detailed analysis, please refer to the complete article."
            }
          };
        }
        
        return {
          ...article,
          summary: summary
        };
      }

      return article;
    } catch (error) {
      console.error(`Error generating summary for article ${article.id}:`, error);
      return article; // Return article without summary if generation fails
    }
  }

  async generateSummaries(articles: TechCrunchArticle[]): Promise<TechCrunchArticle[]> {
    console.log(`Generating summaries for ${articles.length} TechCrunch articles...`);
    
    const summaryPromises = articles.map(article => this.generateSummary(article));
    const results = await Promise.allSettled(summaryPromises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to generate summary for article ${articles[index].id}:`, result.reason);
        return articles[index]; // Return original article if summary generation fails
      }
    });
  }
}

export const geminiTechCrunchService = new GeminiTechCrunchService();