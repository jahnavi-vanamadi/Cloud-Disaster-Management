
// ResQCloud - Disaster Report Submission
// Uses Firebase Compat SDK

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("reportForm");
    const submitButton = document.getElementById("submitReportBtn");
    const message = document.getElementById("reportMessage");

    if (!form || !submitButton || !message) {
        console.error("Report form elements could not be found.");
        return;
    }

    // Get the initialized Firebase Firestore connection
    const db = window.db;

    if (!db || typeof firebase === "undefined") {
        console.error("Firebase is not initialized.");

        message.textContent =
            "Cloud connection failed. Please refresh the page.";

        message.style.color = "red";
        return;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const reportData = {
            name: document.getElementById("name").value.trim(),
            disaster_type: document.getElementById("disaster_type").value,
            location: document.getElementById("location").value.trim(),
            description: document.getElementById("description").value.trim(),
            severity: document.getElementById("severity").value,
            status: "Active",
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (
            !reportData.name ||
            !reportData.disaster_type ||
            !reportData.location ||
            !reportData.description ||
            !reportData.severity
        ) {
            message.textContent = "Please fill in all required fields.";
            message.style.color = "red";
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
        message.textContent = "Saving disaster report to the cloud...";
        message.style.color = "black";

        try {
            // Save the report to Firebase Firestore
            const documentReference = await db
                .collection("disaster_reports")
                .add(reportData);

            console.log(
                "Report saved successfully. Document ID:",
                documentReference.id
            );

            message.textContent =
                "Disaster report submitted successfully!";

            message.style.color = "green";

            alert("Disaster report submitted successfully!");

            form.reset();

        } catch (error) {
            console.error("Firestore submission error:", error);

            message.textContent =
                "Report could not be saved: " + error.message;

            message.style.color = "red";

            alert(
                "Report submission failed:\n\n" + error.message
            );

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Disaster Report";
        }
    });
});