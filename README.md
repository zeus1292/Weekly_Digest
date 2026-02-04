# Research Lens

A research aggregation platform that fetches academic papers from ArXiv and articles from the web, then uses AI to generate structured summaries and executive overviews.

## Features

- **ArXiv Paper Search**: Fetch recent papers by topic with date filtering
- **Web Article Search**: Find relevant articles via Tavily API
- **AI Summarization**: Generate structured summaries (problem statement, solution, challenges)
- **Executive Summaries**: AI-generated overviews of research themes and trends
- **LangGraph Workflows**: Orchestrated agent pipelines for parallel data fetching and summarization
- **LangSmith Observability**: Full tracing of LLM interactions and workflow execution
- **Search History**: Save and revisit past searches (requires database)
- **User Authentication**: Optional login/signup functionality

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, TailwindCSS, Radix UI |
| Backend | Express.js, TypeScript |
| AI/LLM | OpenAI GPT-4o-mini, LangChain, LangGraph |
| Database | PostgreSQL (Neon Serverless) |
| APIs | ArXiv REST API, Tavily Search API |
| Observability | LangSmith |
| Deployment | Vercel |

## Project Structure

```
Weekly_Digest/
├── client/                 # React frontend
│   └── src/
│       ├── pages/          # Home, History, Login pages
│       ├── components/     # UI components
│       └── context/        # Global state
├── server/                 # Express backend
│   ├── agents/             # LangGraph research agent
│   ├── services/           # ArXiv, Tavily integrations
│   ├── routes.ts           # API endpoints
│   ├── auth.ts             # Authentication
│   └── db.ts               # Database connection
├── backend/                # Python backend (alternative)
│   ├── agents/             # Python LangGraph agent
│   └── services/           # Python service implementations
├── shared/                 # Shared TypeScript schemas
├── api/                    # Vercel serverless functions
└── vercel.json             # Vercel deployment config
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+ (for Python backend)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/zeus1292/Weekly_Digest.git
   cd Weekly_Digest
   ```

2. **Install dependencies**
   ```bash
   # Node.js dependencies
   npm install

   # Python dependencies (optional, for Python backend)
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `OPENAI_API_KEY` - For AI summarization
   - `TAVILY_API_KEY` - For web article search

   Optional variables:
   - `DATABASE_URL` - PostgreSQL connection (enables history/auth)
   - `LANGCHAIN_TRACING_V2` - Set to `true` for LangSmith tracing
   - `LANGCHAIN_API_KEY` - LangSmith API key

4. **Run database migrations** (if using database)
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service health check |
| POST | `/api/research` | Run research agent |
| GET | `/api/history` | Get search history |
| GET | `/api/history/:id` | Get specific search result |
| DELETE | `/api/history/:id` | Delete history item |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Research Request

```json
POST /api/research
{
  "topic": "Agentic AI",
  "timeframeDays": 7,
  "keywords": "LLM, agents"  // optional
}
```

### Research Response

```json
{
  "topic": "Agentic AI",
  "timeframeDays": 7,
  "generatedAt": "2024-02-04T12:00:00Z",
  "papers": {
    "executiveSummary": "...",
    "count": 10,
    "items": [
      {
        "id": "2402.12345",
        "title": "Paper Title",
        "authors": "Author 1, Author 2",
        "arxivUrl": "https://arxiv.org/abs/2402.12345",
        "publishedDate": "2024-02-03",
        "abstract": "...",
        "summary": {
          "problemStatement": "...",
          "proposedSolution": "...",
          "challenges": "..."
        }
      }
    ]
  },
  "articles": {
    "executiveSummary": "...",
    "count": 5,
    "items": [...]
  }
}
```

## LangGraph Workflow

The research agent uses LangGraph to orchestrate the following workflow:

```
START
  ├─→ fetchPapers ─→ summarizePapers ─→ generatePaperSummary ─→ END
  └─→ fetchArticles ─────────────────→ generateArticleSummary ──→ END
```

- Papers and articles are fetched in parallel
- Each paper is summarized with structured output (problem/solution/challenges)
- Executive summaries are generated for both papers and articles

## Observability

LangSmith tracing is integrated for full observability:

1. Enable tracing in `.env`:
   ```
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=your-langsmith-key
   LANGCHAIN_PROJECT=research-lens
   ```

2. View traces at https://smith.langchain.com

Traces include:
- Workflow execution with metadata (topic, timeframe)
- Individual LLM calls with run names
- Input/output for each step
- Latency and token usage

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository at https://vercel.com/new
3. Configure:
   - Build Command: `vite build`
   - Output Directory: `dist`
4. Add environment variables in Vercel dashboard
5. Deploy

### Local Production Build

```bash
npm run build
npm start
```

## Development

### Running Tests

```bash
# Test ArXiv fetch only (no LLM)
python test_arxiv_only.py

# Test with summarization
python test_arxiv.py
```

### Code Structure

- **TypeScript server** (`server/`) - Primary backend
- **Python backend** (`backend/`) - Alternative implementation
- **Shared schemas** (`shared/schema.ts`) - Zod validation schemas

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

*Built with LangChain, LangGraph, and OpenAI*
