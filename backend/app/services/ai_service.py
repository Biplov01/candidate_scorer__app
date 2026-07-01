import asyncio
import random
from datetime import datetime

async def generate_ai_summary(candidate, scores):
    """
    Simulate an async LLM call with 2s delay
    """
    await asyncio.sleep(2)  # Simulate 2s LLM call
    
    # Generate a realistic-looking summary based on candidate data
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
