
// =====================================================
// RESQCLOUD — EMERGENCY RESOURCES
// Firebase Firestore integration using Compat SDK
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    const db = window.db;

    const COLLECTION = "emergency_resources";

    const form = document.getElementById("resourceForm");
    const table = document.getElementById("resourceTable");
    const tbody = table ? table.querySelector("tbody") : null;

    const searchInput = document.getElementById("searchResource");
    const typeFilter = document.getElementById("typeFilter");
    const locationFilter = document.getElementById("locationFilter");

    let allResources = [];
    let editingId = null;
    let unsubscribe = null;

    if (!form || !tbody) {
        return;
    }

    if (!db) {
        showMessage("Firebase connection failed. Please refresh the page.", true);
        return;
    }

    // Show a message below the form.
    function showMessage(message, isError = false) {
        let messageBox = document.getElementById("resourceMessage");

        if (!messageBox) {
            messageBox = document.createElement("p");
            messageBox.id = "resourceMessage";
            messageBox.setAttribute("role", "status");
            form.insertAdjacentElement("afterend", messageBox);
        }

        messageBox.textContent = message;
        messageBox.style.color = isError ? "#b91c1c" : "#15803d";
    }

    function normalise(value) {
        return String(value ?? "").trim().toLowerCase();
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    function statusClass(status) {
        switch (normalise(status)) {
            case "available":
                return "resolved-status";
            case "limited":
                return "active-status";
            default:
                return "danger-status";
        }
    }

    // -------------------------------------------------
    // LOAD AND LISTEN FOR FIRESTORE CHANGES
    // -------------------------------------------------

    function startResourceListener() {
        if (unsubscribe) {
            unsubscribe();
        }

        unsubscribe = db.collection(COLLECTION)
            .onSnapshot(function (snapshot) {
                allResources = snapshot.docs.map(function (document) {
                    return {
                        id: document.id,
                        ...document.data()
                    };
                });

                populateFilters();
                filterResources();
            }, function (error) {
                console.error("Failed to load emergency resources:", error);
                showMessage(
                    "Unable to load resources. Check Firestore permissions and try again.",
                    true
                );
                tbody.innerHTML =
                    '<tr><td colspan="6">Unable to load resources.</td></tr>';
            });
    }

    // -------------------------------------------------
    // DISPLAY RESOURCES
    // -------------------------------------------------

    function displayResources(resources) {
        tbody.innerHTML = "";

        if (resources.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="6">No emergency resources found.</td></tr>';
            return;
        }

        resources.forEach(function (resource) {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${escapeHTML(resource.name)}</td>
                <td>${escapeHTML(resource.resource_type)}</td>
                <td>${escapeHTML(resource.location)}</td>
                <td>${escapeHTML(resource.quantity)}</td>
                <td>
                    <span class="status ${statusClass(resource.availability)}">
                        ${escapeHTML(resource.availability)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button type="button" class="edit-btn">Edit</button>
                        <button type="button" class="delete-btn">Delete</button>
                    </div>
                </td>
            `;

            row.querySelector(".edit-btn").addEventListener("click", function () {
                editResource(resource);
            });

            row.querySelector(".delete-btn").addEventListener("click", function () {
                deleteResource(resource);
            });

            tbody.appendChild(row);
        });
    }

    // -------------------------------------------------
    // SEARCH AND FILTER
    // -------------------------------------------------

    function filterResources() {
        const search = normalise(searchInput ? searchInput.value : "");
        const selectedType = normalise(typeFilter ? typeFilter.value : "");
        const selectedLocation = normalise(
            locationFilter ? locationFilter.value : ""
        );

        const filtered = allResources.filter(function (resource) {
            const matchesSearch = [
                resource.name,
                resource.resource_type,
                resource.location
            ].some(function (value) {
                return normalise(value).includes(search);
            });

            const matchesType =
                !selectedType ||
                normalise(resource.resource_type) === selectedType;

            const matchesLocation =
                !selectedLocation ||
                normalise(resource.location) === selectedLocation;

            return matchesSearch && matchesType && matchesLocation;
        });

        displayResources(filtered);
    }

    function populateFilters() {
        populateSelect(
            typeFilter,
            "All Types",
            allResources.map(function (resource) {
                return resource.resource_type;
            })
        );

        populateSelect(
            locationFilter,
            "All Locations",
            allResources.map(function (resource) {
                return resource.location;
            })
        );
    }

    function populateSelect(select, label, values) {
        if (!select) return;

        const previousValue = select.value;
        const uniqueValues = [...new Set(
            values.filter(Boolean).map(function (value) {
                return String(value).trim();
            })
        )].sort();

        select.innerHTML = "";

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = label;
        select.appendChild(defaultOption);

        uniqueValues.forEach(function (value) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

        if (uniqueValues.includes(previousValue)) {
            select.value = previousValue;
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterResources);
    }

    if (typeFilter) {
        typeFilter.addEventListener("change", filterResources);
    }

    if (locationFilter) {
        locationFilter.addEventListener("change", filterResources);
    }

    // -------------------------------------------------
    // ADD RESOURCE
    // -------------------------------------------------

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("resourceName").value.trim();
        const resourceType = document.getElementById("resourceType").value.trim();
        const location = document.getElementById("resourceLocation").value.trim();
        const quantity = Number(document.getElementById("resourceQuantity").value);
        const availability =
            document.getElementById("resourceAvailability").value;

        if (
            !name ||
            !resourceType ||
            !location ||
            !Number.isInteger(quantity) ||
            quantity < 0 ||
            !["Available", "Limited", "Unavailable"].includes(availability)
        ) {
            showMessage("Please enter valid resource details.", true);
            return;
        }

        const resourceData = {
            name: name,
            resource_type: resourceType,
            location: location,
            quantity: quantity,
            availability: availability,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (editingId) {
                await db.collection(COLLECTION)
                    .doc(editingId)
                    .update(resourceData);

                editingId = null;
                form.querySelector('button[type="submit"]').textContent = "Add Resource";
                showMessage("Resource updated successfully!");
            } else {
                resourceData.created_at =
                    firebase.firestore.FieldValue.serverTimestamp();

                await db.collection(COLLECTION).add(resourceData);
                showMessage("Resource added successfully!");
            }

            form.reset();
        } catch (error) {
            console.error("Error saving resource:", error);
            showMessage(
                "Could not save the resource. Check Firestore permissions.",
                true
            );
        }
    });

    // -------------------------------------------------
    // EDIT RESOURCE
    // -------------------------------------------------

    function editResource(resource) {
        editingId = resource.id;

        document.getElementById("resourceName").value = resource.name || "";
        document.getElementById("resourceType").value =
            resource.resource_type || "";
        document.getElementById("resourceLocation").value =
            resource.location || "";
        document.getElementById("resourceQuantity").value =
            resource.quantity ?? 0;
        document.getElementById("resourceAvailability").value =
            resource.availability || "Available";

        form.querySelector('button[type="submit"]').textContent = "Save Changes";
        showMessage("Editing resource. Update the fields and select Save Changes.");

        form.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // -------------------------------------------------
    // DELETE RESOURCE
    // -------------------------------------------------

    async function deleteResource(resource) {
        const confirmed = confirm(
            `Delete "${resource.name}" from emergency resources?`
        );

        if (!confirmed) return;

        try {
            await db.collection(COLLECTION).doc(resource.id).delete();
            showMessage("Resource deleted successfully!");
        } catch (error) {
            console.error("Error deleting resource:", error);
            showMessage(
                "Could not delete the resource. Check Firestore permissions.",
                true
            );
        }
    }

    // Cancel edit if the form is reset.
    form.addEventListener("reset", function () {
        editingId = null;

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = "Add Resource";
        }
    });

    // Start listening for real-time resource updates.
    startResourceListener();

    // Stop the listener if this page is unloaded.
    window.addEventListener("beforeunload", function () {
        if (unsubscribe) unsubscribe();
    });
});
