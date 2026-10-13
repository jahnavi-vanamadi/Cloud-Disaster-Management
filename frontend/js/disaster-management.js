
// =====================================================
// ResQCloud - Module 2: Disaster Management
// Firebase Compat SDK
//
// Features:
// 1. Live disaster reports from Firestore
// 2. Official USGS earthquake feed
// 3. Search and filters
// 4. Disaster details popup
// 5. Status management interface
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    // ---------------- SETTINGS ----------------

    const USGS_URL =
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";

    const STATUSES = ["Active", "Monitoring", "Resolved"];

    let communityReports = [];
    let usgsReports = [];

    const db = window.db;

    const container = document.getElementById("disasterList");
    const resultCount = document.getElementById("resultCount");
    const modal = document.getElementById("detailsModal");
    const modalBody = document.getElementById("modalBody");

    if (!container) {
        console.error("Disaster list element was not found.");
        return;
    }

    if (!db || typeof firebase === "undefined") {
        container.textContent =
            "Firebase connection failed. Please refresh the page.";

        console.error("Firebase Compat SDK is not initialized.");
        return;
    }

    // ---------------- HELPERS ----------------

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function iconFor(type) {
        const value = (type || "").toLowerCase();

        if (value.includes("flood")) return "🌊";
        if (value.includes("fire")) return "🔥";

        if (
            value.includes("storm") ||
            value.includes("cyclone")
        ) {
            return "🌪️";
        }

        if (value.includes("earthquake")) return "🏚️";
        if (value.includes("landslide")) return "⛰️";

        return "🚨";
    }

    function formatTime(value) {
        if (!value) return "Date unavailable";

        let date;

        if (typeof value.toDate === "function") {
            date = value.toDate();
        } else if (typeof value === "number") {
            date = new Date(value);
        } else {
            date = new Date(value);
        }

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleString();
    }

    function severityClass(severity) {
        return "sev-" + (severity || "low").toLowerCase();
    }

    function statusClass(status) {
        return "st-" + (status || "active").toLowerCase();
    }

    function getAllReports() {
        return [...communityReports, ...usgsReports];
    }

    function getReportById(id) {
        return getAllReports().find(function (report) {
            return report.id === id;
        });
    }

    // ---------------- FIRESTORE ----------------

    function listenToFirestore() {
        db.collection("disaster_reports")
            .orderBy("created_at", "desc")
            .onSnapshot(
                function (snapshot) {

                    communityReports = snapshot.docs.map(function (document) {
                        const data = document.data();

                        return {
                            id: document.id,
                            source: "community",
                            name: data.name || "Unknown reporter",
                            disaster_type: data.disaster_type || "Unknown disaster",
                            location: data.location || "Location unavailable",
                            description: data.description || "No description provided",
                            severity: data.severity || "Low",
                            status: data.status || "Active",
                            created_at: data.created_at || null,
                            verified: data.verified === true
                        };
                    });

                    refreshLocationOptions();
                    renderReports();

                    console.log(
                        "Community reports loaded from Firestore:",
                        communityReports.length
                    );
                },
                function (error) {
                    console.error(
                        "Could not load Firestore reports:",
                        error
                    );

                    container.textContent =
                        "Unable to load community reports: " +
                        error.message;
                }
            );
    }

    // ---------------- USGS EARTHQUAKES ----------------

    async function loadUSGS() {
        try {
            const response = await fetch(USGS_URL);

            if (!response.ok) {
                throw new Error("USGS request failed.");
            }

            const data = await response.json();

            usgsReports = (data.features || []).map(function (feature) {
                const properties = feature.properties || {};
                const magnitude = properties.mag ?? 0;

                return {
                    id: "usgs-" + feature.id,
                    source: "usgs",
                    verified: true,
                    name: "USGS Earthquake Hazards Program",
                    disaster_type: "Earthquake",
                    location: properties.place || "Unknown location",
                    description: properties.title || "Earthquake",
                    severity:
                        magnitude >= 6
                            ? "High"
                            : magnitude >= 5
                                ? "Medium"
                                : "Low",
                    status: "Active",
                    magnitude: magnitude,
                    created_at: properties.time,
                    url: properties.url
                };
            });

            refreshLocationOptions();
            renderReports();

            console.log("USGS earthquake reports loaded:", usgsReports.length);

        } catch (error) {
            console.warn("USGS feed unavailable:", error);
            // Community reports remain available even if USGS is offline.
        }
    }

    // ---------------- LOCATION FILTER ----------------

    function refreshLocationOptions() {
        const select = document.getElementById("locationFilter");

        if (!select) return;

        const previousValue = select.value;

        const locations = [
            ...new Set(
                getAllReports()
                    .map(function (report) {
                        return (report.location || "").trim();
                    })
                    .filter(Boolean)
            )
        ].sort(function (a, b) {
            return a.localeCompare(b);
        });

        select.innerHTML =
            '<option value="all">All Locations</option>' +
            locations.map(function (location) {
                return (
                    '<option value="' +
                    escapeHTML(location.toLowerCase()) +
                    '">' +
                    escapeHTML(location) +
                    "</option>"
                );
            }).join("");

        const stillExists = locations.some(function (location) {
            return location.toLowerCase() === previousValue;
        });

        select.value = stillExists ? previousValue : "all";
    }

    // ---------------- FILTERS ----------------

    function getFilteredReports() {
        const searchInput = document.getElementById("searchDisaster");
        const typeFilter = document.getElementById("typeFilter");
        const locationFilter = document.getElementById("locationFilter");
        const severityFilter = document.getElementById("severityFilter");
        const statusFilter = document.getElementById("statusFilter");
        const sourceFilter = document.getElementById("sourceFilter");

        const search =
            (searchInput?.value || "").toLowerCase().trim();

        const type = typeFilter?.value || "all";
        const location = locationFilter?.value || "all";
        const severity = severityFilter?.value || "all";
        const status = statusFilter?.value || "all";
        const source = sourceFilter?.value || "all";

        return getAllReports().filter(function (report) {
            const reportType =
                (report.disaster_type || "").toLowerCase();

            const reportLocation =
                (report.location || "").toLowerCase();

            const reportSeverity =
                (report.severity || "").toLowerCase();

            const reportStatus =
                (report.status || "").toLowerCase();

            const searchableText = [
                reportType,
                reportLocation,
                report.description || "",
                report.name || ""
            ].join(" ").toLowerCase();

            return (
                (!search || searchableText.includes(search)) &&
                (type === "all" || reportType === type) &&
                (location === "all" || reportLocation === location) &&
                (severity === "all" || reportSeverity === severity) &&
                (status === "all" || reportStatus === status) &&
                (source === "all" || report.source === source)
            );
        });
    }

    // ---------------- DISPLAY REPORTS ----------------

    function toMillis(value) {
        if (!value) return 0;

        const date =
            typeof value.toDate === "function"
                ? value.toDate()
                : new Date(value);

        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }

    function renderReports() {
        const reports = getFilteredReports().sort(function (a, b) {
            return toMillis(b.created_at) - toMillis(a.created_at);
        });

        if (resultCount) {
            resultCount.textContent =
                `Showing ${reports.length} of ${getAllReports().length} incidents`;
        }

        container.replaceChildren();

        if (reports.length === 0) {
            container.textContent = "No disaster reports found.";
            return;
        }

        reports.forEach(function (report) {
            const card = document.createElement("div");

            card.className = "disaster-card clickable";
            card.dataset.id = report.id;
            card.tabIndex = 0;
            card.setAttribute("role", "button");
            card.setAttribute(
                "aria-label",
                "View details for " + report.disaster_type
            );

            card.innerHTML = `
                <div class="disaster-top">
                    <span class="disaster-type">
                        ${iconFor(report.disaster_type)}
                        ${escapeHTML(report.disaster_type)}
                    </span>

                    <span class="badge ${severityClass(report.severity)}">
                        ${escapeHTML(report.severity)}
                    </span>
                </div>

                <h3>${escapeHTML(report.description)}</h3>

                <div class="badge-row">
                    <span class="badge ${statusClass(report.status)}">
                        ${escapeHTML(report.status)}
                    </span>

                    <span class="badge ${
                        report.verified
                            ? "src-official"
                            : "src-unverified"
                    }">
                        ${
                            report.verified
                                ? "✔ Official"
                                : "Unverified report"
                        }
                    </span>
                </div>

                <div class="disaster-meta">
                    <span>📍 ${escapeHTML(report.location)}</span>
                    <span>🕐 ${escapeHTML(formatTime(report.created_at))}</span>
                </div>
            `;

            container.appendChild(card);
        });
    }

    // ---------------- DETAILS POPUP ----------------

    function openDetails(id) {
        const report = getReportById(id);

        if (!report || !modal || !modalBody) return;

        const canEdit = report.source === "community";

        let statusControl = "";

        if (canEdit) {
            statusControl = `
                <label for="statusSelect">
                    <strong>Update status</strong>
                </label>

                <div class="status-edit">
                    <select id="statusSelect">
                        ${STATUSES.map(function (status) {
                            return `
                                <option value="${status}"
                                    ${status === report.status ? "selected" : ""}>
                                    ${status}
                                </option>
                            `;
                        }).join("")}
                    </select>

                    <button
                        type="button"
                        class="primary-btn"
                        id="saveStatusBtn"
                        data-id="${escapeHTML(report.id)}"
                    >
                        Save
                    </button>
                </div>

                <p id="statusMsg" class="status-msg"></p>
            `;
        } else {
            statusControl = `
                <p class="status-msg">
                    Official USGS feed data is read-only.
                </p>
            `;
        }

        modalBody.innerHTML = `
            <h2>
                ${iconFor(report.disaster_type)}
                ${escapeHTML(report.disaster_type)}
            </h2>

            <div class="badge-row">
                <span class="badge ${severityClass(report.severity)}">
                    ${escapeHTML(report.severity)} severity
                </span>

                <span class="badge ${statusClass(report.status)}">
                    ${escapeHTML(report.status)}
                </span>

                <span class="badge ${
                    report.verified ? "src-official" : "src-unverified"
                }">
                    ${
                        report.verified
                            ? "✔ Official source"
                            : "Unverified community report"
                    }
                </span>
            </div>

            <p class="detail-desc">
                ${escapeHTML(report.description)}
            </p>

            <table class="detail-table">
                <tr>
                    <td>📍 Location</td>
                    <td>${escapeHTML(report.location)}</td>
                </tr>

                <tr>
                    <td>🕐 Reported</td>
                    <td>${escapeHTML(formatTime(report.created_at))}</td>
                </tr>

                <tr>
                    <td>👤 Reporter / Source</td>
                    <td>${escapeHTML(report.name)}</td>
                </tr>

                ${
                    report.magnitude != null
                        ? `
                            <tr>
                                <td>📈 Magnitude</td>
                                <td>${escapeHTML(report.magnitude)}</td>
                            </tr>
                        `
                        : ""
                }

                ${
                    report.url
                        ? `
                            <tr>
                                <td>🔗 More information</td>
                                <td>
                                    <a href="${escapeHTML(report.url)}"
                                       target="_blank"
                                       rel="noopener noreferrer">
                                        View on USGS
                                    </a>
                                </td>
                            </tr>
                        `
                        : ""
                }
            </table>

            ${statusControl}
        `;

        modal.hidden = false;
    }

    function closeDetails() {
        if (modal) modal.hidden = true;
    }

    // ---------------- STATUS MANAGEMENT ----------------
    // Your current Firestore rules deny updates, so the save action
    // may fail until secure status-update authorization is implemented.

    async function saveStatus(id) {
        const select = document.getElementById("statusSelect");
        const message = document.getElementById("statusMsg");
        const button = document.getElementById("saveStatusBtn");

        if (!select || !message || !button) return;

        button.disabled = true;
        message.textContent = "Saving...";

        try {
            await db.collection("disaster_reports").doc(id).update({
                status: select.value,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            message.textContent = "Status updated successfully.";

        } catch (error) {
            console.error("Status update failed:", error);

            message.textContent =
                "Could not update status. Your current Firebase security rules may prohibit updates.";
        } finally {
            button.disabled = false;
        }
    }

    // ---------------- EVENT LISTENERS ----------------

    document.getElementById("searchDisaster")
        ?.addEventListener("input", renderReports);

    [
        "typeFilter",
        "locationFilter",
        "severityFilter",
        "statusFilter",
        "sourceFilter"
    ].forEach(function (id) {
        document.getElementById(id)
            ?.addEventListener("change", renderReports);
    });

    container.addEventListener("click", function (event) {
        const card = event.target.closest(".disaster-card");

        if (card) openDetails(card.dataset.id);
    });

    container.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;

        const card = event.target.closest(".disaster-card");

        if (card) {
            event.preventDefault();
            openDetails(card.dataset.id);
        }
    });

    document.getElementById("modalClose")
        ?.addEventListener("click", closeDetails);

    modal?.addEventListener("click", function (event) {
        if (event.target === modal) closeDetails();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeDetails();
    });

    modalBody?.addEventListener("click", function (event) {
        if (event.target.id === "saveStatusBtn") {
            saveStatus(event.target.dataset.id);
        }
    });

    // ---------------- START ----------------

    listenToFirestore();
    loadUSGS();

});
