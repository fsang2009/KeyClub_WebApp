import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, database } from "./firebaseConfig.js";

const SCHOOL_ID = "southport_high_school";
const SCHOOL_NAME = "Southport High School";
const DEFAULT_AVATAR = "assets/images/profiles/avatar1.png";
const STUDENTS_PER_PAGE = 10;

const schoolLeaderboard = document.querySelector("#schoolLeaderboard");
const studentLeaderboard = document.querySelector("#studentLeaderboard");
const topPerformerGrid = document.querySelector(".top-performers-grid");
const schoolRankingButton = document.querySelector("#school-ranking-button");
const studentRankingButton = document.querySelector("#student-ranking-button");
const schoolsTab = document.querySelector("#schools-tab");
const studentsTab = document.querySelector("#students-tab");
const studentSort = document.querySelector("#studentSort");
const prevStudentPage = document.querySelector("#prevStudentPage");
const nextStudentPage = document.querySelector("#nextStudentPage");
const studentPaginationNumbers = document.querySelector("#studentPaginationNumbers");

let members = [];
let currentSort = "hours";
let currentStudentPage = 1;
let membersUnsubscribe = null;

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

function schoolDisplayName(member) {
    const school = String(member.school || "").trim();
    if (!school || school === SCHOOL_ID) return SCHOOL_NAME;

    return school
        .split("_")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function normalizeProfileImage(savedImage) {
    if (!savedImage) return DEFAULT_AVATAR;

    const value = String(savedImage);
    if (/^https?:\/\//i.test(value)) return value;

    const fileName = value.match(/avatar[1-8]\.png$/i)?.[0];
    return fileName
        ? `assets/images/profiles/${fileName.toLowerCase()}`
        : DEFAULT_AVATAR;
}

function rankClasses(index) {
    if (index === 0) return { row: "rank-1", badge: "gold" };
    if (index === 1) return { row: "rank-2", badge: "silver" };
    if (index === 2) return { row: "rank-3", badge: "bronze" };
    return { row: "", badge: "" };
}

function ordinal(rank) {
    const remainder100 = rank % 100;
    if (remainder100 >= 11 && remainder100 <= 13) return `${rank}th`;

    if (rank % 10 === 1) return `${rank}st`;
    if (rank % 10 === 2) return `${rank}nd`;
    if (rank % 10 === 3) return `${rank}rd`;
    return `${rank}th`;
}

function makeEmptyMessage(message) {
    const messageBox = document.createElement("div");
    messageBox.className = "leaderboard-empty-state";
    messageBox.textContent = message;
    return messageBox;
}

function getSchoolStats() {
    const stats = new Map();

    members.forEach((member) => {
        const name = schoolDisplayName(member);
        const current = stats.get(name) || {
            name,
            totalHours: 0,
            totalPoints: 0,
            studentCount: 0
        };

        current.totalHours += numberValue(member.hours);
        current.totalPoints += numberValue(member.points);
        current.studentCount += 1;
        stats.set(name, current);
    });

    return [...stats.values()].sort((a, b) => {
        return b.totalHours - a.totalHours || b.totalPoints - a.totalPoints || a.name.localeCompare(b.name);
    });
}

function renderSchoolLeaderboard() {
    schoolLeaderboard.replaceChildren();

    const schoolStats = getSchoolStats();
    if (!schoolStats.length) {
        schoolLeaderboard.append(makeEmptyMessage("No member hours have been recorded yet."));
        return;
    }

    const highestHours = Math.max(...schoolStats.map((school) => school.totalHours), 1);

    schoolStats.forEach((school, index) => {
        const classes = rankClasses(index);
        const row = document.createElement("div");
        row.className = `school-leaderboard-item ${classes.row}`.trim();

        const rankBadge = document.createElement("div");
        rankBadge.className = `school-rank-badge ${classes.badge}`.trim();
        rankBadge.textContent = String(index + 1);

        const info = document.createElement("div");
        info.className = "school-info";

        const name = document.createElement("h3");
        name.className = "school-name";
        name.textContent = school.name;

        const stats = document.createElement("p");
        stats.className = "school-stats";
        stats.textContent = `${formatScore(school.totalHours)} hours • ${school.studentCount} ${school.studentCount === 1 ? "student" : "students"} • ${formatScore(school.totalPoints)} points`;

        info.append(name, stats);

        const progress = document.createElement("div");
        progress.className = "school-progress-bar";

        const fill = document.createElement("div");
        fill.className = "progress-fill";
        fill.style.width = `${Math.max(4, (school.totalHours / highestHours) * 100)}%`;
        progress.append(fill);

        row.append(rankBadge, info, progress);
        schoolLeaderboard.append(row);
    });
}

function sortedMembers() {
    const primary = currentSort === "points" ? "points" : "hours";
    const secondary = primary === "hours" ? "points" : "hours";

    return [...members].sort((a, b) => {
        return numberValue(b[primary]) - numberValue(a[primary])
            || numberValue(b[secondary]) - numberValue(a[secondary])
            || memberDisplayName(a).localeCompare(memberDisplayName(b));
    });
}

function createStudentRow(member, absoluteIndex) {
    const classes = rankClasses(absoluteIndex);
    const row = document.createElement("div");
    row.className = `leaderboard-item ${classes.row}`.trim();

    const info = document.createElement("div");
    info.className = "leaderboard-info";

    const rank = document.createElement("div");
    rank.className = "rank-number";
    rank.textContent = String(absoluteIndex + 1);

    const avatar = document.createElement("img");
    avatar.className = "leaderboard-avatar";
    avatar.src = normalizeProfileImage(member.profileImage);
    avatar.alt = `${memberDisplayName(member)} avatar`;
    avatar.addEventListener("error", () => {
        avatar.src = DEFAULT_AVATAR;
    }, { once: true });

    const details = document.createElement("div");
    details.className = "leaderboard-details";

    const name = document.createElement("h3");
    name.className = "leaderboard-name";
    name.textContent = memberDisplayName(member);

    const school = document.createElement("p");
    school.className = "leaderboard-school";
    school.textContent = schoolDisplayName(member);

    details.append(name, school);
    info.append(rank, avatar, details);

    const stats = document.createElement("div");
    stats.className = "leaderboard-stats";

    const hoursStat = document.createElement("div");
    hoursStat.className = "stat-display";
    const hoursValue = document.createElement("span");
    hoursValue.className = "stat-value";
    hoursValue.textContent = formatScore(member.hours);
    const hoursLabel = document.createElement("p");
    hoursLabel.className = "stat-label";
    hoursLabel.textContent = "Hours";
    hoursStat.append(hoursValue, hoursLabel);

    const pointsStat = document.createElement("div");
    pointsStat.className = "stat-display";
    const pointsValue = document.createElement("span");
    pointsValue.className = "stat-value";
    pointsValue.textContent = formatScore(member.points);
    const pointsLabel = document.createElement("p");
    pointsLabel.className = "stat-label";
    pointsLabel.textContent = "Points";
    pointsStat.append(pointsValue, pointsLabel);

    stats.append(hoursStat, pointsStat);
    row.append(info, stats);
    return row;
}

function renderStudentPagination(totalStudents) {
    const pageCount = Math.max(1, Math.ceil(totalStudents / STUDENTS_PER_PAGE));
    currentStudentPage = Math.min(currentStudentPage, pageCount);

    prevStudentPage.disabled = currentStudentPage <= 1;
    nextStudentPage.disabled = currentStudentPage >= pageCount || totalStudents === 0;
    studentPaginationNumbers.replaceChildren();

    if (totalStudents <= STUDENTS_PER_PAGE) {
        document.querySelector("#studentPagination").hidden = true;
        return;
    }

    document.querySelector("#studentPagination").hidden = false;

    for (let page = 1; page <= pageCount; page += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `pagination-number${page === currentStudentPage ? " active" : ""}`;
        button.textContent = String(page);
        button.setAttribute("aria-label", `Go to page ${page}`);
        if (page === currentStudentPage) button.setAttribute("aria-current", "page");
        button.addEventListener("click", () => {
            currentStudentPage = page;
            renderStudentLeaderboard();
        });
        studentPaginationNumbers.append(button);
    }
}

function renderStudentLeaderboard() {
    studentLeaderboard.replaceChildren();

    const rankedMembers = sortedMembers();
    renderStudentPagination(rankedMembers.length);

    if (!rankedMembers.length) {
        studentLeaderboard.append(makeEmptyMessage("No students are available on the leaderboard yet."));
        return;
    }

    const startIndex = (currentStudentPage - 1) * STUDENTS_PER_PAGE;
    const visibleMembers = rankedMembers.slice(startIndex, startIndex + STUDENTS_PER_PAGE);

    visibleMembers.forEach((member, index) => {
        studentLeaderboard.append(createStudentRow(member, startIndex + index));
    });
}

function renderTopPerformers() {
    topPerformerGrid.replaceChildren();

    const topStudents = [...members]
        .sort((a, b) => {
            return numberValue(b.hours) - numberValue(a.hours)
                || numberValue(b.points) - numberValue(a.points)
                || memberDisplayName(a).localeCompare(memberDisplayName(b));
        })
        .slice(0, 3);

    if (!topStudents.length) {
        topPerformerGrid.append(makeEmptyMessage("Top performers will appear after volunteer hours are recorded."));
        return;
    }

    topStudents.forEach((student, index) => {
        const classes = rankClasses(index);
        const card = document.createElement("div");
        card.className = `top-performer-card ${classes.badge}`.trim();

        const badge = document.createElement("div");
        badge.className = "rank-badge";
        badge.textContent = ordinal(index + 1);

        const avatarWrap = document.createElement("div");
        avatarWrap.className = "performer-avatar";
        const avatar = document.createElement("img");
        avatar.src = normalizeProfileImage(student.profileImage);
        avatar.alt = `${memberDisplayName(student)} avatar`;
        avatar.addEventListener("error", () => {
            avatar.src = DEFAULT_AVATAR;
        }, { once: true });
        avatarWrap.append(avatar);

        const name = document.createElement("h3");
        name.className = "performer-name";
        name.textContent = memberDisplayName(student);

        const school = document.createElement("p");
        school.className = "performer-school";
        school.textContent = schoolDisplayName(student);

        const stats = document.createElement("div");
        stats.className = "performer-stats";

        const hours = document.createElement("p");
        hours.className = "stat-item";
        const hoursValue = document.createElement("span");
        hoursValue.className = "stat-value";
        hoursValue.textContent = formatScore(student.hours);
        hours.append(hoursValue, document.createTextNode(" Hours"));

        const points = document.createElement("p");
        points.className = "stat-item";
        const pointsValue = document.createElement("span");
        pointsValue.className = "stat-value";
        pointsValue.textContent = formatScore(student.points);
        points.append(pointsValue, document.createTextNode(" Points"));

        stats.append(hours, points);
        card.append(badge, avatarWrap, name, school, stats);
        topPerformerGrid.append(card);
    });
}

function renderEverything() {
    renderSchoolLeaderboard();
    renderStudentLeaderboard();
    renderTopPerformers();
}

function showTab(tabName) {
    const showingSchools = tabName === "schools";

    schoolRankingButton.classList.toggle("active", showingSchools);
    studentRankingButton.classList.toggle("active", !showingSchools);
    schoolsTab.classList.toggle("active", showingSchools);
    studentsTab.classList.toggle("active", !showingSchools);

    schoolRankingButton.setAttribute("aria-selected", String(showingSchools));
    studentRankingButton.setAttribute("aria-selected", String(!showingSchools));
}

schoolRankingButton.addEventListener("click", () => showTab("schools"));
studentRankingButton.addEventListener("click", () => showTab("students"));

studentSort.addEventListener("change", () => {
    currentSort = studentSort.value === "points" ? "points" : "hours";
    currentStudentPage = 1;
    renderStudentLeaderboard();
});

prevStudentPage.addEventListener("click", () => {
    if (currentStudentPage <= 1) return;
    currentStudentPage -= 1;
    renderStudentLeaderboard();
});

nextStudentPage.addEventListener("click", () => {
    const pageCount = Math.max(1, Math.ceil(members.length / STUDENTS_PER_PAGE));
    if (currentStudentPage >= pageCount) return;
    currentStudentPage += 1;
    renderStudentLeaderboard();
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
            console.error("The signed-in account does not have a Firestore profile.");
            redirectToLogin();
            return;
        }

        showAdminControls(userIsAdmin(profileSnapshot.data()));

        // Keep this live so new attendance totals appear without a refresh.
        const usersRef = collection(database, "schools", SCHOOL_ID, "users");
        membersUnsubscribe?.();
        membersUnsubscribe = onSnapshot(usersRef, (snapshot) => {
            members = snapshot.docs.map((memberDoc) => ({
                uid: memberDoc.id,
                ...memberDoc.data()
            }));

            renderEverything();
        }, (error) => {
            console.error("Could not load leaderboard members:", error);
            members = [];
            renderEverything();
        });
    } catch (error) {
        console.error("Could not initialize the leaderboard:", error);
        renderEverything();
    }
});

window.addEventListener("beforeunload", () => {
    membersUnsubscribe?.();
});
