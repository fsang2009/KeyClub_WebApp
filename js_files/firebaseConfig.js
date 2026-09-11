import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCyPj8KHyiWP1Laek-ZB9DCkqRoLoiNs5M",
  authDomain: "keyclubwebapp.firebaseapp.com",
  projectId: "keyclubwebapp",
  storageBucket: "keyclubwebapp.firebasestorage.app",
  messagingSenderId: "327297064989",
  appId: "1:327297064989:web:0168a5ceca79cff4bde6f4",
  measurementId: "G-MBPNLYRFWY"
};

// Keep Firebase setup in one place so the rest of the app can reuse it.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getFirestore(app);

export { auth, database };
