from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
import os

router = APIRouter()

# Database location
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(BASE_DIR, "resources.db")


# -----------------------------
# Database setup
# -----------------------------

def get_connection():
    connection = sqlite3.connect(DB_FILE)
    connection.row_factory = sqlite3.Row
    return connection


def init_database():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            location TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            availability TEXT NOT NULL
        )
    """)

    # Add default resources only if database is empty
    cursor.execute("SELECT COUNT(*) FROM resources")
    count = cursor.fetchone()[0]

    if count == 0:

        default_resources = [
            (
                "Drinking Water",
                "Water",
                "Vijayawada",
                500,
                "Available"
            ),
            (
                "Food Packets",
                "Food",
                "Guntur",
                300,
                "Available"
            ),
            (
                "First Aid Kits",
                "Medical",
                "Visakhapatnam",
                80,
                "Limited"
            ),
            (
                "Emergency Shelter",
                "Shelter",
                "Vijayawada",
                50,
                "Available"
            )
        ]

        cursor.executemany("""
            INSERT INTO resources
            (name, resource_type, location, quantity, availability)
            VALUES (?, ?, ?, ?, ?)
        """, default_resources)

    connection.commit()
    connection.close()


init_database()


# -----------------------------
# Data model
# -----------------------------

class Resource(BaseModel):

    name: str
    resource_type: str
    location: str
    quantity: int
    availability: str


# -----------------------------
# GET all resources
# -----------------------------

@router.get("/")
def get_resources():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM resources
        ORDER BY id
    """)

    resources = [dict(row) for row in cursor.fetchall()]

    connection.close()

    return {
        "total": len(resources),
        "resources": resources
    }


# -----------------------------
# ADD resource
# -----------------------------

@router.post("/")
def add_resource(resource: Resource):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO resources
        (name, resource_type, location, quantity, availability)
        VALUES (?, ?, ?, ?, ?)
    """, (
        resource.name,
        resource.resource_type,
        resource.location,
        resource.quantity,
        resource.availability
    ))

    connection.commit()

    new_id = cursor.lastrowid

    cursor.execute(
        "SELECT * FROM resources WHERE id = ?",
        (new_id,)
    )

    new_resource = dict(cursor.fetchone())

    connection.close()

    return {
        "message": "Resource added successfully",
        "resource": new_resource
    }


# -----------------------------
# UPDATE resource
# -----------------------------

@router.put("/{resource_id}")
def update_resource(resource_id: int, resource: Resource):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        "SELECT * FROM resources WHERE id = ?",
        (resource_id,)
    )

    existing = cursor.fetchone()

    if existing is None:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Resource not found"
        )

    cursor.execute("""
        UPDATE resources
        SET
            name = ?,
            resource_type = ?,
            location = ?,
            quantity = ?,
            availability = ?
        WHERE id = ?
    """, (
        resource.name,
        resource.resource_type,
        resource.location,
        resource.quantity,
        resource.availability,
        resource_id
    ))

    connection.commit()

    cursor.execute(
        "SELECT * FROM resources WHERE id = ?",
        (resource_id,)
    )

    updated_resource = dict(cursor.fetchone())

    connection.close()

    return {
        "message": "Resource updated successfully",
        "resource": updated_resource
    }


# -----------------------------
# DELETE resource
# -----------------------------

@router.delete("/{resource_id}")
def delete_resource(resource_id: int):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute(
        "SELECT * FROM resources WHERE id = ?",
        (resource_id,)
    )

    existing = cursor.fetchone()

    if existing is None:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Resource not found"
        )

    cursor.execute(
        "DELETE FROM resources WHERE id = ?",
        (resource_id,)
    )

    connection.commit()

    connection.close()

    return {
        "message": "Resource deleted successfully"
    }
