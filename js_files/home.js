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