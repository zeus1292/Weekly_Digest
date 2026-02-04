from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# =============================================================================
# Request Schemas
# =============================================================================

class SearchRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="Research topic to search")
    keywords: Optional[str] = Field(None, description="Optional keywords")
    timeframe_days: int = Field(default=7, ge=1, le=30, alias="timeframeDays")

    class Config:
        populate_by_name = True


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# =============================================================================
# Response Schemas
# =============================================================================

class PaperSummary(BaseModel):
    problem_statement: str = Field(alias="problemStatement")
    proposed_solution: str = Field(alias="proposedSolution")
    challenges: str

    class Config:
        populate_by_name = True


class Paper(BaseModel):
    id: str
    title: str
    authors: str
    arxiv_url: str = Field(alias="arxivUrl")
    published_date: str = Field(alias="publishedDate")
    abstract: str
    categories: List[str]
    summary: PaperSummary

    class Config:
        populate_by_name = True


class Article(BaseModel):
    id: str
    title: str
    url: str
    source: str
    published_date: Optional[str] = Field(None, alias="publishedDate")

    class Config:
        populate_by_name = True


class PapersSection(BaseModel):
    executive_summary: str = Field(alias="executiveSummary")
    count: int
    items: List[Paper]

    class Config:
        populate_by_name = True


class ArticlesSection(BaseModel):
    executive_summary: str = Field(alias="executiveSummary")
    count: int
    items: List[Article]

    class Config:
        populate_by_name = True


class DigestResponse(BaseModel):
    topic: str
    timeframe_days: int = Field(alias="timeframeDays")
    generated_at: str = Field(alias="generatedAt")
    papers: PapersSection
    articles: ArticlesSection
    warning: Optional[str] = None

    class Config:
        populate_by_name = True


class UserResponse(BaseModel):
    id: str
    email: str
    created_at: Optional[str] = Field(None, alias="createdAt")

    class Config:
        populate_by_name = True


class AuthResponse(BaseModel):
    success: bool = True
    user: Optional[UserResponse] = None
    session_id: Optional[str] = Field(None, alias="sessionId")
    message: Optional[str] = None

    class Config:
        populate_by_name = True


class HistoryItem(BaseModel):
    id: str
    topic: str
    keywords: Optional[str] = None
    timeframe_days: int = Field(alias="timeframeDays")
    paper_count: Optional[int] = Field(None, alias="paperCount")
    article_count: Optional[int] = Field(None, alias="articleCount")
    created_at: Optional[str] = Field(None, alias="createdAt")

    class Config:
        populate_by_name = True


class HistoryResponse(BaseModel):
    items: List[HistoryItem]
