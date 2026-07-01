from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.database import get_db, Candidate, Score, User
from app.schemas import (
    CandidateCreate, CandidateUpdate, CandidateResponse,
    ScoreCreate, ScoreResponse, SummaryResponse
)
from app.auth import get_current_user
from datetime import datetime
import asyncio
import random

router = APIRouter()

# Helper function to generate AI summary
def generate_ai_summary_text(candidate: Candidate, scores: List[Score]) -> str:
    """Generate a mock AI summary for a candidate"""
    score_text = ""
    if scores:
        avg_score = sum(s.score for s in scores) / len(scores)
        score_text = f"Average score: {avg_score:.1f}/5 across {len(scores)} categories."
    else:
        score_text = "No scores submitted yet."
    
    summaries = [
        f"{candidate.name} applied for {candidate.role_applied} position. {score_text} Skills: {candidate.skills}. Shows strong potential for the role.",
        f"Candidate {candidate.name} demonstrates good fit for {candidate.role_applied}. {score_text} Would recommend moving forward in the process.",
        f"{candidate.name} has relevant experience for {candidate.role_applied}. {score_text} Consider scheduling a follow-up interview.",
        f"Based on the application, {candidate.name} shows promise for {candidate.role_applied}. {score_text} The candidate's background aligns well with requirements."
    ]
    return random.choice(summaries)

# Helper to convert candidate to response
def candidate_to_response(candidate: Candidate, db: Session, current_user: User):
    # Enforce score visibility: Reviewers only see their own scores, Admins see all
    score_query = db.query(Score).filter(Score.candidate_id == candidate.id)
    if current_user.role != "admin":
        score_query = score_query.filter(Score.reviewer_id == current_user.id)
    
    scores = score_query.all()
    score_responses = []
    for s in scores:
        reviewer = db.query(User).filter(User.id == s.reviewer_id).first()
        score_responses.append(ScoreResponse(
            id=s.id,
            category=s.category,
            score=s.score,
            note=s.note,
            reviewer_id=s.reviewer_id,
            reviewer_email=reviewer.email if reviewer else None,
            created_at=s.created_at
        ))
    
    return CandidateResponse(
        id=candidate.id,
        name=candidate.name,
        email=candidate.email,
        role_applied=candidate.role_applied,
        status=candidate.status,
        skills=candidate.skills.split(",") if candidate.skills else [],
        internal_notes=candidate.internal_notes if current_user.role == "admin" else None,
        created_at=candidate.created_at,
        scores=score_responses,
        ai_summary=candidate.ai_summary
    )

@router.get("/", response_model=List[CandidateResponse])
async def get_candidates(
    status: Optional[str] = Query(None),
    role_applied: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Candidate).filter(Candidate.deleted_at.is_(None))
    
    if status:
        query = query.filter(Candidate.status == status)
    if role_applied:
        query = query.filter(Candidate.role_applied == role_applied)
    if skill:
        query = query.filter(Candidate.skills.contains(skill))
    if keyword:
        query = query.filter(
            or_(
                Candidate.name.contains(keyword),
                Candidate.email.contains(keyword)
            )
        )
    
    offset = (page - 1) * page_size
    candidates = query.offset(offset).limit(page_size).all()
    
    return [candidate_to_response(c, db, current_user) for c in candidates]

@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.deleted_at.is_(None)
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return candidate_to_response(candidate, db, current_user)

@router.post("/", response_model=CandidateResponse, status_code=201)
async def create_candidate(
    candidate: CandidateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Candidate).filter(Candidate.email == candidate.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    db_candidate = Candidate(
        name=candidate.name,
        email=candidate.email,
        role_applied=candidate.role_applied,
        status=candidate.status,
        skills=",".join(candidate.skills) if candidate.skills else "",
        internal_notes=""
    )
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)
    
    return candidate_to_response(db_candidate, db, current_user)

@router.patch("/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    candidate_id: int,
    candidate_update: CandidateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.deleted_at.is_(None)
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if candidate_update.internal_notes is not None and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update internal notes")
    
    update_data = candidate_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "skills" and value is not None:
            setattr(candidate, key, ",".join(value))
        elif key == "internal_notes" and current_user.role == "admin":
            setattr(candidate, key, value)
        elif key != "internal_notes":
            setattr(candidate, key, value)
    
    db.commit()
    db.refresh(candidate)
    
    return candidate_to_response(candidate, db, current_user)

@router.delete("/{candidate_id}", status_code=204)
async def delete_candidate(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.deleted_at.is_(None)
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate.deleted_at = datetime.utcnow()
    candidate.status = "archived"
    db.commit()
    
    return None

@router.post("/{candidate_id}/scores", response_model=ScoreResponse)
async def submit_score(
    candidate_id: int,
    score_data: ScoreCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.deleted_at.is_(None)
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    db_score = Score(
        candidate_id=candidate_id,
        category=score_data.category,
        score=score_data.score,
        note=score_data.note or "",
        reviewer_id=current_user.id
    )
    db.add(db_score)
    db.commit()
    db.refresh(db_score)
    
    return ScoreResponse(
        id=db_score.id,
        category=db_score.category,
        score=db_score.score,
        note=db_score.note,
        reviewer_id=db_score.reviewer_id,
        reviewer_email=current_user.email,
        created_at=db_score.created_at
    )

@router.post("/{candidate_id}/summary", response_model=SummaryResponse)
async def generate_summary(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.deleted_at.is_(None)
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    scores = db.query(Score).filter(Score.candidate_id == candidate_id).all()
    
    # Simulate AI call with 2s delay
    await asyncio.sleep(2)
    
    summary = generate_ai_summary_text(candidate, scores)
    
    # Persist to database
    candidate.ai_summary = summary
    db.commit()
    db.refresh(candidate)
    
    return SummaryResponse(summary=summary)

@router.get("/{candidate_id}/stream")
async def stream_score_updates(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from fastapi.responses import StreamingResponse
    import json
    
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.deleted_at.is_(None)
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    async def event_generator():
        # Send initial scores (filtered by current user)
        score_query = db.query(Score).filter(Score.candidate_id == candidate_id)
        if current_user.role != "admin":
            score_query = score_query.filter(Score.reviewer_id == current_user.id)
        
        scores = score_query.all()
        for s in scores:
            yield f"data: {json.dumps({'type': 'score', 'id': s.id, 'category': s.category, 'score': s.score, 'note': s.note})}\n\n"
        
        # Keep connection open and check for new scores periodically
        last_count = len(scores)
        while True:
            await asyncio.sleep(2)
            
            # Check for new scores (filtered by current user)
            new_score_query = db.query(Score).filter(Score.candidate_id == candidate_id)
            if current_user.role != "admin":
                new_score_query = new_score_query.filter(Score.reviewer_id == current_user.id)
            
            new_scores = new_score_query.all()
            if len(new_scores) > last_count:
                for s in new_scores[last_count:]:
                    yield f"data: {json.dumps({'type': 'score', 'id': s.id, 'category': s.category, 'score': s.score, 'note': s.note})}\n\n"
                last_count = len(new_scores)
            
            # Send heartbeat
            yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")
