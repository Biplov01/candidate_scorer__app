from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Candidate schemas
class CandidateBase(BaseModel):
    name: str
    email: EmailStr
    role_applied: str
    skills: List[str] = []
    status: str = "new"

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role_applied: Optional[str] = None
    skills: Optional[List[str]] = None
    status: Optional[str] = None
    internal_notes: Optional[str] = None

class CandidateResponse(BaseModel):
    id: int
    name: str
    email: str
    role_applied: str
    status: str
    skills: List[str]
    internal_notes: Optional[str] = None
    created_at: datetime
    scores: List['ScoreResponse'] = []
    ai_summary: Optional[str] = None
    
    class Config:
        from_attributes = True

# Score schemas
class ScoreCreate(BaseModel):
    category: str
    score: int = Field(ge=1, le=5)
    note: Optional[str] = ""

class ScoreResponse(BaseModel):
    id: int
    category: str
    score: int
    note: str
    reviewer_id: int
    reviewer_email: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Query params
class CandidateQueryParams(BaseModel):
    status: Optional[str] = None
    role_applied: Optional[str] = None
    skill: Optional[str] = None
    keyword: Optional[str] = None
    page: int = 1
    page_size: int = 20

# AI Summary
class SummaryResponse(BaseModel):
    summary: str

# Update forward refs
CandidateResponse.model_rebuild()
