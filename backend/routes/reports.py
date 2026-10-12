from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime

from database import get_connection


router = APIRouter()


class DisasterReport(BaseModel):
    name: str = Field(..., min_length=2)
    disaster_type: str = Field(..., min_length=2)
    location: str = Field(..., min_length=2)
    description: str = Field(..., min_length=5)
    severity: Literal["Low", "Medium", "High"]


@router.post("/")
def create_report(report: DisasterReport):

    connection = get_connection()

    created_at = datetime.now().isoformat()

    cursor = connection.execute(
        """
        INSERT INTO reports
        (name, disaster_type, location, description, severity, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            report.name,
            report.disaster_type,
            report.location,
            report.description,
            report.severity,
            created_at
        )
    )

    connection.commit()

    report_id = cursor.lastrowid

    connection.close()

    return {
        "message": "Disaster report submitted successfully",
        "report": {
            "id": report_id,
            "name": report.name,
            "disaster_type": report.disaster_type,
            "location": report.location,
            "description": report.description,
            "severity": report.severity,
            "created_at": created_at
        }
    }


@router.get("/")
def get_reports():

    connection = get_connection()

    rows = connection.execute(
        "SELECT * FROM reports ORDER BY id DESC"
    ).fetchall()

    connection.close()

    reports = [dict(row) for row in rows]

    return {
        "total": len(reports),
        "reports": reports
    }


@router.get("/{report_id}")
def get_report(report_id: int):

    connection = get_connection()

    row = connection.execute(
        "SELECT * FROM reports WHERE id = ?",
        (report_id,)
    ).fetchone()

    connection.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Disaster report not found"
        )

    return dict(row)


@router.delete("/{report_id}")
def delete_report(report_id: int):

    connection = get_connection()

    row = connection.execute(
        "SELECT * FROM reports WHERE id = ?",
        (report_id,)
    ).fetchone()

    if row is None:
        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Disaster report not found"
        )

    connection.execute(
        "DELETE FROM reports WHERE id = ?",
        (report_id,)
    )

    connection.commit()
    connection.close()

    return {
        "message": "Disaster report deleted successfully",
        "report": dict(row)
    }