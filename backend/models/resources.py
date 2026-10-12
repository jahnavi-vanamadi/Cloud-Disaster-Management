from pydantic import BaseModel, Field
from typing import Literal

class Resource(BaseModel):
name: str = Field(..., min_length=2)
resource_type: Literal[
"Food",
"Water",
"Medical",
"Shelter",
"Rescue"
]
location: str = Field(..., min_length=2)
quantity: int = Field(..., ge=0)
availability: Literal["Available", "Limited", "Unavailable"] = "Available"
