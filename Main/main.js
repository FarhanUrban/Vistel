// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyATeHhyq9ryFp8qq2oL6QJXPrV7w0-VTKs",
  authDomain: "vislet.firebaseapp.com",
  projectId: "vislet",
  storageBucket: "vislet.firebasestorage.app",
  messagingSenderId: "1025110798524",
  appId: "1:1025110798524:web:826168ad74107e5498e0b9",
  measurementId: "G-VHLF3QK8EQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);