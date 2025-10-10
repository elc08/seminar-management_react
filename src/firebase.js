import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDgh07fnSZQK2DQF09KX1Lo-XsSFskCUIg",
  authDomain: "collab-seminar-management.firebaseapp.com",
  projectId: "collab-seminar-management",
  storageBucket: "collab-seminar-management.firebasestorage.app",
  messagingSenderId: "617828236719",
  appId: "1:617828236719:web:c42653daa123bdd4f2835a",
  measurementId: "G-RW83N0FPKB"
};
  
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
