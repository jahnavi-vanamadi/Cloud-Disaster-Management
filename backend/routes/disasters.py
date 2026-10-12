from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_disasters():
"""Return sample disaster information."""
return {
"total": 3,
"disasters": [
{
"id": 1,
"name": "Vijayawada Flood",
"disaster_type": "Flood",
"location": "Vijayawada",
"severity": "High",
"status": "Active"
},
{
"id": 2,
"name": "Guntur Fire",
"disaster_type": "Fire",
"location": "Guntur",
"severity": "Medium",
"status": "Active"
},
{
"id": 3,
"name": "Visakhapatnam Storm",
"disaster_type": "Storm",
"location": "Visakhapatnam",
"severity": "Low",
"status": "Resolved"
}
]
}
