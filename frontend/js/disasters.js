// =====================================================
// Module 2 - Disaster Management
//   * Disaster listing + details popup
//   * Filters: type, location, severity, status, source
//   * Status management (Active / Monitoring / Resolved)
//   * Genuine data source: USGS Earthquake feed (official)
// Data comes from Cloud Firestore collection "disaster_reports"
// =====================================================

import { db, auth } from "./firebase.js";

import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


// ---------- Settings ----------

// Module 1 (Authentication) is built by a teammate.
// Once login works, change this to true so ONLY logged-in users
// (admins) can change a disaster's status.
const REQUIRE_LOGIN_FOR_STATUS = false;

const STATUSES = ["Active", "Monitoring", "Resolved"];

const USGS_URL =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";


// ---------- State ----------

let communityReports = [];   // from Firestore (unverified)
let usgsReports = [];        // from USGS (official)
let currentUser = null;


// ---------- Helpers ----------

// Stops user-typed text from running as HTML (security)
function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function iconFor(type) {
    const t = (type || "").toLowerCase();
    if (t.includes("flood")) return "🌊";
    if (t.includes("fire")) return "🔥";
    if (t.includes("storm") || t.includes("cyclone")) return "🌪️";
    if (t.includes("earthquake")) return "🏚️";
    if (t.includes("landslide")) return "⛰️";
    return "🚨";
}

function formatTime(value) {
    // Firestore Timestamp, JS Date, number or null
    const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
    return date && !isNaN(date) ? date.toLocaleString() : "Just now";
}

function severityClass(severity) {
    return "sev-" + (severity || "low").toLowerCase();
}

function statusClass(status) {
    return "st-" + (status || "active").toLowerCase();
}

function allReports() {
    return [...communityReports, ...usgsReports];
}


// ---------- Load data ----------

// Live updates from Firestore (cards refresh by themselves)
function listenToFirestore() {
    const q = query(
        collection(db, "disaster_reports"),
        orderBy("created_at", "desc")
    );

    onSnapshot(
        q,
        (snapshot) => {
            communityReports = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    source: "community",
                    verified: false,
                    ...data,
                    status: data.status || "Active"
                };
            });
            refreshLocationOptions();
            render();
        },
        (error) => {
            console.error("Firestore error:", error);
            document.getElementById("disasterList").innerHTML =
                "<p>Unable to load disaster reports. " + esc(error.message) + "</p>";
        }
    );
}

// Official earthquake data from USGS (free public API, no key needed)
async function loadUSGS() {
    try {
        const response = await fetch(USGS_URL);
        if (!response.ok) throw new Error("USGS request failed");

        const data = await response.json();

        usgsReports = (data.features || []).map((f) => {
            const mag = f.properties.mag ?? 0;
            return {
                id: "usgs-" + f.id,
                source: "usgs",
                verified: true,
                name: "USGS Earthquake Hazards Program",
                disaster_type: "Earthquake",
                location: f.properties.place || "Unknown location",
                description: f.properties.title || "Earthquake",
                severity: mag >= 6 ? "High" : mag >= 5 ? "Medium" : "Low",
                status: "Active",
                magnitude: mag,
                created_at: f.properties.time,
                url: f.properties.url
            };
        });

        refreshLocationOptions();
        render();
    } catch (error) {
        // USGS is optional - the page still works without it
        console.warn("USGS feed unavailable:", error);
    }
}


// ---------- Filters ----------

function refreshLocationOptions() {
    const select = document.getElementById("locationFilter");
    const previous = select.value;

    const locations = [
        ...new Set(
            allReports()
                .map((r) => (r.location || "").trim())
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    select.innerHTML =
        '<option value="all">All Locations</option>' +
        locations
            .map((l) => `<option value="${esc(l.toLowerCase())}">${esc(l)}</option>`)
            .join("");

    select.value = locations.some((l) => l.toLowerCase() === previous)
        ? previous
        : "all";
}

function getFiltered() {
    const search = document.getElementById("searchDisaster").value.toLowerCase().trim();
    const type = document.getElementById("typeFilter").value;
    const location = document.getElementById("locationFilter").value;
    const severity = document.getElementById("severityFilter").value;
    const status = document.getElementById("statusFilter").value;
    const source = document.getElementById("sourceFilter").value;

    return allReports().filter((r) => {
        const rType = (r.disaster_type || "").toLowerCase();
        const rLocation = (r.location || "").toLowerCase();
        const rText = `${rLocation} ${(r.description || "").toLowerCase()} ${rType}`;

        return (
            (!search || rText.includes(search)) &&
            (type === "all" || rType === type) &&
            (location === "all" || rLocation === location) &&
            (severity === "all" || (r.severity || "").toLowerCase() === severity) &&
            (status === "all" || (r.status || "").toLowerCase() === status) &&
            (source === "all" || r.source === source)
        );
    });
}


// ---------- Listing ----------

function toMillis(value) {
    const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
    return date && !isNaN(date) ? date.getTime() : Date.now();
}

function render() {
    const container = document.getElementById("disasterList");
    const count = document.getElementById("resultCount");

    const reports = getFiltered().sort(
        (a, b) => toMillis(b.created_at) - toMillis(a.created_at)
    );

    count.textContent = `Showing ${reports.length} of ${allReports().length} incidents`;

    if (reports.length === 0) {
        container.innerHTML = "<p>No disaster reports found.</p>";
        return;
    }

    container.innerHTML = reports
        .map(
            (r) => `
        <div class="disaster-card clickable" data-id="${esc(r.id)}" tabindex="0">

            <div class="disaster-top">
                <span class="disaster-type">${iconFor(r.disaster_type)} ${esc(r.disaster_type)}</span>
                <span class="badge ${severityClass(r.severity)}">${esc(r.severity)}</span>
            </div>

            <h3>${esc(r.description)}</h3>

            <div class="badge-row">
                <span class="badge ${statusClass(r.status)}">${esc(r.status)}</span>
                <span class="badge ${r.verified ? "src-official" : "src-unverified"}">
                    ${r.verified ? "✔ Official" : "Unverified report"}
                </span>
            </div>

            <div class="disaster-meta">
                <span>📍 ${esc(r.location)}</span>
                <span>🕐 ${esc(formatTime(r.created_at))}</span>
            </div>

        </div>`
        )
        .join("");
}


// ---------- Details popup ----------

function canChangeStatus(report) {
    if (report.source !== "community") return false;       // USGS data is read-only
    if (REQUIRE_LOGIN_FOR_STATUS && !currentUser) return false;
    return true;
}

function openDetails(id) {
    const r = allReports().find((x) => x.id === id);
    if (!r) return;

    const statusControl = canChangeStatus(r)
        ? `
        <label for="statusSelect"><strong>Update status</strong></label>
        <div class="status-edit">
            <select id="statusSelect">
                ${STATUSES.map(
                    (s) => `<option ${s === r.status ? "selected" : ""}>${s}</option>`
                ).join("")}
            </select>
            <button class="primary-btn" id="saveStatusBtn" data-id="${esc(r.id)}">Save</button>
        </div>
        <p id="statusMsg" class="status-msg"></p>`
        : `<p class="status-msg">${
              r.source !== "community"
                  ? "Official feed data is read-only."
                  : "Log in as admin to change the status."
          }</p>`;

    document.getElementById("modalBody").innerHTML = `
        <h2>${iconFor(r.disaster_type)} ${esc(r.disaster_type)}</h2>

        <div class="badge-row">
            <span class="badge ${severityClass(r.severity)}">${esc(r.severity)} severity</span>
            <span class="badge ${statusClass(r.status)}">${esc(r.status)}</span>
            <span class="badge ${r.verified ? "src-official" : "src-unverified"}">
                ${r.verified ? "✔ Official source" : "Unverified community report"}
            </span>
        </div>

        <p class="detail-desc">${esc(r.description)}</p>

        <table class="detail-table">
            <tr><td>📍 Location</td><td>${esc(r.location)}</td></tr>
            <tr><td>🕐 Reported</td><td>${esc(formatTime(r.created_at))}</td></tr>
            <tr><td>👤 Source</td><td>${esc(r.name)}</td></tr>
            ${r.magnitude != null ? `<tr><td>📈 Magnitude</td><td>${esc(r.magnitude)}</td></tr>` : ""}
            ${
                r.url
                    ? `<tr><td>🔗 More info</td><td><a href="${esc(r.url)}" target="_blank" rel="noopener">View on USGS</a></td></tr>`
                    : ""
            }
        </table>

        ${statusControl}
    `;

    document.getElementById("detailsModal").hidden = false;
}

function closeDetails() {
    document.getElementById("detailsModal").hidden = true;
}


// ---------- Status management ----------

async function saveStatus(id) {
    const select = document.getElementById("statusSelect");
    const message = document.getElementById("statusMsg");
    const button = document.getElementById("saveStatusBtn");

    button.disabled = true;
    message.textContent = "Saving...";

    try {
        await updateDoc(doc(db, "disaster_reports", id), {
            status: select.value,
            updated_at: serverTimestamp()
        });
        message.textContent = "✅ Status updated to " + select.value;
        // The live listener (onSnapshot) refreshes the cards automatically
    } catch (error) {
        console.error("Status update failed:", error);
        message.textContent = "❌ Could not update: " + error.message;
    } finally {
        button.disabled = false;
    }
}


// ---------- Events ----------

["searchDisaster"].forEach((id) =>
    document.getElementById(id).addEventListener("input", render)
);

["typeFilter", "locationFilter", "severityFilter", "statusFilter", "sourceFilter"].forEach(
    (id) => document.getElementById(id).addEventListener("change", render)
);

document.getElementById("disasterList").addEventListener("click", (e) => {
    const card = e.target.closest(".disaster-card");
    if (card) openDetails(card.dataset.id);
});

document.getElementById("disasterList").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const card = e.target.closest(".disaster-card");
        if (card) openDetails(card.dataset.id);
    }
});

document.getElementById("modalClose").addEventListener("click", closeDetails);

document.getElementById("detailsModal").addEventListener("click", (e) => {
    if (e.target.id === "detailsModal") closeDetails();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetails();
});

document.getElementById("modalBody").addEventListener("click", (e) => {
    if (e.target.id === "saveStatusBtn") saveStatus(e.target.dataset.id);
});

// Track login state (used when REQUIRE_LOGIN_FOR_STATUS is true)
import("https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js")
    .then(({ onAuthStateChanged }) => {
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
        });
    })
    .catch(() => {});


// ---------- Start ----------

listenToFirestore();
loadUSGS();
