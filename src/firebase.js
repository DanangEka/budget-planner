// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Ganti ini dengan konfigurasi Firebase milikmu (bisa dilihat di Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyCrePOJBBueOOLzu2MGz3z6R7jPct6fjDI",
  authDomain: "budget-planner-860ac.firebaseapp.com",
  projectId: "budget-planner-860ac",
  storageBucket: "budget-planner-860ac.appspot.com",
  messagingSenderId: "620002445386",
  appId: "1:620002445386:web:be228ff07fd63640d3feb3",
  measurementId: "G-LXNCQEZRFX"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);

export { analytics };
