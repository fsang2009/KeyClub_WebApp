PATCH 12 - PRODUCTION BUILD / FIREBASE HOSTING FIX

Why this is needed:
Localhost uses Vite, which resolves imports like "firebase/auth".
Firebase Hosting was serving the raw source folder directly, so browsers on the live domain could not resolve those package imports.

Files:
- vite.config.js: builds every HTML page in this multi-page app.
- firebase.json: deploys the Vite-built dist folder and sends the root URL to landingpage.html.

After copying these two files to the project root:
1. npm run build
2. firebase deploy --only hosting

Do not deploy the project root directly anymore. Firebase Hosting should publish dist/.
