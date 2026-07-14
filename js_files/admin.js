console.log('Admin.js loaded');
const userInfo = JSON.parse(localStorage.getItem('userinfo')) || {};
const userSetEmail = JSON.parse(localStorage.getItem('currentUser'));
console.log('userSetEmail:', userSetEmail);
console.log('userInfo:', userInfo);
const currentUser = userInfo[userSetEmail]
console.log('currentUser:', currentUser);

if(!currentUser){
    console.log('No current user, redirecting to login');
    // window.location.href = 'login.html' // Temporarily disabled for debugging
}





const arrived = document.querySelector('#manualTimeArrived');
const left = document.querySelector('#manualTimeLeaving')
const eventChosen = document.querySelector('#manualEvent');
// ^^^  use .append to automatically add events from data
const studentEmail = document.querySelector('#manualEmail');

const events = JSON.parse(localStorage.getItem('eventData'));

const generateEvents = ()=>{
    const events = JSON.parse(localStorage.getItem('eventData'));
    eventChosen.innerHTML = '<option value="">Select event</option>'
    if (events){
    events.forEach((event)=>{
        if(event.id && event.title){
            const option = document.createElement('option');
            option.value = event.id
            option.textContent = event.title
            eventChosen.appendChild(option);
        }
    });
    }
}

generateEvents();


const roundToNearestHalf = (num)=>{
    return Math.round(num*2)/2
}

const timeToDecimal = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
}

const calculateTime = (arrived, left)=>{
    const val = left-arrived;
    return roundToNearestHalf(val);

}

let eventData = JSON.parse(localStorage.getItem('eventData')) || []

const successMessage = document.querySelector('#manualSuccessMessage');
let successTime = null;

const errorMSG =document.querySelector('#manualErrorMessage'); 
let errorTime = null;

const clearButton = document.querySelector('#manualClearButton');
clearButton.addEventListener('click',()=>{
    arrived.value = '';
        left.value = '';
        eventChosen.value ='';
        studentEmail.value ='';
})
const manualUserSignInOut = ()=>{
    errorMSG.textContent= ''
    successMessage.textContent =''
    errorMSG.style.display='none';
    successMessage.style.display='none';
    clearTimeout(errorTime);
    clearTimeout(successTime);
    const timeArrived = timeToDecimal(arrived.value);
    const timeLeft = timeToDecimal(left.value);
    const studentEventChosen = eventChosen.value
    const selectedEvent = eventData.find(e=>e.id === studentEventChosen);
    const studentEventChosenTitle = selectedEvent.title
    const chosenStudentEmail = studentEmail.value;
    if(timeArrived ==='' || timeLeft === '' || studentEventChosen ==='' || chosenStudentEmail=== ''){
        errorMSG.style.display = 'block';
        errorMSG.textContent = 'Please fill in all boxes';
        errorTime = setTimeout(()=>{
            errorMSG.textContent = '';
            errorMSG.style.display ='none';
        }, 4000)
        return;
    }

    const timeSpent = calculateTime(timeArrived, timeLeft);

    if(timeSpent < 0){
        errorMSG.style.display ='block';
        errorMSG.textContent ='Invalid Time Entry'
        errorTime = setTimeout(()=>{
            errorMSG.textContent = '';
            errorMSG.style.display ='none';
        }, 4000)
        return;
    }

   if(!userInfo[chosenStudentEmail]){
        errorMSG.style.display = 'block';
        errorMSG.textContent = 'Invalid Student Email';
        errorTime = setTimeout(()=>{
            errorMSG.textContent = '';
            errorMSG.style.display ='none';
        }, 4000)
        return;

   }

        userInfo[chosenStudentEmail].hours += timeSpent;
        userInfo[chosenStudentEmail].points += timeSpent;
        successMessage.textContent = 'Student Successfully Logged!'
        successMessage.style.display ='block';
    successTime = setTimeout(()=>{
        successMessage.textContent =''
        successMessage.style.display = 'none';
    },4000);

    const now = new Date();
     getNewRecords(chosenStudentEmail, studentEventChosen, studentEventChosenTitle, arrived.value, left.value, timeSpent, now);
     renderAttendanceList();
        arrived.value = '';
        left.value = '';
        eventChosen.value ='';
        studentEmail.value ='';

    localStorage.setItem('userinfo', JSON.stringify(userInfo));






}   

const manualSubmitButton = document.querySelector('#manualSubmitButton');
manualSubmitButton.addEventListener('click',()=>{
    manualUserSignInOut();
})

//log in attendance log list

let attendanceList = document.querySelector('#attendanceList');
const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords'))||[];

const getNewRecords = (studentEmail, eventId, eventTitle, timeArrived, timeLeft, hours, date)=>{
    const newRecord = { studentEmail, eventId, eventTitle, timeArrived, timeLeft, hours, date };
  attendanceRecords.push(newRecord);

  localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords))
  renderAttendanceList();
}
const renderAttendanceList =()=>{
    let html = ''
    attendanceRecords.forEach((record)=>{
        html += ` <div class="attendance-item">
                    <div class="attendance-info">
                        <h3 class="attendance-name">${userInfo[record.studentEmail]?.firstname || 'unkown'} ${userInfo[record.studentEmail]?.lastname || 'unkown'}</h3>
                        <p class="attendance-email">${record.studentEmail}</p>
                        <p class ="attendance-event">${record.eventTitle}</p>
                        <p class="attendance-event">Event ID: ${record.eventId}</p>
                    </div>
                    <div class="attendance-details">
                        <p class="attendance-time">Time: ${record.timeArrived} - ${record.timeLeft}</p>
                        <p class="attendance-hours">Hours: ${record.hours}</p>
                        <p class="attendance-date">Date: ${record.date}</p>
                    </div>
                </div>
           `
    })

        attendanceList.innerHTML = html;

       
}

document.addEventListener('DOMContentLoaded', renderAttendanceList);