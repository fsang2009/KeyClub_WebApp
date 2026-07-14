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

const errorMessageFill = document.querySelector('#fill-signup-error');
const errorMessagePasswordCheck = document.querySelector('#password-check-signup-error');
const errorMessageEmailCheck = document.querySelector('#email-check-signup-error');

let errorMessageTimer = null


document.getElementById('signup-form').addEventListener('submit',(event)=>{
    clearTimeout(errorMessageTimer);
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
    )){
        errorMessageFill.textContent = 'Please Fill in all Boxes'
        errorMessageFill.style.display = 'block'
        errorMessageTimer = setTimeout(()=>{
            errorMessageFill.textContent = ''
            errorMessageFill.style.display='none'
        }, 4300)
        return;
    } if(userSetPassword !== userConfirmedPassword){
        errorMessagePasswordCheck.textContent = 'Passwords do not match'
        errorMessagePasswordCheck.style.display = 'block'
        errorMessageTimer = setTimeout(()=>{
            errorMessagePasswordCheck.textContent = '';
            errorMessagePasswordCheck.style.display ='none';
        }, 4300)
        return;
    } if (userInfo[userSetEmail]){
        errorMessageEmailCheck.textContent = 'Email address already used by an account!'
        errorMessageEmailCheck.style.display = 'block'
        errorMessageTimer = setTimeout(()=>{
            errorMessageEmailCheck.textContent = ''
            errorMessageEmailCheck.style.display='none'
        }, 4300)
        return;
    }
        userInfo[userSetEmail] = userInfo[userSetEmail] || {};
        userInfo[userSetEmail] ={
            firstname: userSetFirstName,
            lastname: userSetLastName,
            email: userSetEmail,
            school: userSetSchool,
            grade: userSetGrade,
            username: userSetDisplayName,
            password: userSetPassword,
            signedUpEvents: {}
        }

    localStorage.setItem('userinfo', JSON.stringify(userInfo))
    localStorage.setItem('currentUser', JSON.stringify(userSetEmail))
    window.location.href ='profile.html'

})