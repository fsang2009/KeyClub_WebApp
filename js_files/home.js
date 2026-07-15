const userInfo = JSON.parse(localStorage.getItem('userinfo')) || {};
const userSetEmail = JSON.parse(localStorage.getItem('currentUser'));
let currentUser = userInfo[userSetEmail];

if(!currentUser){
    window.location.href = 'login.html'
}

/* COMMENT MODAL SETUP */
const commentModal = document.querySelector('#commentModal');
const commentInput = document.querySelectorAll('.comment-input');
const comments = JSON.parse(localStorage.getItem('comments')) || [];
const commentSendButton = document.querySelectorAll('.comment-send-button');
const commentArea = document.querySelectorAll('.comment-modal-body');

const renderComment = ()=>{
    let html = '';
    comments.forEach((comment)=>{
        html += `
        <div class="comment user-comment">
            <div class="comment-content">
                <h style="font-weight: bold">${currentUser.username}</h>
                <p class="comment-text">${comment.userComment}</p>
            </div>
        </div>
        `;
    });
    commentArea.forEach((comment)=>{
        comment.innerHTML = html;
    });
};

const sendComment = () =>{
    commentSendButton.forEach((comment)=>{
        comment.addEventListener('click',(event)=>{
            const parentPost = event.target.closest('.comment-modal-footer');
            const specificInput = parentPost.querySelector('.comment-input');
            const userComment = specificInput.value;
            comments.push({
                userComment: userComment
            });
            renderComment();
            localStorage.setItem('comments', JSON.stringify(comments));
        });
    });
};

sendComment();
renderComment();

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

postModal.addEventListener('submit',(event) =>{
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
        likeCount: 0
    });
    
    localStorage.setItem('postData', JSON.stringify(postData));
    renderPost();
    postModal.classList.remove('active');
});

/* RENDER POSTS (No event listeners inside!) */
const postSection = document.querySelector('#post-section');

const renderPost = ()=>{
    let html = '';
    postData.forEach((post)=>{
        html += `
        <article class="post" data-post-id="${post.id}">
            <div class="post-header">
                <div class="user">
                    <img class="user-avatar" src="${currentUser.profileImage}" alt="Member avatar">
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
            </div>

            <div class="post-stats">
                <span class="likesDOM" data-likes-id="${post.id}">${post.likeCount} Likes</span>
                <span data-comments-id="${post.id}">4 comments</span>
            </div>

            <div class="post-actions">
                <button class="post-action like-toggle-btn" data-likes-id="${post.id}" type="button">
                    <span class="like-button">♡</span>
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

    // 1. Handle Like Button Click (Combined state & update!)
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
            emoji.textContent = '♡';
            if (currentPost.likeCount > 0) currentPost.likeCount -= 1;
            currentUser.likedPosts = currentUser.likedPosts.filter(postId=> postId !== id)
            localStorage.setItem('userinfo', JSON.stringify(userInfo));
        } else {
            emoji.textContent = '❤️';
            emoji.classList.add('animate');
            setTimeout(() => emoji.classList.remove('animate'), 400);
            currentPost.likeCount += 1;
            currentUser.likedPosts.push(id)
            localStorage.setItem('userinfo', JSON.stringify(userInfo));
        }

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