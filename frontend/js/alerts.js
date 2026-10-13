// =====================================================
// Alerts (part of Module 2)
//   * Official warnings  = USGS earthquakes (M5+) + admin-verified reports
//   * Unverified reports = public reports nobody has confirmed yet
//   * Verify button      = admin confirms a report -> becomes official
//   * Notification       = popup (+ browser notification) when a NEW
//                          High-severity report arrives
// Data: Cloud Firestore collection "disaster_reports" + USGS feed
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

// Set to true once Module 1 login works, so only logged-in admins can verify.
const REQUIRE_LOGIN_FOR_VERIFY = false;

const USGS_URL =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";

const MIN_OFFICIAL_MAGNITUDE = 5;

const RANK = { high: 3, medium: 2, low: 1 };


// ---------- State ----------

let communityReports = [];
let usgsAlerts = [];
let currentUser = null;
let firstSnapshot = true;


// ---------- Helpers ----------

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

function toMillis(value) {
    const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
    return date && !isNaN(date) ? date.getTime() : Date.now();
}

function formatTime(value) {
    return new Date(toMillis(value)).toLocaleString();
}

function sevKey(severity) {
    return (severity || "low").toLowerCase();
}

function bySeverityThenTime(a, b) {
    return (
        (RANK[sevKey(b.severity)] || 0) - (RANK[sevKey(a.severity)] || 0) ||
        toMillis(b.created_at) - toMillis(a.created_at)
    );
}


// ---------- Load data ----------

function listenToFirestore() {
    const q = query(
        collection(db, "disaster_reports"),
        orderBy("created_at", "desc")
    );

    onSnapshot(
        q,
        (snapshot) => {
            // Notification workflow: tell the user about NEW high-severity reports
            if (!firstSnapshot) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const d = change.doc.data();
                        if (sevKey(d.severity) === "high") notifyNewAlert(d);
                    }
                });
            }
            firstSnapshot = false;

            communityReports = snapshot.docs.map((d) => ({
                id: d.id,
                source: "community",
                name: "Community report",
                ...d.data(),
                verified: d.data().verified === true
            }));
            render();
        },
        (error) => {
            console.error("Firestore error:", error);
            const msg = "<p>Unable to load alerts. " + esc(error.message) + "</p>";
            document.getElementById("officialList").innerHTML = msg;
            document.getElementById("unverifiedList").innerHTML = "";
        }
    );
}

async function loadUSGS() {
    try {
        const response = await fetch(USGS_URL);
        if (!response.ok) throw new Error("USGS request failed");
        const data = await response.json();

        usgsAlerts = (data.features || [])
            .filter((f) => (f.properties.mag ?? 0) >= MIN_OFFICIAL_MAGNITUDE)
            .map((f) => {
                const mag = f.properties.mag;
                return {
                    id: "usgs-" + f.id,
                    source: "usgs",
                    verified: true,
                    disaster_type: "Earthquake",
                    location: f.properties.place || "Unknown location",
                    description: f.properties.title || "Earthquake",
                    severity: mag >= 6 ? "High" : "Medium",
                    created_at: f.properties.time,
                    url: f.properties.url
                };
            });
        render();
    } catch (error) {
        console.warn("USGS feed unavailable:", error);
        render();
    }
}


// ---------- Display ----------

function alertCard(r, official) {
    const sev = sevKey(r.severity);

    const label = r.source === "usgs"
        ? "✔ Official · USGS"
        : official
            ? "✔ Verified by admin"
            : "Unverified, not confirmed";

    const verifyButton =
        !official && (!REQUIRE_LOGIN_FOR_VERIFY || currentUser)
            ? `<button class="verify-btn" data-id="${esc(r.id)}">Verify</button>`
            : "";

    return `
    <div class="alert-item ${official ? "official" : "unverified"} ${sev}">
        <div class="alert-main">
            <h3>${iconFor(r.disaster_type)} ${esc(r.disaster_type)}: ${esc(r.description)}</h3>
            <div class="badge-row">
                <span class="badge sev-${sev}">${esc(r.severity)}</span>
                <span class="badge ${official ? "src-official" : "src-unverified"}">${label}</span>
                ${r.status ? `<span class="badge st-${esc(r.status.toLowerCase())}">${esc(r.status)}</span>` : ""}
            </div>
            <div class="alert-meta">
                📍 ${esc(r.location)} &nbsp; 🕐 ${esc(formatTime(r.created_at))}
                ${r.url ? ` &nbsp; <a href="${esc(r.url)}" target="_blank" rel="noopener">Source</a>` : ""}
            </div>
        </div>
        ${verifyButton}
    </div>`;
}

function render() {
    // Resolved incidents are no longer alerts
    const active = communityReports.filter(
        (r) => (r.status || "Active").toLowerCase() !== "resolved"
    );

    const official = [
        ...usgsAlerts,
        ...active.filter((r) => r.verified)
    ].sort(bySeverityThenTime);

    const unverified = active
        .filter((r) => !r.verified && ["high", "medium"].includes(sevKey(r.severity)))
        .sort(bySeverityThenTime);

    document.getElementById("officialList").innerHTML = official.length
        ? official.map((r) => alertCard(r, true)).join("")
        : "<p>No official warnings right now.</p>";

    document.getElementById("unverifiedList").innerHTML = unverified.length
        ? unverified.map((r) => alertCard(r, false)).join("")
        : "<p>No unverified reports waiting.</p>";

    document.getElementById("statOfficial").textContent = official.length;
    document.getElementById("statUnverified").textContent = unverified.length;
    document.getElementById("statHigh").textContent =
        [...official, ...unverified].filter((r) => sevKey(r.severity) === "high").length;
}


// ---------- Verify (admin) ----------

async function verifyReport(id, button) {
    button.disabled = true;
    button.textContent = "Verifying...";

    try {
        await updateDoc(doc(db, "disaster_reports", id), {
            verified: true,
            verified_at: serverTimestamp()
        });
        // onSnapshot refreshes the page automatically
    } catch (error) {
        console.error("Verify failed:", error);
        button.disabled = false;
        button.textContent = "Verify";
        showToast("Could not verify", error.message);
    }
}


// ---------- Notifications ----------

function showToast(title, text) {
    const box = document.getElementById("toastBox");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<strong>${esc(title)}</strong>${esc(text)}`;
    box.appendChild(toast);
    setTimeout(() => toast.remove(), 8000);
}

function notifyNewAlert(report) {
    const title = `🚨 New HIGH alert: ${report.disaster_type || "Disaster"}`;
    const text = `${report.location || ""} - ${report.description || ""}`;

    showToast(title, text);

    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: text });
    }
}

function setupNotifyButton() {
    const button = document.getElementById("notifyBtn");

    if (!("Notification" in window)) {
        button.hidden = true;
        return;
    }
    if (Notification.permission === "granted") {
        button.textContent = "🔔 Notifications on";
    }

    button.addEventListener("click", async () => {
        const result = await Notification.requestPermission();
        button.textContent =
            result === "granted" ? "🔔 Notifications on" : "🔕 Notifications blocked";
    });
}


// ---------- Events ----------

document.addEventListener("click", (e) => {
    const button = e.target.closest(".verify-btn");
    if (button) verifyReport(button.dataset.id, button);
});

import("https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js")
    .then(({ onAuthStateChanged }) => {
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            render();
        });
    })
    .catch(() => {});


// ---------- Start ----------

setupNotifyButton();
listenToFirestore();
loadUSGS();
