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

// filter out inappropriate names (make own algorithm)
const filterConverter = {
   '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', 
  '7': 't', '8': 'b', '$': 's', '@': 'a', '!': 'i'
}

const blockedWords = [
  // General profanity
  "nigg",
  "fuck",
  "fuc",
  "fck",
  "crap",
  "crip",
  "slt",
  "messi",
  "motherfuc",
  "motherf",
  "mother",
  "father",
  "dad",
  "motherfck",
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
  "aaa",


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
  "hentai",
  "henta",
  "bitc",
  "btch",
  "bch",
  "fag",
  "lionel",
  "lione",
  "trump",
  
  

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
    ,"crap", "bastard", "idiot", "jerk", "hell", "damn",

];


let displayNameTimer = null
const userDisplayErrorMessage = document.querySelector('#displayname-check-signup-error');
userDisplayName.addEventListener('input',(event)=>{
        clearTimeout(displayNameTimer);
    userDisplayErrorMessage.style.display='none';
    userDisplayErrorMessage.textContent= '';
    let val = event.target.value;
    let trueFalse = isInappropriate(val);
    if(trueFalse === true){
        userDisplayErrorMessage.style.display ='block';
        userDisplayErrorMessage.textContent = 'Please use an appropriate name.'
        firstNameTimer = setTimeout(()=>{
            userDisplayErrorMessage.style.display ='none';
            userDisplayErrorMessage.textContent = ''
        }, 3000);
    }
    if((val.toLowerCase().includes('emili'))||(val.toLowerCase() === 'Marko')){
         userDisplayErrorMessage.style.display ='block';
        userDisplayErrorMessage.textContent = 'You are worst than Adolf Hitler.'
        firstNameTimer = setTimeout(()=>{
            userDisplayErrorMessage.style.display ='none';
            userDisplayErrorMessage.textContent = ''
        }, 3000);
    }
    const wordLength = val.split('').length;
    if(wordLength>15){
        userDisplayErrorMessage.style.display ='block';
        userDisplayErrorMessage.textContent = 'Character limit exceeded.'
        firstNameTimer = setTimeout(()=>{
            userDisplayErrorMessage.style.display ='none';
            userDisplayErrorMessage.textContent = ''
        }, 3000);
    }

})
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
    if((val.toLowerCase().includes('emili'))||(val.toLowerCase() === 'Marko')){
         errorMessageFirstNameCheck.style.display ='block';
        errorMessageFirstNameCheck.textContent = 'You are worst than Adolf Hitler.'
        firstNameTimer = setTimeout(()=>{
            errorMessageFirstNameCheck.style.display ='none';
            errorMessageFirstNameCheck.textContent = ''
        }, 3000);
    }
    const wordLength = val.split('').length;
    if(wordLength>15){
        errorMessageFirstNameCheck.style.display ='block';
        errorMessageFirstNameCheck.textContent = 'Character limit exceeded.'
        firstNameTimer = setTimeout(()=>{
            errorMessageFirstNameCheck.style.display ='none';
            errorMessageFirstNameCheck.textContent = ''
        }, 3000);
    }
})


let lastNameTimer = null;
userLastName.addEventListener('input',(event)=>{
    clearTimeout(firstNameTimer);
    errorMessageLastNameCheck.style.display='none';
    errorMessageLastNameCheck.textContent= '';
    let val = event.target.value;
    let trueFalse = isInappropriate(val);
    if(trueFalse === true){
        errorMessageLastNameCheck.style.display ='block';
        errorMessageLastNameCheck.textContent = 'Please use an appropriate name.'
        lastNameTimer = setTimeout(()=>{
            errorMessageLastNameCheck.style.display ='none';
            errorMessageLastNameCheck.textContent = ''
        }, 3000);
    }
    const wordLength = val.split('').length;
    if(wordLength>15){
        errorMessageLastNameCheck.style.display ='block';
        errorMessageLastNameCheck.textContent = 'Character limit exceeded.'
        lastNameTimer = setTimeout(()=>{
            errorMessageLastNameCheck.style.display ='none';
            errorMessageLastNameCheck.textContent = ''
        }, 3000);
    }
    
})

const isInappropriate = (inputName)=>{
    if (!inputName){ return false}

    const filteredWord = inputName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9$@!]/g, "");

    const cleansedWord = filteredWord.split('').reduce((acc, current)=>{
        acc += filterConverter[current] || current
        return acc;
    },'')

    const superCleansedWord = cleansedWord.replace(/(.)\1+/g, '$1');
    
    if((inputName === 'ass')||(inputName.replace(/(.)\1+/g, '$1$1') === 'ass') ||(inputName.includes('aaa') || (inputName.includes('sss')))
    
){
        return true;
    }
    return blockedWords.reduce((acc, current)=>{
        if(superCleansedWord.includes(current)){
            acc = true;
        }
        return acc
    }, false)
    

}


/*update code
*/



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
        ||(val.includes('proton'))
        ||(val.includes('hotmail'))
        ||(val.includes('aol')))){
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
        errorMessageFill.textContent = 'Please fill in all boxes'
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
        ||(email.includes('proton'))
        ||(email.includes('hotmail'))
        ||(email.includes('aol')))){
        errorMessageEmailCheck.textContent = 'Please enter your school email address'
        errorMessageEmailCheck.style.display = 'block'
        errorMessageTimer = setTimeout(()=>{
            errorMessageEmailCheck.textContent = ''
            errorMessageEmailCheck.style.display='none'
        }, 4300)
        return;
    }
    
    const firstNameVal = isInappropriate(userSetFirstName)
    const lastNameVal = isInappropriate(userSetLastName);

    if(firstNameVal === true){
         errorMessageFirstNameCheck.style.display ='block';
        errorMessageFirstNameCheck.textContent = 'Please use an appropriate name.'
        firstNameTimer = setTimeout(()=>{
            errorMessageFirstNameCheck.style.display ='none';
            errorMessageFirstNameCheck.textContent = ''
        }, 3000);
        return
    }
    
    const wordLength = userSetFirstName.split('').length;
    if(wordLength>15){
        errorMessageFirstNameCheck.style.display ='block';
        errorMessageFirstNameCheck.textContent = 'Character limit exceeded.'
        firstNameTimer = setTimeout(()=>{
            errorMessageFirstNameCheck.style.display ='none';
            errorMessageFirstNameCheck.textContent = ''
        }, 3000);
        return
    }

    if(lastNameVal === true){
         errorMessageLastNameCheck.style.display ='block';
        errorMessageLastNameCheck.textContent = 'Please use an appropriate name.'
        lastNameTimer = setTimeout(()=>{
            errorMessageLastNameCheck.style.display ='none';
            errorMessageLastNameCheck.textContent = ''
        }, 3000);
        return
    }
    const lastNameLength = userSetLastName.split('').length;
    if(lastNameLength>15){
        errorMessageLastNameCheck.style.display ='block';
        errorMessageLastNameCheck.textContent = 'Character limit exceeded.'
        lastNameTimer = setTimeout(()=>{
            errorMessageLastNameCheck.style.display ='none';
            errorMessageLastNameCheck.textContent = ''
        }, 3000);
        return
    }

    const displayNameVal = isInappropriate(userSetDisplayName);
    if(displayNameVal){
         userDisplayErrorMessage.style.display ='block';
        userDisplayErrorMessage.textContent = 'Please use an appropriate name.'
        firstNameTimer = setTimeout(()=>{
            userDisplayErrorMessage.style.display ='none';
            userDisplayErrorMessage.textContent = ''
        }, 3000);
    }

    const displayNameLength = userSetDisplayName.split('').length;
    if(displayNameLength>15){
        userDisplayErrorMessage.style.display ='block';
        userDisplayErrorMessage.textContent = 'Character limit exceeded.'
        firstNameTimer = setTimeout(()=>{
            userDisplayErrorMessage.style.display ='none';
            userDisplayErrorMessage.textContent = ''
        }, 3000);
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
            points: 0,
            likedPosts: [],
            eventsCompleted: []
        }

    localStorage.setItem('userinfo', JSON.stringify(userInfo))
    localStorage.setItem('currentUser', JSON.stringify(userSetEmail))
    window.location.href ='profile.html'

})