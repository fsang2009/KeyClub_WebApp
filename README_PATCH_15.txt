PATCH 15 — EVENT MEMBER LIMITS + SHIFTS

Replace these files in your main KeyConnect project:
- events.html
- js_files/events.js
- css_files/events.css
- firestore.rules

Then run:
1. firebase deploy --only firestore:rules
2. npm run build
3. firebase deploy --only hosting

WHAT THIS ADDS
- Optional overall member limit for internal KeyConnect signups.
- Unlimited shifts per event.
- Each shift has a role, start time, end time, and number of slots.
- Members can choose more than one shift.
- Shift and overall capacity are checked with Firestore transactions.
- Everyone signed in can see the signup roster and which members are in each shift.
- Members can update their shift choices or cancel their signup.
- External-link events do not use KeyConnect limits/shifts and still show only the outside signup link.
- Once the first member signs up, the event's signup configuration is locked. Admins can still edit the event title/date/location/description, but cannot change the limit/shifts/external signup mode and strand existing registrations.

QUICK TEST
- Admin: create an internal event with a member limit and 2+ shifts.
- Member: choose one or multiple shifts and save.
- Confirm the member appears in the public roster under the correct shift(s).
- Fill a shift and confirm another member sees it as full/disabled.
- Cancel and confirm the slot becomes available again.
- Admin: create an event with an external URL and confirm member limit/shift controls disappear and members only get the organization signup link.
