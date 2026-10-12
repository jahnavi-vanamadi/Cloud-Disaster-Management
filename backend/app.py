from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_table, get_connection
from routes.reports import router as reports_router


# ==========================================
# ResQCloud FastAPI Application
# ==========================================

app = FastAPI(
    title="Cloud Disaster Management API",
    description="Backend API for the Cloud Disaster Management System",
    version="1.0.0"
)


# ==========================================
# Initialize Database
# ==========================================

create_table()


# ==========================================
# CORS Configuration
# ==========================================

# Allows the frontend to communicate with
# the FastAPI backend.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Register API Routes
# ==========================================

app.include_router(
    reports_router,
    prefix="/reports",
    tags=["Disaster Reports"]
)


# ==========================================
# Home Endpoint
# ==========================================

@app.get("/")
def home():

    return {
        "message": "Cloud Disaster Management API is running"
    }


# ==========================================
# Health Check
# ==========================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "service": "Cloud Disaster Management Backend"
    }


# ==========================================
# Dashboard Statistics
# ==========================================

@app.get("/stats")
def get_stats():

    connection = get_connection()

    # Get total reports
    total = connection.execute(
        "SELECT COUNT(*) FROM reports"
    ).fetchone()[0]


    # Get high severity reports
    high = connection.execute(
        """
        SELECT COUNT(*)
        FROM reports
        WHERE LOWER(severity) = 'high'
        """
    ).fetchone()[0]


    # Get medium severity reports
    medium = connection.execute(
        """
        SELECT COUNT(*)
        FROM reports
        WHERE LOWER(severity) = 'medium'
        """
    ).fetchone()[0]


    # Get low severity reports
    low = connection.execute(
        """
        SELECT COUNT(*)
        FROM reports
        WHERE LOWER(severity) = 'low'
        """
    ).fetchone()[0]


    connection.close()


    return {
        "total_reports": total,
        "high_severity": high,
        "medium_severity": medium,
        "low_severity": low
    }