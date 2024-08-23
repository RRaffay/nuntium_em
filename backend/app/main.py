# File: backend/app/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class Event(BaseModel):
    id: int
    country: str
    title: str
    description: str
    date: datetime

class Report(BaseModel):
    country: str
    content: str
    generated_at: datetime

# Dummy data
events = [
    Event(id=1, country="USA", title="Economic Policy Change", description="New fiscal policy announced", date=datetime.now()),
    Event(id=2, country="China", title="Trade Agreement", description="New trade deal with EU", date=datetime.now()),
    Event(id=3, country="Japan", title="Bank of Japan Decision", description="Interest rates remain unchanged", date=datetime.now()),
]

# Routes
@app.get("/")
async def read_root():
    return {"message": "Welcome to the EM Investor API"}

@app.get("/countries")
async def get_countries():
    return list(set(event.country for event in events))

@app.get("/countries/{country}/events", response_model=List[Event])
async def get_country_events(country: str):
    country_events = [event for event in events if event.country.lower() == country.lower()]
    if not country_events:
        raise HTTPException(status_code=404, detail="Country not found")
    return country_events

@app.post("/countries/{country}/generate-report", response_model=Report)
async def generate_report(country: str):
    country_events = [event for event in events if event.country.lower() == country.lower()]
    if not country_events:
        raise HTTPException(status_code=404, detail="Country not found")
    
    # This is where you'd use your NLP package to generate a report
    report_content = f"Economic Report for {country}:\n\n"
    for event in country_events:
        report_content += f"- {event.title}: {event.description}\n"
    
    return Report(country=country, content=report_content, generated_at=datetime.now())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)