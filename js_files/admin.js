console.log('Admin.js loaded');
const userInfo = JSON.parse(localStorage.getItem('userinfo')) || {};
const userSetEmail = JSON.parse(localStorage.getItem('currentUser'));
console.log('userSetEmail:', userSetEmail);
console.log('userInfo:', userInfo);
const currentUser = userInfo[userSetEmail]
console.log('currentUser:', currentUser);

if(!currentUser){
    console.log('No current user, redirecting to login');
    window.location.href = 'login.html' // Temporarily disabled for debugging
}





const arrived = document.querySelector('#manualTimeArrived');
const left = document.querySelector('#manualTimeLeaving')
const eventChosen = document.querySelector('#manualEvent');
const otherEventChosen = document.querySelector('#cameraEvent')
// ^^^  use .append to automatically add events from data
const studentEmail = document.querySelector('#manualEmail');

const events = JSON.parse(localStorage.getItem('eventData'));

const generateEvents = ()=>{
    const events = JSON.parse(localStorage.getItem('eventData'));
    eventChosen.innerHTML = '<option value="">Select event</option>'
    otherEventChosen.innerHTML = '<option value="">Select event</option>'
    if (events){
    events.forEach((event)=>{
        if(event.id && event.title){
            const option = document.createElement('option');
            const otherOption = document.createElement('option');
            otherOption.value = event.id;
            otherOption.textContent= event.title;
            option.value = event.id
            option.textContent = event.title
            otherEventChosen.appendChild(otherOption);
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
let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords'))||[];

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


//log users with camera logic below
const startBtn = document.querySelector('#startScanButton');
const stopBtn = document.querySelector('#stopScanButton');
const statusText = document.querySelector('.scanner-status');

const config = { 
    fps: 10, 
    qrbox: 250 
};


let usersSignedIn = JSON.parse(localStorage.getItem('usersSignedIn'))|| [];

const cameraErrorMessage = document.querySelector('#cameraErrorMessage');
let cameraErrorMessageTime = null;

const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, /* verbose= */ false);
let statusTextTimer = null;
// 4. Define what happens on success
function onScanSuccess(decodedText, decodedResult) {
    clearTimeout(cameraErrorMessageTime)
    clearTimeout(statusTextTimer)
    if (!usersSignedIn.some(record=> record.user === decodedText)){
        console.log(`Scan result: ${decodedText}`);
        const now = new Date();
        const timeNow = now.toLocaleTimeString('en-GB', {
  hour: '2-digit',
  minute: '2-digit'
});
    const otherTimeNow = now.toLocaleTimeString();
        const studentEventChosen = otherEventChosen.value
        if(studentEventChosen === ''){
        console.log('Event Not Chosen!')
        cameraErrorMessage.style.display='block';
        cameraErrorMessage.textContent ='Please select an event'
        cameraErrorMessageTime = setTimeout(()=>{
            cameraErrorMessage.style.display='none';
            cameraErrorMessage.textContent = ''
        },2000)
        return;
    }
    const selectedEvent = eventData.find(e=>e.id == studentEventChosen);
    if (!selectedEvent) {
    console.error("Selected event not found in database.");
    return;
}
    const studentEventChosenTitle = selectedEvent.title
    
        usersSignedIn.push({user: decodedText, timeEntered: timeNow, timeExited: null});
    const newRecord = {
        studentEmail: decodedText,
        eventId: studentEventChosen,
        eventTitle: studentEventChosenTitle,
        timeArrived: otherTimeNow, 
        timeLeft: null,
        hours: null, 
        date: now.toLocaleDateString
    }
    attendanceRecords.push(newRecord);
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
        renderUsersLogged();
        statusText.textContent = "Entry time Logged!";
        statusText.style.color = "#4CAF50";
        statusTextTimer = setTimeout(()=>{
            statusText.textContent = "Ready to scan";
        statusText.style.color = "#000000";
        }, 2000)
        localStorage.setItem('usersSignedIn', JSON.stringify(usersSignedIn));
        
    } else{
        const user =  usersSignedIn.find(user=>user.user === decodedText);
        const now = new Date();
        const timeNow = now.toLocaleTimeString('en-GB', {
  hour: '2-digit',
  minute: '2-digit'
});
        user.timeExited = timeNow
        
        const otherTimeNow = now.toLocaleTimeString();
        const timeEntered = timeToDecimal(user.timeEntered);
        const timeExited = timeToDecimal(user.timeExited);

        const timeSpent = calculateTime(timeEntered, timeExited);

        userInfo[decodedText].hours += timeSpent;
        userInfo[decodedText].points += timeSpent;
        
        const record = attendanceRecords.find(record => record.studentEmail === decodedText && record.timeLeft === null);
        record.timeLeft = otherTimeNow;
        record.hours = timeSpent;
        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));

        renderAttendanceList();
        localStorage.setItem('userinfo', JSON.stringify(userInfo));

        document.getElementById(decodedText).remove();
        
        usersSignedIn = usersSignedIn.filter(user=> user.user !== decodedText);
        localStorage.setItem('usersSignedIn', JSON.stringify(usersSignedIn));

        renderUsersLogged();

    
    }
}
/* 
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

       
*/

const userScannedLogArea = document.querySelector('#userScannedLogBox');
const renderUsersLogged =()=>{
    let html = ''
    usersSignedIn.forEach((user)=>{
        html+=`
                    <div class ="studentLogBox" id="${user.user}">
                        <p class ="getDOM">${userInfo[user.user]?.firstname || 'unknown'} ${userInfo[user.user]?.lastname ||'unknown'} | Checked in: ${user.timeEntered} Checked out: ❌</p>
                        <button class ="UserLogDelete" id="${user.user}">
                            Delete
                        </button>
                    </div>
                `
    
            })
            userScannedLogArea.innerHTML = html; 
}
//delete userLog 


const studentLogBox = document.querySelector('.studentLogBox')
userScannedLogArea.addEventListener('click',(event)=>{
    if (event.target && event.target.classList.contains('UserLogDelete')){
        const email = event.target.id;
        usersSignedIn = usersSignedIn.filter(user=> user.user !== email);

        event.target.closest('.studentLogBox').remove()
        localStorage.setItem('usersSignedIn', JSON.stringify(usersSignedIn));
    }
    
})
document.addEventListener('DOMContentLoaded', renderUsersLogged);
// 5. Connect the HTML buttons to the scanner action methods
startBtn.addEventListener('click', () => {
    statusText.textContent = "Accessing camera...";
    html5QrcodeScanner.render(onScanSuccess);
});

stopBtn.addEventListener('click', () => {
    html5QrcodeScanner.clear().then(() => {
        statusText.textContent = "Camera stopped";
        statusText.style.color = "";
        console.log("Scanner cleaned up safely.");
    }).catch(err => {
        console.error("Failed to clear scanner: ", err);
    });
});

const cameraUserLog = (studentEmail, hours) =>{
    const user = userInfo[studentEmail]
    user.hours += hours;
    user.points += hours;    
}


renderUsersLogged();

const historyLogArea = document.querySelector('.attendance-list');
const clearHistoryButton = document.querySelector('#clearLogHistory');
clearHistoryButton.addEventListener('click',()=>{
    console.log('hi')
    historyLogArea.replaceChildren();
    attendanceRecords = [];
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords))
})