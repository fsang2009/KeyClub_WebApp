import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp
} from "firebase/firestore";
import { auth, database } from "./firebaseConfig.js";

const SCHOOL_ID = "southport_high_school";
const HOURS_STEP = 0.5;

const adminAccessMessage = document.querySelector("#adminAccessMessage");
const adminPageSections = document.querySelectorAll("[data-admin-page]");

const arrivedInput = document.querySelector("#manualTimeArrived");
const leftInput = document.querySelector("#manualTimeLeaving");
const manualEventSelect = document.querySelector("#manualEvent");
const cameraEventSelect = document.querySelector("#cameraEvent");
const studentEmailInput = document.querySelector("#manualEmail");
const manualSubmitButton = document.querySelector("#manualSubmitButton");
const manualClearButton = document.querySelector("#manualClearButton");
const manualErrorMessage = document.querySelector("#manualErrorMessage");
const manualSuccessMessage = document.querySelector("#manualSuccessMessage");

const attendanceList = document.querySelector("#attendanceList");
const activeCheckinList = document.querySelector("#userScannedLogBox");

const startScanButton = document.querySelector("#startScanButton");
const stopScanButton = document.querySelector("#stopScanButton");
const scannerStatus = document.querySelector(".scanner-status");
const cameraErrorMessage = document.querySelector("#cameraErrorMessage");

let firebaseUser = null;
let eventData = [];
let attendanceRecords = [];
let membersByEmail = new Map();
let attendanceUnsubscribe = null;
let messageTimer = null;

let qrScanner = null;
let scannerRunning = false;
let scanProcessing = false;
let preferredCameraId = null;

// Keep the camera running between members. The cooldown stops one QR from
// being read over and over while someone is still holding it in front of the phone.
const SAME_QR_COOLDOWN_MS = 20_000;
const recentQrScans = new Map();

function isAdmin(profile) {
    // This check keeps normal members out of the admin page in the browser.
    // Firestore rules still need to enforce the same role so someone cannot bypass the page and write directly.
    return profile?.role === "admin" || profile?.isAdmin === true;
}

function redirectToLogin() {
    window.location.replace("login.html");
}

function redirectToHome() {
    window.location.replace("index.html");
}

function showAdminPage() {
    adminAccessMessage.hidden = true;
    adminPageSections.forEach((section) => {
        section.hidden = false;
    });
}

function clearManualMessages() {
    manualErrorMessage.textContent = "";
    manualSuccessMessage.textContent = "";
    manualErrorMessage.classList.remove("show");
    manualSuccessMessage.classList.remove("show");
}

function showManualError(message) {
    clearManualMessages();
    manualErrorMessage.textContent = message;
    manualErrorMessage.classList.add("show");
}

function showManualSuccess(message) {
    clearManualMessages();
    manualSuccessMessage.textContent = message;
    manualSuccessMessage.classList.add("show");
}

function showCameraError(message) {
    clearTimeout(messageTimer);
    cameraErrorMessage.textContent = message;
    cameraErrorMessage.classList.add("show");
    messageTimer = setTimeout(() => {
        cameraErrorMessage.textContent = "";
        cameraErrorMessage.classList.remove("show");
    }, 4500);
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function roundHours(hours) {
    return Math.round(hours / HOURS_STEP) * HOURS_STEP;
}

function calculateHours(startMs, endMs) {
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return NaN;
    }

    return roundHours((endMs - startMs) / 3_600_000);
}

function combineEventDateAndTime(event, timeValue) {
    const dateValue = event?.date;
    if (!dateValue || !timeValue) return NaN;

    const result = new Date(`${dateValue}T${timeValue}:00`);
    return result.getTime();
}

function formatTime(ms) {
    if (!Number.isFinite(ms)) return "—";

    return new Date(ms).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

function formatDate(ms) {
    if (!Number.isFinite(ms)) return "—";
    return new Date(ms).toLocaleDateString();
}

function getEvent(eventId) {
    return eventData.find((event) => String(event.id) === String(eventId));
}

function getAttendanceId(eventId, memberUid) {
    // One record per member/event prevents a double scan from awarding hours twice.
    return `${eventId}_${memberUid}`;
}

function fillEventSelect(selectElement) {
    const selectedValue = selectElement.value;
    selectElement.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select event";
    selectElement.append(placeholder);

    eventData.forEach((event) => {
        if (!event.id || !event.title) return;

        const option = document.createElement("option");
        option.value = event.id;
        option.textContent = event.title;
        selectElement.append(option);
    });

    if (eventData.some((event) => String(event.id) === selectedValue)) {
        selectElement.value = selectedValue;
    }
}

function syncLegacyEventCache() {
    // A few pages are still being moved to Firestore, so keep their temporary event cache current for now.
    localStorage.setItem("eventData", JSON.stringify(eventData));
}

async function loadEventsOnce() {
    const eventsRef = collection(database, "schools", SCHOOL_ID, "events");
    try {
        const snapshot = await getDocs(eventsRef);
        eventData = snapshot.docs.map((eventDoc) => ({ ...eventDoc.data(), id: eventDoc.id }));
        eventData.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
        syncLegacyEventCache();
        fillEventSelect(manualEventSelect);
        fillEventSelect(cameraEventSelect);
    } catch (error) {
        console.error("Could not load events:", error);
        showManualError("Could not load events. Refresh the page and try again.");
    }
}

async function loadMembersOnce() {
    const usersRef = collection(database, "schools", SCHOOL_ID, "users");
    try {
        const snapshot = await getDocs(usersRef);
        const nextMembers = new Map();
        snapshot.forEach((userDoc) => {
            const profile = userDoc.data();
            const email = normalizeEmail(profile.email);
            if (!email) return;
            nextMembers.set(email, { uid: userDoc.id, ref: userDoc.ref, ...profile, email });
        });
        membersByEmail = nextMembers;
        renderAttendance();
        renderActiveCheckins();
    } catch (error) {
        console.error("Could not load members:", error);
        showCameraError("Could not load the member list. Refresh the page.");
    }
}

function getRecordTime(record, field, fallbackField) {
    const timestamp = record[field];
    if (timestamp?.toDate) return timestamp.toDate().getTime();
    return Number(record[fallbackField]) || NaN;
}

function createAttendanceItem(record) {
    const item = document.createElement("div");
    item.className = "attendance-item";

    const info = document.createElement("div");
    info.className = "attendance-info";

    const name = document.createElement("h3");
    name.className = "attendance-name";
    name.textContent = record.studentName || record.studentEmail || "Unknown member";

    const email = document.createElement("p");
    email.className = "attendance-email";
    email.textContent = record.studentEmail || "";

    const eventName = document.createElement("p");
    eventName.className = "attendance-event";
    eventName.textContent = record.eventTitle || "Unknown event";

    info.append(name, email, eventName);

    const details = document.createElement("div");
    details.className = "attendance-details";

    const checkInMs = getRecordTime(record, "checkInAt", "checkInMs");
    const checkOutMs = getRecordTime(record, "checkOutAt", "checkOutMs");

    const time = document.createElement("p");
    time.className = "attendance-time";
    time.textContent = record.status === "completed"
        ? `Time: ${formatTime(checkInMs)} - ${formatTime(checkOutMs)}`
        : `Checked in: ${formatTime(checkInMs)}`;

    const hours = document.createElement("p");
    hours.className = "attendance-hours";
    hours.textContent = record.status === "completed"
        ? `Hours: ${Number(record.hours || 0).toFixed(1)}`
        : "Currently checked in";

    const date = document.createElement("p");
    date.className = "attendance-date";
    date.textContent = formatDate(checkInMs);

    details.append(time, hours, date);
    item.append(info, details);
    return item;
}

function renderAttendance() {
    attendanceList.replaceChildren();

    if (attendanceRecords.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No attendance records yet";
        attendanceList.append(empty);
        return;
    }

    attendanceRecords.forEach((record) => {
        attendanceList.append(createAttendanceItem(record));
    });
}

function createActiveCheckinItem(record) {
    const row = document.createElement("div");
    row.className = "studentLogBox";

    const member = membersByEmail.get(normalizeEmail(record.studentEmail));
    const name = record.studentName
        || `${member?.firstname || ""} ${member?.lastname || ""}`.trim()
        || record.studentEmail
        || "Unknown member";

    const text = document.createElement("p");
    const checkInMs = getRecordTime(record, "checkInAt", "checkInMs");
    text.textContent = `${name} | ${record.eventTitle || "Event"} | Checked in: ${formatTime(checkInMs)}`;

    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.className = "UserLogDelete";
    undoButton.dataset.recordId = record.id;
    undoButton.textContent = "Undo check-in";

    row.append(text, undoButton);
    return row;
}

function renderActiveCheckins() {
    activeCheckinList.replaceChildren();

    const activeRecords = attendanceRecords.filter((record) => record.status === "checked_in");
    if (activeRecords.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No members currently checked in.";
        activeCheckinList.append(empty);
        return;
    }

    activeRecords.forEach((record) => {
        activeCheckinList.append(createActiveCheckinItem(record));
    });
}

function startAttendanceListener() {
    const attendanceRef = collection(database, "schools", SCHOOL_ID, "attendance");
    const attendanceQuery = query(attendanceRef, orderBy("updatedAt", "desc"), limit(100));

    attendanceUnsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
        attendanceRecords = snapshot.docs.map((attendanceDoc) => ({
            id: attendanceDoc.id,
            ...attendanceDoc.data()
        }));

        renderAttendance();
        renderActiveCheckins();
    }, (error) => {
        console.error("Could not load attendance:", error);
        attendanceList.replaceChildren();
        const errorText = document.createElement("p");
        errorText.className = "empty-state";
        errorText.textContent = "Could not load attendance records.";
        attendanceList.append(errorText);
    });
}

function getMemberByEmail(email) {
    return membersByEmail.get(normalizeEmail(email)) || null;
}

async function createManualAttendance(member, event, startMs, endMs, hours) {
    const attendanceId = getAttendanceId(event.id, member.uid);
    const attendanceRef = doc(database, "schools", SCHOOL_ID, "attendance", attendanceId);

    await runTransaction(database, async (transaction) => {
        const attendanceSnapshot = await transaction.get(attendanceRef);
        const memberSnapshot = await transaction.get(member.ref);

        if (attendanceSnapshot.exists()) {
            throw new Error("ATTENDANCE_EXISTS");
        }

        if (!memberSnapshot.exists()) {
            throw new Error("MEMBER_MISSING");
        }

        const memberData = memberSnapshot.data();
        const currentHours = Number(memberData.hours) || 0;
        const currentPoints = Number(memberData.points) || 0;

        transaction.set(attendanceRef, {
            studentUid: member.uid,
            studentEmail: member.email,
            studentName: `${member.firstname || ""} ${member.lastname || ""}`.trim(),
            eventId: event.id,
            eventTitle: event.title,
            status: "completed",
            entryMethod: "manual",
            checkInMs: startMs,
            checkOutMs: endMs,
            hours,
            createdBy: firebaseUser.uid,
            completedBy: firebaseUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        transaction.update(member.ref, {
            hours: currentHours + hours,
            points: currentPoints + hours
        });
    });
}

async function handleManualAttendance() {
    clearManualMessages();

    const event = getEvent(manualEventSelect.value);
    const email = normalizeEmail(studentEmailInput.value);
    const member = getMemberByEmail(email);

    if (!email || !manualEventSelect.value || !arrivedInput.value || !leftInput.value) {
        showManualError("Please fill in all boxes.");
        return;
    }

    if (!event) {
        showManualError("Please choose a valid event.");
        return;
    }

    if (!member) {
        showManualError("That email does not belong to a registered member.");
        return;
    }

    const startMs = combineEventDateAndTime(event, arrivedInput.value);
    const endMs = combineEventDateAndTime(event, leftInput.value);
    const hours = calculateHours(startMs, endMs);

    if (!Number.isFinite(hours)) {
        showManualError("Leaving time must be after arrival time.");
        return;
    }

    if (hours <= 0) {
        showManualError("That time range is too short to receive attendance credit.");
        return;
    }

    manualSubmitButton.disabled = true;
    manualSubmitButton.textContent = "Saving...";

    try {
        await createManualAttendance(member, event, startMs, endMs, hours);
        showManualSuccess(`Attendance saved: ${hours.toFixed(1)} hour${hours === 1 ? "" : "s"}.`);
        arrivedInput.value = "";
        leftInput.value = "";
        studentEmailInput.value = "";
    } catch (error) {
        if (error.message === "ATTENDANCE_EXISTS") {
            showManualError("This member already has an attendance record for that event.");
        } else if (error.message === "MEMBER_MISSING") {
            showManualError("That member account no longer exists.");
        } else {
            console.error("Could not save manual attendance:", error);
            showManualError("Could not save attendance. Please try again.");
        }
    } finally {
        manualSubmitButton.disabled = false;
        manualSubmitButton.textContent = "Mark Attendance";
    }
}

async function checkMemberIn(member, event) {
    const attendanceId = getAttendanceId(event.id, member.uid);
    const attendanceRef = doc(database, "schools", SCHOOL_ID, "attendance", attendanceId);
    const nowMs = Date.now();

    return runTransaction(database, async (transaction) => {
        const attendanceSnapshot = await transaction.get(attendanceRef);
        const memberSnapshot = await transaction.get(member.ref);

        if (!memberSnapshot.exists()) {
            throw new Error("MEMBER_MISSING");
        }

        if (attendanceSnapshot.exists()) {
            const existingRecord = attendanceSnapshot.data();
            if (existingRecord.status === "completed") {
                throw new Error("ALREADY_COMPLETED");
            }
            if (existingRecord.status === "checked_in") {
                return { action: "checkout", record: existingRecord };
            }
        }

        transaction.set(attendanceRef, {
            studentUid: member.uid,
            studentEmail: member.email,
            studentName: `${member.firstname || ""} ${member.lastname || ""}`.trim(),
            eventId: event.id,
            eventTitle: event.title,
            status: "checked_in",
            entryMethod: "qr",
            checkInAt: serverTimestamp(),
            checkInMs: nowMs,
            checkOutAt: null,
            checkOutMs: null,
            hours: null,
            createdBy: firebaseUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        return { action: "checkin", checkInMs: nowMs };
    });
}

async function checkMemberOut(member, event) {
    const attendanceId = getAttendanceId(event.id, member.uid);
    const attendanceRef = doc(database, "schools", SCHOOL_ID, "attendance", attendanceId);
    const nowMs = Date.now();

    return runTransaction(database, async (transaction) => {
        const attendanceSnapshot = await transaction.get(attendanceRef);
        const memberSnapshot = await transaction.get(member.ref);

        if (!attendanceSnapshot.exists()) {
            throw new Error("NOT_CHECKED_IN");
        }

        if (!memberSnapshot.exists()) {
            throw new Error("MEMBER_MISSING");
        }

        const record = attendanceSnapshot.data();
        if (record.status === "completed") {
            throw new Error("ALREADY_COMPLETED");
        }

        if (record.status !== "checked_in") {
            throw new Error("NOT_CHECKED_IN");
        }

        const checkInMs = Number(record.checkInMs);
        const hours = calculateHours(checkInMs, nowMs);
        if (!Number.isFinite(hours) || hours <= 0) {
            throw new Error("TOO_SOON");
        }

        const memberData = memberSnapshot.data();
        const currentHours = Number(memberData.hours) || 0;
        const currentPoints = Number(memberData.points) || 0;

        transaction.update(attendanceRef, {
            status: "completed",
            checkOutAt: serverTimestamp(),
            checkOutMs: nowMs,
            hours,
            completedBy: firebaseUser.uid,
            updatedAt: serverTimestamp()
        });

        transaction.update(member.ref, {
            hours: currentHours + hours,
            points: currentPoints + hours
        });

        return { hours };
    });
}

async function handleScannedMember(decodedText) {
    const event = getEvent(cameraEventSelect.value);
    if (!event) {
        throw new Error("NO_EVENT");
    }

    const email = normalizeEmail(decodedText);
    const member = getMemberByEmail(email);
    if (!member) {
        throw new Error("INVALID_QR");
    }

    const attendanceId = getAttendanceId(event.id, member.uid);
    const attendanceRef = doc(database, "schools", SCHOOL_ID, "attendance", attendanceId);
    const attendanceSnapshot = await getDoc(attendanceRef);

    if (attendanceSnapshot.exists() && attendanceSnapshot.data().status === "checked_in") {
        const result = await checkMemberOut(member, event);
        return {
            message: `${member.firstname || "Member"} checked out — ${result.hours.toFixed(1)} hour${result.hours === 1 ? "" : "s"} credited.`
        };
    }

    const result = await checkMemberIn(member, event);
    if (result.action === "checkout") {
        // The record changed between our first read and the transaction. Finish the checkout safely.
        const checkoutResult = await checkMemberOut(member, event);
        return {
            message: `${member.firstname || "Member"} checked out — ${checkoutResult.hours.toFixed(1)} hour${checkoutResult.hours === 1 ? "" : "s"} credited.`
        };
    }

    return {
        message: `${member.firstname || "Member"} checked in successfully.`
    };
}

async function stopScanner(statusMessage = "Camera stopped") {
    if (!qrScanner || !scannerRunning) {
        scannerRunning = false;
        stopScanButton.disabled = true;
        cameraEventSelect.disabled = false;
        return;
    }

    try {
        await qrScanner.stop();
    } catch (error) {
        console.warn("Scanner stop warning:", error);
    } finally {
        scannerRunning = false;
        stopScanButton.disabled = true;
        startScanButton.disabled = false;
        cameraEventSelect.disabled = false;
        startScanButton.textContent = "Start Camera";
        scannerStatus.textContent = statusMessage;
    }
}

async function onScanSuccess(decodedText) {
    const normalizedCode = normalizeEmail(decodedText);
    const now = Date.now();
    const lastReadAt = recentQrScans.get(normalizedCode) || 0;

    if (scanProcessing || now - lastReadAt < SAME_QR_COOLDOWN_MS) return;

    scanProcessing = true;
    recentQrScans.set(normalizedCode, now);
    scannerStatus.textContent = "QR read. Saving attendance...";
    scannerStatus.style.color = "";

    try {
        const result = await handleScannedMember(decodedText);
        scannerStatus.textContent = `${result.message} Ready for the next QR.`;
        scannerStatus.style.color = "#15803d";
    } catch (error) {
        // Let an admin retry a failed scan immediately instead of waiting for the cooldown.
        recentQrScans.delete(normalizedCode);
        scannerStatus.style.color = "";

        switch (error.message) {
            case "NO_EVENT":
                showCameraError("Choose an event before scanning.");
                break;
            case "INVALID_QR":
                showCameraError("That QR code does not belong to a registered member.");
                break;
            case "ALREADY_COMPLETED":
                showCameraError("This member has already completed attendance for this event.");
                break;
            case "TOO_SOON":
                showCameraError("The member was checked in too recently to receive time credit yet.");
                break;
            case "MEMBER_MISSING":
                showCameraError("That member account no longer exists.");
                break;
            default:
                console.error("QR attendance failed:", error);
                showCameraError("Could not save this scan. Please try again.");
        }
    } finally {
        scanProcessing = false;

        // Keep this map tiny even if an admin scans a lot of members in one session.
        for (const [code, scannedAt] of recentQrScans) {
            if (now - scannedAt > SAME_QR_COOLDOWN_MS * 3) recentQrScans.delete(code);
        }
    }
}

async function findPreferredCamera() {
    if (preferredCameraId) return preferredCameraId;

    const cameras = await window.Html5Qrcode.getCameras();
    if (!cameras.length) {
        throw new Error("NO_CAMERA");
    }

    const preferred = cameras.find((camera) => /back|rear|environment/i.test(camera.label)) || cameras[0];
    preferredCameraId = preferred.id;
    return preferredCameraId;
}

async function startScanner() {
    cameraErrorMessage.textContent = "";
    cameraErrorMessage.classList.remove("show");

    if (!cameraEventSelect.value || !getEvent(cameraEventSelect.value)) {
        showCameraError("Choose an event before starting the camera.");
        return;
    }

    if (!window.Html5Qrcode) {
        showCameraError("The QR scanner did not load. Refresh the page and try again.");
        return;
    }

    if (scannerRunning) return;

    startScanButton.disabled = true;
    stopScanButton.disabled = false;
    cameraEventSelect.disabled = true;
    scannerStatus.textContent = "Requesting camera access...";
    scannerStatus.style.color = "";

    try {
        if (!qrScanner) {
            const scannerOptions = { verbose: false };

            // QR-only decoding is less work than asking the library to check every barcode format.
            if (window.Html5QrcodeSupportedFormats?.QR_CODE !== undefined) {
                scannerOptions.formatsToSupport = [window.Html5QrcodeSupportedFormats.QR_CODE];
            }

            qrScanner = new window.Html5Qrcode("qr-reader", scannerOptions);
        }

        const cameraId = await findPreferredCamera();
        await qrScanner.start(
            cameraId,
            {
                fps: 18,
                aspectRatio: 4 / 3,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const shortestSide = Math.min(viewfinderWidth, viewfinderHeight);
                    const size = Math.max(180, Math.min(320, Math.floor(shortestSide * 0.72)));
                    return { width: size, height: size };
                }
            },
            onScanSuccess,
            () => {}
        );

        scannerRunning = true;
        scannerStatus.textContent = "Ready to scan";
        startScanButton.textContent = "Camera Running";
    } catch (error) {
        console.error("Could not start scanner:", error);
        scannerRunning = false;
        startScanButton.disabled = false;
        stopScanButton.disabled = true;
        cameraEventSelect.disabled = false;

        if (error.message === "NO_CAMERA") {
            showCameraError("No camera was found on this device.");
        } else {
            showCameraError("Camera access failed. Check browser permissions and try again.");
        }

        scannerStatus.textContent = "Camera unavailable";
    }
}

async function undoCheckin(recordId) {
    const recordRef = doc(database, "schools", SCHOOL_ID, "attendance", recordId);

    await runTransaction(database, async (transaction) => {
        const snapshot = await transaction.get(recordRef);
        if (!snapshot.exists()) return;

        if (snapshot.data().status !== "checked_in") {
            throw new Error("ALREADY_COMPLETED");
        }

        transaction.delete(recordRef);
    });
}

activeCheckinList.addEventListener("click", async (event) => {
    const button = event.target.closest(".UserLogDelete");
    if (!button) return;

    const recordId = button.dataset.recordId;
    if (!recordId) return;

    button.disabled = true;
    try {
        await undoCheckin(recordId);
    } catch (error) {
        console.error("Could not undo check-in:", error);
        showCameraError(
            error.message === "ALREADY_COMPLETED"
                ? "That attendance record has already been completed and cannot be undone here."
                : "Could not undo this check-in."
        );
        button.disabled = false;
    }
});

manualSubmitButton.addEventListener("click", handleManualAttendance);
manualClearButton.addEventListener("click", () => {
    arrivedInput.value = "";
    leftInput.value = "";
    manualEventSelect.value = "";
    studentEmailInput.value = "";
    clearManualMessages();
});

startScanButton.addEventListener("click", startScanner);
stopScanButton.addEventListener("click", () => stopScanner());

window.addEventListener("pagehide", () => {
    if (scannerRunning && qrScanner) {
        qrScanner.stop().catch(() => {});
    }

    attendanceUnsubscribe?.();
});

stopScanButton.disabled = true;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        redirectToLogin();
        return;
    }

    try {
        const profileRef = doc(database, "schools", SCHOOL_ID, "users", user.uid);
        const profileSnapshot = await getDoc(profileRef);

        if (!profileSnapshot.exists()) {
            redirectToHome();
            return;
        }

        const profile = profileSnapshot.data();
        if (!isAdmin(profile)) {
            // Typing /admin.html directly is not enough to get access.
            // The server-side Firestore rules will be the final protection for admin-only writes.
            redirectToHome();
            return;
        }

        firebaseUser = user;
        showAdminPage();
        await Promise.all([loadMembersOnce(), loadEventsOnce()]);
        startAttendanceListener();
    } catch (error) {
        console.error("Could not verify admin access:", error);
        adminAccessMessage.textContent = "Could not verify admin access. Refresh the page and try again.";
    }
});
