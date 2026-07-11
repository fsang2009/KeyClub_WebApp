// First select the element
const eventCard = document.querySelectorAll('.event')
const eventData = {
    "1": {
        title: "Beach Cleanup",
        description: "Join us for a community beach cleanup event! Help keep our beaches clean and safe for everyone.",
        date: "Saturday, July 15, 2026",
        time: "9:00 AM - 12:00 PM",
        location: "Southport Beach"
    },
    "2": {
        title: "Food Drive",
        description: "Help collect food donations for local families in need. All donations go to the Southport Food Bank.",
        date: "Sunday, July 16, 2026",
        time: "10:00 AM - 2:00 PM",
        location: "Southport Community Center"
    }
}
eventCard.forEach((eventCard)=>{
    if(eventCard.dataset.eventId){
        const eventId = eventCard.dataset.eventId
        const data = eventData[eventId];
        const eventButton = eventCard.querySelector('.event-view-button');
        eventButton.addEventListener('click',()=>{
            
        })
        
    } 
})
