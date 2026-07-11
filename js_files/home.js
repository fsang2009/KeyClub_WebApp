const likeEmoji = document.querySelectorAll ('.like-button');
likeEmoji.forEach((emoji)=>{
    let likeButtonClicked = false;
    emoji.closest('button').addEventListener('click',()=>{
        if (!likeButtonClicked){
            console.log('hi!')
            emoji.innerHTML ='❤️'
            likeButtonClicked = true;
        } else{
            emoji.innerHTML ='♡'
            likeButtonClicked = false;
        }
    })
})

/* COMMENT FUNCTION CODE */
const commentButton = document.querySelectorAll('.comment-button');
const commentModal = document.querySelector('#commentModal')
commentButton.forEach((button)=>{
    button.addEventListener('click',()=>{
            commentModal.classList.add('active')
    })
})

const commentButtonClose = document.querySelectorAll('.comment-modal-close')
commentButtonClose.forEach((button)=>{
    button.addEventListener('click',()=>{
        commentModal.classList.remove('active');
    })
})

/*USER COMMENTING FUNCTION*/

const commentInput = document.querySelectorAll('.comment-input');
const comments = []
const commentSendButton = document.querySelectorAll('.comment-send-button')
const commentArea = document.querySelectorAll('.comment-modal-body')



const renderComment = ()=>{
    let html = ''
    comments.forEach((comment)=>{
        html += `
        <div class="comment user-comment">
                
            <div class="comment-content">
                <h style = "font-weight: 'bold'">You</h>
                <p class="comment-text">${comment.userComment}</p>
            </div>
        </div>
        `
    })
    commentArea.forEach((comment)=>{
        comment.innerHTML = html
    })
    console.log(html);
}

const sendComment = () =>{commentSendButton.forEach((comment)=>{
    comment.addEventListener('click',(event)=>{
        const parentPost = event.target.closest('.comment-modal-footer');
        const specificInput = parentPost.querySelector('.comment-input');
        const userComment = specificInput.value
        comments.push(
            {
                userComment:  userComment
            }
        )
        renderComment();
    })
})}

sendComment();

