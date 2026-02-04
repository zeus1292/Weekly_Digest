"""
Test script for ArXiv paper extraction and summarization.
Run with: python test_arxiv.py
"""
import asyncio
import json
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from backend.services.arxiv import arxiv_service
from backend.agents.research_agent import get_llm

print("[Config] Using OpenAI gpt-4o-mini model")


async def test_arxiv_search():
    """Test ArXiv paper search for Agentic AI."""
    print("=" * 60)
    print("Testing ArXiv Search: 'Agentic AI' (last 7 days, top 2)")
    print("=" * 60)

    # Fetch papers
    papers = await arxiv_service.search_papers(
        topic="Agentic AI",
        days=7
    )

    print(f"\nFound {len(papers)} papers total")

    # Limit to top 2
    papers = papers[:2]

    if not papers:
        print("No papers found in the last 7 days. Try extending the timeframe.")
        return

    print(f"\nProcessing top {len(papers)} papers:\n")

    # Display and summarize each paper
    llm = get_llm("test-summarizer")

    for i, paper in enumerate(papers, 1):
        print(f"\n{'='*60}")
        print(f"Paper {i}: {paper.title}")
        print(f"{'='*60}")
        print(f"ID: {paper.id}")
        print(f"Authors: {paper.authors}")
        print(f"Published: {paper.published_date}")
        print(f"URL: {paper.arxiv_url}")
        print(f"Categories: {', '.join(paper.categories)}")
        print(f"\nAbstract:\n{paper.abstract[:500]}...")

        # Generate summary
        print("\n--- AI Summary ---")
        prompt = f"""Analyze this research paper and provide a structured summary.

Title: {paper.title}
Authors: {paper.authors}
Abstract: {paper.abstract}

Provide a JSON response with exactly these three fields:
- problem_statement: What specific problem or challenge does this paper address? (1-2 sentences)
- proposed_solution: What is the main approach, method, or contribution proposed? (1-2 sentences)
- challenges: What limitations, challenges, or future work are mentioned? (1-2 sentences)

Only use information explicitly stated in the abstract. If something is not mentioned, say "Not specified in abstract."

Respond with ONLY valid JSON, no markdown formatting."""

        try:
            response = await llm.ainvoke(prompt)
            content = response.content

            # Parse JSON
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                summary = json.loads(json_match.group())
                print(f"Problem: {summary.get('problem_statement', 'N/A')}")
                print(f"Solution: {summary.get('proposed_solution', 'N/A')}")
                print(f"Challenges: {summary.get('challenges', 'N/A')}")
            else:
                print(f"Raw response: {content}")
        except Exception as e:
            print(f"Error generating summary: {e}")

        # Small delay between API calls
        await asyncio.sleep(0.5)

    print("\n" + "=" * 60)
    print("Test complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_arxiv_search())
