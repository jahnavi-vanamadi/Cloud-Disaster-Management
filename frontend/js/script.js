// =====================================================
// DISASTER REPORT FORM
// =====================================================

const disasterForm =
    document.getElementById("disasterForm");

if (disasterForm) {

    disasterForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const disasterType =
                document.getElementById("disasterType").value;

            const location =
                document.getElementById("location").value;

            if (!disasterType || !location) {

                alert(
                    "Please fill in the required information."
                );

                return;
            }

            alert(
                "Disaster report submitted successfully!\n\n" +
                "Type: " + disasterType +
                "\nLocation: " + location
            );

            disasterForm.reset();

        }
    );
}


// =====================================================
// GET USER LOCATION
// =====================================================

function getLocation() {

    if (!navigator.geolocation) {

        alert(
            "Geolocation is not supported by your browser."
        );

        return;
    }


    navigator.geolocation.getCurrentPosition(

        function (position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            alert(
                "Location detected successfully!\n\n" +
                "Latitude: " + latitude +
                "\nLongitude: " + longitude
            );

        },


        function () {

            alert(
                "Unable to access your location."
            );

        }

    );

}


// =====================================================
// SEARCH DISASTERS
// =====================================================

function filterDisasters() {

    const searchInput =
        document.getElementById("searchDisaster");

    if (!searchInput) {
        return;
    }


    const searchValue =
        searchInput.value.toLowerCase();


    const cards =
        document.querySelectorAll(".disaster-card");


    cards.forEach(function (card) {

        const text =
            card.innerText.toLowerCase();


        if (text.includes(searchValue)) {

            card.style.display = "";

        } else {

            card.style.display = "none";

        }

    });

}


// =====================================================
// SIMPLE ADMIN TABLE BUTTONS
// =====================================================

const tableButtons =
    document.querySelectorAll(".table-btn");


tableButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            alert(
                "This feature will be connected to the backend and cloud database later."
            );

        }
    );

});


// =====================================================
// EMERGENCY RESOURCES
// =====================================================

const API_URL =
    "http://127.0.0.1:8000/resources/";


// Store resources in browser memory
let allResources = [];


// =====================================================
// LOAD RESOURCES
// =====================================================

async function loadResources() {

    try {

        const response =
            await fetch(API_URL);


        if (!response.ok) {

            throw new Error(
                "Failed to fetch resources"
            );

        }


        const data =
            await response.json();


        allResources =
            data.resources || [];


        displayResources(
            allResources
        );


        populateFilters(
            allResources
        );


    } catch (error) {

        console.error(
            "Error loading resources:",
            error
        );

    }

}


// =====================================================
// DISPLAY RESOURCES
// =====================================================

function displayResources(resources) {

    const table =
        document.getElementById(
            "resourceTable"
        );


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector("tbody");


    tbody.innerHTML = "";


    resources.forEach(function (resource) {


        const row =
            document.createElement("tr");


        const nameCell =
            document.createElement("td");

        nameCell.textContent =
            resource.name;


        const typeCell =
            document.createElement("td");

        typeCell.textContent =
            resource.resource_type;


        const locationCell =
            document.createElement("td");

        locationCell.textContent =
            resource.location;


        const quantityCell =
            document.createElement("td");

        quantityCell.textContent =
            resource.quantity;


        const statusCell =
            document.createElement("td");


        const status =
            document.createElement("span");


        status.className =
            "status " +
            getStatusClass(
                resource.availability
            );


        status.textContent =
            resource.availability;


        statusCell.appendChild(status);


        // Action buttons

        const actionCell =
            document.createElement("td");


        const actionDiv =
            document.createElement("div");


        actionDiv.className =
            "action-buttons";


        const editButton =
            document.createElement("button");


        editButton.className =
            "edit-btn";


        editButton.textContent =
            "Edit";


        editButton.onclick =
            function () {

                editResource(resource);

            };


        const deleteButton =
            document.createElement("button");


        deleteButton.className =
            "delete-btn";


        deleteButton.textContent =
            "Delete";


        deleteButton.onclick =
            function () {

                deleteResource(
                    resource.id
                );

            };


        actionDiv.appendChild(
            editButton
        );


        actionDiv.appendChild(
            deleteButton
        );


        actionCell.appendChild(
            actionDiv
        );


        row.appendChild(
            nameCell
        );


        row.appendChild(
            typeCell
        );


        row.appendChild(
            locationCell
        );


        row.appendChild(
            quantityCell
        );


        row.appendChild(
            statusCell
        );


        row.appendChild(
            actionCell
        );


        tbody.appendChild(
            row
        );

    });

}


// =====================================================
// STATUS STYLING
// =====================================================

function getStatusClass(status) {

    const value =
        status.toLowerCase();


    if (value === "available") {

        return "resolved-status";

    }


    if (value === "limited") {

        return "active-status";

    }


    return "danger-status";

}


// =====================================================
// SEARCH + FILTER
// =====================================================

function filterResources() {

    const searchInput =
        document.getElementById(
            "searchResource"
        );


    const typeFilter =
        document.getElementById(
            "typeFilter"
        );


    const locationFilter =
        document.getElementById(
            "locationFilter"
        );


    const searchValue =
        searchInput ?
        searchInput.value.toLowerCase() :
        "";


    const selectedType =
        typeFilter ?
        typeFilter.value.toLowerCase() :
        "";


    const selectedLocation =
        locationFilter ?
        locationFilter.value.toLowerCase() :
        "";


    const filtered =
        allResources.filter(
            function (resource) {


                const matchesSearch =

                    resource.name
                        .toLowerCase()
                        .includes(searchValue)

                    ||

                    resource.resource_type
                        .toLowerCase()
                        .includes(searchValue)

                    ||

                    resource.location
                        .toLowerCase()
                        .includes(searchValue);


                const matchesType =

                    !selectedType ||

                    resource.resource_type
                        .toLowerCase() ===
                    selectedType;


                const matchesLocation =

                    !selectedLocation ||

                    resource.location
                        .toLowerCase() ===
                    selectedLocation;


                return (
                    matchesSearch &&
                    matchesType &&
                    matchesLocation
                );

            }
        );


    displayResources(
        filtered
    );

}


// =====================================================
// POPULATE FILTERS
// =====================================================

function populateFilters(resources) {

    const typeFilter =
        document.getElementById(
            "typeFilter"
        );


    const locationFilter =
        document.getElementById(
            "locationFilter"
        );


    if (!typeFilter || !locationFilter) {
        return;
    }


    const types =
        [...new Set(
            resources.map(
                function (resource) {
                    return resource.resource_type;
                }
            )
        )];


    const locations =
        [...new Set(
            resources.map(
                function (resource) {
                    return resource.location;
                }
            )
        )];


    typeFilter.innerHTML =
        '<option value="">All Types</option>';


    locationFilter.innerHTML =
        '<option value="">All Locations</option>';


    types.forEach(function (type) {

        const option =
            document.createElement("option");

        option.value = type;
        option.textContent = type;

        typeFilter.appendChild(
            option
        );

    });


    locations.forEach(function (location) {

        const option =
            document.createElement("option");

        option.value = location;
        option.textContent = location;

        locationFilter.appendChild(
            option
        );

    });

}


// =====================================================
// ADD RESOURCE
// =====================================================

const resourceForm =
    document.getElementById(
        "resourceForm"
    );


if (resourceForm) {


    resourceForm.addEventListener(
        "submit",
        async function (event) {


            event.preventDefault();


            const resource = {

                name:
                    document.getElementById(
                        "resourceName"
                    ).value.trim(),

                resource_type:
                    document.getElementById(
                        "resourceType"
                    ).value.trim(),

                location:
                    document.getElementById(
                        "resourceLocation"
                    ).value.trim(),

                quantity:
                    parseInt(
                        document.getElementById(
                            "resourceQuantity"
                        ).value
                    ),

                availability:
                    document.getElementById(
                        "resourceAvailability"
                    ).value

            };


            try {


                const response =
                    await fetch(
                        API_URL,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    resource
                                )
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Failed to add resource"
                    );

                }


                alert(
                    "Resource added successfully!"
                );


                resourceForm.reset();


                await loadResources();


            } catch (error) {

                console.error(
                    "Error adding resource:",
                    error
                );


                alert(
                    "Failed to add resource."
                );

            }

        }
    );

}


// =====================================================
// EDIT RESOURCE
// =====================================================

async function editResource(resource) {


    const name =
        prompt(
            "Enter resource name:",
            resource.name
        );


    if (name === null) {
        return;
    }


    const type =
        prompt(
            "Enter resource type:",
            resource.resource_type
        );


    if (type === null) {
        return;
    }


    const location =
        prompt(
            "Enter location:",
            resource.location
        );


    if (location === null) {
        return;
    }


    const quantity =
        prompt(
            "Enter quantity:",
            resource.quantity
        );


    if (quantity === null) {
        return;
    }


    const availability =
        prompt(
            "Enter availability (Available / Limited / Unavailable):",
            resource.availability
        );


    if (availability === null) {
        return;
    }


    const updatedResource = {

        name: name,

        resource_type: type,

        location: location,

        quantity:
            parseInt(quantity),

        availability:
            availability

    };


    try {


        const response =
            await fetch(
                API_URL + resource.id,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            updatedResource
                        )
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to update resource"
            );

        }


        alert(
            "Resource updated successfully!"
        );


        loadResources();


    } catch (error) {

        console.error(
            "Error updating resource:",
            error
        );


        alert(
            "Failed to update resource."
        );

    }

}


// =====================================================
// DELETE RESOURCE
// =====================================================

async function deleteResource(resourceId) {


    const confirmed =
        confirm(
            "Are you sure you want to delete this resource?"
        );


    if (!confirmed) {
        return;
    }


    try {


        const response =
            await fetch(
                API_URL + resourceId,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to delete resource"
            );

        }


        alert(
            "Resource deleted successfully!"
        );


        loadResources();


    } catch (error) {

        console.error(
            "Error deleting resource:",
            error
        );


        alert(
            "Failed to delete resource."
        );

    }

}


// =====================================================
// LOAD RESOURCES PAGE
// =====================================================

if (
    window.location.pathname.includes(
        "resources.html"
    )
) {

    loadResources();

}
