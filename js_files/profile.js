import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, database } from "./firebaseConfig.js";

const SCHOOL_ID = "southport_high_school";

const profilePictures = [
    "assets/images/profiles/avatar1.png",
    "assets/images/profiles/avatar2.png",
    "assets/images/profiles/avatar3.png",
    "assets/images/profiles/avatar4.png",
    "assets/images/profiles/avatar5.png",
    "assets/images/profiles/avatar6.png",
    "assets/images/profiles/avatar7.png",
    "assets/images/profiles/avatar8.png"
];

const logoutButton = document.querySelector("#logout-button");
const editProfileButton = document.querySelector(".edit-profile-button");
const editProfileModal = document.querySelector("#editProfileModal");
const closeProfileModalButton = document.querySelector(".edit-profile-close");
const editProfileForm = document.querySelector("#editProfileForm");
const submitProfileEdit = document.querySelector(".submit-profile-button");
const profileEditMessage = document.querySelector("#profileEditMessage");
const nameInput = document.querySelector("#profileName");
const profileDescription = document.querySelector("#profileDescription");

const userNameProfile = document.querySelector("#username");
const firstAndLastName = document.querySelector("#firstandlastname");
const descriptionProfile = document.querySelector("#description");
const profileImageElement = document.querySelector(".profile-header img");
const studentHoursEntry = document.querySelector("#studentHours");
const studentPointsEntry = document.querySelector("#studentPoints");
const signedUpEventsContainer = document.querySelector("#signedUpEventsContainer");
const qrContainer = document.querySelector("#qrCodeContainer");

let firebaseUser = null;
let currentProfile = null;
let currentProfileRef = null;

editProfileButton.disabled = true;

function redirectToLogin() {
    window.location.replace("login.html");
}

function getLegacyUserInfo() {
    try {
        return JSON.parse(localStorage.getItem("userinfo")) || {};
    } catch (error) {
        console.warn("Could not read the old local profile cache:", error);
        return {};
    }
}

function syncLegacyLocalStorage() {
    // A few older pages still read localStorage. Keep the cache in sync until those pages move to Firestore too.
    if (!firebaseUser || !currentProfile) return;

    const email = (firebaseUser.email || currentProfile.email || "").trim().toLowerCase();
    if (!email) return;

    const userInfo = getLegacyUserInfo();
    userInfo[email] = {
        ...currentProfile,
        email,
        uid: firebaseUser.uid
    };

    localStorage.setItem("userinfo", JSON.stringify(userInfo));
    localStorage.setItem("currentUser", JSON.stringify(email));
}

function chooseProfileImage(savedImage) {
    if (savedImage) {
        const fileName = savedImage.match(/avatar[1-8]\.png$/i)?.[0];
        if (fileName) {
            return `assets/images/profiles/${fileName.toLowerCase()}`;
        }
    }

    const randomIndex = Math.floor(Math.random() * profilePictures.length);
    return profilePictures[randomIndex];
}

async function makeSureProfileHasDefaults() {
    const updates = {};

    if (!currentProfile.signedUpEvents || typeof currentProfile.signedUpEvents !== "object" || Array.isArray(currentProfile.signedUpEvents)) {
        currentProfile.signedUpEvents = {};
        updates.signedUpEvents = {};
    }

    if (!Array.isArray(currentProfile.likedPosts)) {
        currentProfile.likedPosts = [];
        updates.likedPosts = [];
    }

    if (!Array.isArray(currentProfile.eventsCompleted)) {
        currentProfile.eventsCompleted = [];
        updates.eventsCompleted = [];
    }

    if (typeof currentProfile.hours !== "number") {
        currentProfile.hours = Number(currentProfile.hours) || 0;
        updates.hours = currentProfile.hours;
    }

    if (typeof currentProfile.points !== "number") {
        currentProfile.points = Number(currentProfile.points) || 0;
        updates.points = currentProfile.points;
    }

    const profileImage = chooseProfileImage(currentProfile.profileImage);
    if (profileImage !== currentProfile.profileImage) {
        currentProfile.profileImage = profileImage;
        updates.profileImage = profileImage;
    }

    if (Object.keys(updates).length > 0) {
        await updateDoc(currentProfileRef, updates);
    }
}

function renderProfile() {
    const username = currentProfile.username?.trim() || "Student";
    const description = currentProfile.description?.trim() || "No bio yet.";
    const firstName = currentProfile.firstname?.trim() || "";
    const lastName = currentProfile.lastname?.trim() || "";

    userNameProfile.textContent = username;
    firstAndLastName.textContent = `${firstName} ${lastName}`.trim();
    descriptionProfile.textContent = description;
    profileImageElement.src = currentProfile.profileImage;
    profileImageElement.alt = `${username}'s profile picture`;

    studentHoursEntry.textContent = `Hours: ${currentProfile.hours || 0}`;
    studentPointsEntry.textContent = `Points: ${currentProfile.points || 0}`;
}

function renderQRCode() {
    qrContainer.replaceChildren();

    const email = (firebaseUser?.email || currentProfile?.email || "").trim().toLowerCase();
    if (!email) {
        qrContainer.textContent = "QR code unavailable";
        return;
    }

    if (typeof window.QRCode !== "function") {
        qrContainer.textContent = "QR code failed to load. Refresh the page and try again.";
        console.error("QRCode library did not load.");
        return;
    }

    // The scanner currently uses the member email as the attendance ID, so the QR needs to contain that exact value.
    new window.QRCode(qrContainer, {
        text: email,
        width: 240,
        height: 240,
        correctLevel: window.QRCode.CorrectLevel.M
    });
}

function getStoredEvents() {
    try {
        const eventData = JSON.parse(localStorage.getItem("eventData"));
        return Array.isArray(eventData) ? eventData : [];
    } catch (error) {
        console.warn("Could not read event data:", error);
        return [];
    }
}

function createEventCard(event) {
    const card = document.createElement("div");
    card.className = "profile-event-card";

    const title = document.createElement("h3");
    title.textContent = event.title || "Untitled Event";

    const date = document.createElement("p");
    date.className = "event-date";
    date.textContent = event.date || "Date not set";

    const location = document.createElement("p");
    location.textContent = event.location || "Location not set";

    const time = document.createElement("p");
    const startTime = event.time || "Time not set";
    time.textContent = event.endTime ? `${startTime} - ${event.endTime}` : startTime;

    const link = document.createElement("a");
    link.href = "events.html";
    link.className = "view-event-button";
    link.textContent = "View Event";

    card.append(title, date, location, time, link);
    return card;
}

function renderSignedUpEvents() {
    signedUpEventsContainer.replaceChildren();

    const eventData = getStoredEvents();
    const signedUpEvents = currentProfile.signedUpEvents || {};
    const signedUpIds = new Set(
        Object.entries(signedUpEvents)
            .filter(([, isSignedUp]) => isSignedUp === true)
            .map(([eventId]) => eventId)
    );

    const eventList = eventData.filter((event) => signedUpIds.has(String(event.id)));

    if (eventList.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-state";
        emptyMessage.textContent = "You haven't signed up for any events yet.";
        signedUpEventsContainer.append(emptyMessage);
        return;
    }

    eventList.forEach((event) => {
        signedUpEventsContainer.append(createEventCard(event));
    });
}

function openEditProfileModal() {
    if (!currentProfile) return;

    profileEditMessage.textContent = "";
    nameInput.value = currentProfile.username || "";
    profileDescription.value = currentProfile.description || "";
    editProfileModal.classList.add("active");
    nameInput.focus();
}

function closeEditProfileModal() {
    editProfileModal.classList.remove("active");
    profileEditMessage.textContent = "";
}

editProfileButton.addEventListener("click", openEditProfileModal);
closeProfileModalButton.addEventListener("click", closeEditProfileModal);

editProfileModal.addEventListener("click", (event) => {
    if (event.target === editProfileModal) {
        closeEditProfileModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && editProfileModal.classList.contains("active")) {
        closeEditProfileModal();
    }
});

editProfileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    profileEditMessage.textContent = "";

    if (!currentProfile || !currentProfileRef) return;

    const newUsername = nameInput.value.trim();
    const newDescription = profileDescription.value.trim();

    if (newUsername.length < 2 || newUsername.length > 15) {
        profileEditMessage.textContent = "Your display name must be 2 to 15 characters.";
        return;
    }

    if (newDescription.length > 160) {
        profileEditMessage.textContent = "Your bio must be 160 characters or fewer.";
        return;
    }

    submitProfileEdit.disabled = true;
    submitProfileEdit.textContent = "Saving...";

    try {
        await updateDoc(currentProfileRef, {
            username: newUsername,
            description: newDescription
        });

        currentProfile.username = newUsername;
        currentProfile.description = newDescription;
        syncLegacyLocalStorage();
        renderProfile();
        closeEditProfileModal();
    } catch (error) {
        console.error("Profile update failed:", error);
        profileEditMessage.textContent = "Could not save your changes. Please try again.";
    } finally {
        submitProfileEdit.disabled = false;
        submitProfileEdit.textContent = "Save Changes";
    }
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed:", error);
        logoutButton.disabled = false;
        return;
    }

    localStorage.removeItem("currentUser");
    redirectToLogin();
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        localStorage.removeItem("currentUser");
        redirectToLogin();
        return;
    }

    try {
        const profileRef = doc(database, "schools", SCHOOL_ID, "users", user.uid);
        const profileSnapshot = await getDoc(profileRef);

        if (!profileSnapshot.exists()) {
            console.error("The signed-in user does not have a Firestore profile.");
            await signOut(auth);
            localStorage.removeItem("currentUser");
            redirectToLogin();
            return;
        }

        firebaseUser = user;
        currentProfileRef = profileRef;
        currentProfile = {
            ...profileSnapshot.data(),
            uid: user.uid,
            email: (user.email || profileSnapshot.data().email || "").trim().toLowerCase()
        };

        await makeSureProfileHasDefaults();
        syncLegacyLocalStorage();
        renderProfile();
        renderQRCode();
        renderSignedUpEvents();
        editProfileButton.disabled = false;
    } catch (error) {
        console.error("Could not load profile:", error);
        userNameProfile.textContent = "Could not load profile";
        descriptionProfile.textContent = "Refresh the page or try logging in again.";
    }
});
