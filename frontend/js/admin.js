const API_URL = "http://127.0.0.1:8000";


// Load statistics
async function loadAdminStats() {

    try {

        const response = await fetch(`${API_URL}/stats`);

        if (!response.ok) {
            throw new Error("Failed to load statistics");
        }

        const stats = await response.json();

        document.getElementById("adminTotalReports").textContent =
            stats.total_reports;

        document.getElementById("highSeverity").textContent =
            stats.high_severity;

        document.getElementById("mediumSeverity").textContent =
            stats.medium_severity;

        document.getElementById("lowSeverity").textContent =
            stats.low_severity;

    } catch (error) {

        console.error("Stats error:", error);

    }
}


// Load reports
async function loadAdminReports() {

    try {

        const response = await fetch(`${API_URL}/reports/`);

        if (!response.ok) {
            throw new Error("Failed to load reports");
        }

        const data = await response.json();

        const reports = data.reports || [];

        const table =
            document.getElementById("adminReportsTable");

        table.innerHTML = "";


        if (reports.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="6">
                        No disaster reports available.
                    </td>
                </tr>
            `;

            return;
        }


        reports.slice().reverse().forEach(report => {

            const row = document.createElement("tr");

            row.innerHTML = `

                <td>${report.id}</td>

                <td>
                    ${report.disaster_type}
                </td>

                <td>
                    📍 ${report.location}
                </td>

                <td>
                    ${report.name}
                </td>

                <td>
                    <span class="status active-status">
                        ${report.severity}
                    </span>
                </td>

                <td>

                    <button
                        class="table-btn"
                        onclick="viewReport(${report.id})">
                        View
                    </button>

                    <button
                        class="table-btn"
                        onclick="deleteReport(${report.id})">
                        Delete
                    </button>

                </td>
            `;

            table.appendChild(row);

        });

    } catch (error) {

        console.error("Reports error:", error);

        document.getElementById("adminReportsTable").innerHTML = `
            <tr>
                <td colspan="6">
                    Unable to load reports.
                </td>
            </tr>
        `;
    }
}


// View report details
async function viewReport(id) {

    try {

        const response =
            await fetch(`${API_URL}/reports/${id}`);

        if (!response.ok) {
            throw new Error("Report not found");
        }

        const report = await response.json();

        alert(
            `DISASTER REPORT\n\n` +
            `ID: ${report.id}\n` +
            `Name: ${report.name}\n` +
            `Type: ${report.disaster_type}\n` +
            `Location: ${report.location}\n` +
            `Severity: ${report.severity}\n\n` +
            `Description:\n${report.description}`
        );

    } catch (error) {

        console.error(error);

        alert("Unable to load report details.");

    }
}


// Delete report
async function deleteReport(id) {

    const confirmDelete =
        confirm(
            `Are you sure you want to delete report #${id}?`
        );

    if (!confirmDelete) {
        return;
    }


    try {

        const response =
            await fetch(`${API_URL}/reports/${id}`, {
                method: "DELETE"
            });


        if (!response.ok) {
            throw new Error("Failed to delete report");
        }


        alert("✅ Report deleted successfully!");


        // Reload admin page data
        loadAdminStats();
        loadAdminReports();


    } catch (error) {

        console.error(error);

        alert("❌ Could not delete the report.");

    }
}


// Start
loadAdminStats();
loadAdminReports();