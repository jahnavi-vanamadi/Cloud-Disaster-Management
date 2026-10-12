from pydantic import BaseModel, Field
from typing import Literal

class DisasterReport(BaseModel):
name: str = Field(..., min_length=2)
disaster_type: str = Field(..., min_length=2)
location: str = Field(..., min_length=2)
description: str = Field(..., min_length=5)
severity: Literal["Low", "Medium", "High"]

class DisasterReportResponse(DisasterReport):
id: int
created_at: str
