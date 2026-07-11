// First select the element
const eventCard = document.querySelectorAll('.event')



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

const eventData = JSON.parse(localStorage.getItem('eventData')) || []

eventArea.addEventListener('click', (e)=>{
    if(e.target.classList.contains('event-view-button')){
        const eventcard = e.target.closest('.event');
        const eventId = eventcard.dataset.eventId; 
        openModal(eventId);
    }
})

const modalCloseButton = document.querySelector('.modal-close');
modalCloseButton.addEventListener('click', ()=>{
    setTimeout(() => {
        document.getElementById('eventModal').style.display = 'none';
    }, 200);
})


const openModal = (eventId) =>{
    const event = eventData.find(e => e.id === eventId);
    
    document.getElementById('modalEventTitle').textContent = event.title;
    document.getElementById('modalEventDate').textContent = event.date;
    document.getElementById('modalEventTime').textContent = event.time;
    document.getElementById('modalEventLocation').textContent = event.location;
    document.getElementById('modalEventDescription').textContent = event.description;
    
    document.getElementById('eventModal').style.display = 'block';
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
        renderEvent();
        localStorage.setItem('eventData', JSON.stringify(eventData));
    })

    /* CLOSE MODAL EVENT LISTENER */
    exitButton.addEventListener('click',()=>{
        setTimeout(()=>{
            addEventModal.classList.remove('active');
        }, 200)
    })
    
})
}



addEvent()
renderEvent()

