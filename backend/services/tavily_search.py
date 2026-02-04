import uuid
from typing import List, Optional
from dataclasses import dataclass
from urllib.parse import urlparse

from tavily import AsyncTavilyClient
from backend.config import TAVILY_API_KEY


@dataclass
class Article:
    """Article data from Tavily search."""
    id: str
    title: str
    url: str
    source: str
    published_date: Optional[str] = None
    content: Optional[str] = None


class TavilyService:
    """Service for searching web articles using Tavily."""

    def __init__(self):
        self.client = AsyncTavilyClient(api_key=TAVILY_API_KEY) if TAVILY_API_KEY else None

    async def search_articles(
        self,
        topic: str,
        days: int = 7,
        keywords: Optional[str] = None
    ) -> List[Article]:
        """Search for articles related to the topic."""
        if not self.client:
            print("[TavilyService] No API key configured")
            return []

        try:
            query = f"{topic} {keywords}" if keywords else topic

            # Determine search depth based on days
            if days <= 1:
                search_depth = "basic"
            else:
                search_depth = "advanced"

            print(f"[TavilyService] Searching for: '{query}'")

            response = await self.client.search(
                query=query,
                search_depth=search_depth,
                topic="news",
                max_results=15,
                include_raw_content=True
            )

            articles = []
            for result in response.get("results", []):
                article = self._transform_result(result)
                articles.append(article)

            print(f"[TavilyService] Found {len(articles)} articles")
            return articles

        except Exception as e:
            print(f"[TavilyService] Search error: {e}")
            return []

    def _transform_result(self, result: dict) -> Article:
        """Transform Tavily result to Article."""
        # Extract domain from URL as source
        source = "Unknown"
        try:
            parsed = urlparse(result.get("url", ""))
            source = parsed.netloc.replace("www.", "")
        except:
            pass

        return Article(
            id=str(uuid.uuid4()),
            title=result.get("title", "Untitled"),
            url=result.get("url", ""),
            source=source,
            published_date=result.get("published_date"),
            content=result.get("raw_content") or result.get("content")
        )

    def is_available(self) -> bool:
        """Check if Tavily service is configured."""
        return self.client is not None


# Singleton instance
tavily_service = TavilyService()
