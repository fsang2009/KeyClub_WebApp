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
const errorMessageFirstNameCheck = document.querySelector('#firstname-check-signup-error');
const errorMessageLastNameCheck = document.querySelector('#lastname-check-signup-error');

let errorMessageTimer = null

// filter out inappropriate names (make your own algorithm)
const filterConverter = {
   '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', 
  '7': 't', '8': 'b', '$': 's', '@': 'a', '!': 'i'
}

const blockedWords = [
  // General profanity
  "nigg",
  "fuc",
  "nig",
  "shi",
  "fuh",
  "fuck",
  "fuk",
  "shit",
  "bitch",
  "ass",
  "asshole",
  "arse",
  "arsehole",
  "bastard",
  "cunt",
  "dick",
  "cock",
  "penis",
  "vagina",
  "pussy",
  "boob",
  "boobs",
  "tit",
  "tits",
  "cum",
  "semen",
  "whore",
  "slut",
  "hoe",
  "motherfucker",
  "motherfuck",
  "bullshit",
  "jackass",
  "dipshit",
  "douche",
  "douchebag",
  "wanker",
  "tosser",
  "twat",
  "prick",

  // Racial / ethnic slurs
  "nigger",
  "nigga",
  "niga",
  "negro",
  "coon",
  "spic",
  "kike",
  "chink",
  "gook",
  "wetback",
  "raghead",
  "cracker",

  // LGBTQ+ slurs
  "fag",
  "faggot",
  "dyke",
  "tranny",

  // Ableist slurs
  "retard",
  "retarded",

  // Sexual terms
  "porn",
  "sex",
  "sexy",
  "horny",
  "anal",
  "blowjob",
  "handjob",
  "dildo",
  "vibrator",
  "orgasm",
  "rape",
  "rapist",

  // Violence / hate
  "hitler",
  "nazi",
  "isis",
  "terrorist",
  "terror",
  "kkk",

  // Drugs
  "meth",
  "heroin",
  "cocaine",
  "crack",
  "weed",
  "marijuana",
  "xanax",
  "fentanyl",

  // Misc.
  "suicide",
  "kill",
  "murder",

  // Internet slang (if you don't want it)
  "lol",
  "lmao",
  "lmfao",
  "rofl",
  "xd",

  // Custom
  "jedi",
  "jeditaw"
];

let firstNameTimer = null;
userFirstName.addEventListener('input',(event)=>{
    clearTimeout(firstNameTimer);
    errorMessageFirstNameCheck.style.display='none';
    errorMessageFirstNameCheck.textContent= '';
    let val = event.target.value;
    let trueFalse = isInappropriate(val);
    if(trueFalse === true){
        errorMessageFirstNameCheck.style.display ='block';
        errorMessageFirstNameCheck.textContent = 'Please use an appropriate name.'
        firstNameTimer = setTimeout(()=>{
            errorMessageFirstNameCheck.style.display ='none';
            errorMessageFirstNameCheck.textContent = ''
        }, 3000);
    }
    
})

const isInappropriate = (inputName)=>{
    if (!inputName){ return false}

    const filteredWord = inputName.toLowerCase().normalized("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9$@!]/g, "");

    const cleansedWord = filteredWord.split('').reduce((acc, current)=>{
        acc += filterConverter[current] || current
        return acc;
    },'')

    const superCleansedWord = cleansedWord.replace(/(.)\1+/g, '$1');
    return blockedWords.reduce((acc, current)=>{
        if(superCleansedWord.includes(current)){
            acc = true;
        }
        return acc
    }, false)
    

}






function normalizeEmail(email) {
  // 1. Convert to lowercase
  let normalized = email.toLowerCase();
  
  // 2. Separate local part (before @) and domain part (after @)
  let [localPart, domain] = normalized.split('@');
  
  // 3. Normalize Gmail and iCloud (ignore tags and dots for Gmail)
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Remove dots before the @
    localPart = localPart.replace(/\./g, '');
    // Remove the '+' tag and anything following it
    localPart = localPart.split('+')[0];
  }
  
  return `${localPart}@${domain}`;
}
let currentErrorMessageTimer = null
let currentEmailInput = null
userEmail.addEventListener('input',(event)=>{
    clearTimeout(currentErrorMessageTimer)
    errorMessageEmailCheck.textContent=''
    errorMessageEmailCheck.style.display='none'
    let val= event.target.value;
    console.log(val)
    currentEmailInput = val
    setTimeout(()=>{
    if((val.includes('gmail')
        ||(val.includes('yahoo'))
        ||(val.includes('icloud'))
        ||(val.includes('outlook'))
        ||(val.includes('proton')))){
            errorMessageEmailCheck.textContent = 'Please enter your school email address'
        errorMessageEmailCheck.style.display = 'block'
        currentErrorMessageTimer = setTimeout(()=>{
            errorMessageEmailCheck.textContent = ''
            errorMessageEmailCheck.style.display='none'
        }, 4300)
        return;
        }
    }, 100)

    

})

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
    const email = normalizeEmail(userSetEmail);
    const emailNow = normalizeEmail(currentEmailInput);
    if(
        (email.includes('gmail')
        ||(email.includes('yahoo'))
        ||(email.includes('icloud'))
        ||(email.includes('outlook'))
        ||(email.includes('proton')))){
        errorMessageEmailCheck.textContent = 'Please enter your school email address'
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
            signedUpEvents: {},
            hours: 0,
            points: 0
        }

    localStorage.setItem('userinfo', JSON.stringify(userInfo))
    localStorage.setItem('currentUser', JSON.stringify(userSetEmail))
    window.location.href ='profile.html'

})