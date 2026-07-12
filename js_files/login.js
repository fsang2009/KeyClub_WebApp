const userInfo  = JSON.parse(localStorage.getItem('userinfo')) || {};

const userEmail = document.querySelector('#email');
const userPassword = document.querySelector('#password');

const errorDisplayArea = document.querySelector('.error-message');
let errorDisplay = null;

document.getElementById('login-form').addEventListener('submit',(event)=>{
    clearTimeout(errorDisplay);
    event.preventDefault();
    const userSetEmail = userEmail.value.trim();
    const userSetPassword = userPassword.value.trim();
    if (userSetEmail === '' || userSetPassword === ''){
        errorDisplayArea.textContent = 'Please enter proper information';
        errorDisplayArea.style.display ='block';
        errorDisplay = setTimeout(()=>{
            errorDisplayArea.textContent ='';
            errorDisplayArea.style.display ='none';
        }, 3500)
         return;
    }
    if ((!userInfo[userSetEmail])||(userInfo[userSetEmail].password !== userSetPassword)){
        errorDisplayArea.textContent = 'Invalid email or password';
        errorDisplayArea.style.display ='block';
        errorDisplay = setTimeout(()=>{
            errorDisplayArea.textContent ='';
            errorDisplayArea.style.display ='none';
        }, 3500) 
        return;
    } 

    // start session here
    localStorage.setItem('currentUser', JSON.stringify(userSetEmail))
    window.location.href = 'index.html'
})