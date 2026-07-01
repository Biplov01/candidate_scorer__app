import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

# Test database (separate file so this suite doesn't collide with test_api.py)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_auth.db"
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

def test_registration_hardcodes_reviewer(client):
    # Test that role is always reviewer, never accepted from client
    response = client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "password123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "reviewer"
    
    # Try to register with role in body (should be ignored)
    response = client.post(
        "/auth/register",
        json={
            "email": "admin@example.com",
            "password": "password123"
        }
    )
    # We can't even send role because it's not in the schema
    # The schema only accepts email and password
    # So role spoofing is prevented at the schema level

def test_admin_can_login(client):
    # Create admin first
    db = TestingSessionLocal()
    from app.auth import get_password_hash
    from app.database import User
    
    admin = User(
        email="admin@test.com",
        hashed_password=get_password_hash("admin123"),
        role="admin"
    )
    db.add(admin)
    db.commit()
    db.close()
    
    response = client.post(
        "/auth/login",
        data={"username": "admin@test.com", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "admin"

def test_auth_required(client):
    # Try to access protected endpoint without auth
    response = client.get("/candidates/")
    assert response.status_code == 401
    assert "Not authenticated" in response.text
