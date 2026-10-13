/**
 * ResQCloud Authentication & Security Module (Module 1)
 * Provides Firebase Authentication (login, registration, logout),
 * role-based access control, session observation, and page protection guards.
 * Works seamlessly via file:/// and http:// / https://.
 */

// ========================================================
// 1. ERROR MESSAGE HELPER
// ========================================================

function getFriendlyAuthErrorMessage(error) {
    if (!error) return "An unknown error occurred.";
    const code = error.code || "";

    switch (code) {
        case "auth/invalid-email":
            return "Please provide a valid email address.";
        case "auth/user-disabled":
            return "This user account has been disabled.";
        case "auth/user-not-found":
            return "No account found with this email address.";
        case "auth/wrong-password":
            return "Incorrect password. Please try again.";
        case "auth/invalid-credential":
        case "INVALID_LOGIN_CREDENTIALS":
            return "Invalid login credentials. Please check your email and password.";
        case "auth/email-already-in-use":
            return "An account with this email address already exists. Try signing in.";
        case "auth/weak-password":
            return "Password is too weak. Please use at least 6 characters.";
        case "auth/operation-not-allowed":
            return "Email/Password sign-in is not enabled in Firebase Console.";
        case "auth/network-request-failed":
            return "Network connection failed. Please check your internet connection.";
        case "auth/too-many-requests":
            return "Too many unsuccessful attempts. Access temporarily blocked. Try again later.";
        default:
            return error.message || "Authentication failed. Please check your inputs.";
    }
}

// ========================================================
// 2. CORE AUTHENTICATION FUNCTIONS
// ========================================================

/**
 * Sign in a user with email and password.
 * If demo credentials are used for the first time, auto-provisions the account.
 */
async function loginUser(email, password) {
    if (!email || !password) {
        throw new Error("Both email and password are required.");
    }

    const cleanEmail = email.trim();

    try {
        const userCredential = await window.auth.signInWithEmailAndPassword(cleanEmail, password);
        return userCredential.user;
    } catch (error) {
        const code = error.code || "";
        const lowerEmail = cleanEmail.toLowerCase();

        // If a demo account has not been registered yet in Firebase, auto-register it!
        if (
            (code === "auth/user-not-found" || code === "auth/invalid-credential" || error.message.includes("INVALID_LOGIN_CREDENTIALS")) &&
            (lowerEmail.includes("resqcloud.org") || lowerEmail.includes("admin") || lowerEmail.includes("citizen") || lowerEmail.includes("responder"))
        ) {
            console.log("Demo user not found. Auto-registering demo account for first-time setup...");
            let role = "Citizen";
            let displayName = "ResQCloud User";

            if (lowerEmail.includes("admin")) {
                role = "Admin";
                displayName = "Administrator";
            } else if (lowerEmail.includes("responder")) {
                role = "Responder";
                displayName = "First Responder";
            } else {
                displayName = "Citizen Reporter";
            }

            try {
                return await registerUser(displayName, cleanEmail, password, role);
            } catch (regErr) {
                console.warn("Auto-provision fallback failed:", regErr);
                throw error;
            }
        }
        throw error;
    }
}

/**
 * Register a new user with full name, email, password, and role.
 * Stores user document in Cloud Firestore 'users' collection.
 */
async function registerUser(name, email, password, role = "Citizen") {
    if (!email || !password || !name) {
        throw new Error("Name, email, and password are required.");
    }

    const cleanEmail = email.trim();
    const cleanName = name.trim();

    // 1. Create account in Firebase Auth
    const userCredential = await window.auth.createUserWithEmailAndPassword(cleanEmail, password);
    const user = userCredential.user;

    // 2. Update display name in Firebase Auth
    try {
        await user.updateProfile({ displayName: cleanName });
    } catch (err) {
        console.warn("Could not update auth display name:", err);
    }

    // 3. Save user profile document in Firestore 'users/{uid}'
    try {
        await window.db.collection("users").doc(user.uid).set({
            uid: user.uid,
            name: cleanName,
            email: cleanEmail.toLowerCase(),
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Firestore user profile created for ${user.email} (Role: ${role})`);
    } catch (err) {
        console.warn("Could not write user profile to Firestore (may be restricted by security rules):", err);
    }

    return user;
}

/**
 * Sign out the currently authenticated user
 */
async function logoutUser() {
    await window.auth.signOut();
    console.log("User signed out successfully.");
}

/**
 * Retrieve user's role from Firestore 'users/{uid}' with email fallback
 */
async function getUserRole(user) {
    if (!user) return null;

    try {
        const docSnap = await window.db.collection("users").doc(user.uid).get();
        if (docSnap.exists && docSnap.data().role) {
            return docSnap.data().role;
        }
    } catch (err) {
        console.warn("Error retrieving role from Firestore:", err);
    }

    // Fallback: check email address for admin designation
    if (user.email && (user.email.toLowerCase().includes("admin") || user.email.toLowerCase().startsWith("admin@"))) {
        return "Admin";
    }

    return "Citizen";
}

// ========================================================
// 3. NAVBAR AUTHENTICATION SYNC
// ========================================================

function syncNavbarAuth(user, role) {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    let authContainer = document.getElementById("navbarAuth");
    if (!authContainer) {
        authContainer = document.createElement("div");
        authContainer.id = "navbarAuth";
        authContainer.className = "navbar-auth-controls";
        authContainer.style.display = "flex";
        authContainer.style.alignItems = "center";
        authContainer.style.gap = "10px";
        navbar.appendChild(authContainer);
    }

    if (user) {
        const displayRole = role || (user.email && user.email.includes("admin") ? "Admin" : "Citizen");
        const displayName = user.displayName || user.email.split("@")[0];
        const roleColor = displayRole === "Admin" ? "#d93025" : displayRole === "Responder" ? "#c77c00" : "#1769aa";

        authContainer.innerHTML = `
            <div class="user-pill" style="display: flex; align-items: center; gap: 8px; font-size: 13px; background: #eef7ff; padding: 6px 14px; border-radius: 20px; border: 1px solid #dce5eb;">
                <span title="${user.email}">👤 <strong>${displayName}</strong></span>
                <span class="role-badge" style="background: ${roleColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">
                    ${displayRole}
                </span>
            </div>
            <button id="navLogoutBtn" class="table-btn" style="background: #fff0ed; color: #d93025; font-weight: bold; border: 1px solid #ffccd2; padding: 6px 12px;">
                Logout
            </button>
        `;

        const navLogoutBtn = document.getElementById("navLogoutBtn");
        if (navLogoutBtn) {
            navLogoutBtn.onclick = async () => {
                await logoutUser();
                window.location.reload();
            };
        }
    } else {
        authContainer.innerHTML = `
            <a href="login.html" class="primary-btn" style="padding: 8px 16px; font-size: 13px;">
                Sign In
            </a>
        `;
    }
}

// ========================================================
// 4. AUTO-INITIALIZE DOM & PAGE GUARDS
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
    if (!window.auth) {
        console.error("Auth module: window.auth is not initialized.");
        return;
    }

    // 1. Observe Firebase Auth state
    window.auth.onAuthStateChanged(async (user) => {
        let role = null;
        if (user) {
            role = await getUserRole(user);
        }

        // Update navigation bar
        syncNavbarAuth(user, role);

        // Guard admin.html if present
        const loginSection = document.getElementById("loginSection");
        const adminContent = document.getElementById("adminContent");
        const logoutButton = document.getElementById("logoutButton");
        const adminUserBadge = document.getElementById("adminUserBadge");

        if (loginSection && adminContent) {
            if (user) {
                // Check if user is an Administrator
                if (role === "Admin" || (user.email && user.email.toLowerCase().includes("admin"))) {
                    loginSection.style.display = "none";
                    adminContent.style.display = "block";
                    if (logoutButton) logoutButton.style.display = "inline-block";
                    if (adminUserBadge) {
                        adminUserBadge.textContent = `${user.email} (Role: ${role})`;
                    }
                    if (typeof window.initAdminDashboard === "function") {
                        window.initAdminDashboard();
                    }
                } else {
                    // Non-admin user signed in: show access restricted message
                    loginSection.style.display = "block";
                    adminContent.style.display = "none";
                    if (logoutButton) logoutButton.style.display = "inline-block";

                    const loginMessage = document.getElementById("loginMessage");
                    if (loginMessage) {
                        loginMessage.style.color = "#d93025";
                        loginMessage.innerHTML = `
                            ⛔ <strong>Access Restricted:</strong> Signed in as <em>${user.email}</em> (${role}).<br>
                            This area requires Administrator privileges.
                            <button onclick="logoutUser().then(() => window.location.reload())" class="table-btn" style="margin-top: 8px; display: block;">
                                Sign Out & Switch Account
                            </button>
                        `;
                    }
                }
            } else {
                // Unauthenticated visitor
                loginSection.style.display = "block";
                adminContent.style.display = "none";
                if (logoutButton) logoutButton.style.display = "none";
            }
        }
    });

    // 2. Wire up Login Form if present
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const emailInput = document.getElementById("loginEmail");
            const passwordInput = document.getElementById("loginPassword");
            const submitBtn = loginForm.querySelector("button[type='submit']");

            if (!emailInput || !passwordInput) return;

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (loginMessage) {
                loginMessage.style.color = "#1769aa";
                loginMessage.textContent = "Authenticating with secure cloud service...";
            }
            if (submitBtn) submitBtn.disabled = true;

            try {
                const user = await loginUser(email, password);
                const role = await getUserRole(user);

                if (loginMessage) {
                    loginMessage.style.color = "#16834b";
                    loginMessage.textContent = `Login successful as ${role}! Redirecting...`;
                }

                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get("redirect") || (role === "Admin" ? "admin.html" : "dashboard.html");

                // If already on admin.html, page updates reactively
                if (window.location.pathname.includes("admin.html")) {
                    // onAuthStateChanged will handle visibility
                } else {
                    setTimeout(() => {
                        window.location.href = redirect;
                    }, 500);
                }
            } catch (error) {
                console.error("Login failed:", error);
                if (loginMessage) {
                    loginMessage.style.color = "#d93025";
                    loginMessage.textContent = getFriendlyAuthErrorMessage(error);
                }
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 3. Wire up Register Form if present
    const registerForm = document.getElementById("registerForm");
    const registerMessage = document.getElementById("registerMessage");
    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const nameInput = document.getElementById("registerName");
            const emailInput = document.getElementById("registerEmail");
            const passwordInput = document.getElementById("registerPassword");
            const roleSelect = document.getElementById("registerRole");
            const submitBtn = registerForm.querySelector("button[type='submit']");

            if (!nameInput || !emailInput || !passwordInput) return;

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const role = roleSelect ? roleSelect.value : "Citizen";

            if (registerMessage) {
                registerMessage.style.color = "#1769aa";
                registerMessage.textContent = "Creating your account and configuring cloud permissions...";
            }
            if (submitBtn) submitBtn.disabled = true;

            try {
                await registerUser(name, email, password, role);
                if (registerMessage) {
                    registerMessage.style.color = "#16834b";
                    registerMessage.textContent = `Account created successfully as ${role}! Redirecting...`;
                }

                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get("redirect") || (role === "Admin" ? "admin.html" : "dashboard.html");

                setTimeout(() => {
                    window.location.href = redirect;
                }, 800);
            } catch (error) {
                console.error("Registration failed:", error);
                if (registerMessage) {
                    registerMessage.style.color = "#d93025";
                    registerMessage.textContent = getFriendlyAuthErrorMessage(error);
                }
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 4. Wire up Logout Buttons
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                await logoutUser();
                window.location.reload();
            } catch (error) {
                console.error("Logout error:", error);
            }
        });
    }
});

/**
 * Guard function to protect pages requiring authentication and roles
 */
function protectPage({ requiredRole = null, redirectUrl = "login.html" } = {}) {
    return new Promise((resolve) => {
        if (!window.auth) {
            resolve({ allowed: false, user: null, role: null });
            return;
        }
        window.auth.onAuthStateChanged(async (user) => {
            if (!user) {
                if (redirectUrl) {
                    const current = encodeURIComponent(window.location.pathname.split("/").pop());
                    window.location.href = `${redirectUrl}?redirect=${current}`;
                }
                resolve({ allowed: false, user: null, role: null });
                return;
            }
            const role = await getUserRole(user);
            if (requiredRole && role !== requiredRole && !(requiredRole === "Responder" && role === "Admin")) {
                resolve({ allowed: false, user, role });
                return;
            }
            resolve({ allowed: true, user, role });
        });
    });
}

// Expose globally for inline scripts & test suite
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.getUserRole = getUserRole;
window.protectPage = protectPage;
window.getFriendlyAuthErrorMessage = getFriendlyAuthErrorMessage;
