from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./candidates.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Models
class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role_applied = Column(String, nullable=False)
    status = Column(String, default="new")  # new/reviewed/hired/rejected/archived
    skills = Column(String)  # Stored as comma-separated string
    internal_notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)  # Soft delete
    ai_summary = Column(Text, nullable=True)
    
    scores = relationship("Score", back_populates="candidate", cascade="all, delete-orphan")

class Score(Base):
    __tablename__ = "scores"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    category = Column(String, nullable=False)
    score = Column(Integer, nullable=False)  # 1-5
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    candidate = relationship("Candidate", back_populates="scores")
    reviewer = relationship("User", back_populates="scores")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="reviewer")  # reviewer/admin
    created_at = Column(DateTime, default=datetime.utcnow)
    
    scores = relationship("Score", back_populates="reviewer")

# Create tables
Base.metadata.create_all(bind=engine)

# Simple migration to add ai_summary column if it doesn't exist
def migrate_db():
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("candidates")]
    if "ai_summary" not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE candidates ADD COLUMN ai_summary TEXT"))
            conn.commit()

migrate_db()
