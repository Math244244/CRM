// Import Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDBFGDo2IEpSUqHNCxwZWBAUZxa8Lq5VpE",
  authDomain: "crm-dealer-mathieu.firebaseapp.com",
  projectId: "crm-dealer-mathieu",
  storageBucket: "crm-dealer-mathieu.firebasestorage.app",
  messagingSenderId: "99774542996",
  appId: "1:99774542996:web:59457e2166c9646a54f081"
};

// Initialisation Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
