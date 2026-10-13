// ============================================
// ResQCloud - Disaster Dashboard
// Firebase Compat SDK
// ============================================

const db = window.db;
const firestore = firebase.firestore();

// Disaster icons
const ICONS = {
    flood: "🌊",
    fire: "🔥",
    storm: "🌪️",
    cyclone: "🌪️",
    earthquake: "🌍",
    landslide: "⛰️"
};

// Dashboard state
let latestReports = [];
let rangeDays = 7;
let trendChart = null;

// ============================================
// Load disaster reports from Firestore
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    if (!db || !firestore) {
        console.error("Firebase is not initialized.");
        showDashboardError("Firebase connection is not initialized.");
        return;
    }

    const reportsQuery = firestore
        .collection("disaster_reports")
        .orderBy("created_at", "desc");

    reportsQuery.onSnapshot(
        (snapshot) => {
            latestReports = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            renderDashboard(latestReports);
        },
        (error) => {
            console.error("Dashboard error:", error);

            showDashboardError(
                "Unable to load reports. Check Firestore permissions and your connection."
            );
        }
    );

    // Listen for chart range button clicks
    document.querySelectorAll(".range-btns button").forEach((button) => {
        button.addEventListener("click", () => {
            rangeDays = Number(button.dataset.days);

            document.querySelectorAll(".range-btns button").forEach((btn) => {
                btn.classList.remove("active");
            });

            button.classList.add("active");
            renderTrend();
        });
    });
});

// ============================================
// Render dashboard statistics and charts
// ============================================

function renderDashboard(reports) {
    const total = reports.length;

    const active = reports.filter(
        (report) => (report.status || "Active").toLowerCase() === "active"
    ).length;

    const resolved = reports.filter(
        (report) => (report.status || "Active").toLowerCase() === "resolved"
    ).length;

    const high = reports.filter(
        (report) => (report.severity || "").toLowerCase() === "high"
    ).length;

    // Statistics cards
    setText("totalReports", total);
    setText("activeReports", active);
    setText("resolvedReports", resolved);
    setText("highReports", high);

    // Recent reports
    renderRecent(reports.slice(0, 5));

    // Disaster types chart
    renderBars(
        "typeChart",
        countBy(reports, (report) => report.disaster_type),
        { base: total, percent: true }
    );

    // Severity chart
    const severityOrder = ["High", "Medium", "Low"];
    const severityCounts = countBy(reports, (report) => report.severity);

    const severityEntries = severityOrder.map((name) => ({
        label: name,
        count: (
            severityCounts.find(
                (entry) => entry.label.toLowerCase() === name.toLowerCase()
            ) || { count: 0 }
        ).count
    }));

    renderBars(
        "severityChart",
        severityEntries,
        { base: total, percent: true }
    );

    // Top locations chart
    renderBars(
        "locationChart",
        countBy(reports, (report) => report.location).slice(0, 5),
        { base: total, percent: true }
    );

    // Reports-over-time chart
    renderTrend();
}

// ============================================
// Reports over time - Chart.js
// ============================================

function renderTrend() {
    const canvas = document.getElementById("trendChart");

    if (!canvas) {
        return;
    }

    if (typeof Chart === "undefined") {
        console.error("Chart.js is not loaded.");
        return;
    }

    const series = buildSeries(latestReports, rangeDays);

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(canvas, {
        data: {
            labels: series.map((day) => day.label),

            datasets: [
                {
                    type: "line",
                    label: "Total reports",
                    data: series.map((day) => day.total),
                    borderColor: "#16a34a",
                    backgroundColor: "rgba(22, 163, 74, 0.12)",
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2,
                    yAxisID: "yTotal",
                    order: 1
                },
                {
                    type: "bar",
                    label: "New reports",
                    data: series.map((day) => day.count),
                    backgroundColor: "rgba(100, 116, 139, 0.5)",
                    yAxisID: "yNew",
                    order: 2
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                mode: "index",
                intersect: false
            },

            scales: {
                yTotal: {
                    position: "right",
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                },

                yNew: {
                    position: "left",
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// ============================================
// Build daily report totals
// ============================================

function buildSeries(reports, numberOfDays) {
    const days = [];

    for (let i = numberOfDays - 1; i >= 0; i--) {
        const date = new Date();

        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        days.push({
            key: date.toLocaleDateString("en-CA"),
            label: date.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short"
            }),
            count: 0,
            total: 0
        });
    }

    let before = 0;

    reports.forEach((report) => {
        if (!report.created_at) {
            return;
        }

        let reportDate;

        // Firestore Timestamp
        if (typeof report.created_at.toDate === "function") {
            reportDate = report.created_at.toDate();
        } else {
            reportDate = new Date(report.created_at);
        }

        if (Number.isNaN(reportDate.getTime())) {
            return;
        }

        const key = reportDate.toLocaleDateString("en-CA");
        const day = days.find((item) => item.key === key);

        if (day) {
            day.count++;
        } else if (key < days[0].key) {
            before++;
        }
    });

    let running = before;

    days.forEach((day) => {
        running += day.count;
        day.total = running;
    });

    return days;
}

// ============================================
// Group and count reports
// ============================================

function countBy(items, getLabel) {
    const groups = new Map();

    items.forEach((item) => {
        const label =
            (getLabel(item) || "Unknown").toString().trim() || "Unknown";

        const key = label.toLowerCase();

        if (!groups.has(key)) {
            groups.set(key, {
                label,
                count: 0
            });
        }

        groups.get(key).count++;
    });

    return [...groups.values()].sort(
        (a, b) => b.count - a.count
    );
}

// ============================================
// Update text on the page
// ============================================

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

// ============================================
// Show an error on the dashboard
// ============================================

function showDashboardError(message) {
    setText("totalReports", "—");
    setText("activeReports", "—");
    setText("resolvedReports", "—");
    setText("highReports", "—");
    setText("recentReports", message);

    ["typeChart", "severityChart", "locationChart"].forEach((id) => {
        const container = document.getElementById(id);

        if (container) {
            container.textContent = message;
        }
    });
}

// ============================================
// Render horizontal analytics bars
// ============================================

function renderBars(containerId, entries, { base, percent }) {
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    container.replaceChildren();

    if (entries.length === 0 || base === 0) {
        const empty = document.createElement("p");

        empty.textContent =
            "No data yet. Reports will appear here once submitted.";

        container.appendChild(empty);
        return;
    }

    entries.forEach(({ label, count }) => {
        const share = Math.round((count / base) * 100);

        const item = document.createElement("div");
        item.className = "bar-item";

        const head = document.createElement("div");

        const name = document.createElement("span");
        name.textContent = label;

        const value = document.createElement("strong");
        value.textContent = percent
            ? `${count} (${share}%)`
            : count;

        head.append(name, value);

        const bar = document.createElement("div");
        bar.className = "bar";

        const fill = document.createElement("span");
        fill.style.width = `${share}%`;

        bar.appendChild(fill);
        item.append(head, bar);

        container.appendChild(item);
    });
}

// ============================================
// Render the five most recent reports
// ============================================

function renderRecent(reports) {
    const container = document.getElementById("recentReports");

    if (!container) {
        return;
    }

    container.replaceChildren();

    if (reports.length === 0) {
        const empty = document.createElement("p");

        empty.textContent = "No disaster reports yet.";

        container.appendChild(empty);
        return;
    }

    reports.forEach((report) => {
        const type = (report.disaster_type || "").toLowerCase();

        const iconKey = Object.keys(ICONS).find(
            (key) => type.includes(key)
        );

        const row = document.createElement("div");
        row.className = "report-row";

        const iconElement = document.createElement("div");
        iconElement.className = "report-icon";
        iconElement.textContent = iconKey
            ? ICONS[iconKey]
            : "🚨";

        const info = document.createElement("div");
        info.className = "report-info";

        const title = document.createElement("strong");
        title.textContent = report.disaster_type || "Unknown disaster";

        const location = document.createElement("span");
        location.textContent = report.location || "Unknown location";

        info.append(title, location);

        const status = document.createElement("span");
        status.className =
            (report.status || "Active").toLowerCase() === "resolved"
                ? "status resolved-status"
                : "status active-status";

        status.textContent = report.severity || "Unknown";

        row.append(iconElement, info, status);
        container.appendChild(row);
    });
}