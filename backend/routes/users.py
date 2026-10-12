from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_users():
"""Return sample users for demonstration."""
return {
"total": 2,
"users": [
{
"id": 1,
"name": "Admin User",
"email": "[admin@example.com](mailto:admin@example.com)",
"role": "Admin"
},
{
"id": 2,
"name": "Emergency Responder",
"email": "[responder@example.com](mailto:responder@example.com)",
"role": "Responder"
}
]
}
