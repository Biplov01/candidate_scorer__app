from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import Candidate

def search_candidates_correct(db: Session, status: str = None, role_applied: str = None, 
                              skill: str = None, keyword: str = None, 
                              page: int = 1, page_size: int = 20):
    """
    Correct implementation: Use database filtering, not Python filtering
    This is much more efficient and scalable
    """
    query = db.query(Candidate).filter(Candidate.deleted_at.is_(None))
    
    # Apply filters in database
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
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    candidates = query.offset(offset).limit(page_size).all()
    
    return candidates, total
