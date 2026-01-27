// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBu3-PVLRzBTUr1hRtVyfdGUNtmHtH6dKA",
  authDomain: "web-blog-c753e.firebaseapp.com",
  projectId: "web-blog-c753e",
  storageBucket: "web-blog-c753e.firebasestorage.app",
  messagingSenderId: "198710672936",
  appId: "1:198710672936:web:6daac34add3ef15ab1ff1d",
  measurementId: "G-T3XL4RCMKT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Cloudinary Config
const cloudinaryConfig = {
  cloudName: "dzppvmhyt",
  uploadPreset: "vietshare_blog"
};

// Export for use in other modules
export { 
  app, 
  analytics, 
  db, 
  auth, 
  cloudinaryConfig,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
