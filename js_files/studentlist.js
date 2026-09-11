import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, database } from "./firebaseConfig.js";

const SCHOOL_ID = "southport_high_school";
const DEFAULT_AVATAR = "assets/images/profiles/avatar1.png";

const studentListContainer = document.querySelector("#studentsContainer");
const userSearchBar = document.querySelector("#studentSearchInput");
const historyModal = document.querySelector("#historyModal");
const closeHistoryModalButton = document.querySelector("#closeHistoryModalBtn");
const studentNameTarget = document.querySelector("#studentNameTarget");
const historyContainer = document.querySelector("#historyContainer");

let members = [];
let attendanceRecords = [];
let selectedMemberUid = null;
let membersUnsubscribe = null;
let attendanceUnsubscribe = null;

function redirectToLogin() {
    window.location.replace("login.html");
}

function userIsAdmin(profile) {
    return profile?.role === "admin" || profile?.isAdmin === true;
}

function showAdminControls(allowed) {
    document.querySelectorAll("[data-admin-only]").forEach((element) => {
        element.hidden = !allowed;
    });
}

function normalizeProfileImage(savedImage) {
    if (!savedImage) return DEFAULT_AVATAR;

    const fileName = String(savedImage).match(/avatar[1-8]\.png$/i)?.[0];
    return fileName
        ? `assets/images/profiles/${fileName.toLowerCase()}`
        : DEFAULT_AVATAR;
}

function numberValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function formatScore(value) {
    const number = numberValue(value);
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function memberDisplayName(member) {
    const fullName = `${member.firstname || ""} ${member.lastname || ""}`.trim();
    return fullName || member.username || "Student";
}

function makeStatusRow(message) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = message;
    row.append(cell);
    return row;
}

function createStudentRow(member) {
    const row = document.createElement("tr");

    const studentCell = document.createElement("td");
    const profile = document.createElement("div");
    profile.className = "student-profile";

    const avatar = document.createElement("img");
    avatar.className = "student-avatar";
    avatar.src = normalizeProfileImage(member.profileImage);
    avatar.alt = `${memberDisplayName(member)} avatar`;
    avatar.addEventListener("error", () => {
        avatar.src = DEFAULT_AVATAR;
    }, { once: true });

    const details = document.createElement("div");
    details.className = "student-details";

    const name = document.createElement("span");
    name.className = "student-name";
    name.textContent = memberDisplayName(member);

    const email = document.createElement("span");
    email.className = "student-email";
    email.textContent = member.email || "Email unavailable";

    details.append(name, email);
    profile.append(avatar, details);
    studentCell.append(profile);

    const pointsCell = document.createElement("td");
    const points = document.createElement("span");
    points.className = "badge points-badge";
    points.textContent = `${formatScore(member.points)} pts`;
    pointsCell.append(points);

    const hoursCell = document.createElement("td");
    const hours = document.createElement("span");
    hours.className = "hours-text";
    hours.textContent = `${formatScore(member.hours)} hrs`;
    hoursCell.append(hours);

    const historyCell = document.createElement("td");
    historyCell.className = "text-right";

    const historyButton = document.createElement("button");
    historyButton.className = "btn-history-trigger";
    historyButton.type = "button";
    historyButton.dataset.studentUid = member.uid;
    historyButton.textContent = "View History";
    historyCell.append(historyButton);

    row.append(studentCell, pointsCell, hoursCell, historyCell);
    return row;
}

function filteredMembers() {
    const search = userSearchBar.value.trim().toLowerCase();
    if (!search) return members;

    return members.filter((member) => {
        const firstName = String(member.firstname || "").toLowerCase();
        const lastName = String(member.lastname || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const username = String(member.username || "").toLowerCase();
        const email = String(member.email || "").toLowerCase();

        return firstName.includes(search)
            || lastName.includes(search)
            || fullName.includes(search)
            || username.includes(search)
            || email.includes(search);
    });
}

function renderStudents() {
    const visibleMembers = filteredMembers();
    studentListContainer.replaceChildren();

    if (visibleMembers.length === 0) {
        studentListContainer.append(makeStatusRow(
            userSearchBar.value.trim() ? "No students match that search." : "No students found."
        ));
        return;
    }

    visibleMembers.forEach((member) => {
        studentListContainer.append(createStudentRow(member));
    });
}

function timestampToMs(value) {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    return 0;
}

function formatHistoryDate(record) {
    const timestamp = Number(record.checkOutMs)
        || Number(record.checkInMs)
        || timestampToMs(record.updatedAt)
        || timestampToMs(record.createdAt);

    if (!timestamp) return "Date unavailable";

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(new Date(timestamp));
}

function createHistoryCard(record) {
    const card = document.createElement("div");
    card.className = "history-event-card";

    const header = document.createElement("div");
    header.className = "event-card-header";

    const badge = document.createElement("span");
    badge.className = "event-type-badge event";
    badge.textContent = "Completed";

    const date = document.createElement("span");
    date.className = "event-date";
    date.textContent = formatHistoryDate(record);

    header.append(badge, date);

    const title = document.createElement("h4");
    title.textContent = record.eventTitle || record.title || "Event";

    const footer = document.createElement("div");
    footer.className = "event-card-footer";

    const pointsText = document.createElement("span");
    const awardedPoints = record.pointsAwarded ?? record.points ?? record.hours ?? record.timeSpent ?? 0;
    pointsText.append("Points: ");
    const pointsValue = document.createElement("strong");
    pointsValue.textContent = `${formatScore(awardedPoints)} pts`;
    pointsText.append(pointsValue);

    const hoursText = document.createElement("span");
    const creditedHours = record.hours ?? record.timeSpent ?? 0;
    hoursText.append("Hours: ");
    const hoursValue = document.createElement("strong");
    hoursValue.textContent = `${formatScore(creditedHours)} hrs`;
    hoursText.append(hoursValue);

    footer.append(pointsText, hoursText);
    card.append(header, title, footer);
    return card;
}

function getCompletedHistory(member) {
    const firestoreHistory = attendanceRecords
        .filter((record) => record.studentUid === member.uid && record.status === "completed")
        .sort((a, b) => {
            const bTime = Number(b.checkOutMs) || Number(b.checkInMs) || timestampToMs(b.updatedAt);
            const aTime = Number(a.checkOutMs) || Number(a.checkInMs) || timestampToMs(a.updatedAt);
            return bTime - aTime;
        });

    if (firestoreHistory.length > 0) return firestoreHistory;

    // Older accounts stored completed events directly on the profile. Keep showing those during the Firebase migration.
    return Array.isArray(member.eventsCompleted) ? [...member.eventsCompleted].reverse() : [];
}

function renderHistory(member) {
    historyContainer.replaceChildren();
    studentNameTarget.textContent = memberDisplayName(member);

    const history = getCompletedHistory(member);
    if (history.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No completed event history yet.";
        historyContainer.append(empty);
        return;
    }

    history.forEach((record) => {
        historyContainer.append(createHistoryCard(record));
    });
}

function openHistory(memberUid) {
    const member = members.find((item) => item.uid === memberUid);
    if (!member) return;

    selectedMemberUid = memberUid;
    renderHistory(member);
    historyModal.classList.add("active");
    closeHistoryModalButton.focus();
}

function closeHistory() {
    selectedMemberUid = null;
    historyModal.classList.remove("active");
    historyContainer.replaceChildren();
}

studentListContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".btn-history-trigger");
    if (!button) return;

    openHistory(button.dataset.studentUid);
});

userSearchBar.addEventListener("input", renderStudents);
closeHistoryModalButton.addEventListener("click", closeHistory);

historyModal.addEventListener("click", (event) => {
    if (event.target === historyModal) closeHistory();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && historyModal.classList.contains("active")) {
        closeHistory();
    }
});

function startMemberListener() {
    const usersRef = collection(database, "schools", SCHOOL_ID, "users");

    membersUnsubscribe = onSnapshot(usersRef, (snapshot) => {
        members = snapshot.docs
            .map((memberDoc) => ({
                uid: memberDoc.id,
                ...memberDoc.data()
            }))
            .sort((a, b) => memberDisplayName(a).localeCompare(memberDisplayName(b)));

        renderStudents();

        if (selectedMemberUid) {
            const selectedMember = members.find((member) => member.uid === selectedMemberUid);
            if (selectedMember) renderHistory(selectedMember);
            else closeHistory();
        }
    }, (error) => {
        console.error("Could not load student directory:", error);
        studentListContainer.replaceChildren(makeStatusRow("Could not load the student directory."));
    });
}

function startAttendanceListener() {
    const attendanceRef = collection(database, "schools", SCHOOL_ID, "attendance");

    attendanceUnsubscribe = onSnapshot(attendanceRef, (snapshot) => {
        attendanceRecords = snapshot.docs.map((attendanceDoc) => ({
            id: attendanceDoc.id,
            ...attendanceDoc.data()
        }));

        if (selectedMemberUid) {
            const selectedMember = members.find((member) => member.uid === selectedMemberUid);
            if (selectedMember) renderHistory(selectedMember);
        }
    }, (error) => {
        // The directory can still work if history fails, so don't take down the whole page.
        console.error("Could not load attendance history:", error);
        attendanceRecords = [];
    });
}

window.addEventListener("pagehide", () => {
    membersUnsubscribe?.();
    attendanceUnsubscribe?.();
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        redirectToLogin();
        return;
    }

    try {
        const profileRef = doc(database, "schools", SCHOOL_ID, "users", user.uid);
        const profileSnapshot = await getDoc(profileRef);

        if (!profileSnapshot.exists()) {
            redirectToLogin();
            return;
        }

        showAdminControls(userIsAdmin(profileSnapshot.data()));
        startMemberListener();
        startAttendanceListener();
    } catch (error) {
        console.error("Could not verify the signed-in member:", error);
        studentListContainer.replaceChildren(makeStatusRow("Could not load the directory. Refresh and try again."));
    }
});
