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

const schoolRankingButton = document.querySelector('#school-ranking-button');
schoolRankingButton.addEventListener('click',()=>{
    studentRankingButton.classList.remove('active');
    schoolRankingButton.classList.add('active');
    renderSchoolLeaderboard();
})

const studentRankingButton = document.querySelector('#student-ranking-button');
studentRankingButton.addEventListener('click',()=>{
    schoolRankingButton.classList.remove('active');
    studentRankingButton.classList.add('active');
    renderStudentLeaderboard();
})





const renderStudentLeaderboard =() =>{
    const newStudentArray = Object.values(userInfo).sort((a,b)=> b.hours - a.hours);
    let html ='';
    newStudentArray.forEach((student, index)=>{
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

        html+=`
        <div class="school-leaderboard-item ${rankDiv}">
                        <div class="school-rank-badge ${placeClass}">${index+1}</div>
                        <div class="school-info" id ="student-info>
                            <h3 class="school-name" id="student-name">${student.firstname} ${student.lastname}</h3>
                            <p class="school-stats"><span class="hours">Hours: ${student.hours}</span> • <span class="student-count">Email: ${student.email}</span> • <span class ="student-count" id ="studentSchool">School: ${student.school}</span></p>
                        </div>
                        <div class="school-progress-bar">
                            <div class="progress-fill" style="width: 100%;"></div>
                        </div>
                    </div>
        `
    })
    schoolLeaderboard.innerHTML = html;

}

const topPerformerGrid = document.querySelector('.top-performers-grid');

const renderTopPerformers = ()=>{
    const newStudentArray = Object.values(userInfo).sort((a,b)=> b.hours - a.hours);
    const topPerformerStudentsArray = Object.values(newStudentArray).reduce((acc, current, index)=>{
        if(index<=2){
            acc.push(current);
        }
        return acc;
    },[]);


    const realTopPerformerStudentsArray = topPerformerStudentsArray.sort((a,b)=>b.hours-a.hours);
    let html ='';

    realTopPerformerStudentsArray.forEach((student, index)=>{
           let placeClass = null;
        let rankDiv = null;
        if(index===0){
            placeClass = 'gold';
            rankDiv = '1st'
        }
        else if (index===1){
            placeClass = 'silver';
            rankDiv = '2nd'
        }
        else if(index === 2){
            placeClass='bronze';
            rankDiv ='3rd'
        }
        else{
            placeClass ='';
            rankDiv ='';
        }
        html += `
            <div class="top-performer-card ${placeClass}">
                    <div class="rank-badge">${rankDiv}</div>
                    <div class="performer-avatar">
                        <img src="${student.profileImage}" alt="Top Student">
                    </div>
                    <h3 class="performer-name">${student.firstname} ${student.lastname}</h3>
                    <p class="performer-school">${student.school}</p>\
                    <p class ="performer-school">${student.email}</p>
                    <div class="performer-stats">
                        <p class="stat-item"><span class="stat-value">${student.hours}</span> Hours</p>
                        <p class="stat-item"><span class="stat-value">${student.points}</span> Points</p>
                    </div>
                </div>
        `
    })
    topPerformerGrid.innerHTML = html;

}

document.addEventListener('DOMContentLoaded', renderTopPerformers());


