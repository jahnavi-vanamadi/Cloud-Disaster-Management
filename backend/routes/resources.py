from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_resources():
"""Return sample disaster relief resources."""
return {
"total": 4,
"resources": [
{
"id": 1,
"name": "Drinking Water",
"resource_type": "Water",
"location": "Vijayawada",
"quantity": 500,
"availability": "Available"
},
{
"id": 2,
"name": "Food Packets",
"resource_type": "Food",
"location": "Guntur",
"quantity": 300,
"availability": "Available"
},
{
"id": 3,
"name": "First Aid Kits",
"resource_type": "Medical",
"location": "Visakhapatnam",
"quantity": 80,
"availability": "Limited"
},
{
"id": 4,
"name": "Emergency Shelter",
"resource_type": "Shelter",
"location": "Vijayawada",
"quantity": 50,
"availability": "Available"
}
]
}
