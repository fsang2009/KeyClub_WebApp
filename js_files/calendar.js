/*  rather than statically hardcoding our calendar, it is much 
more efficient, advantageous, and feasible if we render it using
our javascript. hardcoding would result in requiring constant
updates, accounting for leap years and such. 

Step 1. using new Date() (which is a method that can find 
the date, hour, time, day, month, year, etc. of TODAY.)
, i will set a variable (like 'today') 
to create an instance of the method. 

Step 2. using our new today instance, we can find our current year,
current date, etc.

Step 3. We will create a renderCalendar() function. 
we will use today.getMonth() and today.getDay() 

Step 4. create an array of the months of the year (getMonth() 
starts at index 0, so january is 0 , december is 11)

Step 5. idfk just start on it
*/
const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
]


const calendarGrid = document.querySelector('.calendar-grid');
//Get all days in a month

const currentDateInfo = new Date()
// Render Calendar function 
const renderCalendar =(month, year)=>{
const firstDayofMonth = new Date(year, month, 1).getDay();
const daysInMonth = new Date(year, month + 1, 0).getDate();
const daysInPrevMonth = new Date(year, month, 0).getDate();
console.log(firstDayofMonth)
let dateCell = ''
const fillInCellDates = daysInPrevMonth - firstDayofMonth + 1

for(d=fillInCellDates; d<=daysInPrevMonth; d++){
    dateCell +=`
    <div class="calendar-day outside-month">
                        <span class="day-number">${d}</span>
                    </div>
    `
}
    for(i=1; i <= daysInMonth; i++){
        
        dateCell +=`<div class="calendar-day">
                        <span class="day-number">${i}</span>
                    </div>`
    }

    calendarGrid.innerHTML = dateCell
}



const currentMonth = currentDateInfo.getMonth();
const currentYear = currentDateInfo.getFullYear();
renderCalendar(currentMonth, currentYear);


// Change as we move forward in months

const previousMonthButton = document.querySelector('#previousMonth');
const forwardMonthButton = document.querySelector('#nextMonth');

previousMonthButton.addEventListener('click',()=>{


})
    