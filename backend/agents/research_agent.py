"""
Research Agent using LangGraph for orchestrating ArXiv and Tavily searches.

Workflow:
1. Parallel search: ArXiv papers + Tavily articles
2. Summarize papers with AI (problem/solution/challenges)
3. Generate executive summaries for both papers and articles
"""

import asyncio
from datetime import datetime, timezone
from typing import TypedDict, List, Optional
from dataclasses import asdict

from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.runnables import RunnableConfig

from backend.config import GOOGLE_API_KEY, LANGCHAIN_TRACING_V2
from backend.services.arxiv import arxiv_service, ArxivPaper
from backend.services.tavily_search import tavily_service, Article


# =============================================================================
# State Definition
# =============================================================================

class ResearchState(TypedDict):
    """State for the research agent workflow."""
    topic: str
    keywords: Optional[str]
    timeframe_days: int
    papers: List[dict]
    articles: List[dict]
    paper_executive_summary: str
    article_executive_summary: str
    error: Optional[str]


# =============================================================================
# LLM Setup
# =============================================================================

def get_llm(run_name: str = "gemini-research"):
    """Get the Gemini LLM instance with tracing metadata."""
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=GOOGLE_API_KEY,
        temperature=0.1
    )
    return llm.with_config(
        run_name=run_name,
        tags=["research-lens", "gemini"]
    )


# =============================================================================
# Agent Nodes
# =============================================================================

async def fetch_papers(state: ResearchState) -> dict:
    """Fetch papers from ArXiv."""
    print(f"[ResearchAgent] Fetching papers for: {state['topic']}")

    try:
        raw_papers = await arxiv_service.search_papers(
            topic=state["topic"],
            keywords=state.get("keywords"),
            days=state["timeframe_days"]
        )

        # Convert to dict format with empty summaries
        papers = []
        for paper in raw_papers:
            paper_dict = asdict(paper)
            paper_dict["summary"] = {
                "problem_statement": "",
                "proposed_solution": "",
                "challenges": ""
            }
            papers.append(paper_dict)

        print(f"[ResearchAgent] Found {len(papers)} papers")
        return {"papers": papers}

    except Exception as e:
        print(f"[ResearchAgent] Error fetching papers: {e}")
        return {"papers": [], "error": str(e)}


async def fetch_articles(state: ResearchState) -> dict:
    """Fetch articles from Tavily."""
    print(f"[ResearchAgent] Fetching articles for: {state['topic']}")

    try:
        raw_articles = await tavily_service.search_articles(
            topic=state["topic"],
            days=state["timeframe_days"],
            keywords=state.get("keywords")
        )

        # Convert to dict format
        articles = [asdict(article) for article in raw_articles]

        print(f"[ResearchAgent] Found {len(articles)} articles")
        return {"articles": articles}

    except Exception as e:
        print(f"[ResearchAgent] Error fetching articles: {e}")
        return {"articles": [], "error": str(e)}


async def summarize_papers(state: ResearchState) -> dict:
    """Generate AI summaries for each paper."""
    print(f"[ResearchAgent] Summarizing {len(state['papers'])} papers")
    if LANGCHAIN_TRACING_V2.lower() == "true":
        print("[ResearchAgent] LangSmith tracing active for paper summarization")

    if not state["papers"]:
        return {"papers": []}

    llm = get_llm("paper-summarizer")
    summarized_papers = []

    for paper in state["papers"]:
        try:
            prompt = f"""Analyze this research paper and provide a structured summary.

Title: {paper['title']}
Authors: {paper['authors']}
Abstract: {paper['abstract']}

Provide a JSON response with exactly these three fields:
- problem_statement: What specific problem or challenge does this paper address? (1-2 sentences)
- proposed_solution: What is the main approach, method, or contribution proposed? (1-2 sentences)
- challenges: What limitations, challenges, or future work are mentioned? (1-2 sentences)

Only use information explicitly stated in the abstract. If something is not mentioned, say "Not specified in abstract."

Respond with ONLY valid JSON, no markdown formatting."""

            response = await llm.ainvoke(prompt)
            content = response.content

            # Parse JSON from response
            import json
            import re

            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                parsed = json.loads(json_match.group())
                paper["summary"] = {
                    "problem_statement": parsed.get("problem_statement", "Not specified."),
                    "proposed_solution": parsed.get("proposed_solution", "Not specified."),
                    "challenges": parsed.get("challenges", "Not specified.")
                }
            else:
                paper["summary"] = {
                    "problem_statement": "Summary unavailable.",
                    "proposed_solution": "Summary unavailable.",
                    "challenges": "Summary unavailable."
                }

            summarized_papers.append(paper)

            # Small delay between API calls
            await asyncio.sleep(0.3)

        except Exception as e:
            print(f"[ResearchAgent] Error summarizing paper {paper['id']}: {e}")
            paper["summary"] = {
                "problem_statement": "Summary unavailable.",
                "proposed_solution": "Summary unavailable.",
                "challenges": "Summary unavailable."
            }
            summarized_papers.append(paper)

    print(f"[ResearchAgent] Summarized {len(summarized_papers)} papers")
    return {"papers": summarized_papers}


async def generate_paper_executive_summary(state: ResearchState) -> dict:
    """Generate executive summary for all papers."""
    print("[ResearchAgent] Generating paper executive summary")

    if not state["papers"]:
        return {"paper_executive_summary": "No papers found for this topic and timeframe."}

    llm = get_llm("paper-executive-summary")

    papers_list = "\n".join([
        f"{i+1}. \"{p['title']}\" - {p['summary'].get('problem_statement', 'N/A')}"
        for i, p in enumerate(state["papers"])
    ])

    prompt = f"""You are a research analyst. Based on the following {len(state['papers'])} academic papers about "{state['topic']}", provide a concise executive summary (3-4 paragraphs) that:

1. Identifies the main themes and research directions
2. Highlights the most significant findings or contributions
3. Notes any emerging trends or patterns across the papers

Papers:
{papers_list}

Write a clear, professional summary suitable for executives or researchers wanting a quick overview."""

    try:
        response = await llm.ainvoke(prompt)
        return {"paper_executive_summary": response.content}
    except Exception as e:
        print(f"[ResearchAgent] Error generating paper summary: {e}")
        return {"paper_executive_summary": "Executive summary generation failed."}


async def generate_article_executive_summary(state: ResearchState) -> dict:
    """Generate executive summary for all articles."""
    print("[ResearchAgent] Generating article executive summary")

    if not state["articles"]:
        return {"article_executive_summary": "No articles found for this topic and timeframe."}

    llm = get_llm("article-executive-summary")

    articles_list = "\n".join([
        f"{i+1}. \"{a['title']}\" ({a['source']})"
        for i, a in enumerate(state["articles"])
    ])

    prompt = f"""You are a technology news analyst. Based on the following {len(state['articles'])} articles about "{state['topic']}", provide a concise executive summary (2-3 paragraphs) that:

1. Summarizes the key news and developments
2. Identifies any significant announcements or trends
3. Notes the overall industry sentiment or direction

Articles:
{articles_list}

Write a clear, professional summary suitable for executives or professionals wanting a quick industry overview."""

    try:
        response = await llm.ainvoke(prompt)
        return {"article_executive_summary": response.content}
    except Exception as e:
        print(f"[ResearchAgent] Error generating article summary: {e}")
        return {"article_executive_summary": "Executive summary generation failed."}


# =============================================================================
# Graph Builder
# =============================================================================

def build_research_graph():
    """Build the LangGraph workflow for research."""
    workflow = StateGraph(ResearchState)

    # Add nodes
    workflow.add_node("fetch_papers", fetch_papers)
    workflow.add_node("fetch_articles", fetch_articles)
    workflow.add_node("summarize_papers", summarize_papers)
    workflow.add_node("generate_paper_summary", generate_paper_executive_summary)
    workflow.add_node("generate_article_summary", generate_article_executive_summary)

    # Define edges - parallel fetching, then summarization
    workflow.add_edge(START, "fetch_papers")
    workflow.add_edge(START, "fetch_articles")
    workflow.add_edge("fetch_papers", "summarize_papers")
    workflow.add_edge("summarize_papers", "generate_paper_summary")
    workflow.add_edge("fetch_articles", "generate_article_summary")
    workflow.add_edge("generate_paper_summary", END)
    workflow.add_edge("generate_article_summary", END)

    return workflow.compile()


# =============================================================================
# Main Runner
# =============================================================================

async def run_research_agent(
    topic: str,
    timeframe_days: int,
    keywords: Optional[str] = None
) -> dict:
    """Run the research agent and return results."""
    print(f"[ResearchAgent] Starting research for: '{topic}'")
    if LANGCHAIN_TRACING_V2.lower() == "true":
        print("[ResearchAgent] LangSmith tracing enabled - traces visible at smith.langchain.com")

    graph = build_research_graph()

    initial_state: ResearchState = {
        "topic": topic,
        "keywords": keywords,
        "timeframe_days": timeframe_days,
        "papers": [],
        "articles": [],
        "paper_executive_summary": "",
        "article_executive_summary": "",
        "error": None
    }

    # Config with tracing metadata
    run_config = {
        "run_name": f"research-{topic[:30]}",
        "tags": ["research-lens", "research-workflow"],
        "metadata": {
            "topic": topic,
            "timeframe_days": timeframe_days,
            "keywords": keywords or "none"
        }
    }

    try:
        result = await graph.ainvoke(initial_state, config=run_config)

        # Transform to API response format
        response = {
            "topic": result["topic"],
            "timeframeDays": result["timeframe_days"],
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "papers": {
                "executiveSummary": result["paper_executive_summary"],
                "count": len(result["papers"]),
                "items": [
                    {
                        "id": p["id"],
                        "title": p["title"],
                        "authors": p["authors"],
                        "arxivUrl": p["arxiv_url"],
                        "publishedDate": p["published_date"],
                        "abstract": p["abstract"],
                        "categories": p["categories"],
                        "summary": {
                            "problemStatement": p["summary"]["problem_statement"],
                            "proposedSolution": p["summary"]["proposed_solution"],
                            "challenges": p["summary"]["challenges"]
                        }
                    }
                    for p in result["papers"]
                ]
            },
            "articles": {
                "executiveSummary": result["article_executive_summary"],
                "count": len(result["articles"]),
                "items": [
                    {
                        "id": a["id"],
                        "title": a["title"],
                        "url": a["url"],
                        "source": a["source"],
                        "publishedDate": a.get("published_date")
                    }
                    for a in result["articles"]
                ]
            },
            "warning": result.get("error")
        }

        print(f"[ResearchAgent] Complete. Papers: {response['papers']['count']}, Articles: {response['articles']['count']}")
        return response

    except Exception as e:
        print(f"[ResearchAgent] Error: {e}")
        return {
            "topic": topic,
            "timeframeDays": timeframe_days,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "papers": {
                "executiveSummary": "Research failed.",
                "count": 0,
                "items": []
            },
            "articles": {
                "executiveSummary": "Research failed.",
                "count": 0,
                "items": []
            },
            "warning": str(e)
        }
