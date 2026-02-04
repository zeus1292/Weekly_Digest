/**
 * Server configuration - loads and validates environment variables
 * IMPORTANT: This file must be imported before any LangChain imports
 * to ensure tracing environment variables are set.
 */

import dotenv from "dotenv";

// Load .env file
dotenv.config();

// API Keys
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";

// LangSmith Observability
export const LANGCHAIN_TRACING_V2 = process.env.LANGCHAIN_TRACING_V2 || "false";
export const LANGCHAIN_API_KEY = process.env.LANGCHAIN_API_KEY || "";
export const LANGCHAIN_PROJECT = process.env.LANGCHAIN_PROJECT || "research-lens";
export const LANGCHAIN_ENDPOINT = process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com";

// Enable LangSmith tracing if configured
export function initializeLangSmith(): boolean {
  if (LANGCHAIN_TRACING_V2.toLowerCase() === "true" && LANGCHAIN_API_KEY) {
    // Set environment variables for LangChain to pick up
    process.env.LANGCHAIN_TRACING_V2 = "true";
    process.env.LANGCHAIN_API_KEY = LANGCHAIN_API_KEY;
    process.env.LANGCHAIN_PROJECT = LANGCHAIN_PROJECT;
    process.env.LANGCHAIN_ENDPOINT = LANGCHAIN_ENDPOINT;

    console.log(`[Config] LangSmith tracing enabled for project: ${LANGCHAIN_PROJECT}`);
    return true;
  }
  return false;
}

// Server config
export const PORT = parseInt(process.env.PORT || "5000", 10);
export const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production";
export const NODE_ENV = process.env.NODE_ENV || "development";

// Initialize LangSmith on module load
const tracingEnabled = initializeLangSmith();
export const IS_TRACING_ENABLED = tracingEnabled;
