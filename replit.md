# ResearchLens - Academic Paper Discovery Platform

## Overview

ResearchLens is a web application that helps researchers stay current with academic literature by generating personalized weekly digests of recent papers from arXiv. The application leverages AI-powered summarization to provide structured, digestible insights from the latest research publications in various academic domains.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack TypeScript Architecture
The application follows a monorepo structure with shared TypeScript types and schemas between client and server. This ensures type safety across the entire stack and reduces code duplication.

**Design Decision**: TypeScript throughout eliminates runtime type errors and provides better developer experience with IntelliSense and compile-time error checking.

### Frontend Architecture
- **Framework**: React with Vite for fast development and building
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS for utility-first styling with custom design tokens
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

**Design Decision**: This stack provides a modern, performant frontend with excellent developer experience while keeping bundle size manageable.

### Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **API Design**: RESTful endpoints with structured JSON responses
- **Validation**: Zod schemas for request/response validation
- **Development**: Hot reloading with Vite integration in development mode

**Design Decision**: Express provides flexibility and extensive middleware ecosystem, while Zod ensures data integrity across client-server boundaries.

### Data Layer
- **Database**: PostgreSQL configured via Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Connection**: Neon serverless PostgreSQL for scalable cloud database

**Design Decision**: PostgreSQL offers robust relational data features, while Drizzle provides type-safe database operations without the overhead of traditional ORMs.

### External Service Integration
- **Research Data**: arXiv API for fetching academic papers
- **AI Processing**: Google Gemini API for paper summarization and analysis (free alternative to OpenAI)
- **Paper Processing**: Fast-XML-Parser for handling arXiv's XML responses

**Design Decision**: arXiv provides comprehensive academic paper data, while Google Gemini offers sophisticated text analysis capabilities with generous free usage limits, eliminating rate limit concerns.

### API Architecture
The application exposes a single primary endpoint `/api/generate-digest` that orchestrates the entire workflow:
1. Validates user search parameters
2. Queries arXiv for relevant papers
3. Processes and filters results
4. Generates AI summaries for each paper
5. Returns structured digest response

**Design Decision**: Single endpoint simplifies client integration while encapsulating complex multi-step processing logic on the server.

### Error Handling and Resilience
- Structured error responses with appropriate HTTP status codes
- Client-side error boundaries for graceful failure handling
- Retry mechanisms in TanStack Query for network resilience
- Validation at multiple layers (client, server, database)

### Development and Build Process
- **Development**: Concurrent client/server development with hot reloading
- **Build**: Vite for client bundling, esbuild for server compilation
- **Type Checking**: TypeScript compilation for both environments
- **Database**: Push-based schema updates with Drizzle

**Design Decision**: Modern tooling provides fast feedback loops and efficient production builds while maintaining type safety.

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL via Neon serverless platform
- **AI Services**: Google Gemini API for free text processing and summarization
- **Academic Data**: arXiv API for research paper retrieval

### Key Libraries
- **Frontend**: React, Vite, TanStack Query, React Hook Form, Wouter
- **UI Components**: Radix UI primitives with Shadcn/ui component library
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Express.js, Drizzle ORM, Zod validation
- **Utilities**: date-fns for date manipulation, clsx for conditional styling

### Development Tools
- **Build Tools**: Vite, esbuild, TypeScript compiler
- **Database Tools**: Drizzle Kit for schema management
- **Replit Integration**: Custom plugins for development environment