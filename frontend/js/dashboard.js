
import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
});

async function loadDashboard() {
    const totalReportsElement = document.getElementById("totalReports");
    const recentReportsElement = document.getElementById("recentReports");

    try {
        // Get disaster reports from Firestore
        const reportsQuery = query(
            collection(db, "disaster_reports"),
            orderBy("created_at", "desc")
        );

        const snapshot = await getDocs(reportsQuery);

        const reports = snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data()
        }));

        // Update total report count
        if (totalReportsElement) {
            totalReportsElement.textContent = reports.length;
        }

        // Display the five most recent reports
        displayRecentReports(reports.slice(0, 5));

        console.log("Dashboard reports loaded:", reports);

    } catch (error) {
        console.error("Error loading dashboard:", error);

        if (totalReportsElement) {
            totalReportsElement.textContent = "—";
        }

        if (recentReportsElement) {
            recentReportsElement.textContent =
                "Unable to load disaster reports. Please try again.";
        }
    }
}

function displayRecentReports(reports) {
    const container = document.getElementById("recentReports");

    if (!container) {
        console.error("Recent reports container not found.");
        return;
    }

    container.replaceChildren();

    if (reports.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No disaster reports available.";
        container.appendChild(emptyMessage);
        return;
    }

    reports.forEach((report) => {
        const type = (report.disaster_type || "").toLowerCase();

        let icon = "🚨";

        if (type.includes("flood")) {
            icon = "🌊";
        } else if (type.includes("fire")) {
            icon = "🔥";
        } else if (type.includes("storm") || type.includes("cyclone")) {
            icon = "🌪️";
        } else if (type.includes("earthquake")) {
            icon = "🌍";
        } else if (type.includes("landslide")) {
            icon = "⛰️";
        }

        const row = document.createElement("div");
        row.className = "report-row";

        const iconElement = document.createElement("div");
        iconElement.className = "report-icon";
        iconElement.textContent = icon;

        const infoElement = document.createElement("div");
        infoElement.className = "report-info";

        const titleElement = document.createElement("strong");
        titleElement.textContent = report.disaster_type || "Unknown Disaster";

        const locationElement = document.createElement("span");
        locationElement.textContent = report.location || "Unknown Location";

        infoElement.append(titleElement, locationElement);

        const statusElement = document.createElement("span");
        statusElement.className = "status active-status";
        statusElement.textContent = report.severity || "Unknown Severity";

        row.append(iconElement, infoElement, statusElement);
        container.appendChild(row);
    });
}

