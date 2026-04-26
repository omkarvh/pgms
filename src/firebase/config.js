import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD39mnvd4np6q9BebjJj4eUh-nRWzhFGjo",
  authDomain: "pgms-b14a4.firebaseapp.com",
  projectId: "pgms-b14a4",
  storageBucket: "pgms-b14a4.firebasestorage.app",
  messagingSenderId: "532010508283",
  appId: "1:532010508283:web:fd5422337f614875bb755e",
  measurementId: "G-6XFH1MTJ6X"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();