// src/config.js
// ⚠️ 이 파일은 .gitignore에 추가하세요!

const CONFIG = {
  API_BASE_URL: 'http://localhost:8080/api',
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyA7h3UhjppVBmK9lZtZ9zCV-wGiqDmScsc",
    authDomain: "plandata-638f6.firebaseapp.com",
    projectId: "plandata-638f6",
    storageBucket: "plandata-638f6.firebasestorage.app",
    messagingSenderId: "455733315394",
    appId: "1:455733315394:web:7fcec6801447335e4baadb",
    measurementId: "G-CVJJGMHFG6"
  }
};

// Firebase 초기화 (CDN 방식)
firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
const db = firebase.firestore();
const auth = firebase.auth();