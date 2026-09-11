import {
    browserLocalPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signOut
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, database } from "./firebaseConfig.js";

const userEmail = document.querySelector("#email");
const userPassword = document.querySelector("#password");
const rememberCheckbox = document.querySelector("#remember");
const loginForm = document.querySelector("#login-form");
const loginButton = document.querySelector(".login-button");
const passwordToggle = document.querySelector("#password-toggle");
const forgotPasswordLink = document.querySelector(".forgot-password");
const errorDisplayArea = document.querySelector("#login-error");

const SCHOOL_ID = "southport_high_school";
let errorTimer = null;

function showMessage(message, timeout = 4300) {
    clearTimeout(errorTimer);
    errorDisplayArea.textContent = message;
    errorDisplayArea.style.display = "block";

    if (timeout) {
        errorTimer = setTimeout(() => {
            errorDisplayArea.textContent = "";
            errorDisplayArea.style.display = "none";
        }, timeout);
    }
}

function getFriendlyAuthError(error) {
    switch (error.code) {
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
            return "Invalid email or password.";
        case "auth/too-many-requests":
            return "Too many login attempts. Please wait a moment and try again.";
        case "auth/network-request-failed":
            return "Network error. Check your connection and try again.";
        default:
            console.error("Login error:", error);
            return "Something went wrong while logging in. Please try again.";
    }
}

async function loadUserProfile(firebaseUser) {
    const profileRef = doc(database, "schools", SCHOOL_ID, "users", firebaseUser.uid);
    const profileSnapshot = await getDoc(profileRef);

    if (!profileSnapshot.exists()) {
        return null;
    }

    return profileSnapshot.data();
}

function updateLegacyLocalStorage(firebaseUser, profile) {
    // Older pages still read these keys. Keep them updated while we move the app to Firestore.
    const email = (firebaseUser.email || profile.email || "").toLowerCase();
    const userInfo = JSON.parse(localStorage.getItem("userinfo")) || {};

    userInfo[email] = {
        ...profile,
        email,
        uid: firebaseUser.uid
    };

    localStorage.setItem("userinfo", JSON.stringify(userInfo));
    localStorage.setItem("currentUser", JSON.stringify(email));
}

passwordToggle.addEventListener("click", () => {
    const showingPassword = userPassword.type === "text";
    userPassword.type = showingPassword ? "password" : "text";
    passwordToggle.textContent = showingPassword ? "Show" : "Hide";
    passwordToggle.setAttribute("aria-label", showingPassword ? "Show password" : "Hide password");
});

forgotPasswordLink.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = userEmail.value.trim().toLowerCase();
    if (!email) {
        showMessage("Enter your email address first, then click Forgot password.");
        userEmail.focus();
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showMessage("Password reset email sent. Check your inbox.", 6000);
    } catch (error) {
        if (error.code === "auth/invalid-email") {
            showMessage("Please enter a valid email address.");
            return;
        }

        if (error.code === "auth/network-request-failed") {
            showMessage("Network error. Check your connection and try again.");
            return;
        }

        console.error("Password reset error:", error);
        showMessage("Could not send a password reset email. Please try again.");
    }
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearTimeout(errorTimer);

    const email = userEmail.value.trim().toLowerCase();
    const password = userPassword.value;

    if (!email || !password) {
        showMessage("Please enter your email and password.");
        return;
    }

    loginButton.disabled = true;

    try {
        const persistence = rememberCheckbox.checked
            ? browserLocalPersistence
            : browserSessionPersistence;

        await setPersistence(auth, persistence);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const profile = await loadUserProfile(userCredential.user);

        if (!profile) {
            // Auth succeeded, but the app cannot work without its matching Firestore profile.
            await signOut(auth);
            showMessage("Your account exists, but your profile data is missing. Please contact a club officer.", 7000);
            return;
        }

        updateLegacyLocalStorage(userCredential.user, profile);
        window.location.href = "index.html";
    } catch (error) {
        showMessage(getFriendlyAuthError(error));
    } finally {
        loginButton.disabled = false;
    }
});
