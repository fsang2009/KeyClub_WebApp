/*'userProfile' = { name, description, profileImage, qrCode }
'userHours' = { totalHours, totalPoints, eventHistory: [] }
'userAchievements' = [achievement objects]*/

// Edit profile functionality
const editProfileButton = document.querySelector('.edit-profile-button');
const editProfileModal = document.querySelector('#editProfileModal');
const closeProfileModalButton = document.querySelector('.edit-profile-close');

editProfileButton.addEventListener('click',()=>{
    editProfileModal.classList.add('active');
    nameInput.value = userInfo.username
    profileDescription.value = userInfo.description
})

closeProfileModalButton.addEventListener('click',()=>{
    editProfileModal.classList.remove('active');
})

// Actual editing features
const nameInput = document.querySelector('#profileName')
const profileDescription = document.querySelector('#profileDescription');

const submitProfileEdit = document.querySelector('.submit-profile-button');

const userInfo = JSON.parse(localStorage.getItem('userinfo')) || {};

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
if (!userInfo.profileImage) {
    const randomIndex = Math.floor(Math.random() * profilePictures.length);
    userInfo.profileImage = profilePictures[randomIndex];
    localStorage.setItem('userinfo', JSON.stringify(userInfo));
}

const userNameProfile = document.querySelector('#username');
const descriptionProfile = document.querySelector('#description');
const profileImageElement = document.querySelector('.profile-header img');

userNameProfile.textContent = userInfo.username || 'Student'
descriptionProfile.textContent = userInfo.description || 'Bio'
profileImageElement.src = userInfo.profileImage


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




    userNameProfile.textContent = newUsername;
    descriptionProfile.textContent = newProfileDescription;
    userInfo.username = newUsername;
    userInfo.description = newProfileDescription;
    localStorage.setItem('userinfo', JSON.stringify(userInfo));
    editProfileModal.classList.remove('active');
})


const signedUpEventsContainer = document.querySelector('#signedUpEventsContainer');

const renderSignedUpEvents = () =>{
    const eventData = JSON.parse(localStorage.getItem('eventData'));
    console.log(eventData)
    let eventHTML = ''
    eventData.forEach((event)=>{
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