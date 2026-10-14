// ResQCloud Admin Dashboard
// Reads disaster reports from Firebase Firestore.

document.addEventListener("DOMContentLoaded", function () {
const totalReportsElement = document.getElementById("adminTotalReports");
const highSeverityElement = document.getElementById("highSeverity");
const mediumSeverityElement = document.getElementById("mediumSeverity");
const lowSeverityElement = document.getElementById("lowSeverity");
const reportsTable = document.getElementById("adminReportsTable");

const db = window.db;

if (!db) {
    console.error("Firebase Firestore is not initialized.");

    if (reportsTable) {
        reportsTable.innerHTML =
            '<tr><td colspan="6">Cloud connection failed. Please refresh the page.</td></tr>';
    }

    return;
}

let reportsById = {};

function displayMessage(message) {
    if (reportsTable) {
        reportsTable.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = message;

        row.appendChild(cell);
        reportsTable.appendChild(row);
    }
}

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
        const dateA = a.created_at && typeof a.created_at.toMillis === "function"
            ? a.created_at.toMillis()
            : 0;

        const dateB = b.created_at && typeof b.created_at.toMillis === "function"
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

        const severityCell = addCell(row, report.severity || "Not specified");
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

// Display the full details of a report.
function viewReport(id) {
    const report = reportsById[id];

    if (!report) {
        alert("Report details are not available. Please refresh the page.");
        return;
    }

    alert(
        "DISASTER REPORT\n\n" +
        "ID: " + id + "\n" +
        "Name: " + (report.name || "Unknown") + "\n" +
        "Type: " + (report.disaster_type || "Not specified") + "\n" +
        "Location: " + (report.location || "Not specified") + "\n" +
        "Severity: " + (report.severity || "Not specified") + "\n" +
        "Status: " + (report.status || "Not specified") + "\n\n" +
        "Description:\n" + (report.description || "No description provided.")
    );
}

// Delete a report from Firestore after confirmation.
async function deleteReport(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this disaster report?"
    );

    if (!confirmed) return;

    try {
        await db.collection("disaster_reports").doc(id).delete();
        alert("Disaster report deleted successfully.");
    } catch (error) {
        console.error("Could not delete report:", error);

        alert(
            "Could not delete the report. Check that you are signed in " +
            "as an authorized administrator and that Firestore security rules allow this action."
        );
    }
}

// Keep these functions available to the dashboard buttons.
window.viewReport = viewReport;
window.deleteReport = deleteReport;

// Listen for changes so the dashboard updates when reports are added or removed.
db.collection("disaster_reports")
    .onSnapshot(
        renderReports,
        function (error) {
            console.error("Error loading Firestore reports:", error);

            displayMessage(
                "Unable to load reports. Check your login and Firestore permissions."
            );
        }
    );


});
