const likeEmoji = document.querySelectorAll ('.like-button');
likeEmoji.forEach((emoji)=>{
    let buttonClicked = false;
    emoji.closest('button').addEventListener('click',()=>{
        if (!buttonClicked){
            console.log('hi!')
            emoji.innerHTML ='❤️'
            buttonClicked = true;
        } else{
            emoji.innerHTML ='♡'
            buttonClicked = false;
        }
    })
})