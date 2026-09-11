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
    runTransaction,
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
const cancelSignupButton = document.querySelector("#cancelSignupButton");
const externalSignupLink = document.querySelector("#externalSignupLink");
const internalSignupSection = document.querySelector("#internalSignupSection");
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
const eventMemberLimit = document.querySelector("#eventMemberLimit");
const internalSignupOptions = document.querySelector("#internalSignupOptions");
const addShiftButton = document.querySelector("#addShiftButton");
const shiftEditor = document.querySelector("#shiftEditor");
const signupConfigLockMessage = document.querySelector("#signupConfigLockMessage");

const shiftSignupSection = document.querySelector("#shiftSignupSection");
const shiftChoices = document.querySelector("#shiftChoices");
const signupStatus = document.querySelector("#signupStatus");
const signupRosterSection = document.querySelector("#signupRosterSection");
const signupRosterSummary = document.querySelector("#signupRosterSummary");
const signupRosterContent = document.querySelector("#signupRosterContent");

const chatSection = document.querySelector("#chatSection");
const chatMessages = document.querySelector("#chatMessages");
const chatInput = document.querySelector("#chatInput");
const chatSendButton = document.querySelector(".chat-send");

let firebaseUser = null;
let currentProfile = null;
let currentProfileRef = null;
let currentEventID = "";
let currentReservations = [];
let memberDirectory = new Map();
let eventData = [];
let isAdmin = false;
let eventsUnsubscribe = null;
let membersUnsubscribe = null;
let reservationsUnsubscribe = null;
let chatUnsubscribe = null;
let chatEventID = "";
let signupSettingsLocked = false;

function redirectToLogin() {
    window.location.replace("login.html");
}

function userIsAdmin(profile) {
    // The page hides admin tools, but Firestore rules are still the real security layer.
    return profile?.role === "admin" || profile?.isAdmin === true;
}

function showAdminControls(allowed) {
    document.querySelectorAll("[data-admin-only]").forEach((element) => {
        element.hidden = !allowed;
    });
}

function syncLegacyProfileCache() {
    // A couple older pages still read localStorage, so keep the cache synced for now.
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

function normalizeEvent(event) {
    return {
        ...event,
        memberLimit: Number.isInteger(Number(event.memberLimit)) && Number(event.memberLimit) > 0
            ? Number(event.memberLimit)
            : 0,
        shifts: Array.isArray(event.shifts) ? event.shifts : [],
        shiftCapacities: event.shiftCapacities && typeof event.shiftCapacities === "object"
            ? event.shiftCapacities
            : {}
    };
}

function showEventFormMessage(message, type = "error") {
    eventFormMessage.textContent = message;
    eventFormMessage.dataset.type = type;
    eventFormMessage.style.display = message ? "block" : "none";
}

function setSignupSettingsLocked(locked) {
    signupSettingsLocked = locked;
    signupConfigLockMessage.hidden = !locked;
    eventSignupLink.disabled = locked;
    eventMemberLimit.disabled = locked;
    addShiftButton.disabled = locked;

    shiftEditor.querySelectorAll("input, button").forEach((element) => {
        element.disabled = locked;
    });
}

function updateInternalOptionsVisibility() {
    const hasExternalLink = Boolean(eventSignupLink.value.trim());
    internalSignupOptions.hidden = hasExternalLink;
}

function createShiftEditorRow(shift = {}) {
    const row = document.createElement("div");
    row.className = "shift-editor-row";
    row.dataset.shiftId = shift.id || crypto.randomUUID();

    const roleGroup = document.createElement("div");
    roleGroup.className = "shift-field shift-role-field";
    const roleLabel = document.createElement("label");
    roleLabel.textContent = "Role";
    const roleInput = document.createElement("input");
    roleInput.type = "text";
    roleInput.className = "shift-role-input";
    roleInput.maxLength = 80;
    roleInput.placeholder = "Check-in, setup, concessions...";
    roleInput.value = shift.role || "";
    roleGroup.append(roleLabel, roleInput);

    const startGroup = document.createElement("div");
    startGroup.className = "shift-field";
    const startLabel = document.createElement("label");
    startLabel.textContent = "Start";
    const startInput = document.createElement("input");
    startInput.type = "time";
    startInput.className = "shift-start-input";
    startInput.value = shift.startTime24 || convertTo24Hour(shift.startTime) || "";
    startGroup.append(startLabel, startInput);

    const endGroup = document.createElement("div");
    endGroup.className = "shift-field";
    const endLabel = document.createElement("label");
    endLabel.textContent = "End";
    const endInput = document.createElement("input");
    endInput.type = "time";
    endInput.className = "shift-end-input";
    endInput.value = shift.endTime24 || convertTo24Hour(shift.endTime) || "";
    endGroup.append(endLabel, endInput);

    const slotsGroup = document.createElement("div");
    slotsGroup.className = "shift-field shift-slots-field";
    const slotsLabel = document.createElement("label");
    slotsLabel.textContent = "Slots";
    const slotsInput = document.createElement("input");
    slotsInput.type = "number";
    slotsInput.className = "shift-slots-input";
    slotsInput.min = "1";
    slotsInput.max = "500";
    slotsInput.inputMode = "numeric";
    slotsInput.value = shift.slots ? String(shift.slots) : "";
    slotsGroup.append(slotsLabel, slotsInput);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-shift-button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => row.remove());

    row.append(roleGroup, startGroup, endGroup, slotsGroup, removeButton);
    shiftEditor.append(row);
}

function collectShifts() {
    const shifts = [];

    for (const row of shiftEditor.querySelectorAll(".shift-editor-row")) {
        const role = row.querySelector(".shift-role-input").value.trim();
        const startTime24 = row.querySelector(".shift-start-input").value;
        const endTime24 = row.querySelector(".shift-end-input").value;
        const slots = Number(row.querySelector(".shift-slots-input").value);

        if (!role || !startTime24 || !endTime24 || !Number.isInteger(slots) || slots < 1) {
            throw new Error("Every shift needs a role, start time, end time, and at least one slot.");
        }

        if (timeToMinutes(endTime24) <= timeToMinutes(startTime24)) {
            throw new Error(`The “${role}” shift must end after it starts.`);
        }

        shifts.push({
            id: row.dataset.shiftId,
            role,
            startTime24,
            endTime24,
            startTime: convertTo12Hour(startTime24),
            endTime: convertTo12Hour(endTime24),
            slots
        });
    }

    return shifts;
}

function resetEventForm() {
    eventForm.reset();
    shiftEditor.replaceChildren();
    submitEventButton.dataset.editMode = "false";
    submitEventButton.textContent = "Create Event";
    eventEditorTitle.textContent = "Add New Event";
    setSignupSettingsLocked(false);
    updateInternalOptionsVisibility();
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

    const meta = document.createElement("div");
    meta.className = "event-card-meta";
    if (!event.signupLink && event.shifts.length > 0) {
        meta.textContent = `${event.shifts.length} shift${event.shifts.length === 1 ? "" : "s"}`;
    } else if (!event.signupLink && event.memberLimit > 0) {
        meta.textContent = `${event.memberLimit} member limit`;
    } else if (event.signupLink) {
        meta.textContent = "External signup";
    }

    const button = document.createElement("button");
    button.className = "event-view-button";
    button.textContent = event.signupLink ? "View Event" : "View & Sign Up";

    card.append(title, description);
    if (meta.textContent) card.append(meta);
    card.append(button);
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
    chatEventID = "";
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
    if (chatEventID === eventId && chatUnsubscribe) return;
    stopChatListener();
    chatEventID = eventId;

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

function stopReservationsListener() {
    if (reservationsUnsubscribe) {
        reservationsUnsubscribe();
        reservationsUnsubscribe = null;
    }
    currentReservations = [];
}

function reservationsRef(eventId) {
    return collection(database, "schools", SCHOOL_ID, "events", eventId, "reservations");
}

function currentEvent() {
    return eventData.find((item) => item.id === currentEventID) || null;
}

function ownReservations() {
    if (!firebaseUser) return [];
    return currentReservations.filter((reservation) => reservation.uid === firebaseUser.uid);
}

function isCurrentUserSignedUp() {
    return ownReservations().some((reservation) => ["member", "general", "shift"].includes(reservation.type));
}

function signedUpMemberIds() {
    const ids = new Set();
    currentReservations.forEach((reservation) => {
        if (["member", "general", "shift"].includes(reservation.type) && reservation.uid) {
            ids.add(reservation.uid);
        }
    });
    return ids;
}

function memberDisplayName(uid) {
    const profile = memberDirectory.get(uid);
    if (!profile) return "Member";

    const fullName = `${profile.firstname || ""} ${profile.lastname || ""}`.trim();
    return fullName || profile.username || profile.email || "Member";
}

function shiftUsage(shiftId) {
    return currentReservations.filter((reservation) => (
        reservation.type === "shift" && reservation.shiftId === shiftId
    )).length;
}

function renderShiftChoices(event) {
    shiftChoices.replaceChildren();
    const hasShifts = event.shifts.length > 0;
    shiftSignupSection.hidden = !hasShifts;

    if (!hasShifts) return;

    const ownShiftIds = new Set(
        ownReservations()
            .filter((reservation) => reservation.type === "shift")
            .map((reservation) => reservation.shiftId)
    );

    event.shifts.forEach((shift) => {
        const used = shiftUsage(shift.id);
        const checked = ownShiftIds.has(shift.id);
        const full = used >= shift.slots;

        const label = document.createElement("label");
        label.className = "shift-choice";
        label.classList.toggle("shift-choice-full", full && !checked);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = shift.id;
        checkbox.checked = checked;
        checkbox.disabled = full && !checked;

        const textWrap = document.createElement("span");
        textWrap.className = "shift-choice-text";

        const role = document.createElement("strong");
        role.textContent = shift.role;

        const details = document.createElement("span");
        details.textContent = `${shift.startTime || convertTo12Hour(shift.startTime24)} – ${shift.endTime || convertTo12Hour(shift.endTime24)} • ${used}/${shift.slots} slots`;

        textWrap.append(role, details);
        label.append(checkbox, textWrap);
        shiftChoices.append(label);
    });
}

function renderRoster(event) {
    signupRosterContent.replaceChildren();

    if (event.signupLink) {
        signupRosterSection.hidden = true;
        return;
    }

    signupRosterSection.hidden = false;
    const members = [...signedUpMemberIds()];
    const totalText = event.memberLimit > 0
        ? `${members.length} / ${event.memberLimit} members`
        : `${members.length} member${members.length === 1 ? "" : "s"}`;
    signupRosterSummary.textContent = totalText;

    if (event.shifts.length === 0) {
        const list = document.createElement("ul");
        list.className = "signup-name-list";

        if (members.length === 0) {
            const empty = document.createElement("li");
            empty.className = "roster-empty";
            empty.textContent = "No one has signed up yet.";
            list.append(empty);
        } else {
            members
                .map((uid) => ({ uid, name: memberDisplayName(uid) }))
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(({ name }) => {
                    const item = document.createElement("li");
                    item.textContent = name;
                    list.append(item);
                });
        }

        signupRosterContent.append(list);
        return;
    }

    event.shifts.forEach((shift) => {
        const group = document.createElement("div");
        group.className = "roster-shift-group";

        const heading = document.createElement("div");
        heading.className = "roster-shift-heading";

        const title = document.createElement("strong");
        title.textContent = shift.role;

        const count = document.createElement("span");
        const reservations = currentReservations.filter((reservation) => (
            reservation.type === "shift" && reservation.shiftId === shift.id
        ));
        count.textContent = `${reservations.length}/${shift.slots} slots`;

        const time = document.createElement("small");
        time.textContent = `${shift.startTime || convertTo12Hour(shift.startTime24)} – ${shift.endTime || convertTo12Hour(shift.endTime24)}`;

        heading.append(title, count, time);
        group.append(heading);

        const list = document.createElement("ul");
        list.className = "signup-name-list";

        if (reservations.length === 0) {
            const empty = document.createElement("li");
            empty.className = "roster-empty";
            empty.textContent = "No one in this shift yet.";
            list.append(empty);
        } else {
            reservations
                .map((reservation) => memberDisplayName(reservation.uid))
                .sort((a, b) => a.localeCompare(b))
                .forEach((name) => {
                    const item = document.createElement("li");
                    item.textContent = name;
                    list.append(item);
                });
        }

        group.append(list);
        signupRosterContent.append(group);
    });
}

function renderSignupControls(event) {
    const hasExternalSignup = Boolean(event.signupLink);
    externalSignupLink.hidden = !hasExternalSignup;
    signUpButton.hidden = hasExternalSignup;
    internalSignupSection.classList.toggle("external-signup-mode", hasExternalSignup);

    if (hasExternalSignup) {
        externalSignupLink.href = event.signupLink;
        shiftSignupSection.hidden = true;
        cancelSignupButton.hidden = true;
        signupStatus.textContent = "Signup is handled by the organization running this event.";
        signupRosterSection.hidden = true;
        chatSection.style.display = "none";
        stopChatListener();
        return;
    }

    externalSignupLink.removeAttribute("href");
    const signedUp = isCurrentUserSignedUp();
    const uniqueMembers = signedUpMemberIds().size;
    const eventFull = event.memberLimit > 0 && uniqueMembers >= event.memberLimit && !signedUp;

    renderShiftChoices(event);
    renderRoster(event);

    if (event.shifts.length > 0) {
        signUpButton.textContent = signedUp ? "Update Shift Signup" : "Save Shift Signup";
        cancelSignupButton.hidden = !signedUp;

        const availableShift = event.shifts.some((shift) => shiftUsage(shift.id) < shift.slots);
        signUpButton.disabled = eventFull || (!signedUp && !availableShift);
    } else {
        signUpButton.textContent = signedUp ? "Cancel Signup" : "Sign Up for Event";
        signUpButton.disabled = eventFull;
        cancelSignupButton.hidden = true;
    }

    signUpButton.classList.toggle("signed-up", signedUp);

    if (eventFull) {
        signupStatus.textContent = "This event is full.";
    } else if (signedUp) {
        signupStatus.textContent = "You’re signed up.";
    } else {
        signupStatus.textContent = "";
    }

    if (signedUp) {
        chatSection.style.display = "block";
        startChatListener(event.id);
    } else {
        chatSection.style.display = "none";
        stopChatListener();
    }
}

function startReservationsListener(eventId) {
    stopReservationsListener();

    reservationsUnsubscribe = onSnapshot(reservationsRef(eventId), (snapshot) => {
        currentReservations = snapshot.docs.map((reservationDoc) => ({
            id: reservationDoc.id,
            ...reservationDoc.data()
        }));

        const event = currentEvent();
        if (event) renderSignupControls(event);
    }, (error) => {
        console.error("Could not load event signups:", error);

        // Keep the event's shift choices visible even if the live roster fails to load.
        // Saving still goes through Firestore, so permission errors will not bypass security.
        const event = currentEvent();
        if (event) renderShiftChoices(event);
        signupStatus.textContent = "Signup availability could not be loaded. Refresh and try again.";
    });
}

function openEventModal(eventId) {
    const event = eventData.find((item) => item.id === eventId);
    if (!event) return;

    currentEventID = eventId;
    currentReservations = [];

    document.querySelector("#modalEventTitle").textContent = event.title || "Untitled Event";
    document.querySelector("#modalEventDate").textContent = event.date || "TBA";
    document.querySelector("#modalEventTime").textContent = event.time || convertTo12Hour(event.time24) || "TBA";
    document.querySelector("#modalEventEndTime").textContent = event.endTime || convertTo12Hour(event.endTime24) || "TBA";
    document.querySelector("#modalEventLocation").textContent = event.location || "TBA";
    document.querySelector("#modalEventDescription").textContent = event.description || "";

    eventModal.style.display = "block";

    // Draw the signup controls immediately. The reservation listener updates
    // slot counts a moment later, but members should never see an empty signup box
    // while Firestore is still loading.
    renderSignupControls(event);
    startReservationsListener(eventId);
}

function closeEventModal() {
    currentEventID = "";
    eventModal.style.display = "none";
    signupRosterContent.replaceChildren();
    shiftChoices.replaceChildren();
    chatSection.style.display = "none";
    stopReservationsListener();
    stopChatListener();
}

function openAddEventModal() {
    if (!isAdmin) return;
    resetEventForm();
    addEventModal.classList.add("active");
}

async function openEditEventModal() {
    if (!isAdmin) return;

    const event = currentEvent();
    if (!event) return;

    eventTitle.value = event.title || "";
    eventDate.value = event.date || "";
    eventTime.value = event.time24 || convertTo24Hour(event.time);
    eventEndTime.value = event.endTime24 || convertTo24Hour(event.endTime);
    eventLocation.value = event.location || "";
    eventDescription.value = event.description || "";
    eventSignupLink.value = event.signupLink || "";
    eventMemberLimit.value = event.memberLimit > 0 ? String(event.memberLimit) : "";
    shiftEditor.replaceChildren();
    event.shifts.forEach((shift) => createShiftEditorRow(shift));
    updateInternalOptionsVisibility();

    let hasReservations = currentReservations.length > 0;
    try {
        const snapshot = await getDocs(reservationsRef(event.id));
        hasReservations = !snapshot.empty;
    } catch (error) {
        console.error("Could not check existing signups:", error);
    }

    // Lock capacity/shift settings after the first signup so edits cannot strand existing reservations.
    setSignupSettingsLocked(hasReservations);

    submitEventButton.dataset.editMode = "true";
    submitEventButton.textContent = "Update Event";
    eventEditorTitle.textContent = "Edit Event";
    showEventFormMessage("");
    addEventModal.classList.add("active");
}

async function saveEvent(formEvent) {
    if (!isAdmin || !firebaseUser) return;

    formEvent.preventDefault();
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
    const oldEvent = editing ? currentEvent() : null;

    let memberLimit = 0;
    let shifts = [];

    if (editing && signupSettingsLocked && oldEvent) {
        memberLimit = oldEvent.memberLimit;
        shifts = oldEvent.shifts;
    } else if (!signupLink) {
        const limitValue = eventMemberLimit.value.trim();
        if (limitValue) {
            memberLimit = Number(limitValue);
            if (!Number.isInteger(memberLimit) || memberLimit < 1 || memberLimit > 5000) {
                showEventFormMessage("Member limit must be a whole number between 1 and 5000.");
                return;
            }
        }

        try {
            shifts = collectShifts();
        } catch (error) {
            showEventFormMessage(error.message);
            return;
        }
    }

    const finalSignupLink = editing && signupSettingsLocked && oldEvent
        ? oldEvent.signupLink
        : signupLink;

    // External signups never use KeyConnect capacity or shifts.
    if (finalSignupLink) {
        memberLimit = 0;
        shifts = [];
    }

    const shiftCapacities = Object.fromEntries(shifts.map((shift) => [shift.id, shift.slots]));

    const eventToSave = {
        id: eventId,
        title: eventTitle.value.trim(),
        date: eventDate.value,
        time24: eventTime.value,
        endTime24: eventEndTime.value,
        time: convertTo12Hour(eventTime.value),
        endTime: convertTo12Hour(eventEndTime.value),
        location: eventLocation.value.trim(),
        description: eventDescription.value.trim(),
        signupLink: finalSignupLink,
        memberLimit,
        shifts,
        shiftCapacities,
        updatedAt: serverTimestamp(),
        updatedBy: firebaseUser.uid
    };

    submitEventButton.disabled = true;

    try {
        const eventRef = doc(database, "schools", SCHOOL_ID, "events", eventId);

        if (editing) {
            await updateDoc(eventRef, eventToSave);
        } else {
            await setDoc(eventRef, {
                ...eventToSave,
                createdAt: serverTimestamp(),
                createdBy: firebaseUser.uid
            });
        }

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

async function deleteSubcollection(collectionRef) {
    const snapshot = await getDocs(collectionRef);
    const docs = snapshot.docs;

    for (let start = 0; start < docs.length; start += 400) {
        const batch = writeBatch(database);
        docs.slice(start, start + 400).forEach((item) => batch.delete(item.ref));
        await batch.commit();
    }
}

async function removeEventFromProfiles(eventId) {
    const usersRef = collection(database, "schools", SCHOOL_ID, "users");
    const snapshot = await getDocs(usersRef);

    for (let start = 0; start < snapshot.docs.length; start += 300) {
        const batch = writeBatch(database);
        snapshot.docs.slice(start, start + 300).forEach((userDoc) => {
            if (userDoc.data().signedUpEvents?.[eventId] === true) {
                batch.update(userDoc.ref, {
                    [`signedUpEvents.${eventId}`]: deleteField()
                });
            }
        });
        await batch.commit();
    }
}

async function deleteCurrentEvent() {
    if (!isAdmin || !currentEventID) return;

    const eventId = currentEventID;
    const event = currentEvent();
    const confirmed = window.confirm(`Delete “${event?.title || "this event"}”? This cannot be undone.`);
    if (!confirmed) return;

    deleteEventButton.disabled = true;

    try {
        await deleteSubcollection(collection(database, "schools", SCHOOL_ID, "events", eventId, "messages"));
        await deleteSubcollection(reservationsRef(eventId));
        await removeEventFromProfiles(eventId);
        await deleteDoc(doc(database, "schools", SCHOOL_ID, "events", eventId));
        closeEventModal();
    } catch (error) {
        console.error("Could not delete event:", error);
        window.alert("The event could not be deleted. Please try again.");
    } finally {
        deleteEventButton.disabled = false;
    }
}

function selectedShiftIdsFromUI() {
    return [...shiftChoices.querySelectorAll('input[type="checkbox"]:checked')]
        .map((checkbox) => checkbox.value);
}

function findFreeSlot(reservations, type, limit, shiftId = "") {
    const occupied = new Set(
        reservations
            .filter((reservation) => {
                if (reservation.type !== type) return false;
                if (type === "shift" && reservation.shiftId !== shiftId) return false;
                return reservation.uid !== firebaseUser.uid;
            })
            .map((reservation) => Number(reservation.slotNumber))
    );

    for (let slotNumber = 1; slotNumber <= limit; slotNumber += 1) {
        if (!occupied.has(slotNumber)) return slotNumber;
    }

    return null;
}

function makeReservationRef(eventId, reservationId) {
    return doc(database, "schools", SCHOOL_ID, "events", eventId, "reservations", reservationId);
}

function buildReservationPlan(event, reservations, selectedShiftIds) {
    const uid = firebaseUser.uid;
    const own = reservations.filter((reservation) => reservation.uid === uid);
    const claims = [];
    const removals = [];

    const ownBaseReservations = own.filter((reservation) => ["member", "general"].includes(reservation.type));
    const currentGeneral = ownBaseReservations.find((reservation) => reservation.type === "general");
    const currentMember = ownBaseReservations.find((reservation) => reservation.type === "member");

    if (event.memberLimit > 0) {
        if (!currentGeneral) {
            const slotNumber = findFreeSlot(reservations, "general", event.memberLimit);
            if (slotNumber === null) throw new Error("event-full");

            claims.push({
                id: `general_${slotNumber}`,
                data: { uid, type: "general", slotNumber, shiftId: "" }
            });
        }

        if (currentMember) removals.push(currentMember);
    } else {
        if (!currentMember) {
            claims.push({
                id: `member_${uid}`,
                data: { uid, type: "member", slotNumber: 0, shiftId: "" }
            });
        }

        if (currentGeneral) removals.push(currentGeneral);
    }

    const validShiftIds = new Set(event.shifts.map((shift) => shift.id));
    const selected = new Set(selectedShiftIds.filter((shiftId) => validShiftIds.has(shiftId)));
    const ownShiftReservations = own.filter((reservation) => reservation.type === "shift");

    ownShiftReservations.forEach((reservation) => {
        if (!selected.has(reservation.shiftId)) removals.push(reservation);
    });

    for (const shiftId of selected) {
        const alreadyReserved = ownShiftReservations.find((reservation) => reservation.shiftId === shiftId);
        if (alreadyReserved) continue;

        const shift = event.shifts.find((item) => item.id === shiftId);
        const slotNumber = findFreeSlot(reservations, "shift", shift.slots, shiftId);
        if (slotNumber === null) throw new Error(`shift-full:${shift.role}`);

        claims.push({
            id: `shift_${shiftId}_${slotNumber}`,
            data: { uid, type: "shift", slotNumber, shiftId }
        });
    }

    return { claims, removals };
}

async function saveInternalSignup(event, selectedShiftIds) {
    if (!firebaseUser || !currentProfileRef) return;

    // Each available spot has its own reservation document. The transaction checks those
    // documents before writing, so two members clicking the last slot at the same time
    // cannot both get it.

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const snapshot = await getDocs(reservationsRef(event.id));
        const reservations = snapshot.docs.map((reservationDoc) => ({
            id: reservationDoc.id,
            ref: reservationDoc.ref,
            ...reservationDoc.data()
        }));

        let plan;
        try {
            plan = buildReservationPlan(event, reservations, selectedShiftIds);
        } catch (error) {
            throw error;
        }

        try {
            await runTransaction(database, async (transaction) => {
                const claimChecks = [];
                for (const claim of plan.claims) {
                    const ref = makeReservationRef(event.id, claim.id);
                    const snapshot = await transaction.get(ref);
                    claimChecks.push({ claim, ref, snapshot });
                }

                for (const check of claimChecks) {
                    if (check.snapshot.exists() && check.snapshot.data().uid !== firebaseUser.uid) {
                        throw new Error("slot-taken");
                    }
                }

                plan.removals.forEach((reservation) => {
                    transaction.delete(reservation.ref || makeReservationRef(event.id, reservation.id));
                });

                claimChecks.forEach(({ claim, ref, snapshot }) => {
                    // If another tab already created this exact reservation for the same user, leave it alone.
                    if (snapshot.exists()) return;

                    transaction.set(ref, {
                        ...claim.data,
                        createdAt: serverTimestamp()
                    });
                });

                transaction.update(currentProfileRef, {
                    [`signedUpEvents.${event.id}`]: true
                });
            });

            currentProfile.signedUpEvents = currentProfile.signedUpEvents || {};
            currentProfile.signedUpEvents[event.id] = true;
            syncLegacyProfileCache();
            return;
        } catch (error) {
            if (error.message === "slot-taken" && attempt < 3) continue;
            throw error;
        }
    }

    throw new Error("signup-retry-failed");
}

async function cancelInternalSignup(event) {
    if (!firebaseUser || !currentProfileRef) return;

    const snapshot = await getDocs(reservationsRef(event.id));
    const ownDocs = snapshot.docs.filter((reservationDoc) => reservationDoc.data().uid === firebaseUser.uid);

    const batch = writeBatch(database);
    ownDocs.forEach((reservationDoc) => batch.delete(reservationDoc.ref));
    batch.update(currentProfileRef, {
        [`signedUpEvents.${event.id}`]: deleteField()
    });
    await batch.commit();

    if (currentProfile.signedUpEvents) delete currentProfile.signedUpEvents[event.id];
    syncLegacyProfileCache();
}

async function handleSignupButton() {
    const event = currentEvent();
    if (!event || event.signupLink) return;

    const signedUp = isCurrentUserSignedUp();

    if (event.shifts.length === 0 && signedUp) {
        cancelSignupButton.disabled = true;
        signUpButton.disabled = true;
        try {
            await cancelInternalSignup(event);
        } catch (error) {
            console.error("Could not cancel signup:", error);
            window.alert("Your signup could not be cancelled. Please try again.");
        } finally {
            cancelSignupButton.disabled = false;
            signUpButton.disabled = false;
        }
        return;
    }

    const selectedShiftIds = selectedShiftIdsFromUI();
    if (event.shifts.length > 0 && selectedShiftIds.length === 0) {
        signupStatus.textContent = "Choose at least one shift before saving your signup.";
        return;
    }

    signUpButton.disabled = true;
    cancelSignupButton.disabled = true;

    try {
        await saveInternalSignup(event, selectedShiftIds);
        signupStatus.textContent = "Signup saved.";
    } catch (error) {
        console.error("Could not update event signup:", error);
        if (error.message === "event-full") {
            signupStatus.textContent = "This event just filled up.";
        } else if (error.message.startsWith("shift-full:")) {
            signupStatus.textContent = `The ${error.message.split(":").slice(1).join(":")} shift just filled up. Pick another shift.`;
        } else {
            window.alert("Your signup could not be updated. Please try again.");
        }
    } finally {
        signUpButton.disabled = false;
        cancelSignupButton.disabled = false;
    }
}

async function handleCancelSignup() {
    const event = currentEvent();
    if (!event || event.signupLink || !isCurrentUserSignedUp()) return;

    const confirmed = window.confirm("Cancel your signup for this event?");
    if (!confirmed) return;

    cancelSignupButton.disabled = true;
    signUpButton.disabled = true;

    try {
        await cancelInternalSignup(event);
    } catch (error) {
        console.error("Could not cancel signup:", error);
        window.alert("Your signup could not be cancelled. Please try again.");
    } finally {
        cancelSignupButton.disabled = false;
        signUpButton.disabled = false;
    }
}

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text || !currentEventID || !firebaseUser || !currentProfile) return;

    const event = currentEvent();
    if (!event || event.signupLink || !isCurrentUserSignedUp()) return;

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

    for (const oldEvent of legacyEvents) {
        if (!oldEvent?.id) continue;
        const eventRef = doc(database, "schools", SCHOOL_ID, "events", String(oldEvent.id));
        await setDoc(eventRef, {
            ...oldEvent,
            signupLink: oldEvent.signupLink || "",
            memberLimit: Number(oldEvent.memberLimit) > 0 ? Number(oldEvent.memberLimit) : 0,
            shifts: Array.isArray(oldEvent.shifts) ? oldEvent.shifts : [],
            shiftCapacities: oldEvent.shiftCapacities || {},
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
            .map((eventDoc) => normalizeEvent({ id: eventDoc.id, ...eventDoc.data() }))
            .sort((a, b) => {
                const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
                if (dateCompare !== 0) return dateCompare;
                return String(a.time24 || "").localeCompare(String(b.time24 || ""));
            });

        syncLegacyEventCache();
        renderEvents();

        if (currentEventID) {
            const event = currentEvent();
            if (!event) {
                closeEventModal();
            } else {
                renderSignupControls(event);
            }
        }
    }, (error) => {
        console.error("Could not load events:", error);
        eventArea.textContent = "Events could not be loaded. Please refresh and try again.";
    });
}

function startMemberDirectoryListener() {
    if (membersUnsubscribe) membersUnsubscribe();

    const usersRef = collection(database, "schools", SCHOOL_ID, "users");
    membersUnsubscribe = onSnapshot(usersRef, (snapshot) => {
        memberDirectory = new Map(
            snapshot.docs.map((userDoc) => [userDoc.id, userDoc.data()])
        );

        const event = currentEvent();
        if (event) renderRoster(event);
    }, (error) => {
        console.error("Could not load member names for event signups:", error);
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
addShiftButton.addEventListener("click", () => {
    createShiftEditorRow();
    setSignupSettingsLocked(signupSettingsLocked);
});
eventSignupLink.addEventListener("input", updateInternalOptionsVisibility);
eventForm.addEventListener("submit", saveEvent);
editEventButton.addEventListener("click", openEditEventModal);
deleteEventButton.addEventListener("click", deleteCurrentEvent);
signUpButton.addEventListener("click", handleSignupButton);
cancelSignupButton.addEventListener("click", handleCancelSignup);
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
        startMemberDirectoryListener();
        startEventsListener();
    } catch (error) {
        console.error("Could not load the current user:", error);
        window.alert("Your account could not be loaded. Please refresh and try again.");
    }
});

window.addEventListener("beforeunload", () => {
    if (eventsUnsubscribe) eventsUnsubscribe();
    if (membersUnsubscribe) membersUnsubscribe();
    stopReservationsListener();
    stopChatListener();
});
