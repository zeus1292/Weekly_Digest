"""
Research Lens - FastAPI Application

Main entry point for the Research Lens backend API.
"""

import os
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import engine, Base
from backend.auth import router as auth_router
from backend.routes import router as api_router
from backend.config import FRONTEND_URL


# =============================================================================
# Create FastAPI App
# =============================================================================

app = FastAPI(
    title="Research Lens API",
    description="AI-powered research aggregation combining ArXiv papers and web articles",
    version="1.0.0"
)


# =============================================================================
# Middleware
# =============================================================================

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def session_middleware(request: Request, call_next):
    """Ensure anonymous users have a session ID."""
    response = await call_next(request)

    # Set session_id cookie for anonymous tracking
    if "session_id" not in request.cookies:
        import uuid
        session_id = str(uuid.uuid4())
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=False,  # Set to True in production
            samesite="lax",
            max_age=30 * 24 * 60 * 60  # 30 days
        )

    return response


# =============================================================================
# Database Initialization
# =============================================================================

@app.on_event("startup")
async def startup():
    """Initialize database tables on startup."""
    print("[Research Lens] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("[Research Lens] Database ready")


# =============================================================================
# Include Routers
# =============================================================================

app.include_router(auth_router)
app.include_router(api_router)


# =============================================================================
# Static Files (React Frontend)
# =============================================================================

# Serve static files from the React build
STATIC_DIR = Path(__file__).parent.parent / "client" / "dist"

if STATIC_DIR.exists():
    # Serve static assets
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve React SPA for all non-API routes."""
        # Don't serve SPA for API routes
        if full_path.startswith("api/"):
            return Response(status_code=404)

        # Check if file exists in static dir
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # Return index.html for SPA routing
        return FileResponse(STATIC_DIR / "index.html")
else:
    @app.get("/")
    async def root():
        """Root endpoint when no frontend is built."""
        return {
            "message": "Research Lens API",
            "docs": "/docs",
            "note": "Run 'npm run build' in the client directory to build the frontend"
        }


# =============================================================================
# Development Server
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=5000,
        reload=True
    )
