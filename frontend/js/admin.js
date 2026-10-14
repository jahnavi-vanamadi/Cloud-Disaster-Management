
// ResQCloud Admin Dashboard
// Allows only authenticated Admin users to access admin functions.

document.addEventListener("DOMContentLoaded", async function () {
    const totalReportsElement = document.getElementById("adminTotalReports");
    const highSeverityElement = document.getElementById("highSeverity");
    const mediumSeverityElement = document.getElementById("mediumSeverity");
    const lowSeverityElement = document.getElementById("lowSeverity");
    const reportsTable = document.getElementById("adminReportsTable");

    function displayMessage(message) {
        if (!reportsTable) return;

        reportsTable.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = message;

        row.appendChild(cell);
        reportsTable.appendChild(row);
    }

    // Hide the dashboard until authorization is confirmed.
    const adminContent = document.getElementById("adminContent");

    if (adminContent) {
        adminContent.style.display = "none";
    }

    // Confirm Firebase and authentication are available.
    if (
        !window.auth ||
        !window.db ||
        typeof window.protectPage !== "function"
    ) {
        console.error("Firebase authentication or page protection is unavailable.");
        displayMessage("Authentication could not be initialized. Please refresh the page.");
        return;
    }

    let access;

    try {
        access = await window.protectPage({
            requiredRole: "Admin",
            redirectUrl: "login.html"
        });
    } catch (error) {
        console.error("Admin authorization failed:", error);
        displayMessage("Unable to verify administrator access. Please try again.");
        return;
    }

    // Do not read or modify reports unless the user is an Admin.
    if (!access || !access.allowed || !access.user || access.role !== "Admin") {
        displayMessage("Access denied. Administrator permission is required.");

        if (access && access.user) {
            window.location.replace("dashboard.html");
        }

        return;
    }

    // Reveal the dashboard after authorization succeeds.
    if (adminContent) {
        adminContent.style.display = "";
    }

    const db = window.db;
    let reportsById = {};

    function addCell(row, value) {
        const cell = document.createElement("td");
        cell.textContent = value == null ? "" : String(value);
        row.appendChild(cell);
        return cell;
    }

    function renderReports(snapshot) {
        const reports = [];
        reportsById = {};

        snapshot.forEach(function (documentSnapshot) {
            const report = documentSnapshot.data();

            reports.push({
                id: documentSnapshot.id,
                ...report
            });

            reportsById[documentSnapshot.id] = report;
        });

        if (totalReportsElement) {
            totalReportsElement.textContent = reports.length;
        }

        let high = 0;
        let medium = 0;
        let low = 0;

        reports.forEach(function (report) {
            const severity = String(report.severity || "").toLowerCase();

            if (severity === "high") high++;
            else if (severity === "medium") medium++;
            else if (severity === "low") low++;
        });

        if (highSeverityElement) highSeverityElement.textContent = high;
        if (mediumSeverityElement) mediumSeverityElement.textContent = medium;
        if (lowSeverityElement) lowSeverityElement.textContent = low;

        if (!reportsTable) return;

        reportsTable.replaceChildren();

        if (reports.length === 0) {
            displayMessage("No disaster reports available.");
            return;
        }

        reports.sort(function (a, b) {
            const dateA =
                a.created_at && typeof a.created_at.toMillis === "function"
                    ? a.created_at.toMillis()
                    : 0;

            const dateB =
                b.created_at && typeof b.created_at.toMillis === "function"
                    ? b.created_at.toMillis()
                    : 0;

            return dateB - dateA;
        });

        reports.forEach(function (report) {
            const row = document.createElement("tr");

            addCell(row, report.id);
            addCell(row, report.disaster_type || "Not specified");
            addCell(row, "📍 " + (report.location || "Not specified"));
            addCell(row, report.name || "Unknown");

            const severityCell = addCell(
                row,
                report.severity || "Not specified"
            );

            const severityBadge = document.createElement("span");
            severityBadge.className = "status active-status";
            severityBadge.textContent = report.severity || "Not specified";
            severityCell.replaceChildren(severityBadge);

            const actionCell = document.createElement("td");

            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.className = "table-btn";
            viewButton.textContent = "View";
            viewButton.addEventListener("click", function () {
                viewReport(report.id);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "table-btn";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", function () {
                deleteReport(report.id);
            });

            actionCell.appendChild(viewButton);
            actionCell.appendChild(document.createTextNode(" "));
            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);

            reportsTable.appendChild(row);
        });
    }

    function viewReport(id
