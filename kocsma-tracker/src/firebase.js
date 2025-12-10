// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAkkRL35AJWNk0TA2rqEhV2M_RLp_z1fPk",
  authDomain: "kocsmap-b95df.firebaseapp.com",
  projectId: "kocsmap-b95df",
  storageBucket: "kocsmap-b95df.firebasestorage.app",
  messagingSenderId: "111749647188",
  appId: "1:111749647188:web:0c7df9b04d5182190316c1",
  measurementId: "G-Y5DVKNRJPN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);