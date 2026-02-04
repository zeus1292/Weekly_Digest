"""
API routes for Research Lens.

Provides research endpoint and history management.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import SearchHistory, User
from backend.schemas import SearchRequest, DigestResponse, HistoryItem
from backend.auth import get_current_user
from backend.agents.research_agent import run_research_agent


router = APIRouter(prefix="/api", tags=["research"])


# =============================================================================
# Research Endpoint
# =============================================================================

@router.post("/research", response_model=DigestResponse)
async def research(
    request: SearchRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """
    Execute research agent to fetch papers and articles.

    Returns papers from ArXiv and articles from Tavily with AI-generated
    executive summaries.
    """
    print(f"[API] Research request: topic='{request.topic}', days={request.timeframe_days}")

    try:
        # Run the research agent
        result = await run_research_agent(
            topic=request.topic,
            timeframe_days=request.timeframe_days,
            keywords=request.keywords
        )

        # Get current user (optional)
        user = get_current_user(http_request, db)

        # Get session ID from cookie for anonymous users
        session_id = http_request.cookies.get("session_id")
        if not session_id and not user:
            session_id = str(uuid.uuid4())

        # Save to history
        history_entry = SearchHistory(
            id=str(uuid.uuid4()),
            user_id=user.id if user else None,
            session_id=session_id if not user else None,
            topic=request.topic,
            keywords=request.keywords,
            timeframe_days=request.timeframe_days,
            paper_count=result.get("papers", {}).get("count", 0),
            article_count=result.get("articles", {}).get("count", 0),
            executive_summary={
                "papers": result.get("papers", {}).get("executiveSummary", ""),
                "articles": result.get("articles", {}).get("executiveSummary", "")
            },
            results=result,
            created_at=datetime.now(timezone.utc)
        )
        db.add(history_entry)
        db.commit()

        return result

    except Exception as e:
        print(f"[API] Research error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# History Endpoints
# =============================================================================

@router.get("/history")
async def get_history(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get search history for the current user or session."""
    user = get_current_user(request, db)

    if user:
        # Get history for logged-in user
        history = db.query(SearchHistory).filter(
            SearchHistory.user_id == user.id
        ).order_by(SearchHistory.created_at.desc()).limit(50).all()
    else:
        # Get history for anonymous session
        session_id = request.cookies.get("session_id")
        if not session_id:
            return {"items": []}

        history = db.query(SearchHistory).filter(
            SearchHistory.session_id == session_id
        ).order_by(SearchHistory.created_at.desc()).limit(20).all()

    items = [
        HistoryItem(
            id=h.id,
            topic=h.topic,
            keywords=h.keywords,
            timeframe_days=h.timeframe_days,
            paper_count=h.paper_count or 0,
            article_count=h.article_count or 0,
            created_at=h.created_at.isoformat() if h.created_at else None
        )
        for h in history
    ]

    return {"items": items}


@router.get("/history/{history_id}")
async def get_history_item(
    history_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get a specific search result from history."""
    user = get_current_user(request, db)
    session_id = request.cookies.get("session_id")

    history = db.query(SearchHistory).filter(SearchHistory.id == history_id).first()

    if not history:
        raise HTTPException(status_code=404, detail="History item not found")

    # Verify ownership
    if user:
        if history.user_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        if history.session_id != session_id:
            raise HTTPException(status_code=403, detail="Access denied")

    return history.results


@router.delete("/history/{history_id}")
async def delete_history_item(
    history_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete a search from history."""
    user = get_current_user(request, db)
    session_id = request.cookies.get("session_id")

    history = db.query(SearchHistory).filter(SearchHistory.id == history_id).first()

    if not history:
        raise HTTPException(status_code=404, detail="History item not found")

    # Verify ownership
    if user:
        if history.user_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        if history.session_id != session_id:
            raise HTTPException(status_code=403, detail="Access denied")

    db.delete(history)
    db.commit()

    return {"success": True}


# =============================================================================
# Health Check
# =============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
