// =====================================================
// ResQCloud - Emergency Alerts
// Firebase Compat SDK + USGS Earthquake Feed
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    const db = window.db;
    const auth = window.auth;

    const USGS_URL =
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";

    const MIN_OFFICIAL_MAGNITUDE = 5;

    const RANK = {
        high: 3,
        medium: 2,
        low: 1
    };

    let communityReports = [];
    let usgsAlerts = [];
    let firstSnapshot = true;

    // =====================================================
    // HELPERS
    // =====================================================

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
        if (value && typeof value.toDate === "function") {
            return value.toDate().getTime();
        }

        if (value) {
            const date = new Date(value);

            if (!isNaN(date.getTime())) {
                return date.getTime();
            }
        }

        return 0;
    }

    function formatTime(value) {
        const millis = toMillis(value);

        return millis
            ? new Date(millis).toLocaleString()
            : "Time unavailable";
    }

    function sevKey(severity) {
        return (severity || "low").toLowerCase();
    }

    function bySeverityThenTime(a, b) {
        return (
            (RANK[sevKey(b.severity)] || 0) -
                (RANK[sevKey(a.severity)] || 0) ||
            toMillis(b.created_at) - toMillis(a.created_at)
        );
    }

    // =====================================================
    // NOTIFICATION MESSAGE
    // =====================================================

    function showToast(title, message) {
        const box = document.getElementById("toastBox");

        if (!box) return;

        const toast = document.createElement("div");
        toast.className = "toast";

        const heading = document.createElement("strong");
        heading.textContent = title;

        const content = document.createElement("div");
        content.textContent = message;

        toast.append(heading, content);
        box.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 8000);
    }

    function notifyNewAlert(report) {
        const title =
            `🚨 New HIGH alert: ${report.disaster_type || "Disaster"}`;

        const message =
            `${report.location || ""} - ${report.description || ""}`;

        showToast(title, message);

        if (
            "Notification" in window &&
            Notification.permission === "granted"
        ) {
            new Notification(title, {
                body: message
            });
        }
    }

    // =====================================================
    // ALERT CARD
    // =====================================================

    function alertCard(report, official) {
        const severity = sevKey(report.severity);

        let label;

        if (report.source === "usgs") {
            label = "✔ Official · USGS";
        } else if (official) {
            label = "✔ Verified by admin";
        } else {
            label = "Unverified, not confirmed";
        }

        // Verification requires a signed-in user.
        // Firestore rules must also authorize the update.
        const verifyButton = !official
            ? `<button class="verify-btn"
                       data-id="${esc(report.id)}"
                       type="button">Verify</button>`
            : "";

        return `
            <div class="alert-item ${official ? "official" : "unverified"} ${severity}">

                <div class="alert-main">

                    <h3>
                        ${iconFor(report.disaster_type)}
                        ${esc(report.disaster_type)}:
                        ${esc(report.description)}
                    </h3>

                    <div class="badge-row">

                        <span class="badge sev-${severity}">
                            ${esc(report.severity)}
                        </span>

                        <span class="badge ${official ? "src-official" : "src-unverified"}">
                            ${label}
                        </span>

                        ${
                            report.status
                                ? `<span class="badge st-${esc(report.status.toLowerCase())}">
                                       ${esc(report.status)}
                                   </span>`
                                : ""
                        }

                    </div>

                    <div class="alert-meta">
                        📍 ${esc(report.location)}
                        &nbsp; 🕐 ${esc(formatTime(report.created_at))}

                        ${
                            report.url
                                ? `&nbsp; <a href="${esc(report.url)}"
                                       target="_blank"
                                       rel="noopener noreferrer">Source</a>`
                                : ""
                        }
                    </div>

                </div>

                ${verifyButton}

            </div>
        `;
    }

    // =====================================================
    // DISPLAY ALERTS
    // =====================================================

    function render() {
        const officialList = document.getElementById("officialList");
        const unverifiedList = document.getElementById("unverifiedList");

        if (!officialList || !unverifiedList) {
            console.error("Alert list elements are missing from alerts.html.");
            return;
        }

        // Exclude resolved reports.
        const activeReports = communityReports.filter(report =>
            (report.status || "Active").toLowerCase() !== "resolved"
        );

        // Official alerts include USGS events and verified reports.
        const official = [
            ...usgsAlerts,
            ...activeReports.filter(report => report.verified)
        ].sort(bySeverityThenTime);

        // Show unverified high/medium severity reports separately.
        const unverified = activeReports
            .filter(report =>
                !report.verified &&
                ["high", "medium"].includes(sevKey(report.severity))
            )
            .sort(bySeverityThenTime);

        officialList.innerHTML = official.length
            ? official.map(report => alertCard(report, true)).join("")
            : "<p>No official warnings right now.</p>";

        unverifiedList.innerHTML = unverified.length
            ? unverified.map(report => alertCard(report, false)).join("")
            : "<p>No unverified reports waiting.</p>";

        document.getElementById("statOfficial").textContent =
            official.length;

        document.getElementById("statUnverified").textContent =
            unverified.length;

        document.getElementById("statHigh").textContent =
            [...official, ...unverified].filter(
                report => sevKey(report.severity) === "high"
            ).length;
    }

    // =====================================================
    // FIRESTORE COMMUNITY REPORTS
    // =====================================================

    function listenToFirestore() {
        if (!db) {
            console.error(
                "Firestore is not initialized. Check js/firebase.js."
            );

            document.getElementById("officialList").innerHTML =
                "<p>Firebase connection failed. Check the Firebase configuration.</p>";

            document.getElementById("unverifiedList").innerHTML = "";
            return;
        }

        db.collection("disaster_reports")
            .orderBy("created_at", "desc")
            .onSnapshot(
                snapshot => {
                    // Notify only about new high-severity reports
                    // after the initial Firestore load.
                    if (!firstSnapshot) {
                        snapshot.docChanges().forEach(change => {
                            if (change.type === "added") {
                                const report = change.doc.data();

                                if (sevKey(report.severity) === "high") {
                                    notifyNewAlert(report);
                                }
                            }
                        });
                    }

                    firstSnapshot = false;

                    communityReports = snapshot.docs.map(document => ({
                        id: document.id,
                        source: "community",
                        name: "Community report",
                        ...document.data(),
                        verified: document.data().verified === true
                    }));

                    render();
                },
                error => {
                    console.error("Firestore error:", error);

                    document.getElementById("officialList").innerHTML =
                        `<p>Unable to load community alerts: ${esc(error.message)}</p>`;

                    document.getElementById("unverifiedList").innerHTML =
                        "<p>Community reports could not be loaded.</p>";
                }
            );
    }

    // =====================================================
    // OFFICIAL USGS EARTHQUAKE FEED
    // =====================================================

    async function loadUSGS() {
        const officialList = document.getElementById("officialList");

        try {
            const response = await fetch(USGS_URL);

            if (!response.ok) {
                throw new Error(`USGS request failed: HTTP ${response.status}`);
            }

            const data = await response.json();

            usgsAlerts = (data.features || [])
                .filter(feature =>
                    (feature.properties.mag ?? 0) >= MIN_OFFICIAL_MAGNITUDE
                )
                .map(feature => {
                    const properties = feature.properties;

                    return {
                        id: "usgs-" + feature.id,
                        source: "usgs",
                        verified: true,
                        disaster_type: "Earthquake",
                        location: properties.place || "Unknown location",
                        description: properties.title || "Earthquake",
                        severity: properties.mag >= 6 ? "High" : "Medium",
                        created_at: properties.time,
                        url: properties.url
                    };
                });

            render();

        } catch (error) {
            console.error("USGS feed unavailable:", error);

            if (officialList && usgsAlerts.length === 0) {
                officialList.innerHTML =
                    "<p>USGS earthquake feed is temporarily unavailable. Community alerts may still appear below.</p>";
            }

            render();
        }
    }

    // =====================================================
    // VERIFY COMMUNITY REPORT
    // =====================================================

    async function verifyReport(id, button) {
        if (!auth || !auth.currentUser) {
            showToast(
                "Login required",
                "Please sign in before attempting to verify a report."
            );
            return;
        }

        button.disabled = true;
        button.textContent = "Verifying...";

        try {
            await db.collection("disaster_reports")
                .doc(id)
                .update({
                    verified: true,
                    verified_at:
                        firebase.firestore.FieldValue.serverTimestamp()
                });

            // The Firestore listener will refresh the alert automatically.

        } catch (error) {
            console.error("Verification failed:", error);

            button.disabled = false;
            button.textContent = "Verify";

            showToast(
                "Could not verify",
                "Firestore rejected the update. Check your security rules."
            );
        }
    }

    // =====================================================
    // BROWSER NOTIFICATIONS
    // =====================================================

    function setupNotifyButton() {
        const button = document.getElementById("notifyBtn");

        if (!button) return;

        if (!("Notification" in window)) {
            button.hidden = true;
            return;
        }

        if (Notification.permission === "granted") {
            button.textContent = "🔔 Notifications on";
        }

        button.addEventListener("click", async () => {
            try {
                const permission =
                    await Notification.requestPermission();

                button.textContent = permission === "granted"
                    ? "🔔 Notifications on"
                    : "🔕 Notifications blocked";
            } catch (error) {
                console.error("Notification permission error:", error);

                showToast(
                    "Notifications unavailable",
                    "Your browser could not enable notifications."
                );
            }
        });
    }

    // =====================================================
    // EVENT LISTENERS
    // =====================================================

    document.addEventListener("click", event => {
        const button = event.target.closest(".verify-btn");

        if (button) {
            verifyReport(button.dataset.id, button);
        }
    });

    if (auth) {
        auth.onAuthStateChanged(user => {
            console.log(
                "Alerts authentication status:",
                user ? "Signed in" : "Not signed in"
            );
        });
    }

    // =====================================================
    // START
    // =====================================================

    setupNotifyButton();
    listenToFirestore();
    loadUSGS();
});
