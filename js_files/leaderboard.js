const userInfo = JSON.parse(localStorage.getItem('userinfo'));
const userSetEmail = JSON.parse(localStorage.getItem('currentUser'));
let currentUser = userInfo[userSetEmail];
if(!currentUser){
    console.log('User does not exist.');
}






const schools = Object.values(userInfo).reduce((acc,current)=>{
    if(!acc[current.school]){
        acc[current.school]??= {};
        acc[current.school].name = current.school;
        return acc;
    }
    return acc;
}, {});
console.log(schools);






if(!currentUser){
    window.location.href ='login.html';
}


if (!schools){
    console.log('No Schools Available');
}


const schoolLeaderboard = document.querySelector('#schoolLeaderboard');


const renderSchoolLeaderboard = ()=>{
    const schoolStats = Object.values(userInfo).reduce((acc, current)=>{
        let currentSchool = current.school;


        if(!acc[currentSchool]){
            acc[currentSchool]={
                name: currentSchool,
                totalHours: 0,
                studentCount:0
            }
        }


        let hours = current.hours;


        acc[currentSchool].totalHours += hours;
        acc[currentSchool].studentCount += 1;
        return acc;
    }, {});


    const newSchoolsArray = Object.values(schoolStats).sort((a,b)=> b.totalHours-a.totalHours);


    let html ='';
    newSchoolsArray.forEach((school, index)=>{
        let placeClass = null;
        let rankDiv = null;
        if(index===0){
            placeClass = 'gold';
            rankDiv = 'rank-1'
        }
        else if (index===1){
            placeClass = 'silver';
            rankDiv = 'rank-2'
        }
        else if(index === 2){
            placeClass='bronze';
            rankDiv ='rank-3'
        }
        else{
            placeClass ='';
            rankDiv ='';
        }


        html+=  `
          <div class="school-leaderboard-item ${rankDiv}">
                        <div class="school-rank-badge ${placeClass}">${index+1}</div>
                        <div class="school-info">
                            <h3 class="school-name">${school.name}</h3>
                            <p class="school-stats"><span class="hours">${school.totalHours}</span> hours • <span class="student-count">${school.studentCount}</span> students</p>
                        </div>
                        <div class="school-progress-bar">
                            <div class="progress-fill" style="width: 100%;"></div>
                        </div>
                    </div>
        `




    })
    schoolLeaderboard.innerHTML=html;






}


document.addEventListener('DOMContentLoaded', renderSchoolLeaderboard());



