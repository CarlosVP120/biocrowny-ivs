// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAESaDKqgD7JMWpcmi5l7MVnN7rqfO9gOY",
  authDomain: "innovacrown.firebaseapp.com",
  projectId: "innovacrown",
  storageBucket: "innovacrown.firebasestorage.app",
  messagingSenderId: "151239666277",
  appId: "1:151239666277:android:0043a4d5587f6a69edb48c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Enable better error messages in development
if (__DEV__) {
  console.log('Running in development mode');
}

export { app, db, auth }; 