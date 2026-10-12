const API_URL = "http://127.0.0.1:8000";

let allReports = [];


// Load reports from backend
async function loadDisasterReports() {

    try {

        const response = await fetch(`${API_URL}/reports/`);

        if (!response.ok) {
            throw new Error("Failed to fetch reports");
        }

        const data = await response.json();

        allReports = data.reports || [];

        console.log("Reports loaded:", allReports);

        displayReports(allReports);

    } catch (error) {

        console.error("Error:", error);

        document.getElementById("disasterList").innerHTML =
            "<p>Unable to load disaster reports.</p>";
    }
}


// Display reports
function displayReports(reports) {

    const container = document.getElementById("disasterList");

    container.innerHTML = "";

    if (reports.length === 0) {

        container.innerHTML =
            "<p>No disaster reports found.</p>";

        return;
    }


    reports.slice().reverse().forEach(report => {

        let icon = "🚨";

        const type = (report.disaster_type || "").toLowerCase();


        if (type.includes("flood")) {
            icon = "🌊";
        }
        else if (type.includes("fire")) {
            icon = "🔥";
        }
        else if (
            type.includes("storm") ||
            type.includes("cyclone")
        ) {
            icon = "🌪️";
        }
        else if (type.includes("earthquake")) {
            icon = "🏚️";
        }
        else if (type.includes("landslide")) {
            icon = "⛰️";
        }


        const card = document.createElement("div");

        card.className = "disaster-card";


        card.innerHTML = `

            <div class="disaster-top">

                <span class="disaster-type">
                    ${icon} ${report.disaster_type}
                </span>

                <span class="status active-status">
                    ${report.severity}
                </span>

            </div>


            <h3>${report.description}</h3>


            <p>
                Reported by: ${report.name}
            </p>


            <div class="disaster-meta">

                <span>
                    📍 ${report.location}
                </span>

                <span>
                    🕐 ${new Date(report.created_at).toLocaleString()}
                </span>

            </div>

        `;


        container.appendChild(card);

    });
}


// Search and filters
function filterReports() {

    const search =
        document
            .getElementById("searchDisaster")
            .value
            .toLowerCase();

    const type =
        document
            .getElementById("typeFilter")
            .value
            .toLowerCase();

    const severity =
        document
            .getElementById("statusFilter")
            .value
            .toLowerCase();


    const filtered = allReports.filter(report => {

        const disasterType =
            (report.disaster_type || "").toLowerCase();

        const location =
            (report.location || "").toLowerCase();

        const reportSeverity =
            (report.severity || "").toLowerCase();


        const matchesSearch =
            disasterType.includes(search) ||
            location.includes(search);


        const matchesType =
            type === "all" ||
            disasterType.includes(type);


        const matchesSeverity =
            severity === "all" ||
            reportSeverity === severity;


        return (
            matchesSearch &&
            matchesType &&
            matchesSeverity
        );

    });


    displayReports(filtered);
}


// Connect filters
document
    .getElementById("searchDisaster")
    .addEventListener("input", filterReports);

document
    .getElementById("typeFilter")
    .addEventListener("change", filterReports);

document
    .getElementById("statusFilter")
    .addEventListener("change", filterReports);


// Start
loadDisasterReports();