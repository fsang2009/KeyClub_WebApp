import { onAuthStateChanged } from "firebase/auth";
import {
    addDoc,
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch
} from "firebase/firestore";
import { auth, database } from "./firebaseConfig.js";

const SCHOOL_ID = "southport_high_school";

const eventArea = document.querySelector(".event-grid");
const eventModal = document.querySelector("#eventModal");
const addEventModal = document.querySelector("#addEventModal");
const addEventButton = document.querySelector(".add-event-button");
const signUpButton = document.querySelector("#signupButton");
const externalSignupLink = document.querySelector("#externalSignupLink");
const editEventButton = document.querySelector("#editEventButton");
const deleteEventButton = document.querySelector("#deleteEventButton");
const submitEventButton = document.querySelector(".submit-event-button");
const eventForm = document.querySelector(".add-event-form");
const eventFormMessage = document.querySelector("#eventFormMessage");
const eventEditorTitle = document.querySelector("#eventEditorTitle");

const eventTitle = document.querySelector("#eventTitle");
const eventDate = document.querySelector("#eventDate");
const eventTime = document.querySelector("#eventTime");
const eventEndTime = document.querySelector("#eventEndTime");
const eventLocation = document.querySelector("#eventLocation");
const eventDescription = document.querySelector("#eventDescription");
const eventSignupLink = document.querySelector("#eventSignupLink");

const chatSection = document.querySelector("#chatSection");
const chatMessages = document.querySelector("#chatMessages");
const chatInput = document.querySelector("#chatInput");
const chatSendButton = document.querySelector(".chat-send");

let firebaseUser = null;
let currentProfile = null;
let currentProfileRef = null;
let currentEventID = "";
let eventData = [];
let isAdmin = false;
let eventsUnsubscribe = null;
let chatUnsubscribe = null;

function redirectToLogin() {
    window.location.replace("login.html");
}

function userIsAdmin(profile) {
    // Admin accounts are marked in Firestore with role: "admin" (or isAdmin: true for older accounts).
    // Hiding buttons is only the UI layer. Firestore rules are what actually block unauthorized writes.
    return profile?.role === "admin" || profile?.isAdmin === true;
}

function showAdminControls(allowed) {
    document.querySelectorAll("[data-admin-only]").forEach((element) => {
        element.hidden = !allowed;
    });
}

function syncLegacyProfileCache() {
    // Older pages still read localStorage, so keep a temporary cache until those pages are migrated too.
    if (!firebaseUser || !currentProfile) return;

    let users = {};
    try {
        users = JSON.parse(localStorage.getItem("userinfo")) || {};
    } catch {
        users = {};
    }

    const email = (firebaseUser.email || currentProfile.email || "").toLowerCase();
    if (!email) return;

    users[email] = {
        ...users[email],
        ...currentProfile,
        email
    };

    localStorage.setItem("userinfo", JSON.stringify(users));
    localStorage.setItem("currentUser", JSON.stringify(email));
}

function syncLegacyEventCache() {
    // Calendar, home, profile and admin still use this cache for now.
    localStorage.setItem("eventData", JSON.stringify(eventData));
}

function convertTo12Hour(timeString) {
    if (!timeString) return "";

    const [hoursText, minutesText] = timeString.split(":");
    let hours = Number(hoursText);
    const minutes = Number(minutesText);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return timeString;

    const suffix = hours >= 12 ? "PM" : "AM";
    hours %= 12;
    if (hours === 0) hours = 12;

    return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function convertTo24Hour(timeString) {
    if (!timeString) return "";
    if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;

    const match = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return "";

    let hours = Number(match[1]);
    const minutes = match[2];
    const suffix = match[3].toUpperCase();

    if (suffix === "AM" && hours === 12) hours = 0;
    if (suffix === "PM" && hours !== 12) hours += 12;

    return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function timeToMinutes(timeString) {
    if (!timeString) return NaN;
    const [hours, minutes] = timeString.split(":").map(Number);
    return (hours * 60) + minutes;
}

function cleanSignupLink(value) {
    const trimmed = value.trim();
    if (!trimmed) return "";

    try {
        const url = new URL(trimmed);
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        return url.href;
    } catch {
        return null;
    }
}

function showEventFormMessage(message, type = "error") {
    eventFormMessage.textContent = message;
    eventFormMessage.dataset.type = type;
    eventFormMessage.style.display = message ? "block" : "none";
}

function resetEventForm() {
    eventForm.reset();
    submitEventButton.dataset.editMode = "false";
    submitEventButton.textContent = "Create Event";
    eventEditorTitle.textContent = "Add New Event";
    showEventFormMessage("");
}

function createEventCard(event) {
    const card = document.createElement("div");
    card.className = "event";
    card.dataset.eventId = event.id;

    const title = document.createElement("h2");
    title.textContent = event.title || "Untitled Event";

    const description = document.createElement("p");
    description.textContent = event.description || "";

    const button = document.createElement("button");
    button.className = "event-view-button";
    button.textContent = event.signupLink ? "View & Sign Up" : "Sign Up & View";

    card.append(title, description, button);
    return card;
}

function renderEvents() {
    eventArea.replaceChildren();

    if (eventData.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No upcoming events yet.";
        eventArea.append(empty);
        return;
    }

    eventData.forEach((event) => eventArea.append(createEventCard(event)));
}

function stopChatListener() {
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }
    chatMessages.replaceChildren();
}

function renderChatMessage(message) {
    const row = document.createElement("div");
    row.className = "chat-message";

    const user = document.createElement("span");
    user.className = "chat-user";
    user.textContent = `${message.username || "Member"}: `;

    const text = document.createElement("span");
    text.className = "chat-text";
    text.textContent = message.text || "";

    row.append(user, text);
    return row;
}

function startChatListener(eventId) {
    stopChatListener();

    const messagesRef = collection(
        database,
        "schools",
        SCHOOL_ID,
        "events",
        eventId,
        "messages"
    );

    const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));

    chatUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        chatMessages.replaceChildren();
        snapshot.forEach((messageDoc) => {
            chatMessages.append(renderChatMessage(messageDoc.data()));
        });
    }, (error) => {
        console.error("Could not load event chat:", error);
    });
}

function updateSignupArea(event) {
    const hasExternalSignup = Boolean(event.signupLink);

    signUpButton.hidden = hasExternalSignup;
    externalSignupLink.hidden = !hasExternalSignup;

    if (hasExternalSignup) {
        externalSignupLink.href = event.signupLink;
        chatSection.style.display = "none";
        stopChatListener();
        return;
    }

    externalSignupLink.removeAttribute("href");

    const signedUp = currentProfile?.signedUpEvents?.[event.id] === true;
    signUpButton.textContent = signedUp ? "Cancel Signup" : "Sign Up for Event";
    signUpButton.classList.toggle("signed-up", signedUp);

    if (signedUp) {
        chatSection.style.display = "block";
        startChatListener(event.id);
    } else {
        chatSection.style.display = "none";
        stopChatListener();
    }
}

function openEventModal(eventId) {
    const event = eventData.find((item) => item.id === eventId);
    if (!event) return;

    currentEventID = eventId;

    document.querySelector("#modalEventTitle").textContent = event.title || "Untitled Event";
    document.querySelector("#modalEventDate").textContent = event.date || "TBA";
    document.querySelector("#modalEventTime").textContent = event.time || convertTo12Hour(event.time24) || "TBA";
    document.querySelector("#modalEventEndTime").textContent = event.endTime || convertTo12Hour(event.endTime24) || "TBA";
    document.querySelector("#modalEventLocation").textContent = event.location || "TBA";
    document.querySelector("#modalEventDescription").textContent = event.description || "";

    updateSignupArea(event);
    eventModal.style.display = "block";
}

function closeEventModal() {
    currentEventID = "";
    eventModal.style.display = "none";
    chatSection.style.display = "none";
    stopChatListener();
}

function openAddEventModal() {
    if (!isAdmin) return;
    resetEventForm();
    addEventModal.classList.add("active");
}

function openEditEventModal() {
    if (!isAdmin) return;

    const event = eventData.find((item) => item.id === currentEventID);
    if (!event) return;

    eventTitle.value = event.title || "";
    eventDate.value = event.date || "";
    eventTime.value = event.time24 || convertTo24Hour(event.time);
    eventEndTime.value = event.endTime24 || convertTo24Hour(event.endTime);
    eventLocation.value = event.location || "";
    eventDescription.value = event.description || "";
    eventSignupLink.value = event.signupLink || "";

    submitEventButton.dataset.editMode = "true";
    submitEventButton.textContent = "Update Event";
    eventEditorTitle.textContent = "Edit Event";
    showEventFormMessage("");
    addEventModal.classList.add("active");
}

async function saveEvent(event) {
    if (!isAdmin || !firebaseUser) return;

    event.preventDefault();
    showEventFormMessage("");

    const signupLink = cleanSignupLink(eventSignupLink.value);
    if (signupLink === null) {
        showEventFormMessage("Please enter a full http:// or https:// signup link.");
        return;
    }

    if (timeToMinutes(eventEndTime.value) <= timeToMinutes(eventTime.value)) {
        showEventFormMessage("End time must be later than the start time.");
        return;
    }

    const editing = submitEventButton.dataset.editMode === "true";
    const eventId = editing ? currentEventID : crypto.randomUUID();

    const eventToSave = {
        id: eventId,
        title: eventTitle.value.trim(),
        date: eventDate.value,
        time24: eventTime.value,
        endTime24: eventEndTime.value,
        // Keep these display fields because a few older pages still read them.
        time: convertTo12Hour(eventTime.value),
        endTime: convertTo12Hour(eventEndTime.value),
        location: eventLocation.value.trim(),
        description: eventDescription.value.trim(),
        signupLink,
        updatedAt: serverTimestamp(),
        updatedBy: firebaseUser.uid
    };

    if (!editing) {
        eventToSave.createdAt = serverTimestamp();
        eventToSave.createdBy = firebaseUser.uid;
    }

    submitEventButton.disabled = true;

    try {
        const eventRef = doc(database, "schools", SCHOOL_ID, "events", eventId);
        await setDoc(eventRef, eventToSave, { merge: editing });

        addEventModal.classList.remove("active");
        if (editing) closeEventModal();
        resetEventForm();
    } catch (error) {
        console.error("Could not save event:", error);
        showEventFormMessage("Could not save the event. Please try again.");
    } finally {
        submitEventButton.disabled = false;
    }
}

async function deleteEventMessages(eventId) {
    // Firestore does not automatically delete subcollections when an event is deleted.
    const messagesRef = collection(database, "schools", SCHOOL_ID, "events", eventId, "messages");
    const snapshot = await getDocs(messagesRef);
    const docs = snapshot.docs;

    for (let start = 0; start < docs.length; start += 400) {
        const batch = writeBatch(database);
        docs.slice(start, start + 400).forEach((messageDoc) => batch.delete(messageDoc.ref));
        await batch.commit();
    }
}

async function deleteCurrentEvent() {
    if (!isAdmin || !currentEventID) return;

    const eventId = currentEventID;
    const event = eventData.find((item) => item.id === eventId);
    const confirmed = window.confirm(`Delete “${event?.title || "this event"}”? This cannot be undone.`);
    if (!confirmed) return;

    deleteEventButton.disabled = true;

    try {
        await deleteEventMessages(eventId);
        await deleteDoc(doc(database, "schools", SCHOOL_ID, "events", eventId));
        closeEventModal();
    } catch (error) {
        console.error("Could not delete event:", error);
        window.alert("The event could not be deleted. Please try again.");
    } finally {
        deleteEventButton.disabled = false;
    }
}

async function toggleInternalSignup() {
    if (!currentEventID || !currentProfileRef || !currentProfile) return;

    const event = eventData.find((item) => item.id === currentEventID);
    if (!event || event.signupLink) return;

    currentProfile.signedUpEvents = currentProfile.signedUpEvents || {};
    const alreadySignedUp = currentProfile.signedUpEvents[currentEventID] === true;
    signUpButton.disabled = true;

    try {
        if (alreadySignedUp) {
            await updateDoc(currentProfileRef, {
                [`signedUpEvents.${currentEventID}`]: deleteField()
            });
            delete currentProfile.signedUpEvents[currentEventID];
        } else {
            await updateDoc(currentProfileRef, {
                [`signedUpEvents.${currentEventID}`]: true
            });
            currentProfile.signedUpEvents[currentEventID] = true;
        }

        syncLegacyProfileCache();
        updateSignupArea(event);
    } catch (error) {
        console.error("Could not update event signup:", error);
        window.alert("Your signup could not be updated. Please try again.");
    } finally {
        signUpButton.disabled = false;
    }
}

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text || !currentEventID || !firebaseUser || !currentProfile) return;

    const event = eventData.find((item) => item.id === currentEventID);
    const signedUp = currentProfile.signedUpEvents?.[currentEventID] === true;
    if (!event || event.signupLink || !signedUp) return;

    chatSendButton.disabled = true;

    try {
        const messagesRef = collection(
            database,
            "schools",
            SCHOOL_ID,
            "events",
            currentEventID,
            "messages"
        );

        await addDoc(messagesRef, {
            uid: firebaseUser.uid,
            username: currentProfile.username || `${currentProfile.firstname || ""} ${currentProfile.lastname || ""}`.trim() || "Member",
            text: text.slice(0, 500),
            createdAt: serverTimestamp()
        });

        chatInput.value = "";
    } catch (error) {
        console.error("Could not send message:", error);
        window.alert("Your message could not be sent. Please try again.");
    } finally {
        chatSendButton.disabled = false;
    }
}

async function migrateLegacyEventsIfNeeded(snapshot) {
    if (!snapshot.empty || !isAdmin) return;

    let legacyEvents = [];
    try {
        legacyEvents = JSON.parse(localStorage.getItem("eventData")) || [];
    } catch {
        legacyEvents = [];
    }

    if (!Array.isArray(legacyEvents) || legacyEvents.length === 0) return;

    // This runs only when Firestore has no events. It saves old local events once instead of losing them.
    for (const oldEvent of legacyEvents) {
        if (!oldEvent?.id) continue;
        const eventRef = doc(database, "schools", SCHOOL_ID, "events", String(oldEvent.id));
        await setDoc(eventRef, {
            ...oldEvent,
            signupLink: oldEvent.signupLink || "",
            migratedAt: serverTimestamp()
        }, { merge: true });
    }
}

function startEventsListener() {
    if (eventsUnsubscribe) eventsUnsubscribe();

    const eventsRef = collection(database, "schools", SCHOOL_ID, "events");
    eventsUnsubscribe = onSnapshot(eventsRef, async (snapshot) => {
        try {
            await migrateLegacyEventsIfNeeded(snapshot);
        } catch (error) {
            console.error("Could not migrate old events:", error);
        }

        eventData = snapshot.docs
            .map((eventDoc) => ({ id: eventDoc.id, ...eventDoc.data() }))
            .sort((a, b) => {
                const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
                if (dateCompare !== 0) return dateCompare;
                return String(a.time24 || "").localeCompare(String(b.time24 || ""));
            });

        syncLegacyEventCache();
        renderEvents();

        if (currentEventID) {
            const eventStillExists = eventData.some((item) => item.id === currentEventID);
            if (!eventStillExists) closeEventModal();
        }
    }, (error) => {
        console.error("Could not load events:", error);
        eventArea.textContent = "Events could not be loaded. Please refresh and try again.";
    });
}

async function loadProfile(user) {
    const profileRef = doc(database, "schools", SCHOOL_ID, "users", user.uid);
    const profileSnapshot = await getDoc(profileRef);
    if (!profileSnapshot.exists()) return null;

    return {
        ref: profileRef,
        data: profileSnapshot.data()
    };
}

eventArea.addEventListener("click", (event) => {
    const button = event.target.closest(".event-view-button");
    if (!button) return;

    const card = button.closest(".event");
    if (card?.dataset.eventId) openEventModal(card.dataset.eventId);
});

document.querySelector("#eventModal .modal-close").addEventListener("click", closeEventModal);
document.querySelector(".add-event-close").addEventListener("click", () => {
    addEventModal.classList.remove("active");
    resetEventForm();
});

addEventButton.addEventListener("click", openAddEventModal);
eventForm.addEventListener("submit", saveEvent);
editEventButton.addEventListener("click", openEditEventModal);
deleteEventButton.addEventListener("click", deleteCurrentEvent);
signUpButton.addEventListener("click", toggleInternalSignup);
chatSendButton.addEventListener("click", sendChatMessage);
chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        sendChatMessage();
    }
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        redirectToLogin();
        return;
    }

    firebaseUser = user;

    try {
        const profileResult = await loadProfile(user);
        if (!profileResult) {
            redirectToLogin();
            return;
        }

        currentProfileRef = profileResult.ref;
        currentProfile = profileResult.data;
        currentProfile.signedUpEvents = currentProfile.signedUpEvents || {};

        isAdmin = userIsAdmin(currentProfile);
        showAdminControls(isAdmin);
        syncLegacyProfileCache();
        startEventsListener();
    } catch (error) {
        console.error("Could not load the current user:", error);
        window.alert("Your account could not be loaded. Please refresh and try again.");
    }
});

window.addEventListener("beforeunload", () => {
    if (eventsUnsubscribe) eventsUnsubscribe();
    stopChatListener();
});
