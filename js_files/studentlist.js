let studentListContainer = document.querySelector('#studentsContainer');
const userInfo = JSON.parse(localStorage.getItem('userinfo')) || {};
 Object.entries(userInfo).forEach(([key, value]) => {
  console.log(`${key}: ${value.firstname}`);
});

const userEmail = JSON.parse(localStorage.getItem('currentUser')) || ''
const currentUser = userInfo[userEmail]
if(!currentUser){
  window.location.href = 'login.html'
}

const renderStudents = ()=>{
    let html = ''
    Object.entries(userInfo).forEach(([key, value])=>{
        html +=`<tr>
          <td>
            <div class="student-profile">
              <img class="student-avatar" src="${value.profileImage}" alt="Student avatar">
              <div class="student-details">
                <span class="student-name">${value.firstname} ${value.lastname}</span>
                <span class="student-email">${value.email}</span>
              </div>
            </div>
          </td>
          <td><span class="badge points-badge">${value.points} pts</span></td>
          <td><span class="hours-text">${value.hours} hrs</span></td>
          <td class="text-right">
            <button class="btn-history-trigger" data-student-id="${value.email}" data-student-name="${value.firstname} ${value.lastname}">
              View History
            </button>
          </td>
        </tr>`
    })
    studentListContainer.innerHTML = html
}
document.addEventListener('DOMContentLoaded', renderStudents);


// open history modal 
let currentUserEmail = null

const historyModal = document.querySelector('#historyModal');

const historyModalButtons = document.querySelectorAll('.btn-history-trigger')



studentListContainer.addEventListener('click',(event)=>{
    if(event.target && event.target.classList.contains('btn-history-trigger')){
        if(event.target.dataset.studentId !== null){
            currentUserEmail = event.target.dataset.studentId;
            
            const user = userInfo[currentUserEmail]
            console.log('user events:', user.eventsCompleted);
            historyModal.classList.add('active');
            loadHistoryModal();
        } else {
            console.log('student id does not exist. ')
            return;
        }
    }
})


const studentName = document.querySelector('#studentNameTarget');

const loadHistoryModal = ()=>{
    if(currentUserEmail !== null){
        const user = userInfo[currentUserEmail];
        studentName.textContent = `${user.firstname} ${user.lastname}`
        if(user.eventsCompleted){
            renderEventHistory();
        } else{
          return;
        }
    }

}



// close history modal function

const closeHistoryModal = document.querySelector('#closeHistoryModalBtn')

closeHistoryModal.addEventListener('click',()=>{
    currentUserEmail = null;
    studentName.textContent ='';
    historyContainer.innerHTML = ''
    historyModal.classList.remove('active');
    
})

// render student events
const historyContainer = document.querySelector('.history-scroll-container');

const renderEventHistory =()=>{
    const user = userInfo[currentUserEmail];
    console.log('user:', user);
    console.log('userInfo', userInfo);
    const userEventsCompleted = user.eventsCompleted
    let eventHTML = ''

    userEventsCompleted.forEach((event)=>{
        eventHTML += ` <div class="history-event-card">
        <div class="event-card-header">
          <span class="event-type-badge meetup">event type</span>
          <span class="event-date">${event.date}</span>
        </div>
        <h4>${event.title}</h4>
        <div class="event-card-footer">
          <span>Points: <strong>pts</strong></span>
          <span>Hours: <strong>hrs</strong></span>
        </div>
      </div>`
    })
    historyContainer.innerHTML = eventHTML
}

//search users logic

const userSearchBar = document.querySelector('#studentSearchInput');

userSearchBar.addEventListener('input',()=>{
  console.log(userSearchBar.value)
  renderStudentListAfterSearch();
})


const renderStudentListAfterSearch =()=>{
  const userSearched = userSearchBar.value;
  const trueUserSearched = userSearched.toLowerCase().trim();

  const newUserList = Object.entries(userInfo).filter(([key,value])=>{
    const firstNameAccepted = value.firstname.toLowerCase().includes(trueUserSearched);
    const lastNameAccepted = value.lastname.toLowerCase().includes(trueUserSearched);
    const fullName = `${value.firstname} ${value.lastname}`
    const fullNameAccepted = fullName.toLowerCase().includes(trueUserSearched);
    return firstNameAccepted || lastNameAccepted || fullNameAccepted
  })

  let html  =''

  newUserList.forEach(([key, value])=>{
    html += `<tr> 
            <td> 
                <div class="student-profile"> 
                    <img class="student-avatar" src="${value.profileImage}" alt="Student avatar"> 
                    <div class="student-details"> 
                        <span class="student-name">${value.firstname} ${value.lastname}</span> 
                        <span class="student-email">${value.email}</span> 
                    </div> 
                </div> 
            </td> 
            <td><span class="badge points-badge">${value.points} pts</span></td> 
            <td><span class="hours-text">${value.hours} hrs</span></td> 
            <td class="text-right"> 
                <!-- You can use the preserved object 'key' here if needed -->
                <button class="btn-history-trigger" data-key="${key}" data-student-id="${value.email}" data-student-name="${value.firstname} ${value.lastname}"> 
                    View History 
                </button> 
            </td> 
        </tr>`
  })
  studentListContainer.innerHTML = html




}
























/*const renderStudentListAfterSearch = () => {
    const userInSearch = userSearchBar.value.toLowerCase();
    const trueUserInSearch = userInSearch.trim();
    // Filter entries to preserve both the object key and the student data value
    const matchedUsers = Object.entries(userInfo).filter(([key, value]) => {
        const firstNameMatch = value.firstname.toLowerCase().includes(trueUserInSearch);
        const lastNameMatch = value.lastname.toLowerCase().includes(trueUserInSearch);
        const fullName = `${value.firstname} ${value.lastname}`
        const fullNameMatch = fullName.toLowerCase().includes(trueUserInSearch);
        return firstNameMatch || lastNameMatch || fullNameMatch;
    });

    let html = '';
    
    // Loop through the filtered entries array (key is preserved as 'key')
    matchedUsers.forEach(([key, value]) => {
        html += `<tr> 
            <td> 
                <div class="student-profile"> 
                    <img class="student-avatar" src="${value.profileImage}" alt="Student avatar"> 
                    <div class="student-details"> 
                        <span class="student-name">${value.firstname} ${value.lastname}</span> 
                        <span class="student-email">${value.email}</span> 
                    </div> 
                </div> 
            </td> 
            <td><span class="badge points-badge">${value.points} pts</span></td> 
            <td><span class="hours-text">${value.hours} hrs</span></td> 
            <td class="text-right"> 
                <!-- You can use the preserved object 'key' here if needed -->
                <button class="btn-history-trigger" data-key="${key}" data-student-id="${value.email}" data-student-name="${value.firstname} ${value.lastname}"> 
                    View History 
                </button> 
            </td> 
        </tr>`;
    });

    studentListContainer.innerHTML = html;
}*/
