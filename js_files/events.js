// First select the element
const eventCard = document.querySelectorAll('.event')

const userInfo = JSON.parse(localStorage.getItem('userinfo')) || {};
const userSetEmail = JSON.parse(localStorage.getItem('currentUser'));
const currentUser = userInfo[userSetEmail]

if(!currentUser){
    window.location.href = 'login.html'
}

if (!currentUser.signedUpEvents) {
    currentUser.signedUpEvents = {};
    localStorage.setItem('userinfo', JSON.stringify(userInfo));
}


/*<div class="event" data-event-id="2">
                <h2>Food Drive</h2>
                <p>Help collect food donations for local families in need.</p>
                <button class="event-view-button">Sign Up & View</button>
            </div>*/

/* ADD EVENT SECTION */
const addEventButton = document.querySelector('.add-event-button');
const addEventModal = document.querySelector('#addEventModal')
const eventTitle = document.querySelector('#eventTitle');
const eventDate = document.querySelector('#eventDate');
const eventTime = document.querySelector('#eventTime');
const eventLocation = document.querySelector('#eventLocation');
const eventDescription = document.querySelector('#eventDescription');
const eventArea = document.querySelector('.event-grid');

let eventData = JSON.parse(localStorage.getItem('eventData')) || []

eventArea.addEventListener('click', (e)=>{
    if(e.target.classList.contains('event-view-button')){
        const eventcard = e.target.closest('.event');
        const eventId = eventcard.dataset.eventId; 
        openModal(eventId);
    }
})

let currentEventID = ''

const modalCloseButton = document.querySelector('.modal-close');
modalCloseButton.addEventListener('click', ()=>{
    setTimeout(() => {
        currentEventID = ''
        document.getElementById('eventModal').style.display = 'none';
    }, 200);
})




const openModal = (eventId) =>{
    currentEventID = eventId
    const event = eventData.find(e => e.id === eventId);
    
    document.getElementById('modalEventTitle').textContent = event.title;
    document.getElementById('modalEventDate').textContent = event.date;
    document.getElementById('modalEventTime').textContent = event.time;
    document.getElementById('modalEventLocation').textContent = event.location;
    document.getElementById('modalEventDescription').textContent = event.description;
    
    document.getElementById('eventModal').style.display = 'block';

    if(currentUser.signedUpEvents[currentEventID] === true){
        signUpButton.textContent = "Cancel Signup";
    signUpButton.classList.add('signed-up');
    toggleMessages(currentEventID)
    renderChats();
    } else{ 
         signUpButton.textContent = "Sign Up for Event";
    signUpButton.classList.remove('signed-up');
    toggleMessages(currentEventID)
    }


}


const renderEvent = () =>{ 
    let html = ''
    eventData.forEach((event)=>{
        html += `<div class="event" data-event-id="${event.id}">
                <h2>${event.title}</h2>
                <p>${event.description}</p>
                <button class="event-view-button">Sign Up & View</button>
            </div>`
    })
    eventArea.innerHTML = html
}

const addEvent = ()=>{
    addEventButton.addEventListener('click', ()=>{

    addEventModal.classList.add('active');
    const exitButton = addEventModal.querySelector('.modal-close');
    const submitEventButton = addEventModal.querySelector('.submit-event-button');
    
    
    /* SUBMIT EVENT EVENT LISTENER*/
    submitEventButton.addEventListener('click',(event)=>{
        event.preventDefault();
        console.log('hi')
        const currentTitle = eventTitle.value;
        const currentDate = eventDate.value;
        const currentTime = eventTime.value;
        const currentLocation = eventLocation.value;
        const currentDescription = eventDescription.value;

        if(currentTitle && currentDate && currentTime && currentLocation && currentDescription){
            // Check if we're in edit mode
            if (submitEventButton.dataset.editMode === 'true') {
                // Update existing event
                const eventIndex = eventData.findIndex(event => event.id === currentEventID);
                if (eventIndex !== -1) {
                    eventData[eventIndex] = {
                        id: currentEventID,
                        title: currentTitle,
                        description: currentDescription,
                        time: currentTime,
                        date: currentDate,
                        location: currentLocation
                    };
                }
                // Reset edit mode
                submitEventButton.dataset.editMode = 'false';
                submitEventButton.textContent = 'Create Event';
                addEventModal.classList.remove('active');
                // Close event details modal if open
                document.getElementById('eventModal').style.display = 'none';
                currentEventID = '';
            } else {
                // Create new event
                eventData.push({
                    id: crypto.randomUUID(),
                    title: currentTitle,
                    description: currentDescription,
                    time: currentTime,
                    date: currentDate,
                    location: currentLocation
                })
                addEventModal.classList.remove('active')
            }
        }
        renderEvent();
        localStorage.setItem('eventData', JSON.stringify(eventData));
    })

    /* CLOSE MODAL EVENT LISTENER */
    exitButton.addEventListener('click',()=>{
        setTimeout(()=>{
            addEventModal.classList.remove('active');
            // Reset edit mode if closing without saving
            submitEventButton.dataset.editMode = 'false';
            submitEventButton.textContent = 'Create Event';
        }, 200)
    })
    
})
}



addEvent()
renderEvent()

/* USER SIGNING UP FUNCTION */
const signUpButton = document.querySelector('.signup-button')
let lateMSG = null
signUpButton.addEventListener('click',()=>{
        clearTimeout(lateMSG)
        
        if(!currentUser.signedUpEvents[currentEventID])   {
             lateMSG = setTimeout(()=>{
                signUpButton.textContent = "Cancel Signup"
            }, 3000)
            signUpButton.textContent = "Signed Up! 🥳"
            signUpButton.classList.add('signed-up');
             currentUser.signedUpEvents[currentEventID] = true;
            localStorage.setItem('userinfo',JSON.stringify(userInfo))
            toggleMessages(currentEventID)
            
        }
     else{
            signUpButton.textContent = 'Sign Up';
            signUpButton.classList.remove('signed-up');
            delete currentUser.signedUpEvents[currentEventID];
            localStorage.setItem('userinfo', JSON.stringify(userInfo));
             toggleMessages(currentEventID)
    }
})

/* DELETE EVENT FUNCTION */
const deleteEventButton = document.querySelector('#deleteEventButton');
deleteEventButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this event?')) {
        // Remove event from eventData
     eventData = JSON.parse(localStorage.getItem('eventData')) || [];
        eventData = eventData.filter(event => event.id !== currentEventID);
        localStorage.setItem('eventData', JSON.stringify(eventData));

        // Clean up signups for this event from all users
        Object.values(userInfo).forEach(user => {
            if (user.signedUpEvents[currentEventID]) {
                delete user.signedUpEvents[currentEventID];
            }
        });
        localStorage.setItem('userinfo', JSON.stringify(userInfo));

        // Clean up chat messages for this event
        const eventChats = JSON.parse(localStorage.getItem('eventChats')) || {};
        delete eventChats[currentEventID];
        localStorage.setItem('eventChats', JSON.stringify(eventChats));

        // Re-render events and close modal
        renderEvent();
        document.getElementById('eventModal').style.display = 'none';
        currentEventID = '';
    }
});

/* EDIT EVENT FUNCTION */
const editEventButton = document.querySelector('#editEventButton');
editEventButton.addEventListener('click', () => {
    // Get current event data
    const eventData = JSON.parse(localStorage.getItem('eventData')) || [];
    const currentEvent = eventData.find(event => event.id === currentEventID);

    if (currentEvent) {
        // Populate add event form with current data
        eventTitle.value = currentEvent.title;
        eventDate.value = currentEvent.date;
        eventTime.value = currentEvent.time;
        eventLocation.value = currentEvent.location;
        eventDescription.value = currentEvent.description;

        // Open add event modal
        addEventModal.classList.add('active');

        // Change submit button to "Update Event"
        const submitEventButton = addEventModal.querySelector('.submit-event-button');
        submitEventButton.textContent = 'Update Event';
        submitEventButton.dataset.editMode = 'true';
    }
});

//const eventChats = {"event-id-1": [{user:"You", text: "Yo"}], "event-id-2"}

//MESSAGING FUNCTIONS
const toggleMessages = (eventID)=>{
    const chatBox = document.querySelector('.chat-section')
    const eventChats = JSON.parse(localStorage.getItem('eventChats')) || {};
    if (currentUser.signedUpEvents[eventID]){
        chatBox.style.display = 'block'
        eventChats[eventID] = eventChats[eventID] || [];

    } else {
        chatBox.style.display = 'none'
    }

}


//Send message function
const sendMessageButton = document.querySelector('.chat-send');
const messages = document.querySelector('#chatInput'); 

let messageEmpty = null
   
    sendMessageButton.addEventListener('click',()=>{
        clearTimeout(messageEmpty)
         const eventChats = JSON.parse(localStorage.getItem('eventChats')) || {};
        const userMessages = messages.value;
        eventChats[currentEventID] = eventChats[currentEventID] || []; 
        if(messages.value === ''){
            messages.placeholder = 'Please Enter a Message'
            messageEmpty = setTimeout(()=>{
                messages.placeholder = ''
            }, 2000)
            return
        }
        eventChats[currentEventID].push({
            user: 'You',
            message: userMessages
        })
        console.log(eventChats[currentEventID])
        messages.value = ''
        localStorage.setItem('eventChats', JSON.stringify(eventChats))
        renderChats();
        
    }

)


// Render chat messsages 
const chatMessages = document.querySelector('.chat-messages')
const renderChats = ()=>{
    chatMessages.innerHTML = ''
    let html = ''
    const eventChats = JSON.parse(localStorage.getItem('eventChats'))|| {};
    eventChats[currentEventID]=eventChats[currentEventID] || [];
    eventChats[currentEventID].forEach((chat)=>{
        html += `
         <div class="chat-message">
                            <span class="chat-user">${chat.user}:</span>
                            <span class="chat-text">${chat.message}</span>
                        </div>
        `
        
    })
    chatMessages.innerHTML = html
}