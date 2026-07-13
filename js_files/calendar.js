/*  rather than statically hardcoding our calendar, it is much 
more efficient, advantageous, and feasible if we render it using
our javascript. hardcoding would result in requiring constant
updates, accounting for leap years and such. 

Step 1. using new Date() (which is a method that can find 
the date, hour, time, day, month, year, etc. of TODAY.)
, i will set a variable (like 'today') 
to create an instance of the method. 

Step 2. using our new today instance, we can find our current year,
current date, etc.

Step 3. We will create a renderCalendar() function. 
we will use today.getMonth() and today.getDay() 

Step 4. create an array of the months of the year (getMonth() 
starts at index 0, so january is 0 , december is 11)

Step 5. idfk just start on it
*/
const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
]


const calendarGrid = document.querySelector('.calendar-grid');
//Get all days in a month

const currentDateInfo = new Date()
// Render Calendar function 
const renderCalendar =(month, year)=>{
const firstDayofMonth = new Date(year, month, 1).getDay();
const daysInMonth = new Date(year, month + 1, 0).getDate();
const daysInPrevMonth = new Date(year, month, 0).getDate();
console.log(firstDayofMonth)
let dateCell = ''
const fillInCellDates = daysInPrevMonth - firstDayofMonth + 1

for(d=fillInCellDates; d<=daysInPrevMonth; d++){
    dateCell +=`
    <div class="calendar-day outside-month">
                        <span class="day-number">${d}</span>
                    </div>
    `
}
    for(i=1; i <= daysInMonth; i++){
        
        dateCell +=`<div class="calendar-day" id ="calendarDayBox"
         data-day ="${i}"
                        data-month ="${currentMonth}" 
                        data-year ="${currentYear}">
                        <span class="day-number">${i}</span>
                    </div>`
    }

    calendarGrid.innerHTML = dateCell
}



let currentMonth = currentDateInfo.getMonth();
let currentYear = currentDateInfo.getFullYear();

const monthDateValue = document.querySelector('#monthDateValue');
const updateMonthYear =(month, year)=>{
    monthDateValue.textContent = `${month} ${year}`
}

updateMonthYear(months[currentMonth], currentYear)
renderCalendar(currentMonth, currentYear);


// Change as we move forward/backward in months

const previousMonthButton = document.querySelector('#previousMonth');
const forwardMonthButton = document.querySelector('#nextMonth');

previousMonthButton.addEventListener('click',()=>{
    if(currentMonth<=0){
         currentMonth = 12;
         currentYear --
    }
    currentMonth --
    console.log(`currentMonth value: ${currentMonth}`)
    renderCalendar(currentMonth, currentYear);
    updateMonthYear(months[currentMonth], currentYear);
    

})

forwardMonthButton.addEventListener('click',()=>{
    if(currentMonth >=11){
        currentMonth = -1;
        currentYear++
    }
    currentMonth ++ 
    renderCalendar(currentMonth, currentYear);
    updateMonthYear(months[currentMonth], currentYear);
})


//schedule events logic 
let currentDate = {
    day: null,
    month: null,
    year: null,
}
const scheduleEventModal = document.querySelector('#scheduleEventModal');
calendarGrid.addEventListener('click',(event)=>{
    if(event.target && event.target.closest('.calendar-day') && !event.target.closest('.calendar-event')){
        scheduleEventModal.classList.add('active');
        currentDate.day = event.target.dataset.day;
        currentDate.month = event.target.dataset.month;
        currentDate.year = event.target.dataset.year;
        console.log(currentDate);
    }

})

let eventsCalendarData = JSON.parse(localStorage.getItem('eventsCalendarData'))||[];

const eventName = document.querySelector('#eventName');
const eventTime = document.querySelector('#eventTime');
const eventLocation = document.querySelector('#eventLocation');
const eventDescription = document.querySelector('#eventDescription');

const closeScheduleEventModal = document.querySelector('#closeScheduleModal');
closeScheduleEventModal.addEventListener('click',()=>{

    currentDate.day = null;
    currentDate.month = null;
    currentDate.year = null;
    scheduleEventModal.classList.remove('active');
})

document.querySelector('.submit-button').addEventListener('click',(event)=>{
    event.preventDefault();

    const newEventName = eventName.value;
    const newEventTime = eventTime.value;
    const newEventLocation=eventLocation.value;
    const newEventDescription = eventDescription.value; 
    const id = Date.now();

    eventsCalendarData.push({
        name: newEventName,
        time: newEventTime,
        location: newEventLocation,
        description: newEventDescription,
        id: id,
         day: currentDate.day,
    month: currentDate.month,
    year: currentDate.year
    })

    eventName.value = ''
    eventTime.value = ''
    eventLocation.value =''
    eventDescription.value =''

     const specificDay = document.querySelector(`[data-day="${currentDate.day}"][data-month="${currentDate.month}"][data-year="${currentDate.year}"]`);
        if(specificDay){
            const eventElement = document.createElement('div');
            eventElement.className = 'calendar-event service-event';
            eventElement.textContent = newEventName;
            eventElement.id = id;
            specificDay.appendChild(eventElement);
        }
    
    
    currentDate.day = null;
    currentDate.month = null;
    currentDate.year = null;

    
    scheduleEventModal.classList.remove('active');
    localStorage.setItem('eventsCalendarData', JSON.stringify(eventsCalendarData));


})






const renderAllEvents = ()=>{
    eventsCalendarData.forEach((event)=>{
        const specificDay = document.querySelector(`[data-day="${event.day}"][data-month="${event.month}"][data-year="${event.year}"]`);
        if(specificDay){
            const eventElement = document.createElement('div');
            eventElement.className = 'calendar-event service-event';
            eventElement.textContent = event.name;
            eventElement.id = event.id
            specificDay.appendChild(eventElement);
        }
    })
}
/*we have event, we have to remove div element
get specific day box from day, month, year
from box, remove the div with the id
*/

renderAllEvents()
/*we have current event date by textContent, how to
use value to enter event? 

2. we now have not just the date, but the 
day, month, and year, which are all datasets to a specific 
box. so we should be easily able to use them to our advantage 
by innerContent. make a scoped const in which we will find them
by the exact dataset we're on, then innerHTML then boom 
*/

/*<div class="calendar-day">
    <span class="day-number">15</span>
    
    <div class="calendar-event service-event">
        Beach Cleanup
    </div>
    
    <div class="calendar-event meeting-event">
        Club Meeting
    </div>
</div>
*/


// opening up event modal
/* <div class="calendar-day" id ="calendarDayBox"
         data-day ="${i}"
                        data-month ="${currentMonth}" 
                        data-year ="${currentYear}">
                        <span class="day-number">${i}</span>
                    </div>` */

const eventDetailsModal = document.querySelector('#eventDetailsModal');

const eventDetailsModalTime = document.querySelector('#eventDetailsTime');
const eventDetailsModalLocation = document.querySelector('#eventDetailsLocation');
const eventDetailsModalDescription  = document.querySelector('#eventDetailsDescription');
const eventDetailsModalTitle = document.querySelector('#eventDetailsTitle');

let currentId = null;

calendarGrid.addEventListener('click',(event)=>{
    if(event.target && event.target.closest('.calendar-event')){
        console.log('Event clicked');
        const eventId = event.target.id;
        console.log('Event ID:', eventId);
        const eventData = eventsCalendarData.find(e => String(e.id) === String(eventId));
        console.log('Event data found:', eventData);
        console.log('All events:', eventsCalendarData);

        currentId  = eventId;

        const time = eventData.time;
        const location = eventData.location;
        const description = eventData.description;
        const title = eventData.name;

        eventDetailsModalTitle.textContent = `${title} Details`;
        eventDetailsModalDescription.textContent = `${description}`;
        eventDetailsModalLocation.textContent = `${location}`;
        eventDetailsModalTime.textContent = `${time}`;

        console.log('Modal element:', eventDetailsModal);
        eventDetailsModal.classList.add('active');
        console.log('Modal should be active now');
        
    }

})

//Close event details modal

const eventDetailsModalCloseButton = document.querySelector('#closeEventDetailsModal');

eventDetailsModalCloseButton.addEventListener('click',()=>{
    eventDetailsModalTitle.textContent = '';
        eventDetailsModalDescription.textContent = '';
        eventDetailsModalLocation.textContent = '';
        eventDetailsModalTime.textContent = '';
        currentId = null;
        eventDetailsModal.classList.remove('active');
})

//Delete event

const deleteEventCalendarButton = document.querySelector('#deleteEventButton');
deleteEventCalendarButton.addEventListener('click',()=>{
    console.log('Id:', currentId)
    if(currentId){
        const event = eventsCalendarData.find(e=> String(e.id) === String(currentId));
        document.getElementById(event.id).remove(); 
        
        eventsCalendarData = eventsCalendarData.filter(e => String(e.id) !== String(currentId));
        localStorage.setItem('eventsCalendarData', JSON.stringify(eventsCalendarData));
        eventDetailsModal.classList.remove('active');
        
    }
})