import { db } from "./firebase.js";

import {
    collection,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const ICONS = {
    flood: "🌊",
    fire: "🔥",
    storm: "🌪️",
    cyclone: "🌪️",
    earthquake: "🌍",
    landslide: "⛰️"
};

document.addEventListener("DOMContentLoaded", () => {
    const reportsQuery = query(
        collection(db, "disaster_reports"),
        orderBy("created_at", "desc")
    );

    // onSnapshot = "live listener": runs now, then again
    // every time a report is added or deleted in Firestore.
    onSnapshot(
        reportsQuery,
        (snapshot) => {
            const reports = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            renderDashboard(reports);
        },
        (error) => {
            console.error("Dashboard error:", error);
            setText("totalReports", "—");
            setText("recentReports", "Unable to load reports. Check Firestore rules and your connection.");
        }
    );
});

// ---------- Main render ----------

function renderDashboard(reports) {
    const total = reports.length;

    const active = reports.filter(
        (r) => (r.status || "Active").toLowerCase() === "active"
    ).length;

    const high = reports.filter(
        (r) => (r.severity || "").toLowerCase() === "high"
    ).length;

    setText("totalReports", total);
    setText("activeReports", active);
    setText("resolvedReports", total - active);
    setText("highReports", high);

    renderRecent(reports.slice(0, 5));

    renderBars("typeChart", countBy(reports, (r) => r.disaster_type), { base: total, percent: true });

    const severityOrder = ["High", "Medium", "Low"];
    const severityCounts = countBy(reports, (r) => r.severity);
    const severityEntries = severityOrder.map((name) => ({
        label: name,
        count: (severityCounts.find((e) => e.label.toLowerCase() === name.toLowerCase()) || { count: 0 }).count
    }));
    renderBars("severityChart", severityEntries, { base: total, percent: true });

    renderBars("locationChart", countBy(reports, (r) => r.location).slice(0, 5), { base: total, percent: true });

    latestReports = reports;
    renderTrend();
}

// ---------- Stock-style chart ----------

let latestReports = [];
let rangeDays = 7;
let trendChart = null;

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".range-btns button").forEach((button) => {
        button.addEventListener("click", () => {
            rangeDays = Number(button.dataset.days);
            document.querySelectorAll(".range-btns button").forEach((b) => b.classList.remove("active"));
            button.classList.add("active");
            renderTrend();
        });
    });
});

function renderTrend() {
    const canvas = document.getElementById("trendChart");
    if (!canvas || typeof Chart === "undefined") return;

    const series = buildSeries(latestReports, rangeDays);

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(canvas, {
        data: {
            labels: series.map((d) => d.label),
            datasets: [
                {
                    type: "line",
                    label: "Total reports",
                    data: series.map((d) => d.total),
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
                    data: series.map((d) => d.count),
                    backgroundColor: "rgba(100, 116, 139, 0.5)",
                    yAxisID: "yNew",
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            scales: {
                yTotal: { position: "right", beginAtZero: true, ticks: { precision: 0 } },
                yNew: { position: "left", beginAtZero: true, ticks: { precision: 0 }, grid: { drawOnChartArea: false } }
            }
        }
    });
}

// One entry per day: new reports that day + running total.
function buildSeries(reports, n) {
    const days = [];

    for (let i = n - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push({
            key: date.toLocaleDateString("en-CA"),
            label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
            count: 0,
            total: 0
        });
    }

    let before = 0; // reports older than the chosen range

    reports.forEach((r) => {
        if (!r.created_at || typeof r.created_at.toDate !== "function") return;

        const key = r.created_at.toDate().toLocaleDateString("en-CA");
        const day = days.find((d) => d.key === key);

        if (day) day.count++;
        else if (key < days[0].key) before++;
    });

    let running = before;
    days.forEach((d) => {
        running += d.count;
        d.total = running;
    });

    return days;
}

// ---------- Analytics helpers ----------

// Groups items by a label and counts them, biggest first.
// "flood" and "Flood" are treated as the same group.
function countBy(items, getLabel) {
    const groups = new Map();

    items.forEach((item) => {
        const label = (getLabel(item) || "Unknown").toString().trim() || "Unknown";
        const key = label.toLowerCase();

        if (!groups.has(key)) {
            groups.set(key, { label, count: 0 });
        }
        groups.get(key).count++;
    });

    return [...groups.values()].sort((a, b) => b.count - a.count);
}

// ---------- DOM helpers ----------

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function renderBars(containerId, entries, { base, percent }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.replaceChildren();

    if (entries.length === 0 || base === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No data yet. Reports will appear here once submitted.";
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
        value.textContent = percent ? `${count} (${share}%)` : count;
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

function renderRecent(reports) {
    const container = document.getElementById("recentReports");
    if (!container) return;

    container.replaceChildren();

    if (reports.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No disaster reports yet.";
        container.appendChild(empty);
        return;
    }

    reports.forEach((report) => {
        const type = (report.disaster_type || "").toLowerCase();
        const icon = Object.keys(ICONS).find((k) => type.includes(k));

        const row = document.createElement("div");
        row.className = "report-row";

        const iconElement = document.createElement("div");
        iconElement.className = "report-icon";
        iconElement.textContent = icon ? ICONS[icon] : "🚨";

        const info = document.createElement("div");
        info.className = "report-info";
        const title = document.createElement("strong");
        title.textContent = report.disaster_type || "Unknown disaster";
        const location = document.createElement("span");
        location.textContent = report.location || "Unknown location";
        info.append(title, location);

        const status = document.createElement("span");
        status.className = "status active-status";
        status.textContent = report.severity || "Unknown";

        row.append(iconElement, info, status);
        container.appendChild(row);
    });
}