
// ResQCloud - Disaster Management
// Loads disaster reports directly from Firebase Firestore.

document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("disasterList");
    const searchInput = document.getElementById("searchDisaster");
    const typeFilter = document.getElementById("typeFilter");
    const severityFilter = document.getElementById("statusFilter");

    let allReports = [];

    if (!container) {
        console.error("Disaster list container was not found.");
        return;
    }

    const db = window.db;

    if (!db) {
        console.error("Firebase Firestore is not initialized.");
        container.textContent = "Cloud connection failed. Please refresh.";
        return;
    }

    // Format Firestore timestamps safely.
    function formatDate(value) {
        if (!value) return "Date unavailable";

        let date;

        if (typeof value.toDate === "function") {
            date = value.toDate();
        } else {
            date = new Date(value);
        }

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleString();
    }

    // Choose an icon based on disaster type.
    function getDisasterIcon(type) {
        const value = (type || "").toLowerCase();

        if (value.includes("flood")) return "🌊";
        if (value.includes("fire")) return "🔥";
        if (value.includes("storm") || value.includes("cyclone")) {
            return "🌪️";
        }
        if (value.includes("earthquake")) return "🏚️";
        if (value.includes("landslide")) return "⛰️";

        return "🚨";
    }

    // Safely display report data.
    function displayReports(reports) {
        container.replaceChildren();

        if (reports.length === 0) {
            container.textContent = "No disaster reports found.";
            return;
        }

        reports.forEach(function (report) {
            const card = document.createElement("div");
            card.className = "disaster-card";

            const top = document.createElement("div");
            top.className = "disaster-top";

            const type = document.createElement("span");
            type.className = "disaster-type";
            type.textContent =
                `${getDisasterIcon(report.disaster_type)} ${report.disaster_type || "Unknown disaster"}`;

            const severity = document.createElement("span");
            severity.className = "status active-status";
            severity.textContent = report.severity || "Unknown severity";

            top.append(type, severity);

            const description = document.createElement("h3");
            description.textContent =
                report.description || "No description provided.";

            const reporter = document.createElement("p");
            reporter.textContent =
                `Reported by: ${report.name || "Unknown"}`;

            const meta = document.createElement("div");
            meta.className = "disaster-meta";

            const location = document.createElement("span");
            location.textContent =
                `📍 ${report.location || "Location unavailable"}`;

            const date = document.createElement("span");
            date.textContent = `🕐 ${formatDate(report.created_at)}`;

            const status = document.createElement("p");
            status.textContent = `Status: ${report.status || "Active"}`;

            meta.append(location, date);
            card.append(top, description, reporter, meta, status);

            container.appendChild(card);
        });
    }

    // Apply search and filters.
    function filterReports() {
        const search = (searchInput?.value || "").toLowerCase().trim();
        const selectedType = (typeFilter?.value || "all").toLowerCase();
        const selectedSeverity =
            (severityFilter?.value || "all").toLowerCase();

        const filtered = allReports.filter(function (report) {
            const disasterType =
                (report.disaster_type || "").toLowerCase();

            const location = (report.location || "").toLowerCase();
            const description = (report.description || "").toLowerCase();
            const reporter = (report.name || "").toLowerCase();
            const severity = (report.severity || "").toLowerCase();

            const matchesSearch =
                disasterType.includes(search) ||
                location.includes(search) ||
                description.includes(search) ||
                reporter.includes(search);

            const matchesType =
                selectedType === "all" ||
                disasterType === selectedType;

            const matchesSeverity =
                selectedSeverity === "all" ||
                severity === selectedSeverity;

            return matchesSearch && matchesType && matchesSeverity;
        });

        displayReports(filtered);
    }

    searchInput?.addEventListener("input", filterReports);
    typeFilter?.addEventListener("change", filterReports);
    severityFilter?.addEventListener("change", filterReports);

    // Subscribe to Firestore so newly submitted reports appear automatically.
    db.collection("disaster_reports")
        .orderBy("created_at", "desc")
        .onSnapshot(
            function (snapshot) {
                allReports = snapshot.docs.map(function (doc) {
                    return {
                        id: doc.id,
                        ...doc.data()
                    };
                });

                console.log("Firestore disaster reports loaded:", allReports);
                filterReports();
            },
            function (error) {
                console.error("Could not load Firestore reports:", error);
                container.textContent =
                    "Unable to load disaster reports. Please check the console.";
            }
        );
});
