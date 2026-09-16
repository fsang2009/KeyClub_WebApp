import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc,
    writeBatch
} from "firebase/firestore";
import { auth, database } from "./firebaseConfig.js";

const SCHOOL_ID = "southport_high_school";

const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

const calendarGrid = document.querySelector(".calendar-grid");
const monthDateValue = document.querySelector("#monthDateValue");
const previousMonthButton = document.querySelector("#previousMonth");
const forwardMonthButton = document.querySelector("#nextMonth");
const todayButton = document.querySelector(".today-button");
const upcomingEventsGrid = document.querySelector(".upcoming-events-grid");

const scheduleEventModal = document.querySelector("#scheduleEventModal");
const scheduleEventForm = document.querySelector("#scheduleEventForm");
const closeScheduleEventModal = document.querySelector("#closeScheduleModal");
const scheduleEventMessage = document.querySelector("#scheduleEventMessage");

const eventName = document.querySelector("#eventName");
const eventTime = document.querySelector("#eventTime");
const eventEndTime = document.querySelector("#eventEndTime");
const eventLocation = document.querySelector("#eventLocation");
const eventDescription = document.querySelector("#eventDescription");
const eventSignupLink = document.querySelector("#eventSignupLink");

const eventDetailsModal = document.querySelector("#eventDetailsModal");
const eventDetailsModalCloseButton = document.querySelector("#closeEventDetailsModal");
const eventDetailsModalTitle = document.querySelector("#eventDetailsTitle");
const eventDetailsModalTime = document.querySelector("#eventDetailsTime");
const eventDetailsModalEndTime = document.querySelector("#eventDetailsEndTime");
const eventDetailsModalLocation = document.querySelector("#eventDetailsLocation");
const eventDetailsModalDescription = document.querySelector("#eventDetailsDescription");
const eventDetailsSignupLink = document.querySelector("#eventDetailsSignupLink");
const deleteEventCalendarButton = document.querySelector("#deleteEventButton");

let firebaseUser = null;
let currentProfile = null;
let isAdmin = false;
let events = [];
let currentEventId = null;

const today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();

function userIsAdmin(profile) {
    // The page hides admin controls here, but Firestore rules still need to block unauthorized writes too.
    return profile?.role === "admin" || profile?.isAdmin === true;
}

function showAdminControls(allowed) {
    document.querySelectorAll("[data-admin-only]").forEach((element) => {
        element.hidden = !allowed;
    });
}

function padNumber(value) {
    return String(value).padStart(2, "0");
}

function makeIsoDate(year, monthIndex, day) {
    return `${year}-${padNumber(monthIndex + 1)}-${padNumber(day)}`;
}

function parseIsoDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString || "")) return null;

    const [year, month, day] = dateString.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);

    if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
    ) {
        return null;
    }

    return parsed;
}

function convertTo12Hour(time24) {
    if (!/^\d{2}:\d{2}$/.test(time24 || "")) return time24 || "";

    const [hourString, minute] = time24.split(":");
    const hour = Number(hourString);
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
}

function timeToMinutes(time24) {
    if (!/^\d{2}:\d{2}$/.test(time24 || "")) return -1;
    const [hours, minutes] = time24.split(":").map(Number);
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

function setScheduleMessage(message) {
    scheduleEventMessage.textContent = message;
    scheduleEventMessage.hidden = !message;
}

function closeScheduleModal() {
    scheduleEventModal.classList.remove("active");
    scheduleEventForm.reset();
    scheduleEventForm.dataset.date = "";
    setScheduleMessage("");
}

function closeDetailsModal() {
    currentEventId = null;
    eventDetailsModal.classList.remove("active");
    eventDetailsModalTitle.textContent = "Event Details";
    eventDetailsModalTime.textContent = "";
    eventDetailsModalEndTime.textContent = "";
    eventDetailsModalLocation.textContent = "";
    eventDetailsModalDescription.textContent = "";
    eventDetailsSignupLink.hidden = true;
    eventDetailsSignupLink.removeAttribute("href");
}

function renderCalendar() {
    calendarGrid.replaceChildren();
    monthDateValue.textContent = `${months[currentMonth]} ${currentYear}`;

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPreviousMonth = new Date(currentYear, currentMonth, 0).getDate();

    for (let offset = firstDayOfMonth - 1; offset >= 0; offset -= 1) {
        const day = daysInPreviousMonth - offset;
        const cell = document.createElement("div");
        cell.className = "calendar-day outside-month";

        const number = document.createElement("span");
        number.className = "day-number";
        number.textContent = day;

        cell.appendChild(number);
        calendarGrid.appendChild(cell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const cell = document.createElement("div");
        cell.className = "calendar-day";
        cell.dataset.day = String(day);
        cell.dataset.month = String(currentMonth);
        cell.dataset.year = String(currentYear);
        cell.dataset.date = makeIsoDate(currentYear, currentMonth, day);

        if (
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear()
        ) {
            cell.classList.add("today");
        }

        const number = document.createElement("span");
        number.className = "day-number";
        number.textContent = day;

        cell.appendChild(number);
        calendarGrid.appendChild(cell);
    }

    // Always render six full weeks. This keeps the calendar the same height
    // from month to month instead of stretching and shrinking around events.
    const cellsUsed = firstDayOfMonth + daysInMonth;
    const trailingCells = 42 - cellsUsed;

    for (let day = 1; day <= trailingCells; day += 1) {
        const cell = document.createElement("div");
        cell.className = "calendar-day outside-month";

        const number = document.createElement("span");
        number.className = "day-number";
        number.textContent = day;

        cell.appendChild(number);
        calendarGrid.appendChild(cell);
    }

    renderEventsOnCalendar();
}

function renderEventsOnCalendar() {
    const eventElements = calendarGrid.querySelectorAll(".calendar-event");
    eventElements.forEach((element) => element.remove());

    events.forEach((event) => {
        const date = parseIsoDate(event.date);
        if (!date) return;
        if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) return;

        const dayCell = calendarGrid.querySelector(`[data-date="${event.date}"]`);
        if (!dayCell) return;

        const eventElement = document.createElement("button");
        eventElement.type = "button";
        eventElement.className = "calendar-event service-event";
        eventElement.dataset.eventId = event.id;
        eventElement.textContent = event.title || "Untitled Event";
        eventElement.title = event.title || "Untitled Event";

        dayCell.appendChild(eventElement);
    });
}

function formatEventDate(dateString) {
    const date = parseIsoDate(dateString);
    if (!date) return "Date unavailable";

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function renderUpcomingEvents() {
    upcomingEventsGrid.replaceChildren();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const upcoming = events
        .filter((event) => {
            const date = parseIsoDate(event.date);
            return date && date >= todayStart;
        })
        .sort((a, b) => {
            const firstDate = parseIsoDate(a.date);
            const secondDate = parseIsoDate(b.date);
            return firstDate - secondDate;
        })
        .slice(0, 6);

    if (upcoming.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No upcoming events yet.";
        upcomingEventsGrid.appendChild(emptyMessage);
        return;
    }

    upcoming.forEach((event) => {
        const card = document.createElement("article");
        card.className = "upcoming-event-card";

        const dateBox = document.createElement("div");
        dateBox.className = "event-date";

        const dateLabel = document.createElement("span");
        dateLabel.className = "event-month";
        dateLabel.textContent = formatEventDate(event.date);
        dateBox.appendChild(dateLabel);

        const information = document.createElement("div");
        information.className = "event-information";

        const category = document.createElement("span");
        category.className = "event-category service-category";
        category.textContent = "Service";

        const title = document.createElement("h3");
        title.textContent = event.title || "Untitled Event";

        const time = document.createElement("p");
        const startTime = event.time || convertTo12Hour(event.time24);
        const endTime = event.endTime || convertTo12Hour(event.endTime24);
        time.textContent = startTime && endTime ? `${startTime} – ${endTime}` : "Time TBD";

        const location = document.createElement("p");
        location.textContent = event.location || "Location TBD";

        information.append(category, title, time, location);
        card.append(dateBox, information);

        card.addEventListener("click", () => openEventDetails(event.id));
        upcomingEventsGrid.appendChild(card);
    });
}

function openEventDetails(eventId) {
    const selectedEvent = events.find((event) => event.id === eventId);
    if (!selectedEvent) return;

    currentEventId = selectedEvent.id;
    eventDetailsModalTitle.textContent = `${selectedEvent.title || "Event"} Details`;
    eventDetailsModalTime.textContent = selectedEvent.time || convertTo12Hour(selectedEvent.time24) || "TBD";
    eventDetailsModalEndTime.textContent = selectedEvent.endTime || convertTo12Hour(selectedEvent.endTime24) || "TBD";
    eventDetailsModalLocation.textContent = selectedEvent.location || "TBD";
    eventDetailsModalDescription.textContent = selectedEvent.description || "No description provided.";

    if (selectedEvent.signupLink) {
        eventDetailsSignupLink.href = selectedEvent.signupLink;
        eventDetailsSignupLink.hidden = false;
    } else {
        eventDetailsSignupLink.hidden = true;
        eventDetailsSignupLink.removeAttribute("href");
    }

    deleteEventCalendarButton.hidden = !isAdmin;
    eventDetailsModal.classList.add("active");
}

async function deleteEventMessages(eventId) {
    // Firestore does not automatically remove an event's message subcollection.
    const messagesRef = collection(database, "schools", SCHOOL_ID, "events", eventId, "messages");
    const snapshot = await getDocs(messagesRef);
    if (snapshot.empty) return;

    const batch = writeBatch(database);
    snapshot.docs.forEach((messageDoc) => batch.delete(messageDoc.ref));
    await batch.commit();
}

async function deleteCurrentEvent() {
    if (!isAdmin || !currentEventId) return;

    const confirmed = window.confirm("Delete this event? This cannot be undone.");
    if (!confirmed) return;

    deleteEventCalendarButton.disabled = true;

    try {
        await deleteEventMessages(currentEventId);
        await deleteDoc(doc(database, "schools", SCHOOL_ID, "events", currentEventId));
        events = events.filter((item) => item.id !== currentEventId);
        localStorage.setItem("eventData", JSON.stringify(events));
        renderEventsOnCalendar();
        renderUpcomingEvents();
        closeDetailsModal();
    } catch (error) {
        console.error("Could not delete event:", error);
        window.alert("Could not delete the event. Please try again.");
    } finally {
        deleteEventCalendarButton.disabled = false;
    }
}

async function saveCalendarEvent(event) {
    event.preventDefault();
    if (!isAdmin || !firebaseUser) return;

    const selectedDate = scheduleEventForm.dataset.date;
    if (!parseIsoDate(selectedDate)) {
        setScheduleMessage("Please close this window and select a date again.");
        return;
    }

    if (timeToMinutes(eventEndTime.value) <= timeToMinutes(eventTime.value)) {
        setScheduleMessage("End time must be later than the start time.");
        return;
    }

    const signupLink = cleanSignupLink(eventSignupLink.value);
    if (signupLink === null) {
        setScheduleMessage("Please enter a full http:// or https:// signup link.");
        return;
    }

    const eventId = crypto.randomUUID();
    const eventToSave = {
        id: eventId,
        title: eventName.value.trim(),
        date: selectedDate,
        time24: eventTime.value,
        endTime24: eventEndTime.value,
        time: convertTo12Hour(eventTime.value),
        endTime: convertTo12Hour(eventEndTime.value),
        location: eventLocation.value.trim(),
        description: eventDescription.value.trim(),
        signupLink,
        createdAt: serverTimestamp(),
        createdBy: firebaseUser.uid,
        updatedAt: serverTimestamp(),
        updatedBy: firebaseUser.uid
    };

    const submitButton = scheduleEventForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    setScheduleMessage("");

    try {
        // Calendar-created events use the same collection as the Events page, so both stay in sync.
        await setDoc(doc(database, "schools", SCHOOL_ID, "events", eventId), eventToSave);
        events.push({ ...eventToSave, id: eventId });
        localStorage.setItem("eventData", JSON.stringify(events));
        renderEventsOnCalendar();
        renderUpcomingEvents();
        closeScheduleModal();
    } catch (error) {
        console.error("Could not schedule event:", error);
        setScheduleMessage("Could not schedule the event. Please try again.");
    } finally {
        submitButton.disabled = false;
    }
}

async function loadEventsOnce() {
    const eventsRef = collection(database, "schools", SCHOOL_ID, "events");

    try {
        const snapshot = await getDocs(eventsRef);
        events = snapshot.docs.map((eventDoc) => ({ id: eventDoc.id, ...eventDoc.data() }));
        localStorage.setItem("eventData", JSON.stringify(events));
        renderEventsOnCalendar();
        renderUpcomingEvents();
    } catch (error) {
        console.error("Could not load calendar events:", error);
        upcomingEventsGrid.replaceChildren();
        const message = document.createElement("p");
        message.textContent = "Could not load events right now.";
        upcomingEventsGrid.appendChild(message);
    }
}

calendarGrid.addEventListener("click", (event) => {
    const eventButton = event.target.closest(".calendar-event");
    if (eventButton) {
        openEventDetails(eventButton.dataset.eventId);
        return;
    }

    const dayCell = event.target.closest(".calendar-day:not(.outside-month)");
    if (!dayCell || !isAdmin) return;

    scheduleEventForm.dataset.date = dayCell.dataset.date;
    setScheduleMessage("");
    scheduleEventModal.classList.add("active");
});

previousMonthButton.addEventListener("click", () => {
    currentMonth -= 1;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear -= 1;
    }
    renderCalendar();
});

forwardMonthButton.addEventListener("click", () => {
    currentMonth += 1;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear += 1;
    }
    renderCalendar();
});

todayButton.addEventListener("click", () => {
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear = now.getFullYear();
    renderCalendar();
});

closeScheduleEventModal.addEventListener("click", closeScheduleModal);
eventDetailsModalCloseButton.addEventListener("click", closeDetailsModal);
scheduleEventForm.addEventListener("submit", saveCalendarEvent);
deleteEventCalendarButton.addEventListener("click", deleteCurrentEvent);

scheduleEventModal.addEventListener("click", (event) => {
    if (event.target === scheduleEventModal) closeScheduleModal();
});

eventDetailsModal.addEventListener("click", (event) => {
    if (event.target === eventDetailsModal) closeDetailsModal();
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    firebaseUser = user;

    try {
        const profileRef = doc(database, "schools", SCHOOL_ID, "users", user.uid);
        const profileSnapshot = await getDoc(profileRef);

        if (!profileSnapshot.exists()) {
            window.location.replace("login.html");
            return;
        }

        currentProfile = profileSnapshot.data();
        isAdmin = userIsAdmin(currentProfile);
        showAdminControls(isAdmin);
        renderCalendar();
        await loadEventsOnce();
    } catch (error) {
        console.error("Could not verify calendar access:", error);
        window.location.replace("login.html");
    }
});

