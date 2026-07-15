let studentListContainer = document.querySelector('#studentsContainer');
const userInfo = JSON.parse(localStorage.getItem('userinfo')) || {};
 Object.entries(userInfo).forEach(([key, value]) => {
  console.log(`${key}: ${value.firstname}`);
});


const renderStudents = ()=>{
    let html = ''
    Object.entries(userInfo).forEach(([key, value])=>{
        html +=`<tr>
          <td>
            <div class="student-profile">
              <img class="student-avatar" src="${value.profileImage}" alt="Student avatar">
              <div class="student-details">
                <span class="student-name">${value.firstname}</span>
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