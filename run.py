#!/usr/bin/env python3
"""
Development server runner for Research Lens.

Usage:
    python run.py                  # Run with default settings
    python run.py --port 8000      # Run on custom port
    python run.py --no-reload      # Disable auto-reload
"""

import argparse
import uvicorn

from backend.config import PORT, DEBUG


def main():
    parser = argparse.ArgumentParser(description="Run Research Lens development server")
    parser.add_argument("--port", type=int, default=PORT, help="Port to run on")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")
    args = parser.parse_args()

    print(f"""
╔═══════════════════════════════════════════════════════════╗
║                    Research Lens                          ║
║         AI-Powered Research Aggregation Tool              ║
╠═══════════════════════════════════════════════════════════╣
║  Backend API:  http://{args.host}:{args.port}                        ║
║  API Docs:     http://{args.host}:{args.port}/docs                   ║
║  Frontend:     http://localhost:5173 (run npm run dev)    ║
╚═══════════════════════════════════════════════════════════╝
    """)

    uvicorn.run(
        "backend.main:app",
        host=args.host,
        port=args.port,
        reload=not args.no_reload and DEBUG,
        log_level="info"
    )


if __name__ == "__main__":
    main()
