import { TavilySearch } from "@langchain/tavily";
import type { Article } from "../../shared/schema";

export class TavilyService {
  private searchTool: TavilySearch;

  constructor() {
    if (!process.env.TAVILY_API_KEY) {
      console.warn("TAVILY_API_KEY not set - Tavily search will be unavailable");
    }

    this.searchTool = new TavilySearch({
      maxResults: 15,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      includeRawContent: "markdown",
      searchDepth: "advanced",
      topic: "news",
    });
  }

  async searchArticles(topic: string, days: number, keywords?: string): Promise<Article[]> {
    try {
      const query = keywords ? `${topic} ${keywords}` : topic;

      // Determine time range based on days
      let timeRange: "day" | "week" | "month" | "year" = "week";
      if (days <= 1) {
        timeRange = "day";
      } else if (days <= 7) {
        timeRange = "week";
      } else if (days <= 30) {
        timeRange = "month";
      } else {
        timeRange = "year";
      }

      console.log(`[Tavily] Searching for: "${query}" with timeRange: ${timeRange}`);

      const response = await this.searchTool.invoke({
        query,
        timeRange,
        topic: "news",
      });

      // Handle the response - it could be a TavilySearchResponse object
      if (typeof response === "object" && "results" in response) {
        const results = response.results as Array<{
          title: string;
          url: string;
          content: string;
          raw_content?: string | null;
          score?: number;
          published_date?: string;
        }>;
        return results.map((result) => this.transformToArticle(result));
      }

      // If response is already an array or string
      console.log("[Tavily] Unexpected response format:", typeof response);
      return [];
    } catch (error) {
      console.error("[Tavily] Search error:", error);
      return [];
    }
  }

  private transformToArticle(result: {
    title: string;
    url: string;
    content: string;
    raw_content?: string | null;
    score?: number;
    published_date?: string;
  }): Article {
    // Extract domain from URL as source
    let source = "Unknown";
    try {
      const url = new URL(result.url);
      source = url.hostname.replace("www.", "");
    } catch {
      source = "Unknown";
    }

    return {
      id: crypto.randomUUID(),
      title: result.title,
      url: result.url,
      source,
      publishedDate: result.published_date,
      content: result.raw_content || result.content,
    };
  }

  isAvailable(): boolean {
    return !!process.env.TAVILY_API_KEY;
  }
}

export const tavilyService = new TavilyService();
