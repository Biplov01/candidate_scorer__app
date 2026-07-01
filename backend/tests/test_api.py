import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db, Candidate, User, Score
from app.auth import get_password_hash

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_database():
    # Bind the override to THIS module's engine for the duration of each test.
    # (Assigning at import time would let whichever test module imports last
    # "win" globally and break the other module's tests.)
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def test_user():
    db = TestingSessionLocal()
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        role="reviewer"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user

@pytest.fixture
def test_admin():
    db = TestingSessionLocal()
    admin = User(
        email="admin@example.com",
        hashed_password=get_password_hash("admin123"),
        role="admin"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    db.close()
    return admin

@pytest.fixture
def auth_token(client, test_user):
    response = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "password123"}
    )
    return response.json()["access_token"]

@pytest.fixture
def admin_token(client, test_admin):
    response = client.post(
        "/auth/login",
        data={"username": "admin@example.com", "password": "admin123"}
    )
    return response.json()["access_token"]

def test_create_candidate(client, auth_token):
    response = client.post(
        "/candidates/",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "name": "John Doe",
            "email": "john@example.com",
            "role_applied": "Software Engineer",
            "skills": ["Python", "React"],
            "status": "new"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "John Doe"
    assert data["email"] == "john@example.com"
    assert "Python" in data["skills"]

def test_candidate_filtering(client, auth_token):
    # Create test candidates
    candidates = [
        {"name": "Alice", "email": "alice@example.com", "role_applied": "Engineer", "skills": ["Python"], "status": "new"},
        {"name": "Bob", "email": "bob@example.com", "role_applied": "Manager", "skills": ["Java"], "status": "reviewed"},
    ]
    
    for c in candidates:
        client.post(
            "/candidates/",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=c
        )
    
    # Test filtering
    response = client.get(
        "/candidates/?status=new",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(c["status"] == "new" for c in data)

def test_reviewer_cannot_see_another_reviewers_scores(client, auth_token, test_user):
    # Create a candidate
    response = client.post(
        "/candidates/",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "name": "Test Candidate",
            "email": "testcandidate@example.com",
            "role_applied": "Engineer",
            "skills": ["Python"],
            "status": "new"
        }
    )
    candidate_id = response.json()["id"]
    
    # Submit score
    response = client.post(
        f"/candidates/{candidate_id}/scores",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "category": "Technical",
            "score": 5,
            "note": "Excellent"
        }
    )
    assert response.status_code == 200
    
    # Create another reviewer
    db = TestingSessionLocal()
    other_user = User(
        email="other@example.com",
        hashed_password=get_password_hash("password123"),
        role="reviewer"
    )
    db.add(other_user)
    db.commit()
    db.close()
    
    # Login as other reviewer
    response = client.post(
        "/auth/login",
        data={"username": "other@example.com", "password": "password123"}
    )
    other_token = response.json()["access_token"]
    
    # Get candidate detail - should not see notes (admin-only)
    response = client.get(
        f"/candidates/{candidate_id}",
        headers={"Authorization": f"Bearer {other_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    # Reviewer should not see internal_notes
    assert "internal_notes" not in data or data["internal_notes"] is None

def test_admin_can_see_internal_notes(client, admin_token, auth_token, test_admin, test_user):
    # Create a candidate
    response = client.post(
        "/candidates/",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "name": "Test Candidate 2",
            "email": "test2@example.com",
            "role_applied": "Engineer",
            "skills": ["Python"],
            "status": "new"
        }
    )
    candidate_id = response.json()["id"]
    
    # Admin updates internal notes
    response = client.patch(
        f"/candidates/{candidate_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "internal_notes": "Admin note - strong candidate"
        }
    )
    assert response.status_code == 200
    
    # Reviewer gets candidate - should not see internal_notes
    response = client.get(
        f"/candidates/{candidate_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    # Reviewer should not see internal_notes
    assert data.get("internal_notes") is None
    
    # Admin gets candidate - should see internal_notes
    response = client.get(
        f"/candidates/{candidate_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data.get("internal_notes") == "Admin note - strong candidate"
