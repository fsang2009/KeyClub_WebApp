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