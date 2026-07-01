# Candidate Scoring & Review Dashboard

A full-stack candidate management system for TechKraft's recruitment workflow.

## 🚀 Quick Start

### Using Docker (Recommended)
This is the easiest way to run the application as it handles all dependencies and environment setup.
```bash
docker-compose down --volumes # Optional: clear old data
docker-compose up --build
```
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Local Setup
**Backend:**
```bash
cd backend
pip install -r requirements.txt
export PYTHONPATH=. # On Windows: set PYTHONPATH=.
uvicorn app.main:app --reload --port 8000
```
**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔍 Debugging Signal: The "Subtle Bug"

The provided query pattern has a critical **scalability issue**:

```python
all_candidates = db.execute("SELECT * FROM candidates").fetchall()
filtered = [c for c in all_candidates if c["status"] == status]
```

### The Issue
This pattern performs **In-Memory Filtering**. It fetches **every single row** from the database into the application's RAM before filtering.

### Why it matters at scale
1.  **Memory Exhaustion:** If the database has 1,000,000 candidates, the application will crash trying to load all of them into memory.
2.  **Performance Latency:** Transferring millions of rows over the network from the DB to the App is extremely slow.
3.  **Database Efficiency:** It ignores database indexes, making the database work harder for no reason.

### The Correct Approach
Filtering should always happen at the **Database Level** using SQL `WHERE` clauses:
```python
query = db.query(Candidate).filter(Candidate.status == status)
# Use database-level pagination too
results = query.offset(offset).limit(page_size).all()
```

---

## 📡 Example API Calls (curl)

All examples assume the backend is running on `http://localhost:8000` (default when using Docker or the local uvicorn setup above).

**1. Register a reviewer** (role is always forced to `reviewer` server-side, even if you pass `role` in the body):
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"reviewer@techkraft.com","password":"password123"}'
```

**2. Log in and grab a token** (note: this is a form-encoded OAuth2 endpoint, not JSON):
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=reviewer@techkraft.com&password=password123"
```
Save the `access_token` from the response — every call below needs it as a Bearer token.

**3. Create a candidate:**
```bash
TOKEN="<paste access_token here>"

curl -X POST http://localhost:8000/candidates/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role_applied": "Backend Engineer",
    "status": "new",
    "skills": ["python", "fastapi"]
  }'
```

**4. List candidates with filters + pagination:**
```bash
curl "http://localhost:8000/candidates/?status=new&page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN"
```

**5. Get a single candidate** (reviewers see only their own scores and never `internal_notes`; admins see everything):
```bash
curl http://localhost:8000/candidates/1 \
  -H "Authorization: Bearer $TOKEN"
```

**6. Submit a score for a candidate:**
```bash
curl -X POST http://localhost:8000/candidates/1/scores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"technical","score":4,"note":"Solid FastAPI experience"}'
```

**7. Trigger the mock AI summary** (simulates a ~2s async LLM call, result is persisted):
```bash
curl -X POST http://localhost:8000/candidates/1/summary \
  -H "Authorization: Bearer $TOKEN"
```

**8. Stream live score updates (stretch goal, SSE)** — run this before deleting the candidate below:
```bash
curl -N http://localhost:8000/candidates/1/stream \
  -H "Authorization: Bearer $TOKEN"
```

**9. Soft-delete a candidate** (sets `deleted_at` + `status=archived`, never removes the row):
```bash
curl -X DELETE http://localhost:8000/candidates/1 \
  -H "Authorization: Bearer $TOKEN"
```

Full interactive docs (Swagger UI) are also available at [http://localhost:8000/docs](http://localhost:8000/docs) once the backend is running.

---

## 🏗️ Architecture Decision Record (ADR)

### 1. Choice of FastAPI + SQLAlchemy (Async-ready)
- **Context:** Need a high-performance backend with automatic documentation.
- **Decision:** Used FastAPI for its native type hinting and SQLAlchemy 2.0 for its robust ORM capabilities.
- **Trade-off:** Requires a bit more boilerplate for schemas (Pydantic) compared to Flask, but provides better validation and speed.

### 2. Role-Based Access Control (RBAC) via JWT
- **Context:** Different visibility rules for Reviewers and Admins.
- **Decision:** Implemented RBAC by embedding the `role` and `user_id` in the JWT payload. Backend routers verify these claims for every sensitive request.
- **Trade-off:** If a user's role changes, the old token remains valid until it expires (30 mins).

### 3. Soft Deletion Policy
- **Context:** Requirement to never hard-delete candidate data.
- **Decision:** Added a `deleted_at` timestamp and a status change to `archived`.
- **Trade-off:** Database size grows over time, but data integrity and audit trails are preserved.

---

## 🧠 Learning Reflection

One thing I explored deeply for this project was **Server-Sent Events (SSE)** for real-time updates. Implementing a generator that polls the database and yields events to the frontend was a great way to handle "live" score updates without the complexity of WebSockets. 

Given more time, I would explore using **Alembic** for more formal database migrations and **Redis** for caching AI summaries to reduce the 2-second mock delay for frequently viewed candidates.

---

## ✅ Features Implemented
- **RBAC:** Reviewers see only their scores; Admins see all.
- **AI Summary:** Mock 2s delay with persistence in the database.
- **Real-time:** SSE stream for score updates.
- **Validation:** Pydantic models for strict API contracts.
- **Containerization:** Fully dockerized with shared volumes for persistence.
