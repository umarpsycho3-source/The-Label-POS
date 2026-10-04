import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBuQ9NrQKgYSfbFOqXFwI5XGmXOA5M9AxI",
  authDomain: "the-label-pos.firebaseapp.com",
  projectId: "the-label-pos",
  storageBucket: "the-label-pos.firebasestorage.app",
  messagingSenderId: "1026686993909",
  appId: "1:1026686993909:web:afb76ef4d7cb44bec98cbc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
