import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDbS0szCRD7b0LN33KHBgElA8t9UPSMGVg",
  authDomain: "thelabelposdb.firebaseapp.com",
  projectId: "thelabelposdb",
  storageBucket: "thelabelposdb.firebasestorage.app",
  messagingSenderId: "940127204415",
  appId: "1:940127204415:web:45be4b9545b9ac6f5748a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
