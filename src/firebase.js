import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA0WAYUl8_c-cOKVBjIC7VoF1NIC3Hj7wQ",
  authDomain: "moneymoney-6b5c5.firebaseapp.com",
  projectId: "moneymoney-6b5c5",
  storageBucket: "moneymoney-6b5c5.firebasestorage.app",
  messagingSenderId: "224032486343",
  appId: "1:224032486343:web:30221d1431705ededa5fe2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export { signInWithPopup, signOut };
