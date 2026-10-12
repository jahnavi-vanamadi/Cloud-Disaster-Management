from pydantic import BaseModel, Field
from typing import Literal

class Disaster(BaseModel):
name: str = Field(..., min_length=2)
disaster_type: str = Field(..., min_length=2)
location: str = Field(..., min_length=2)
severity: Literal["Low", "Medium", "High"]
status: Literal["Active", "Resolved"] = "Active"
description: str = Field(..., min_length=5)
