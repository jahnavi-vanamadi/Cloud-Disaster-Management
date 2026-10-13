/**
 * ResQCloud Authentication Module
 * Firebase Authentication with role-based access.
 *
 * Public registration roles: Citizen and Responder.
 * Admin access must be assigned manually in Firestore.
 */

// ========================================================
// 1. FRIENDLY ERROR MESSAGES
// ========================================================

function getFriendlyAuthErrorMessage(error) {
    if (!error) return "An unknown error occurred.";

    switch (error.code || "") {
        case "auth/invalid-email":
            return "Please provide a valid email address.";

        case "auth/user-disabled":
            return "This account has been disabled.";

        case "auth/user-not-found":
            return "No account found with this email address.";

        case "auth/wrong-password":
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
            return "Invalid email or password.";

        case "auth/email-already-in-use":
            return "This email already has an account. Please sign in.";

        case "auth/weak-password":
            return "Please use a stronger password of at least 6 characters.";

        case "auth/operation-not-allowed":
            return "Email/Password sign-in is not enabled in Firebase Console.";

        case "auth/network-request-failed":
            return "Network error. Check your internet connection.";

        case "auth/too-many-requests":
            return "Too many unsuccessful attempts. Try again later.";

        default:
            return error.message || "Authentication failed.";
    }
}

// ========================================================
// 2. LOGIN
// ========================================================

async function loginUser(email, password) {
    if (!email || !password) {
        throw new Error("Email and password are required.");
    }

    // Login only. Never automatically create accounts here.
    const result = await window.auth.signInWithEmailAndPassword(
        email.trim(),
        password
    );

    return result.user;
}

// ========================================================
// 3. REGISTRATION
// ========================================================

async function registerUser(name, email, password, role = "Citizen") {
    if (!name || !email || !password) {
        throw new Error("Name, email, and password are required.");
    }

    // Never permit public registration as Admin.
    const allowedRoles = ["Citizen", "Responder"];

    if (!allowedRoles.includes(role)) {
        role = "Citizen";
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Create Firebase Authentication account.
    const result = await window.auth.createUserWithEmailAndPassword(
        cleanEmail,
        password
    );

    const user = result.user;

    // Save the display name.
    try {
        await user.updateProfile({
            displayName: cleanName
        });
    } catch (error) {
        console.warn("Could not update display name:", error);
    }

    // Create the user's Firestore profile.
    // Firestore rules must also enforce the allowed roles.
    await window.db.collection("users").doc(user.uid).set({
        uid: user.uid,
        name: cleanName,
        email: cleanEmail,
        role: role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return user;
}

// ========================================================
// 4. GET ROLE FROM FIRESTORE
// ========================================================

async function getUserRole(user) {
    if (!user) return null;

    try {
        const profile = await window.db
            .collection("users")
            .doc(user.uid)
            .get();

        if (profile.exists) {
            const role = profile.data().role;

            if (["Admin", "Responder", "Citizen"].includes(role)) {
                return role;
            }
        }
    } catch (error) {
        console.error("Could not retrieve the user's Firestore role:", error);
    }

    // Never grant Admin based on an email address.
    // A missing profile must not grant administrator access.
    return "Citizen";
}

// ========================================================
// 5. LOGOUT
// ========================================================

async function logoutUser() {
    await window.auth.signOut();
}

// ========================================================
// 6. NAVBAR AUTHENTICATION
// ========================================================

function syncNavbarAuth(user, role) {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    let container = document.getElementById("navbarAuth");

    if (!container) {
        container = document.createElement("div");
        container.id = "navbarAuth";
        container.className = "navbar-auth-controls";

        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "10px";

        navbar.appendChild(container);
    }

    if (!user) {
        container.innerHTML = `
            <a href="login.html"
               class="primary-btn"
               style="padding:8px 16px;font-size:13px;">
                Sign In
            </a>
        `;
        return;
    }

    const displayRole = role || "Citizen";
    const displayName = user.displayName || user.email || "User";

    const roleColor =
        displayRole === "Admin" ? "#d93025" :
        displayRole === "Responder" ? "#c77c00" :
        "#1769aa";

    // Use textContent for user-provided values where possible.
    container.innerHTML = `
        <span id="navbarUserName"></span>
        <span id="navbarUserRole"
              style="background:${roleColor};color:white;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:bold;">
        </span>
        <button id="navLogoutBtn"
                class="table-btn"
                style="background:#fff0ed;color:#d93025;">
            Logout
        </button>
    `;

    document.getElementById("navbarUserName").textContent =
        "👤 " + displayName;

    document.getElementById("navbarUserRole").textContent =
        displayRole;

    document.getElementById("navLogoutBtn").onclick = async () => {
        try {
            await logoutUser();
            window.location.reload();
        } catch (error) {
            console.error("Logout failed:", error);
            alert("Could not log out. Please try again.");
        }
    };
}

// ========================================================
// 7. PAGE INITIALIZATION AND ADMIN PAGE GUARD
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
    if (!window.auth || !window.db) {
        console.error(
            "ResQCloud: Firebase is not initialized. Check firebase.js and script order."
        );
        return;
    }

    window.auth.onAuthStateChanged(async (user) => {
        let role = null;

        if (user) {
            role = await getUserRole(user);
        }

        syncNavbarAuth(user, role);

        const loginSection = document.getElementById("loginSection");
        const adminContent = document.getElementById("adminContent");
        const logoutButton = document.getElementById("logoutButton");
        const adminUserBadge = document.getElementById("adminUserBadge");
        const loginMessage = document.getElementById("loginMessage");

        // These elements must exist on admin.html for this guard to run.
        if (loginSection && adminContent) {
            if (user && role === "Admin") {
                loginSection.style.display = "none";
                adminContent.style.display = "block";

                if (logoutButton) {
                    logoutButton.style.display = "inline-block";
                }

                if (adminUserBadge) {
                    adminUserBadge.textContent =
                        user.email + " (Role: Admin)";
                }

                if (typeof window.initAdminDashboard === "function") {
                    window.initAdminDashboard();
                }
            } else {
                loginSection.style.display = "block";
                adminContent.style.display = "none";

                if (logoutButton) {
                    logoutButton.style.display = user
                        ? "inline-block"
                        : "none";
                }

                if (loginMessage) {
                    loginMessage.textContent = user
                        ? "Access restricted. An administrator account is required."
                        : "Please sign in with an administrator account.";
                    loginMessage.style.color = "#d93025";
                }
            }
        }
    });

    // ----------------------------------------------------
    // LOGIN FORM
    // ----------------------------------------------------

    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email = document.getElementById("loginEmail")?.value.trim();
            const password = document.getElementById("loginPassword")?.value;
            const submitButton =
                loginForm.querySelector("button[type='submit']");

            if (loginMessage) {
                loginMessage.textContent = "Signing in...";
                loginMessage.style.color = "#1769aa";
            }

            if (submitButton) submitButton.disabled = true;

            try {
                const user = await loginUser(email, password);
                const role = await getUserRole(user);

                if (loginMessage) {
                    loginMessage.textContent = "Login successful!";
                    loginMessage.style.color = "#16834b";
                }

                const params = new URLSearchParams(window.location.search);
                let redirect = params.get("redirect");

                // Do not allow an unprivileged user to redirect to admin.html.
                if (redirect && redirect.includes("admin.html") && role !== "Admin") {
                    redirect = null;
                }

                if (!redirect) {
                    redirect = role === "Admin"
                        ? "admin.html"
                        : "dashboard.html";
                }

                setTimeout(() => {
                    window.location.href = redirect;
                }, 500);
            } catch (error) {
                console.error("Login failed:", error);

                if (loginMessage) {
                    loginMessage.textContent =
                        getFriendlyAuthErrorMessage(error);
                    loginMessage.style.color = "#d93025";
                }
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
    }

    // ----------------------------------------------------
    // REGISTRATION FORM
    // ----------------------------------------------------

    const registerForm = document.getElementById("registerForm");
    const registerMessage = document.getElementById("registerMessage");

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name =
                document.getElementById("registerName")?.value.trim();

            const email =
                document.getElementById("registerEmail")?.value.trim();

            const password =
                document.getElementById("registerPassword")?.value;

            const roleSelect =
                document.getElementById("registerRole");

            let role = roleSelect ? roleSelect.value : "Citizen";

            // Enforce public roles even if someone modifies the HTML.
            if (!["Citizen", "Responder"].includes(role)) {
                role = "Citizen";
            }

            const submitButton =
                registerForm.querySelector("button[type='submit']");

            if (registerMessage) {
                registerMessage.textContent = "Creating your account...";
                registerMessage.style.color = "#1769aa";
            }

            if (submitButton) submitButton.disabled = true;

            try {
                await registerUser(name, email, password, role);

                if (registerMessage) {
                    registerMessage.textContent =
                        `Account created successfully as ${role}!`;
                    registerMessage.style.color = "#16834b";
                }

                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 700);
            } catch (error) {
                console.error("Registration failed:", error);

                if (registerMessage) {
                    registerMessage.textContent =
                        getFriendlyAuthErrorMessage(error);
                    registerMessage.style.color = "#d93025";
                }
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
    }

    // ----------------------------------------------------
    // LOGOUT BUTTON
    // ----------------------------------------------------

    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                await logoutUser();
                window.location.reload();
            } catch (error) {
                console.error("Logout failed:", error);
            }
        });
    }
});

// ========================================================
// 8. PAGE PROTECTION HELPER
// ========================================================

function protectPage({
    requiredRole = null,
    redirectUrl = "login.html"
} = {}) {
    return new Promise((resolve) => {
        if (!window.auth) {
            resolve({
                allowed: false,
                user: null,
                role: null
            });
            return;
        }

        let unsubscribe = null;

        unsubscribe = window.auth.onAuthStateChanged(async (user) => {
            if (!user) {
                if (unsubscribe) unsubscribe();

                if (redirectUrl) {
                    const page = encodeURIComponent(
                        window.location.pathname.split("/").pop()
                    );

                    window.location.href =
                        `${redirectUrl}?redirect=${page}`;
                }

                resolve({
                    allowed: false,
                    user: null,
                    role: null
                });
                return;
            }

            const role = await getUserRole(user);

            const allowed =
                !requiredRole ||
                role === requiredRole ||
                (requiredRole === "Responder" && role === "Admin");

            if (unsubscribe) unsubscribe();

            resolve({
                allowed,
                user,
                role
            });
        });
    });
}

// ========================================================
// 9. GLOBAL FUNCTIONS
// ========================================================

window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.getUserRole = getUserRole;
window.protectPage = protectPage;
window.getFriendlyAuthErrorMessage = getFriendlyAuthErrorMessage;
