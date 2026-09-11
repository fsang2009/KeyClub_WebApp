import {
    createUserWithEmailAndPassword,
    deleteUser
} from "firebase/auth";
import {
    deleteDoc,
    doc,
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import { auth, database } from "./firebaseConfig.js";

const signupForm = document.querySelector("#signup-form");
const userFirstName = document.querySelector("#first-name");
const userLastName = document.querySelector("#last-name");
const userEmail = document.querySelector("#email");
const userSchool = document.querySelector("#school");
const userGrade = document.querySelector("#grade");
const schoolCodeGroup = document.querySelector("#school-code-group");
const userSchoolCode = document.querySelector("#school-code");
const userDisplayName = document.querySelector("#username");
const userPassword = document.querySelector("#password");
const confirmUserPassword = document.querySelector("#confirm-password");
const termsCheckbox = document.querySelector("#terms");
const createAccountButton = document.querySelector(".create-account-button");

const errorMessageFill = document.querySelector("#fill-signup-error");
const errorMessagePasswordCheck = document.querySelector("#password-check-signup-error");
const errorMessageEmailCheck = document.querySelector("#email-check-signup-error");
const errorMessageFirstNameCheck = document.querySelector("#firstname-check-signup-error");
const errorMessageLastNameCheck = document.querySelector("#lastname-check-signup-error");
const errorMessageSchoolCode = document.querySelector("#school-code-signup-error");
const userDisplayErrorMessage = document.querySelector("#displayname-check-signup-error");
const errorMessageRegisterCheck = document.querySelector("#register-error-check");

// Add another school ID here later if that school should require its own access code.
const SCHOOLS_REQUIRING_CODE = new Set([
    "southport_high_school"
]);

const PUBLIC_EMAIL_DOMAINS = new Set([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "icloud.com",
    "outlook.com",
    "hotmail.com",
    "aol.com",
    "proton.me",
    "protonmail.com"
]);

// Short words are only blocked when the whole cleaned name matches them.
// That keeps real names such as Cassidy from being caught by a word like "ass".
const BLOCKED_EXACT = new Set([
    "nigger", "nigga", "nigg", "niga", "coon", "spic", "kike", "chink", "gook", "wetback", "raghead",
    "fag", "faggot", "dyke", "tranny", "retard", "retarded",
    "fuck", "fuk", "fck", "fuc", "shit", "bitch", "ass", "asshole", "arse", "arsehole", "bastard",
    "cunt", "dick", "cock", "penis", "vagina", "pussy", "boob", "boobs", "tit", "tits", "cum", "semen",
    "whore", "slut", "hoe", "bullshit", "jackass", "dipshit", "douche", "douchebag", "wanker", "tosser", "twat", "prick",
    "porn", "sex", "sexy", "horny", "anal", "blowjob", "handjob", "dildo", "vibrator", "orgasm", "rape", "rapist", "hentai",
    "hitler", "nazi", "isis", "terrorist", "kkk",
    "meth", "heroin", "cocaine", "crack", "weed", "marijuana", "xanax", "fentanyl",
    "suicide", "murder"
]);

// These are long enough that checking inside a username is unlikely to reject an innocent name.
const BLOCKED_FRAGMENTS = [
    "motherfuck",
    "asshole",
    "arsehole",
    "douchebag",
    "bullshit",
    "blowjob",
    "handjob",
    "vibrator",
    "hentai",
    "faggot",
    "nigger"
];

const FILTER_CONVERTER = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "8": "b",
    "$": "s",
    "@": "a",
    "!": "i"
};

function showError(element, message) {
    element.textContent = message;
    element.style.display = "block";
}

function clearError(element) {
    element.textContent = "";
    element.style.display = "none";
}

function clearAllErrors() {
    [
        errorMessageFill,
        errorMessagePasswordCheck,
        errorMessageEmailCheck,
        errorMessageFirstNameCheck,
        errorMessageLastNameCheck,
        errorMessageSchoolCode,
        userDisplayErrorMessage,
        errorMessageRegisterCheck
    ].forEach(clearError);
}

function cleanForFilter(value) {
    const basic = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9$@!]/g, "");

    const converted = [...basic]
        .map((character) => FILTER_CONVERTER[character] || character)
        .join("");

    // Turns things like fuuuuck into fuck before checking it.
    return converted.replace(/(.)\1{2,}/g, "$1");
}

function isInappropriate(value) {
    if (!value) return false;

    const cleanedWholeValue = cleanForFilter(value);
    const cleanedParts = value
        .split(/[\s._-]+/)
        .map(cleanForFilter)
        .filter(Boolean);

    const candidates = [cleanedWholeValue, ...cleanedParts];

    if (candidates.some((candidate) => BLOCKED_EXACT.has(candidate))) {
        return true;
    }

    return candidates.some((candidate) =>
        BLOCKED_FRAGMENTS.some((fragment) => candidate.includes(fragment))
    );
}

function isValidPersonName(value) {
    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.length > 30) return false;

    // Letters, spaces, apostrophes and hyphens cover normal names without allowing random symbols.
    return /^[\p{L}][\p{L}' -]*$/u.test(trimmed);
}

function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

function getEmailDomain(email) {
    const parts = normalizeEmail(email).split("@");
    return parts.length === 2 ? parts[1] : "";
}

function isAllowedSchoolEmail(email) {
    const domain = getEmailDomain(email);
    if (!domain || !domain.includes(".")) return false;

    // For now we reject common personal providers. If the club later wants one exact
    // school domain, this is the one function to tighten.
    return !PUBLIC_EMAIL_DOMAINS.has(domain);
}

function schoolRequiresAccessCode(schoolId) {
    return SCHOOLS_REQUIRING_CODE.has(schoolId);
}

function updateSchoolCodeField() {
    const needsCode = schoolRequiresAccessCode(userSchool.value);

    schoolCodeGroup.hidden = !needsCode;
    userSchoolCode.required = needsCode;

    if (!needsCode) {
        userSchoolCode.value = "";
        clearError(errorMessageSchoolCode);
    }
}

function validateSchoolCode() {
    clearError(errorMessageSchoolCode);

    if (!schoolRequiresAccessCode(userSchool.value)) {
        return true;
    }

    if (!userSchoolCode.value.trim()) {
        showError(errorMessageSchoolCode, "Enter your school's access code.");
        return false;
    }

    return true;
}

function validateFirstName() {
    const value = userFirstName.value.trim();
    clearError(errorMessageFirstNameCheck);

    if (!value) return true;

    if (!isValidPersonName(value)) {
        showError(errorMessageFirstNameCheck, "Use 2–30 letters. Apostrophes, spaces and hyphens are okay.");
        return false;
    }

    if (isInappropriate(value)) {
        showError(errorMessageFirstNameCheck, "Please use an appropriate name.");
        return false;
    }

    return true;
}

function validateLastName() {
    const value = userLastName.value.trim();
    clearError(errorMessageLastNameCheck);

    if (!value) return true;

    if (!isValidPersonName(value)) {
        showError(errorMessageLastNameCheck, "Use 2–30 letters. Apostrophes, spaces and hyphens are okay.");
        return false;
    }

    if (isInappropriate(value)) {
        showError(errorMessageLastNameCheck, "Please use an appropriate name.");
        return false;
    }

    return true;
}

function validateDisplayName() {
    const value = userDisplayName.value.trim();
    clearError(userDisplayErrorMessage);

    if (!value) return true;

    if (value.length < 2 || value.length > 15) {
        showError(userDisplayErrorMessage, "Display names must be 2–15 characters.");
        return false;
    }

    if (isInappropriate(value)) {
        showError(userDisplayErrorMessage, "Please use an appropriate display name.");
        return false;
    }

    return true;
}

function validateEmail() {
    const value = normalizeEmail(userEmail.value);
    clearError(errorMessageEmailCheck);

    if (!value) return true;

    if (!userEmail.validity.valid) {
        showError(errorMessageEmailCheck, "Please enter a valid email address.");
        return false;
    }

    if (!isAllowedSchoolEmail(value)) {
        showError(errorMessageEmailCheck, "Please enter your school email address.");
        return false;
    }

    return true;
}

function setButtonLoading(isLoading) {
    createAccountButton.disabled = isLoading;

    const text = createAccountButton.querySelector("span:first-child");
    if (text) {
        text.textContent = isLoading ? "Creating account..." : "Create my account";
    }
}

function getFriendlySignupError(error) {
    switch (error.code) {
        case "auth/email-already-in-use":
            return "An account already uses this email. Try logging in instead.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/weak-password":
        case "auth/password-does-not-meet-requirements":
            return "Your password does not meet the account requirements.";
        case "auth/operation-not-allowed":
            return "Email/password sign-up is not enabled yet. Please contact a club officer.";
        case "auth/network-request-failed":
            return "Network error. Check your connection and try again.";
        case "auth/too-many-requests":
            return "Too many attempts. Wait a moment and try again.";
        case "permission-denied":
            return "Your account could not finish setting up. Please try again or contact a club officer.";
        default:
            console.error("Signup error:", error);
            return "Something went wrong while creating your account. Please try again.";
    }
}

function syncLegacyLocalStorage(firebaseUser, profile) {
    // A few pages still use this cache while the Firebase migration is being finished.
    const email = normalizeEmail(firebaseUser.email || profile.email || "");
    if (!email) return;

    let userInfo = {};
    try {
        userInfo = JSON.parse(localStorage.getItem("userinfo")) || {};
    } catch (error) {
        console.warn("Could not read the old local account cache:", error);
    }

    userInfo[email] = {
        ...profile,
        email,
        uid: firebaseUser.uid
    };

    localStorage.setItem("userinfo", JSON.stringify(userInfo));
    localStorage.setItem("currentUser", JSON.stringify(email));
}

userFirstName.addEventListener("input", validateFirstName);
userLastName.addEventListener("input", validateLastName);
userDisplayName.addEventListener("input", validateDisplayName);
userEmail.addEventListener("input", validateEmail);
userSchool.addEventListener("change", () => {
    updateSchoolCodeField();
    validateSchoolCode();
});
userSchoolCode.addEventListener("input", () => clearError(errorMessageSchoolCode));

// Keep the field correct if the browser restores a previous school selection.
updateSchoolCodeField();

for (const toggleButton of document.querySelectorAll("[data-password-toggle]")) {
    toggleButton.addEventListener("click", () => {
        const input = document.getElementById(toggleButton.dataset.passwordToggle);
        if (!input) return;

        const shouldShow = input.type === "password";
        input.type = shouldShow ? "text" : "password";
        toggleButton.textContent = shouldShow ? "Hide" : "Show";
        toggleButton.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
    });
}

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAllErrors();

    const firstName = userFirstName.value.trim();
    const lastName = userLastName.value.trim();
    const email = normalizeEmail(userEmail.value);
    const school = userSchool.value.trim();
    const grade = userGrade.value.trim();
    const schoolCode = userSchoolCode.value.trim();
    const username = userDisplayName.value.trim();
    const password = userPassword.value;
    const confirmedPassword = confirmUserPassword.value;

    if (!firstName || !lastName || !email || !school || !grade || !username || !password || !confirmedPassword) {
        showError(errorMessageFill, "Please fill in every required field.");
        return;
    }

    const namesAreValid = validateFirstName() && validateLastName();
    const displayNameIsValid = validateDisplayName();
    const emailIsValid = validateEmail();
    const schoolCodeIsValid = validateSchoolCode();

    if (!namesAreValid || !displayNameIsValid || !emailIsValid || !schoolCodeIsValid) {
        return;
    }

    if (password.length < 6) {
        showError(errorMessagePasswordCheck, "Password must be at least 6 characters long.");
        return;
    }

    if (password !== confirmedPassword) {
        showError(errorMessagePasswordCheck, "Passwords do not match.");
        return;
    }

    if (!termsCheckbox.checked) {
        showError(errorMessageFill, "Please agree to the community guidelines before creating your account.");
        return;
    }

    setButtonLoading(true);

    let createdUser = null;
    let profileCreated = false;
    let signupAccessRef = null;
    let signupAccessApproved = false;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        createdUser = userCredential.user;

        if (schoolRequiresAccessCode(school)) {
            // Firestore checks this code against the school's private code field.
            // The code is never placed in the member profile or saved in localStorage.
            signupAccessRef = doc(database, "schools", school, "signupAccess", createdUser.uid);

            await setDoc(signupAccessRef, {
                uid: createdUser.uid,
                school,
                code: schoolCode,
                createdAt: serverTimestamp()
            });

            signupAccessApproved = true;
        }

        const profileRef = doc(database, "schools", school, "users", createdUser.uid);
        const profile = {
            uid: createdUser.uid,
            firstname: firstName,
            lastname: lastName,
            email,
            school,
            grade,
            username,
            description: "",
            profileImage: "",
            role: "member",
            isAdmin: false,
            signedUpEvents: {},
            hours: 0,
            points: 0,
            likedPosts: [],
            eventsCompleted: [],
            createdAt: serverTimestamp()
        };

        await setDoc(profileRef, profile);
        profileCreated = true;

        // The temporary access check is no longer needed once the profile exists.
        if (signupAccessRef) {
            try {
                await deleteDoc(signupAccessRef);
            } catch (cleanupError) {
                console.warn("Could not remove the temporary school access check:", cleanupError);
            }
        }

        // Keep the old cache only after Firebase has finished successfully.
        syncLegacyLocalStorage(createdUser, {
            ...profile,
            createdAt: null
        });

        window.location.replace("profile.html");
    } catch (error) {
        const schoolCodeWasRejected =
            schoolRequiresAccessCode(school)
            && error.code === "permission-denied"
            && !signupAccessApproved;

        // Clean up the temporary code check before removing an incomplete Auth account.
        if (signupAccessRef && !profileCreated) {
            try {
                await deleteDoc(signupAccessRef);
            } catch (cleanupError) {
                // A rejected code never created this document, so this can safely fail.
            }
        }

        // Firebase Auth signs the user in immediately. If setup fails afterward,
        // remove that half-created account so the student can safely try again.
        if (createdUser && !profileCreated) {
            try {
                await deleteUser(createdUser);
            } catch (cleanupError) {
                console.error("Could not remove the incomplete Firebase account:", cleanupError);
            }
        }

        if (schoolCodeWasRejected) {
            showError(errorMessageSchoolCode, "That school access code is incorrect.");
            return;
        }

        const message = getFriendlySignupError(error);

        if (error.code === "auth/email-already-in-use" || error.code === "auth/invalid-email") {
            showError(errorMessageEmailCheck, message);
        } else if (error.code === "auth/weak-password" || error.code === "auth/password-does-not-meet-requirements") {
            showError(errorMessagePasswordCheck, message);
        } else {
            showError(errorMessageRegisterCheck, message);
        }
    } finally {
        setButtonLoading(false);
    }
});
