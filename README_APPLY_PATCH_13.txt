PATCH 13 - Vite public assets fix

Why this is needed:
Vite only copies files in public/ to dist/ unchanged. The profile avatars are chosen dynamically in JavaScript, so Vite cannot discover/rewrite those paths during build.

Apply:
1. Copy the public folder from this patch into the root of KeyClub_WebApp (same level as package.json).
2. Keep your existing root assets folder; do not delete it yet.
3. Run: npm run build
4. Confirm dist/assets/images/profiles/avatar1.png exists.
5. Run: firebase deploy --only hosting
6. Hard refresh the site (Ctrl+Shift+R).

No Firestore changes are needed. Existing profileImage values keep working.
