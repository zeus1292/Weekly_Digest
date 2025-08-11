import { GoogleGenAI } from "@google/genai";
import type { TechCrunchArticle } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class GeminiTechCrunchService {
  async generateSummary(article: TechCrunchArticle): Promise<TechCrunchArticle> {
    try {
      const prompt = `Please analyze this TechCrunch article and provide a structured summary:

Title: ${article.title}
URL: ${article.url}

Please provide a JSON response with the following structure:
{
  "keyFindings": "Main findings or announcements in 2-3 sentences",
  "methodology": "What happened, who was involved, and any key details",
  "significance": "Why this matters to the tech industry or broader market"
}

Focus on the business impact, technological innovation, and industry implications.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
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

      const rawJson = response.text;
      if (rawJson) {
        const summary = JSON.parse(rawJson);
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