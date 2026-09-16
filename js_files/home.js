import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    collection,
    deleteDoc,
    doc,
    arrayRemove,
    arrayUnion,
    getCountFromServer,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc
} from "firebase/firestore";
import {
    deleteObject,
    getDownloadURL,
    getStorage,
    ref,
    uploadBytes
} from "firebase/storage";
import { auth, database } from "./firebaseConfig.js";

const SCHOOL_ID = "southport_high_school";
const MAX_MEDIA_SIZE = 50 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime"
]);

const storage = getStorage();

const postSection = document.querySelector("#post-section");
const createPostButton = document.querySelector("#create-post-button");
const feedSortButton = document.querySelector("#feedSortButton");

const postModal = document.querySelector("#postModal");
const postForm = document.querySelector("#postForm");
const closePostModalButton = document.querySelector("#closeModalBtn");
const cancelPostButton = document.querySelector("#cancelBtn");
const publishPostButton = document.querySelector("#postPublish");
const postTitle = document.querySelector("#postTitle");
const postEventSelect = document.querySelector("#eventSelect");
const postDescription = document.querySelector("#postDesc");
const postFileUpload = document.querySelector("#mediaUpload");
const postType = document.querySelector("#postTypeSelect");
const postErrorMessage = document.querySelector("#postErrorMessage");

const commentModal = document.querySelector("#commentModal");
const commentArea = document.querySelector(".comment-modal-body");
const commentInput = document.querySelector(".comment-input");
const commentSendButton = document.querySelector(".comment-send-button");
const commentCloseButton = document.querySelector("#closeCommentModal");

let firebaseUser = null;
let currentProfile = null;
let isAdmin = false;
let postData = [];
let eventData = [];
let sortNewestFirst = true;
let activeCommentsUnsubscribe = null;
const postMeta = new Map();
const busyLikes = new Set();

function redirectToLogin() {
    window.location.replace("login.html");
}

function userIsAdmin(profile) {
    // Browser checks control what the user sees. Firestore rules are the real security layer.
    return profile?.role === "admin" || profile?.isAdmin === true;
}

function showAdminControls(allowed) {
    document.querySelectorAll("[data-admin-only]").forEach((element) => {
        element.hidden = !allowed;
    });
}

function syncLegacyProfileCache() {
    // A few pages are still being migrated, so keep the old cache current for now.
    if (!firebaseUser || !currentProfile) return;

    let users = {};
    try {
        users = JSON.parse(localStorage.getItem("userinfo")) || {};
    } catch {
        users = {};
    }

    const email = (firebaseUser.email || currentProfile.email || "").trim().toLowerCase();
    if (!email) return;

    users[email] = {
        ...users[email],
        ...currentProfile,
        email,
        uid: firebaseUser.uid
    };

    localStorage.setItem("userinfo", JSON.stringify(users));
    localStorage.setItem("currentUser", JSON.stringify(email));
}

function showPostError(message) {
    postErrorMessage.textContent = message;
    postErrorMessage.style.display = message ? "block" : "none";
}

function openPostModal() {
    if (!isAdmin) return;
    showPostError("");
    postModal.classList.add("active");
    postTitle.focus();
}

function closePostModal() {
    postModal.classList.remove("active");
    postForm.reset();
    showPostError("");
}

function closeCommentModal() {
    commentModal.classList.add("closing");
    commentModal.querySelector(".comment-modal-content")?.classList.add("closing");

    window.setTimeout(() => {
        commentModal.classList.remove("active", "closing");
        commentModal.querySelector(".comment-modal-content")?.classList.remove("closing");
        commentModal.dataset.activePostId = "";
        commentInput.value = "";
        stopActiveCommentsListener();
    }, 200);
}

function formatTimestamp(timestamp) {
    const date = timestamp?.toDate?.();
    if (!date) return "Just now";

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}

function getDisplayName(profile) {
    const fullName = `${profile?.firstname || ""} ${profile?.lastname || ""}`.trim();
    return profile?.username?.trim() || fullName || "Key Club Admin";
}

function getPostTypeLabel(type) {
    const labels = {
        announcement: "Announcement",
        event: "Event",
        "member-post": "Member Post",
        reminder: "Reminder"
    };

    return labels[type] || "Update";
}

function createPostMedia(post) {
    if (!post.mediaUrl) return null;

    const wrapper = document.createElement("div");
    wrapper.className = "post-media";
    wrapper.style.marginTop = "12px";
    wrapper.style.borderRadius = "12px";
    wrapper.style.overflow = "hidden";
    wrapper.style.display = "flex";
    wrapper.style.justifyContent = "center";

    const isVideo = post.mediaType?.startsWith("video/");
    const media = document.createElement(isVideo ? "video" : "img");
    media.src = post.mediaUrl;
    media.style.width = "100%";
    media.style.height = "auto";
    media.style.maxHeight = "500px";
    media.style.objectFit = "contain";
    media.style.borderRadius = "12px";

    if (isVideo) {
        media.controls = true;
        media.preload = "metadata";
    } else {
        media.alt = post.title ? `Media for ${post.title}` : "Post media";
        media.loading = "lazy";
    }

    wrapper.append(media);
    return wrapper;
}

function createPostCard(post) {
    const meta = postMeta.get(post.id) || { likeCount: 0, commentCount: 0, liked: false };

    const article = document.createElement("article");
    article.className = "post";
    article.dataset.postId = post.id;

    const header = document.createElement("div");
    header.className = "post-header";

    const user = document.createElement("div");
    user.className = "user";

    const avatar = document.createElement("img");
    avatar.className = "user-avatar";
    avatar.src = post.authorPhoto || "assets/images/profiles/avatar1.png";
    avatar.alt = `${post.authorName || "Key Club"} avatar`;

    const userInformation = document.createElement("div");
    userInformation.className = "user-information";

    const authorName = document.createElement("p");
    authorName.className = "user-name";
    authorName.textContent = post.authorName || "Key Club Admin";

    const postTime = document.createElement("p");
    postTime.className = "post-time";
    postTime.textContent = formatTimestamp(post.createdAt);

    userInformation.append(authorName, postTime);
    user.append(avatar, userInformation);

    const headerActions = document.createElement("div");
    headerActions.className = "post-header-actions";

    const category = document.createElement("span");
    category.className = `post-category ${post.type || "announcement"}-category`;
    category.textContent = getPostTypeLabel(post.type);
    headerActions.append(category);

    if (isAdmin) {
        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-post-btn";
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.title = "Delete post";
        headerActions.append(deleteButton);
    }

    header.append(user, headerActions);

    const content = document.createElement("div");
    content.className = "post-content";

    const title = document.createElement("h3");
    title.textContent = post.title || "Untitled Post";

    const description = document.createElement("p");
    description.textContent = post.description || "";

    content.append(title, description);

    if (post.eventTitle) {
        const eventLabel = document.createElement("p");
        eventLabel.className = "post-time";
        eventLabel.textContent = `Related event: ${post.eventTitle}`;
        content.append(eventLabel);
    }

    const media = createPostMedia(post);
    if (media) content.append(media);

    const stats = document.createElement("div");
    stats.className = "post-stats";

    const likes = document.createElement("span");
    likes.className = "likesDOM";
    likes.dataset.likesId = post.id;
    likes.textContent = `${meta.likeCount} Like${meta.likeCount === 1 ? "" : "s"}`;

    const comments = document.createElement("span");
    comments.dataset.commentsId = post.id;
    comments.textContent = `${meta.commentCount} comment${meta.commentCount === 1 ? "" : "s"}`;

    stats.append(likes, comments);

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const likeButton = document.createElement("button");
    likeButton.className = "post-action like-toggle-btn";
    likeButton.dataset.likesId = post.id;
    likeButton.type = "button";
    likeButton.setAttribute("aria-pressed", String(meta.liked));

    const heart = document.createElement("span");
    heart.className = "like-button";
    heart.textContent = meta.liked ? "❤️" : "♡";
    likeButton.append(heart, document.createTextNode(" Like"));

    const commentButton = document.createElement("button");
    commentButton.className = "post-action comment-button";
    commentButton.type = "button";
    const commentIcon = document.createElement("span");
    commentIcon.textContent = "💬";
    commentButton.append(commentIcon, document.createTextNode(" Comment"));

    actions.append(likeButton, commentButton);
    article.append(header, content, stats, actions);
    return article;
}

function renderPosts() {
    postSection.replaceChildren();

    if (postData.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No club updates have been posted yet.";
        postSection.append(empty);
        return;
    }

    const sorted = [...postData].sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return sortNewestFirst ? bTime - aTime : aTime - bTime;
    });

    sorted.forEach((post) => postSection.append(createPostCard(post)));
}

function updatePostMetaInDom(postId) {
    const meta = postMeta.get(postId);
    if (!meta) return;

    const postElement = postSection.querySelector(`[data-post-id="${CSS.escape(postId)}"]`);
    if (!postElement) return;

    const likes = postElement.querySelector(".likesDOM");
    const comments = postElement.querySelector(`[data-comments-id="${CSS.escape(postId)}"]`);
    const likeButton = postElement.querySelector(".like-toggle-btn");
    const heart = likeButton?.querySelector(".like-button");

    if (likes) likes.textContent = `${meta.likeCount} Like${meta.likeCount === 1 ? "" : "s"}`;
    if (comments) comments.textContent = `${meta.commentCount} comment${meta.commentCount === 1 ? "" : "s"}`;
    if (likeButton) likeButton.setAttribute("aria-pressed", String(meta.liked));
    if (heart) heart.textContent = meta.liked ? "❤️" : "♡";
}

async function loadPostMetaOnce(postId) {
    const likesRef = collection(database, "schools", SCHOOL_ID, "posts", postId, "likes");
    const commentsRef = collection(database, "schools", SCHOOL_ID, "posts", postId, "comments");

    try {
        // Aggregate counts cost far fewer reads than downloading every like/comment document.
        const [likesCount, commentsCount] = await Promise.all([
            getCountFromServer(likesRef),
            getCountFromServer(commentsRef)
        ]);

        postMeta.set(postId, {
            likeCount: likesCount.data().count,
            commentCount: commentsCount.data().count,
            liked: Array.isArray(currentProfile?.likedPosts) && currentProfile.likedPosts.includes(postId)
        });
    } catch (error) {
        console.error(`Could not load post counts for ${postId}:`, error);
        postMeta.set(postId, { likeCount: 0, commentCount: 0, liked: false });
    }
}

async function loadPostsOnce() {
    const postsRef = collection(database, "schools", SCHOOL_ID, "posts");
    const postsQuery = query(postsRef, orderBy("createdAt", "desc"), limit(25));

    try {
        const snapshot = await getDocs(postsQuery);
        postData = snapshot.docs.map((postDoc) => ({
            id: postDoc.id,
            ...postDoc.data()
        }));

        postMeta.clear();
        await Promise.all(postData.map((post) => loadPostMetaOnce(post.id)));
        renderPosts();
    } catch (error) {
        console.error("Could not load posts:", error);
        postSection.replaceChildren();
        const message = document.createElement("p");
        message.className = "empty-state";
        message.textContent = "Could not load club posts. Please refresh and try again.";
        postSection.append(message);
    }
}

function renderEventsInModal() {
    postEventSelect.replaceChildren();

    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "No related event";
    postEventSelect.append(blank);

    const sortedEvents = [...eventData].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    sortedEvents.forEach((event) => {
        const option = document.createElement("option");
        option.value = event.id;
        option.textContent = event.title || "Untitled Event";
        postEventSelect.append(option);
    });
}

async function loadEventsOnce() {
    const eventsRef = collection(database, "schools", SCHOOL_ID, "events");

    try {
        const snapshot = await getDocs(eventsRef);
        eventData = snapshot.docs.map((eventDoc) => ({
            id: eventDoc.id,
            ...eventDoc.data()
        }));
        renderEventsInModal();
    } catch (error) {
        console.error("Could not load events for the post form:", error);
    }
}

function validateMedia(file) {
    if (!file) return "";
    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
        return "Please upload a JPG, PNG, WEBP, GIF, MP4, MOV, or WEBM file.";
    }
    if (file.size > MAX_MEDIA_SIZE) {
        return "Media must be 50 MB or smaller.";
    }
    return "";
}

function safeFileName(fileName) {
    const clean = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return clean.slice(-100) || "upload";
}

async function uploadPostMedia(postId, file) {
    if (!file) return { mediaUrl: "", mediaType: "", mediaPath: "" };

    const mediaPath = `schools/${SCHOOL_ID}/posts/${postId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const mediaRef = ref(storage, mediaPath);

    await uploadBytes(mediaRef, file, {
        contentType: file.type,
        cacheControl: "public,max-age=3600"
    });

    const mediaUrl = await getDownloadURL(mediaRef);
    return {
        mediaUrl,
        mediaType: file.type,
        mediaPath
    };
}

async function publishPost() {
    if (!isAdmin || !firebaseUser || !currentProfile) {
        showPostError("Only administrators can publish club posts.");
        return;
    }

    const title = postTitle.value.trim();
    const description = postDescription.value.trim();
    const type = postType.value;
    const eventId = postEventSelect.value;
    const file = postFileUpload.files?.[0] || null;

    if (!title || !description || !type) {
        showPostError("Please add a title, description, and post type.");
        return;
    }
    if (title.length > 120) {
        showPostError("Post titles must be 120 characters or fewer.");
        return;
    }
    if (description.length > 2000) {
        showPostError("Post descriptions must be 2,000 characters or fewer.");
        return;
    }

    const mediaError = validateMedia(file);
    if (mediaError) {
        showPostError(mediaError);
        return;
    }

    const selectedEvent = eventData.find((event) => event.id === eventId) || null;
    const postsRef = collection(database, "schools", SCHOOL_ID, "posts");
    const postRef = doc(postsRef);

    publishPostButton.disabled = true;
    publishPostButton.textContent = file ? "Uploading..." : "Publishing...";
    showPostError("");

    let uploadedMediaPath = "";

    try {
        const media = await uploadPostMedia(postRef.id, file);
        uploadedMediaPath = media.mediaPath;

        await setDoc(postRef, {
            title,
            description,
            type,
            eventId: selectedEvent?.id || "",
            eventTitle: selectedEvent?.title || "",
            authorUid: firebaseUser.uid,
            authorName: getDisplayName(currentProfile),
            authorPhoto: currentProfile.profileImage || "",
            mediaUrl: media.mediaUrl,
            mediaType: media.mediaType,
            mediaPath: media.mediaPath,
            createdAt: serverTimestamp()
        });

        closePostModal();
        await loadPostsOnce();
    } catch (error) {
        console.error("Could not publish post:", error);

        if (uploadedMediaPath) {
            deleteObject(ref(storage, uploadedMediaPath)).catch(() => {});
        }

        if (error?.code?.startsWith("storage/")) {
            showPostError("The media upload failed. Check Firebase Storage, or remove the file and publish the post without media.");
        } else {
            showPostError("Could not publish the post. Please try again.");
        }
    } finally {
        publishPostButton.disabled = false;
        publishPostButton.textContent = "Publish Post";
    }
}

async function deleteSubcollection(postId, subcollectionName) {
    const subcollectionRef = collection(
        database,
        "schools",
        SCHOOL_ID,
        "posts",
        postId,
        subcollectionName
    );
    const snapshot = await getDocs(subcollectionRef);
    await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
}

async function deletePost(postId) {
    if (!isAdmin) return;

    const post = postData.find((item) => item.id === postId);
    if (!post) return;

    const confirmed = window.confirm(`Delete “${post.title || "this post"}”? This cannot be undone.`);
    if (!confirmed) return;

    const postRef = doc(database, "schools", SCHOOL_ID, "posts", postId);

    try {
        // Firestore does not remove nested comments/likes automatically, so clean those up first.
        await Promise.all([
            deleteSubcollection(postId, "comments"),
            deleteSubcollection(postId, "likes")
        ]);

        if (post.mediaPath) {
            await deleteObject(ref(storage, post.mediaPath)).catch((error) => {
                if (error?.code !== "storage/object-not-found") throw error;
            });
        }

        await deleteDoc(postRef);
        await loadPostsOnce();
    } catch (error) {
        console.error("Could not delete post:", error);
        window.alert("Could not delete this post. Please try again.");
    }
}

async function toggleLike(postId) {
    if (!firebaseUser || busyLikes.has(postId)) return;

    busyLikes.add(postId);
    const likeRef = doc(
        database,
        "schools",
        SCHOOL_ID,
        "posts",
        postId,
        "likes",
        firebaseUser.uid
    );
    const profileRef = doc(database, "schools", SCHOOL_ID, "users", firebaseUser.uid);
    const meta = postMeta.get(postId) || { likeCount: 0, commentCount: 0, liked: false };

    try {
        if (meta.liked) {
            await Promise.all([
                deleteDoc(likeRef),
                updateDoc(profileRef, { likedPosts: arrayRemove(postId) })
            ]);
            meta.liked = false;
            meta.likeCount = Math.max(0, meta.likeCount - 1);
            currentProfile.likedPosts = (currentProfile.likedPosts || []).filter((id) => id !== postId);
        } else {
            await Promise.all([
                setDoc(likeRef, {
                    userUid: firebaseUser.uid,
                    createdAt: serverTimestamp()
                }),
                updateDoc(profileRef, { likedPosts: arrayUnion(postId) })
            ]);
            meta.liked = true;
            meta.likeCount += 1;
            currentProfile.likedPosts = [...new Set([...(currentProfile.likedPosts || []), postId])];
        }

        postMeta.set(postId, meta);
        updatePostMetaInDom(postId);
    } catch (error) {
        console.error("Could not update like:", error);
    } finally {
        busyLikes.delete(postId);
    }
}

function createCommentRow(comment) {
    const row = document.createElement("div");
    row.className = "comment user-comment";

    const content = document.createElement("div");
    content.className = "comment-content";

    const author = document.createElement("p");
    author.className = "comment-author";
    author.textContent = comment.username || "Member";

    const text = document.createElement("p");
    text.className = "comment-text";
    text.textContent = comment.text || "";

    const time = document.createElement("p");
    time.className = "comment-time";
    time.textContent = formatTimestamp(comment.createdAt);

    content.append(author, text, time);
    row.append(content);
    return row;
}

function stopActiveCommentsListener() {
    activeCommentsUnsubscribe?.();
    activeCommentsUnsubscribe = null;
}

function openComments(postId) {
    stopActiveCommentsListener();
    commentModal.dataset.activePostId = postId;
    commentArea.replaceChildren();

    const loading = document.createElement("p");
    loading.className = "empty-state";
    loading.textContent = "Loading comments...";
    commentArea.append(loading);

    const commentsRef = collection(database, "schools", SCHOOL_ID, "posts", postId, "comments");
    const commentsQuery = query(commentsRef, orderBy("createdAt", "asc"));

    activeCommentsUnsubscribe = onSnapshot(commentsQuery, (snapshot) => {
        commentArea.replaceChildren();

        if (snapshot.empty) {
            const empty = document.createElement("p");
            empty.className = "empty-state";
            empty.textContent = "No comments yet. Be the first to respond.";
            commentArea.append(empty);
            return;
        }

        snapshot.forEach((commentDoc) => {
            commentArea.append(createCommentRow(commentDoc.data()));
        });

        commentArea.scrollTop = commentArea.scrollHeight;
    }, (error) => {
        console.error("Could not load comments:", error);
        commentArea.replaceChildren();
        const message = document.createElement("p");
        message.textContent = "Could not load comments.";
        commentArea.append(message);
    });

    commentModal.classList.add("active");
    commentInput.focus();
}

async function sendComment() {
    const postId = commentModal.dataset.activePostId;
    const text = commentInput.value.trim();

    if (!postId || !text || !firebaseUser || !currentProfile) return;
    if (text.length > 500) {
        window.alert("Comments must be 500 characters or fewer.");
        return;
    }

    commentSendButton.disabled = true;

    try {
        const commentRef = doc(collection(
            database,
            "schools",
            SCHOOL_ID,
            "posts",
            postId,
            "comments"
        ));

        await setDoc(commentRef, {
            text,
            authorUid: firebaseUser.uid,
            username: getDisplayName(currentProfile),
            createdAt: serverTimestamp()
        });

        const meta = postMeta.get(postId) || { likeCount: 0, commentCount: 0, liked: false };
        meta.commentCount += 1;
        postMeta.set(postId, meta);
        updatePostMetaInDom(postId);
        commentInput.value = "";
    } catch (error) {
        console.error("Could not send comment:", error);
        window.alert("Could not send your comment. Please try again.");
    } finally {
        commentSendButton.disabled = false;
        commentInput.focus();
    }
}

postForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await publishPost();
});

createPostButton.addEventListener("click", openPostModal);
closePostModalButton.addEventListener("click", closePostModal);
cancelPostButton.addEventListener("click", closePostModal);

postModal.addEventListener("click", (event) => {
    if (event.target === postModal) closePostModal();
});

commentCloseButton.addEventListener("click", closeCommentModal);
commentSendButton.addEventListener("click", sendComment);
commentInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendComment();
    }
});

commentModal.addEventListener("click", (event) => {
    if (event.target === commentModal) closeCommentModal();
});

feedSortButton.addEventListener("click", () => {
    sortNewestFirst = !sortNewestFirst;
    feedSortButton.textContent = sortNewestFirst ? "Recent" : "Oldest";
    renderPosts();
});

postSection.addEventListener("click", async (event) => {
    const postElement = event.target.closest(".post");
    if (!postElement) return;

    const postId = postElement.dataset.postId;
    if (!postId) return;

    if (event.target.closest(".like-toggle-btn")) {
        await toggleLike(postId);
        return;
    }

    if (event.target.closest(".comment-button")) {
        openComments(postId);
        return;
    }

    if (event.target.closest(".delete-post-btn")) {
        await deletePost(postId);
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (postModal.classList.contains("active")) closePostModal();
    if (commentModal.classList.contains("active")) closeCommentModal();
});

window.addEventListener("beforeunload", () => {
    stopActiveCommentsListener();
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
            redirectToLogin();
            return;
        }

        firebaseUser = user;
        currentProfile = {
            ...profileSnapshot.data(),
            uid: user.uid,
            email: (user.email || profileSnapshot.data().email || "").trim().toLowerCase()
        };
        isAdmin = userIsAdmin(currentProfile);

        showAdminControls(isAdmin);
        syncLegacyProfileCache();
        await loadPostsOnce();
        if (isAdmin) await loadEventsOnce();
    } catch (error) {
        console.error("Could not load home page:", error);
        postSection.replaceChildren();
        const message = document.createElement("p");
        message.className = "empty-state";
        message.textContent = "Could not load your account. Refresh the page or sign in again.";
        postSection.append(message);
    }
});
