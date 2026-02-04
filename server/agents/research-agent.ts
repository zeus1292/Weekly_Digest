import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ArxivService } from "../services/arxiv";
import { tavilyService } from "../services/tavily";
import { IS_TRACING_ENABLED, OPENAI_API_KEY } from "../config";
import type { PaperSummary, Article, DigestResponse } from "../../shared/schema";

// State definition for the research agent workflow
const ResearchState = Annotation.Root({
  topic: Annotation<string>(),
  keywords: Annotation<string | undefined>(),
  timeframeDays: Annotation<number>(),
  papers: Annotation<PaperSummary[]>({
    default: () => [],
    reducer: (_, new_) => new_,
  }),
  articles: Annotation<Article[]>({
    default: () => [],
    reducer: (_, new_) => new_,
  }),
  paperExecutiveSummary: Annotation<string>({
    default: () => "",
    reducer: (_, new_) => new_,
  }),
  articleExecutiveSummary: Annotation<string>({
    default: () => "",
    reducer: (_, new_) => new_,
  }),
  error: Annotation<string | undefined>(),
});

type ResearchStateType = typeof ResearchState.State;

// Initialize services
const arxivService = new ArxivService();

// Initialize LangChain OpenAI model with tracing metadata
function getModel(runName?: string) {
  return new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.1,
    apiKey: OPENAI_API_KEY,
  }).withConfig({
    runName: runName || "openai-research",
    tags: ["research-lens", "openai"],
  });
}

// Node: Fetch papers from ArXiv
async function fetchPapers(state: ResearchStateType): Promise<Partial<ResearchStateType>> {
  console.log(`[ResearchAgent] Fetching papers for: ${state.topic}`);

  try {
    const rawPapers = await arxivService.searchPapers(
      state.topic,
      state.keywords,
      undefined, // no subdomain filter
      state.timeframeDays
    );

    // Transform to PaperSummary format (summaries will be added later)
    const papers: PaperSummary[] = rawPapers.map((paper) => ({
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      arxivUrl: paper.arxivUrl,
      publishedDate: paper.publishedDate,
      abstract: paper.abstract,
      categories: paper.categories,
      summary: {
        problemStatement: "",
        proposedSolution: "",
        challenges: "",
      },
    }));

    console.log(`[ResearchAgent] Found ${papers.length} papers`);
    return { papers };
  } catch (error) {
    console.error("[ResearchAgent] Error fetching papers:", error);
    return { papers: [], error: `Failed to fetch papers: ${error}` };
  }
}

// Node: Fetch articles from Tavily
async function fetchArticles(state: ResearchStateType): Promise<Partial<ResearchStateType>> {
  console.log(`[ResearchAgent] Fetching articles for: ${state.topic}`);

  try {
    const articles = await tavilyService.searchArticles(
      state.topic,
      state.timeframeDays,
      state.keywords
    );

    console.log(`[ResearchAgent] Found ${articles.length} articles`);
    return { articles };
  } catch (error) {
    console.error("[ResearchAgent] Error fetching articles:", error);
    return { articles: [], error: `Failed to fetch articles: ${error}` };
  }
}

// Node: Generate summaries for papers using Gemini
async function summarizePapers(state: ResearchStateType): Promise<Partial<ResearchStateType>> {
  console.log(`[ResearchAgent] Summarizing ${state.papers.length} papers`);
  if (IS_TRACING_ENABLED) {
    console.log(`[ResearchAgent] LangSmith tracing active for paper summarization`);
  }

  if (state.papers.length === 0) {
    return { papers: [] };
  }

  const model = getModel("paper-summarizer");
  const summarizedPapers: PaperSummary[] = [];

  for (const paper of state.papers) {
    try {
      const prompt = `Analyze this research paper and provide a structured summary.

Title: ${paper.title}
Authors: ${paper.authors}
Abstract: ${paper.abstract}

Provide a JSON response with exactly these three fields:
- problemStatement: What specific problem or challenge does this paper address? (1-2 sentences)
- proposedSolution: What is the main approach, method, or contribution proposed? (1-2 sentences)
- challenges: What limitations, challenges, or future work are mentioned? (1-2 sentences)

Only use information explicitly stated in the abstract. If something is not mentioned, say "Not specified in abstract."

Respond with ONLY valid JSON, no markdown formatting.`;

      const response = await model.invoke(prompt);
      const content = response.content.toString();

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        summarizedPapers.push({
          ...paper,
          summary: {
            problemStatement: parsed.problemStatement || "Not specified in abstract.",
            proposedSolution: parsed.proposedSolution || "Not specified in abstract.",
            challenges: parsed.challenges || "Not specified in abstract.",
          },
        });
      } else {
        summarizedPapers.push(paper);
      }

      // Small delay between API calls
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`[ResearchAgent] Error summarizing paper ${paper.id}:`, error);
      summarizedPapers.push({
        ...paper,
        summary: {
          problemStatement: "Summary unavailable.",
          proposedSolution: "Summary unavailable.",
          challenges: "Summary unavailable.",
        },
      });
    }
  }

  console.log(`[ResearchAgent] Summarized ${summarizedPapers.length} papers`);
  return { papers: summarizedPapers };
}

// Node: Generate executive summary for papers
async function generatePaperExecutiveSummary(state: ResearchStateType): Promise<Partial<ResearchStateType>> {
  console.log(`[ResearchAgent] Generating executive summary for papers`);

  if (state.papers.length === 0) {
    return { paperExecutiveSummary: "No papers found for this topic and timeframe." };
  }

  const model = getModel("paper-executive-summary");

  const papersList = state.papers
    .map((p, i) => `${i + 1}. "${p.title}" - ${p.summary.problemStatement}`)
    .join("\n");

  const prompt = `You are a research analyst. Based on the following ${state.papers.length} academic papers about "${state.topic}", provide a concise executive summary (3-4 paragraphs) that:

1. Identifies the main themes and research directions
2. Highlights the most significant findings or contributions
3. Notes any emerging trends or patterns across the papers

Papers:
${papersList}

Write a clear, professional summary suitable for executives or researchers wanting a quick overview.`;

  try {
    const response = await model.invoke(prompt);
    return { paperExecutiveSummary: response.content.toString() };
  } catch (error) {
    console.error("[ResearchAgent] Error generating paper executive summary:", error);
    return { paperExecutiveSummary: "Executive summary generation failed. Please review individual paper summaries." };
  }
}

// Node: Generate executive summary for articles
async function generateArticleExecutiveSummary(state: ResearchStateType): Promise<Partial<ResearchStateType>> {
  console.log(`[ResearchAgent] Generating executive summary for articles`);

  if (state.articles.length === 0) {
    return { articleExecutiveSummary: "No articles found for this topic and timeframe." };
  }

  const model = getModel("article-executive-summary");

  const articlesList = state.articles
    .map((a, i) => `${i + 1}. "${a.title}" (${a.source})`)
    .join("\n");

  const prompt = `You are a technology news analyst. Based on the following ${state.articles.length} articles about "${state.topic}", provide a concise executive summary (2-3 paragraphs) that:

1. Summarizes the key news and developments
2. Identifies any significant announcements or trends
3. Notes the overall industry sentiment or direction

Articles:
${articlesList}

Write a clear, professional summary suitable for executives or professionals wanting a quick industry overview.`;

  try {
    const response = await model.invoke(prompt);
    return { articleExecutiveSummary: response.content.toString() };
  } catch (error) {
    console.error("[ResearchAgent] Error generating article executive summary:", error);
    return { articleExecutiveSummary: "Executive summary generation failed. Please review individual articles." };
  }
}

// Build the research agent graph
function buildResearchGraph() {
  const workflow = new StateGraph(ResearchState)
    // Add nodes
    .addNode("fetchPapers", fetchPapers)
    .addNode("fetchArticles", fetchArticles)
    .addNode("summarizePapers", summarizePapers)
    .addNode("generatePaperSummary", generatePaperExecutiveSummary)
    .addNode("generateArticleSummary", generateArticleExecutiveSummary)

    // Define edges - parallel fetching, then summarization
    .addEdge(START, "fetchPapers")
    .addEdge(START, "fetchArticles")
    .addEdge("fetchPapers", "summarizePapers")
    .addEdge("summarizePapers", "generatePaperSummary")
    .addEdge("fetchArticles", "generateArticleSummary")
    .addEdge("generatePaperSummary", END)
    .addEdge("generateArticleSummary", END);

  return workflow.compile();
}

// Export the research agent runner
export async function runResearchAgent(
  topic: string,
  timeframeDays: number,
  keywords?: string
): Promise<DigestResponse> {
  console.log(`[ResearchAgent] Starting research for topic: "${topic}"`);
  if (IS_TRACING_ENABLED) {
    console.log(`[ResearchAgent] LangSmith tracing enabled - traces visible at smith.langchain.com`);
  }

  const graph = buildResearchGraph();

  const initialState = {
    topic,
    keywords,
    timeframeDays,
    papers: [],
    articles: [],
    paperExecutiveSummary: "",
    articleExecutiveSummary: "",
    error: undefined,
  };

  try {
    // Invoke with tracing metadata
    const result = await graph.invoke(initialState, {
      runName: `research-${topic.slice(0, 30)}`,
      tags: ["research-lens", "research-workflow"],
      metadata: {
        topic,
        timeframeDays,
        keywords: keywords || "none",
      },
    });

    // Transform to DigestResponse format
    const response: DigestResponse = {
      topic: result.topic,
      timeframeDays: result.timeframeDays,
      generatedAt: new Date().toISOString(),
      papers: {
        executiveSummary: result.paperExecutiveSummary,
        count: result.papers.length,
        items: result.papers,
      },
      articles: {
        executiveSummary: result.articleExecutiveSummary,
        count: result.articles.length,
        items: result.articles.map((article) => ({
          id: article.id,
          title: article.title,
          url: article.url,
          source: article.source,
          publishedDate: article.publishedDate,
        })),
      },
      warning: result.error,
    };

    console.log(`[ResearchAgent] Research complete. Papers: ${response.papers.count}, Articles: ${response.articles.count}`);
    return response;
  } catch (error) {
    console.error("[ResearchAgent] Error running research agent:", error);

    // Return error response
    return {
      topic,
      timeframeDays,
      generatedAt: new Date().toISOString(),
      papers: {
        executiveSummary: "Research failed. Please try again.",
        count: 0,
        items: [],
      },
      articles: {
        executiveSummary: "Research failed. Please try again.",
        count: 0,
        items: [],
      },
      warning: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
