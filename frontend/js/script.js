// Disaster Report Form
const disasterForm = document.getElementById("disasterForm");

if (disasterForm) {
    disasterForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const disasterType = document.getElementById("disasterType").value;
        const location = document.getElementById("location").value;

        if (!disasterType || !location) {
            alert("Please fill in the required information.");
            return;
        }

        alert(
            "Disaster report submitted successfully!\n\n" +
            "Type: " + disasterType +
            "\nLocation: " + location
        );

        disasterForm.reset();
    });
}


// Get user's location
function getLocation() {

    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            alert(
                "Location detected successfully!\n\n" +
                "Latitude: " + latitude +
                "\nLongitude: " + longitude
            );

        },

        function () {
            alert("Unable to access your location.");
        }
    );
}


// Search disasters
function filterDisasters() {

    const searchInput = document.getElementById("searchDisaster");

    if (!searchInput) {
        return;
    }

    const searchValue = searchInput.value.toLowerCase();

    const cards = document.querySelectorAll(".disaster-card");

    cards.forEach(function (card) {

        const text = card.innerText.toLowerCase();

        if (text.includes(searchValue)) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }

    });
}


// Simple admin table buttons
const tableButtons = document.querySelectorAll(".table-btn");

tableButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        alert(
            "This feature will be connected to the backend and cloud database later."
        );

    });

});