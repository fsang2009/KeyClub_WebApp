// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCyPj8KHyiWP1Laek-ZB9DCkqRoLoiNs5M",
  authDomain: "keyclubwebapp.firebaseapp.com",
  projectId: "keyclubwebapp",
  storageBucket: "keyclubwebapp.firebasestorage.app",
  messagingSenderId: "327297064989",
  appId: "1:327297064989:web:0168a5ceca79cff4bde6f4",
  measurementId: "G-MBPNLYRFWY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);