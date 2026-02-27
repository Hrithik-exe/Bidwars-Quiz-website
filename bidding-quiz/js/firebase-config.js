/**
 * Firebase Configuration Module
 * 
 * This module initializes Firebase and exports the database reference
 * for use throughout the application.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

/**
 * Firebase project configuration object
 */
export const firebaseConfig = {
  apiKey: "AIzaSyCjYfqERV57gK88hrOr0nXybXikeTsVhHw",
  authDomain: "bidding-quiz.firebaseapp.com",
  databaseURL: "https://bidding-quiz-default-rtdb.firebaseio.com",
  projectId: "bidding-quiz",
  storageBucket: "bidding-quiz.firebasestorage.app",
  messagingSenderId: "610423723805",
  appId: "1:610423723805:web:ec8f9b95c747742fcbf3f4",
  measurementId: "G-GYZ88NX0GE"
};

/**
 * Initialize Firebase app with the configuration
 */
const app = initializeApp(firebaseConfig);

/**
 * Get Firebase Realtime Database reference
 * This is the main interface for reading and writing data
 */
export const db = getDatabase(app);

console.log('Firebase initialized successfully');
