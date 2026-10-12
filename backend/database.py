import sqlite3
from pathlib import Path


# ==========================================
# ResQCloud Database Configuration
# ==========================================

# Store the SQLite database inside the backend folder
BASE_DIR = Path(__file__).resolve().parent

DATABASE_PATH = BASE_DIR / "disaster.db"


# ==========================================
# Get Database Connection
# ==========================================

def get_connection():
    """
    Create and return a connection to the SQLite database.
    """

    connection = sqlite3.connect(DATABASE_PATH)

    # Allows rows to behave like dictionaries
    connection.row_factory = sqlite3.Row

    return connection


# ==========================================
# Create Required Tables
# ==========================================

def create_table():
    """
    Create the reports table if it does not already exist.
    """

    connection = get_connection()

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            disaster_type TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT NOT NULL,
            severity TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    connection.commit()

    connection.close()


# ==========================================
# Initialize Database
# ==========================================

if __name__ == "__main__":
    create_table()

    print("✅ Database initialized successfully.")
    print(f"📁 Database location: {DATABASE_PATH}")