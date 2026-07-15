/*'userProfile' = { name, description, profileImage, qrCode }
'userHours' = { totalHours, totalPoints, eventHistory: [] }
'userAchievements' = [achievement objects]*/

const userInfo = JSON.parse(localStorage.getItem('userinfo')) || {};
const userSetEmail = JSON.parse(localStorage.getItem('currentUser'));
let currentUser = userInfo[userSetEmail]

if(!currentUser){
    window.location.href = 'login.html'
}

//logout logic

const logoutButton = document.querySelector('#logout-button');

logoutButton.addEventListener('click',()=>{
    currentUser = null
    localStorage.removeItem('currentUser')
    window.location.href = 'login.html';
})


// QR code generation system

const userEmail = currentUser.email
const qrContainer = document.querySelector('.qr-code-container');
const qrImage = qrContainer.querySelector('img');

if(currentUser.qrCode){
    // User already has a QR code - just display it
    qrImage.src = currentUser.qrCode;
} else{
const generateQrCode = (container, email)=>{
    return new Promise((resolve, reject)=>{
        new QRCode(container,{
            text: email,
            width: 200, 
            height: 200,
        })        
        let resolved = false;

        const observer = new MutationObserver(()=>{
            if(resolved) return;
            const img = container.querySelector('img');
            if(img && img.src){
                resolved = true;
                observer.disconnect();
                resolve(img.src);
            }
        })

        observer.observe(container, {childList: true, subtree: true}); 
       
        setTimeout(()=>{
            if(!resolved){
                observer.disconnect();
                const img = container.querySelector('img');
                if(img && img.src){
                    resolve(img.src);
                } else{
                    reject(new Error('QR Code generation timeout'))
                }
            }
        }, 2000)
    })

}

  generateQrCode(qrContainer, userEmail)
    .then(qrDataUrl => {currentUser.qrCode = qrDataUrl;
        localStorage.setItem('userinfo', JSON.stringify(userInfo));
    })
    .catch(error=>{
        console.log('Failed to generate QR Code:', error);
    })
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

if(currentUser.profileImage === 'images/proifles/avatar1.png1'){
    currentUser.description = 'Arise.'
    profileDescription.textConent = currentUser.description
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
renderSignedUpEvents();



// load student hours/points 

const studentHoursEntry = document.querySelector('#studentHours');
const studentPointsEntry = document.querySelector('#studentPoints');

const studentHours = currentUser?.hours || 0;
const studentPoints = currentUser?.points || 0;

studentHoursEntry.textContent = `Hours: ${studentHours}`;
studentPointsEntry.textContent = `Points: ${studentPoints}`;

const firstandlastname = document.querySelector('#firstandlastname');
firstandlastname.textContent = `${currentUser.firstname} ${currentUser.lastname}`