from pydantic import BaseModel, Field
from typing import Literal

class User(BaseModel):
name: str = Field(..., min_length=2)
email: str = Field(..., min_length=5)
role: Literal["Admin", "Responder", "Citizen"] = "Citizen"
