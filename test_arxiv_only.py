"""
Test script for ArXiv paper extraction only (no LLM).
Run with: python test_arxiv_only.py
"""
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from backend.services.arxiv import arxiv_service


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
        print("\nNo papers found in the last 7 days.")
        print("Trying with 30 days instead...")
        papers = await arxiv_service.search_papers(
            topic="Agentic AI",
            days=30
        )
        papers = papers[:2]

    if not papers:
        print("Still no papers found. Try a different topic.")
        return

    print(f"\nDisplaying top {len(papers)} papers:\n")

    for i, paper in enumerate(papers, 1):
        print(f"\n{'='*60}")
        print(f"Paper {i}: {paper.title}")
        print(f"{'='*60}")
        print(f"ID: {paper.id}")
        print(f"Authors: {paper.authors}")
        print(f"Published: {paper.published_date}")
        print(f"URL: {paper.arxiv_url}")
        print(f"Categories: {', '.join(paper.categories)}")
        print(f"\nAbstract (first 500 chars):")
        print(paper.abstract[:500] + "..." if len(paper.abstract) > 500 else paper.abstract)

    print("\n" + "=" * 60)
    print("ArXiv fetch test complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_arxiv_search())
