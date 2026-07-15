const userInfo = JSON.parse(localStorage.getItem('userinfo')) || {};
const userSetEmail = JSON.parse(localStorage.getItem('currentUser'));
let currentUser = userInfo[userSetEmail];

if(!currentUser){
    window.location.href = 'login.html';
}

/* COMMENT MODAL SETUP */
const commentModal = document.querySelector('#commentModal');
const commentInput = document.querySelectorAll('.comment-input');
const comments = JSON.parse(localStorage.getItem('comments')) || [];
const commentSendButton = document.querySelectorAll('.comment-send-button');
const commentArea = document.querySelectorAll('.comment-modal-body');

// Render comments ONLY for the currently active post in the modal
const renderComment = ()=>{
    const activePostId = commentModal.dataset.activePostId;
    let html = '';
    
    // Filter comments to show only the ones belonging to the open post
    const filteredComments = comments.filter(c => c.postId === activePostId);

    filteredComments.forEach((comment)=>{
        html += `
        <div class="comment user-comment">
            <div class="comment-content">
                <h style="font-weight: bold">${comment.username}</h>
                <p class="comment-text">${comment.userComment}</p>
            </div>
        </div>
        `;
    });
    commentArea.forEach((commentBox)=>{
        commentBox.innerHTML = html;
    });
};

const sendComment = () =>{
    commentSendButton.forEach((button)=>{
        button.addEventListener('click',(event)=>{
            const parentPost = event.target.closest('.comment-modal-footer');
            const specificInput = parentPost.querySelector('.comment-input');
            const userComment = specificInput.value.trim();
            const activePostId = commentModal.dataset.activePostId;

            if (userComment === '') return; // Prevent empty comments

            // Save comment mapped to the unique postId
            comments.push({
                postId: activePostId,
                username: currentUser.username,
                userComment: userComment
            });

            specificInput.value = ''; 
            renderComment();          // Re-render open modal list
            renderPost();             // Instantly update count badge on the feed
            localStorage.setItem('comments', JSON.stringify(comments));
        });
    });
};

sendComment();

/* CREATE POST LOGIC */
const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const createPostButton = document.querySelector('#create-post-button');
const postModal = document.querySelector('#postModal');
createPostButton.addEventListener('click',()=>{
    postModal.classList.add('active');
});

const postTitle = document.querySelector('#postTitle');
const postEventSelect = document.querySelector('#eventSelect');
const postDescription = document.querySelector('#postDesc');
const postFileUpload = document.querySelector('#mediaUpload');
const postType = document.querySelector('#postTypeSelect');

const errorMessage = document.querySelector('#postErrorMessage');
let errorMessageTime = null;

let postData = JSON.parse(localStorage.getItem('postData')) || [];

// HELPER FUNCTION: Convert file to Base64 so it can be saved in LocalStorage
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

// NOTICE: Form submission is now async to handle file reading
postModal.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearTimeout(errorMessageTime);
    const realPostTitle = postTitle.value;
    const realEventSelect = postEventSelect.value;
    const realPostDescription = postDescription.value;
    const realPostType = postType.value;

    if(realPostTitle === ''|| realPostDescription === '' || realPostType === ''){
        errorMessage.style.display = 'block';
        errorMessage.textContent = "Please enter title/description";
        errorMessageTime = setTimeout(()=>{
            errorMessage.style.display = 'none';
            errorMessage.textContent = "";
        }, 3000);
        return;
    }

    // Process media upload if a file was selected
    let mediaDataUrl = null;
    let mediaType = null;
    if (postFileUpload.files && postFileUpload.files[0]) {
        const file = postFileUpload.files[0];
        mediaType = file.type; // "image/jpeg", "video/mp4", etc.
        try {
            mediaDataUrl = await fileToBase64(file);
        } catch (e) {
            console.error("Failed to read file", e);
        }
    }

    const now = new Date();
    const month = now.getMonth();
    const postMonth = months[month];
    const postDay = now.getDate();
    const postYear = now.getFullYear();
    
    const postTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    
    postData.push({
        title: realPostTitle,
        event: realEventSelect,
        description: realPostDescription,
        type: realPostType,
        date: `${postMonth} ${postDay} ${postYear}`,
        time: postTime,
        id: crypto.randomUUID(),
        likeCount: 0,
        media: mediaDataUrl,       // Save media Base64 string
        mediaType: mediaType       // Save media type
    });
    
    localStorage.setItem('postData', JSON.stringify(postData));
    renderPost();
    
    // Reset form fields
    postTitle.value = '';
    postDescription.value = '';
    postFileUpload.value = '';
    postEventSelect.selectedIndex = 0;
    postType.selectedIndex = 0;

    postModal.classList.remove('active');
});

/* RENDER POSTS */
const postSection = document.querySelector('#post-section');

const renderPost = ()=>{
    let html = '';
    postData.forEach((post)=>{
        // 1. Dynamic Liked State (Persistence on Refresh!)
        const userLikedList = currentUser.likedPosts || [];
        const isLiked = userLikedList.includes(post.id);
        const heartIcon = isLiked ? '❤️' : '♡';

        // 2. Dynamic Comment Count
        const postCommentsCount = comments.filter(c => c.postId === post.id).length;

        // 3. Clean, Seamless Media Render Check (No black borders, perfectly matches your screenshot!)
        let mediaHtml = '';
        if (post.media) {
            if (post.mediaType && post.mediaType.startsWith('video/')) {
                mediaHtml = `
                <div class="post-media" style="margin-top: 12px; border-radius: 12px; overflow: hidden; display: flex; justify-content: center;">
                    <video src="${post.media}" controls style="width: 100%; height: auto; max-height: 500px; object-fit: contain; border-radius: 12px;"></video>
                </div>`;
            } else {
                mediaHtml = `
                <div class="post-media" style="margin-top: 12px; border-radius: 12px; overflow: hidden; display: flex; justify-content: center;">
                    <img src="${post.media}" alt="Uploaded media" style="width: 100%; height: auto; max-height: 500px; object-fit: contain; border-radius: 12px;" />
                </div>`;
            }
        }

        html += `
        <article class="post" data-post-id="${post.id}">
            <div class="post-header">
                <div class="user">
                    <img class="user-avatar" src="${currentUser.profileImage || 'https://via.placeholder.com/150'}" alt="Member avatar">
                    <div class="user-information">
                        <p class="user-name">${currentUser.firstname} ${currentUser.lastname}</p>
                        <p class="post-time" id="post-date">${post.date}</p>
                        <p class="post-time" id="post-time">${post.time}</p>
                    </div>
                </div>

                <div class="post-header-actions">
                    <span class="post-category ${post.type.toLowerCase()}-category">
                        ${post.type}
                    </span>
                    <button class="delete-post-btn" style="font-weight: bold" type="button" title="Delete Post">
                        Delete
                    </button>
                </div>
            </div>

            <div class="post-content">
                <h3>${post.title}</h3>
                <p>${post.description}</p>
                ${mediaHtml} 
            </div>

            <div class="post-stats">
                <span class="likesDOM" data-likes-id="${post.id}">${post.likeCount} Likes</span>
                <span data-comments-id="${post.id}">${postCommentsCount} comment${postCommentsCount !== 1 ? 's' : ''}</span>
            </div>

            <div class="post-actions">
                <button class="post-action like-toggle-btn" data-likes-id="${post.id}" type="button">
                    <span class="like-button">${heartIcon}</span>
                    Like
                </button>
                <button class="post-action comment-button" type="button">
                    <span>💬</span>
                    Comment
                </button>
            </div>
        </article>
        `;
    });
    postSection.innerHTML = html;
};

/* GLOBAL MASTER EVENT DELEGATOR */
postSection.addEventListener('click', (event) => {
    const target = event.target;

    // 1. Handle Like Button Click
    const likeBtn = target.closest('.like-toggle-btn');
    if (likeBtn) {
        const id = likeBtn.dataset.likesId;
        currentUser.likedPosts = currentUser.likedPosts || [];
        
        const currentPost = postData.find(p => p.id === id);
        if (!currentPost) return;

        const emoji = likeBtn.querySelector('.like-button');
        const postElement = likeBtn.closest('.post');
        const display = postElement.querySelector('.likesDOM');

        if (currentUser.likedPosts.includes(id)) {
            // UNLIKE Action
            emoji.textContent = '♡';
            if (currentPost.likeCount > 0) currentPost.likeCount -= 1;
            currentUser.likedPosts = currentUser.likedPosts.filter(postId => postId !== id);
        } else {
            // LIKE Action
            emoji.textContent = '❤️';
            emoji.classList.add('animate');
            setTimeout(() => emoji.classList.remove('animate'), 400);
            currentPost.likeCount += 1;
            currentUser.likedPosts.push(id);
        }

        // Save progress back into LocalStorage
        userInfo[userSetEmail] = currentUser;
        localStorage.setItem('userinfo', JSON.stringify(userInfo));
        localStorage.setItem('postData', JSON.stringify(postData));
        display.textContent = `${currentPost.likeCount} Likes`;
    }

    // 2. Handle Delete Post Button Click
    if (target.classList.contains('delete-post-btn')) {
        const postElement = target.closest('.post');
        const id = postElement.dataset.postId;
        
        postData = postData.filter(post => post.id !== id);
        localStorage.setItem('postData', JSON.stringify(postData));
        postElement.remove();
    }

    // 3. Handle Comment Modal Open Button Click
    if (target.closest('.comment-button')) {
        const postElement = target.closest('.post');
        const id = postElement.dataset.postId;
        
        // Setup unique active ID on comment modal
        commentModal.dataset.activePostId = id;
        
        renderComment(); // Load comments linked with this postId
        commentModal.classList.add('active');
    }
});

/* CLOSE MODALS */
const closePostModalButton = document.querySelector('#closeModalBtn');
closePostModalButton.addEventListener('click',()=>{
    postModal.classList.remove('active');
});

const commentButtonClose = document.querySelectorAll('.comment-modal-close');
commentButtonClose.forEach((button)=>{
    button.addEventListener('click',()=>{
        commentModal.classList.add('closing');
        commentModal.querySelector('.comment-modal-content').classList.add('closing');
        setTimeout(() => {
            commentModal.classList.remove('active', 'closing');
            commentModal.querySelector('.comment-modal-content').classList.remove('closing');
        }, 200);
    });
});

/* RENDER EVENTS IN MODAL */
const selectPostEvent = document.querySelector('#eventSelect');
const renderEventsInModal = ()=>{
    const eventData = JSON.parse(localStorage.getItem('eventData')) || [];
    selectPostEvent.innerHTML = '<option value="">Select event</option>';
    if(eventData){
        eventData.forEach((event)=>{
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = event.title;
            selectPostEvent.appendChild(option);
        });
    }
};

/* ON DOCUMENT READY */
document.addEventListener('DOMContentLoaded', () => {
    renderPost();
    renderEventsInModal();
});