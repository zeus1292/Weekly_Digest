import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Optional
from dataclasses import dataclass


@dataclass
class ArxivPaper:
    """Raw paper data from ArXiv."""
    id: str
    title: str
    authors: str
    abstract: str
    arxiv_url: str
    published_date: str
    categories: List[str]


class ArxivService:
    """Service for fetching papers from ArXiv API."""

    BASE_URL = "http://export.arxiv.org/api/query"

    async def search_papers(
        self,
        topic: str,
        keywords: Optional[str] = None,
        days: int = 7
    ) -> List[ArxivPaper]:
        """Search ArXiv for papers matching the topic."""
        try:
            # Build search query
            search_query = f"all:{topic}"

            if keywords:
                keyword_list = [k.strip() for k in keywords.split(",")]
                keyword_query = " OR ".join([f"all:{k}" for k in keyword_list])
                search_query += f" AND ({keyword_query})"

            # Default to CS categories
            search_query += " AND (cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:cs.RO OR cat:cs.NE)"

            # Calculate cutoff date
            cutoff_date = datetime.now() - timedelta(days=days)

            params = {
                "search_query": search_query,
                "start": "0",
                "max_results": "50",
                "sortBy": "submittedDate",
                "sortOrder": "descending"
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(self.BASE_URL, params=params, timeout=30.0)
                response.raise_for_status()

            # Parse XML response
            papers = self._parse_response(response.text, cutoff_date)

            # Return up to 10 papers
            return papers[:10]

        except Exception as e:
            print(f"[ArxivService] Error fetching papers: {e}")
            return []

    def _parse_response(self, xml_text: str, cutoff_date: datetime) -> List[ArxivPaper]:
        """Parse ArXiv XML response."""
        papers = []

        # Define namespaces
        namespaces = {
            "atom": "http://www.w3.org/2005/Atom",
            "arxiv": "http://arxiv.org/schemas/atom"
        }

        root = ET.fromstring(xml_text)

        for entry in root.findall("atom:entry", namespaces):
            try:
                # Parse published date
                published_str = entry.find("atom:published", namespaces).text
                published_date = datetime.fromisoformat(published_str.replace("Z", "+00:00"))

                # Filter by date
                if published_date.replace(tzinfo=None) < cutoff_date:
                    continue

                # Extract ID from URL
                id_url = entry.find("atom:id", namespaces).text
                arxiv_id = id_url.split("/")[-1]

                # Get title
                title = entry.find("atom:title", namespaces).text
                title = " ".join(title.split())  # Normalize whitespace

                # Get authors
                authors = []
                for author in entry.findall("atom:author", namespaces):
                    name = author.find("atom:name", namespaces).text
                    authors.append(name)
                authors_str = ", ".join(authors)

                # Get abstract
                abstract = entry.find("atom:summary", namespaces).text
                abstract = " ".join(abstract.split())  # Normalize whitespace

                # Get categories
                categories = []
                for category in entry.findall("atom:category", namespaces):
                    term = category.get("term")
                    if term:
                        categories.append(term)

                paper = ArxivPaper(
                    id=arxiv_id,
                    title=title,
                    authors=authors_str,
                    abstract=abstract,
                    arxiv_url=f"https://arxiv.org/abs/{arxiv_id}",
                    published_date=published_str,
                    categories=categories
                )
                papers.append(paper)

            except Exception as e:
                print(f"[ArxivService] Error parsing entry: {e}")
                continue

        return papers


# Singleton instance
arxiv_service = ArxivService()
