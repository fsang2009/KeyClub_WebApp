/*'userProfile' = { name, description, profileImage, qrCode }
'userHours' = { totalHours, totalPoints, eventHistory: [] }
'userAchievements' = [achievement objects]*/

const userInfo = JSON.parse(localStorage.getItem('userinfo')) || {};
const userSetEmail = JSON.parse(localStorage.getItem('currentUser'));
const currentUser = userInfo[userSetEmail]

if(!currentUser){
    window.location.href = 'login.html'
}
// Edit profile functionality
const editProfileButton = document.querySelector('.edit-profile-button');
const editProfileModal = document.querySelector('#editProfileModal');
const closeProfileModalButton = document.querySelector('.edit-profile-close');

editProfileButton.addEventListener('click',()=>{
    editProfileModal.classList.add('active');
    nameInput.value = currentUser.username || ''
    profileDescription.value = currentUser.description || ''
})

closeProfileModalButton.addEventListener('click',()=>{
    editProfileModal.classList.remove('active');
})

// Actual editing features
const nameInput = document.querySelector('#profileName')
const profileDescription = document.querySelector('#profileDescription');

const submitProfileEdit = document.querySelector('.submit-profile-button');



// School-friendly profile pictures array
const profilePictures = [
    'images/profiles/avatar1.png',
    'images/profiles/avatar2.png',
    'images/profiles/avatar3.png',
    'images/profiles/avatar4.png',
    'images/profiles/avatar5.png',
    'images/profiles/avatar6.png',
    'images/profiles/avatar7.png',
    'images/profiles/avatar8.png'
];

 
// Assign random profile picture if user doesn't have one
if (!currentUser.profileImage) {
    const randomIndex = Math.floor(Math.random() * profilePictures.length);
    currentUser.profileImage = profilePictures[randomIndex];
    localStorage.setItem('userinfo', JSON.stringify(userInfo));
}

const userNameProfile = document.querySelector('#username');
const descriptionProfile = document.querySelector('#description');
const profileImageElement = document.querySelector('.profile-header img');

userNameProfile.textContent = currentUser.username || 'Student'
descriptionProfile.textContent = currentUser.description || 'Bio'
profileImageElement.src = currentUser.profileImage


let nameInputTimer = null
submitProfileEdit.addEventListener('click',(event)=>{
    clearTimeout(nameInputTimer);
    event.preventDefault();
    const newUsername = nameInput.value;
    const newProfileDescription = profileDescription.value;

    if(newUsername === ''){
        nameInput.placeholder ="Please Enter a Username";
        nameInputTimer = setTimeout(()=>{
            nameInput.placeholder="";
        }, 6000)
        return;
    }


    currentUser.username = newUsername
    currentUser.description = newProfileDescription


    userNameProfile.textContent = currentUser.username;
    descriptionProfile.textContent = currentUser.description;
    localStorage.setItem('userinfo', JSON.stringify(userInfo));
    editProfileModal.classList.remove('active');
})


const signedUpEventsContainer = document.querySelector('#signedUpEventsContainer');

const renderSignedUpEvents = () =>{
    const eventData = JSON.parse(localStorage.getItem('eventData'));
    console.log(eventData)
    const eventIds = Object.keys(currentUser.signedUpEvents).reduce((acc, current)=>{
        acc.push(current);
        return acc;
    },[])

    const eventList = eventData.reduce((acc,current)=>{
        if (eventIds.includes(current.id)){
            acc.push(current)
        }
        return acc;
    }, [])

    let eventHTML = ''
    eventList.forEach((event)=>{
        eventHTML += `<div class="profile-event-card">
    <h3>${event.title}</h3>
    <p class="event-date">${event.date}</p>
    <p>${event.location}</p>
    <p>${event.time}</p>
    <a href="events.html" class="view-event-button">View Event</a>
</div>`
    })
    signedUpEventsContainer.innerHTML = eventHTML
}
renderSignedUpEvents()