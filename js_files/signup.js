const userFirstName = document.querySelector('#first-name');
const userLastName = document.querySelector('#last-name');
const userEmail = document.querySelector('#email');
const userSchool = document.querySelector('#school');
const userGrade = document.querySelector('#grade');
const userDisplayName = document.querySelector('#username');
const userPassword = document.querySelector('#password');
const confirmUserPassword = document.querySelector('#confirm-password');

const createAcccountButton = document.querySelector('.create-account-button')

const userInfo = JSON.parse(localStorage.getItem('userinfo')) || {};

document.getElementbyId('signup-form').addEventListener('submit',(event)=>{
    event.preventDefault();
    const userSetFirstName = userFirstName.value.trim();
    const userSetLastName = userLastName.value.trim();
    const userSetEmail = userEmail.value.trim();
    const userSetSchool = userSchool.value.trim();
    const userSetGrade = userGrade.value.trim();
    const userSetDisplayName = userDisplayName.value.trim();
    const userSetPassword = userPassword.value.trim();
    const userConfirmedPassword = confirmUserPassword.value.trim();

    if((userSetFirstName === ''|| userSetLastName === '' || userSetEmail === ''
    || userSetSchool === ''|| userSetGrade === '' || userSetDisplayName === '' 
    || userSetPassword === '' || userConfirmedPassword === ''
    )|| (userSetPassword !== userConfirmedPassword) || (userInfo[userSetEmail])){
        return;
    }
        userInfo[userSetEmail] = userInfo[userSetEmail] || {};
        userInfo[userSetEmail] ={
            firstname: userSetFirstName,
            lastname: userSetLastName,
            email: userSetEmail,
            school: userSetSchool,
            grade: userSetGrade,
            displayname: userSetDisplayName,
            password: userSetPassword
        }
    localStorage.setItem('userinfo', JSON.stringify(userInfo))

})