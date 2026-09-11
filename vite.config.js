import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      // This is a multi-page app. Vite needs to build every HTML page we deploy,
      // not just index.html.
      input: [
        resolve(__dirname, "landingpage.html"),
        resolve(__dirname, "index.html"),
        resolve(__dirname, "login.html"),
        resolve(__dirname, "signup.html"),
        resolve(__dirname, "profile.html"),
        resolve(__dirname, "events.html"),
        resolve(__dirname, "calendar.html"),
        resolve(__dirname, "admin.html"),
        resolve(__dirname, "leaderboard.html"),
        resolve(__dirname, "studentlist.html"),
        resolve(__dirname, "settings.html"),
        resolve(__dirname, "404.html")
      ]
    }
  }
});
