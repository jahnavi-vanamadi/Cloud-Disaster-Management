
/* ResQCloud Firebase initialization — Compat SDK */

const firebaseConfig = {
    apiKey: "AIzaSyCMgbjLMHVZLEL_8T8hC3S_9hkJ3IVWYUI",
    authDomain: "resqcloud-3e809.firebaseapp.com",
    projectId: "resqcloud-3e809",
    storageBucket: "resqcloud-3e809.firebasestorage.app",
    messagingSenderId: "365277735223",
    appId: "1:365277735223:web:7ccf34f5f9854c7b47d2b2"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.db = firebase.firestore();
window.auth = firebase.auth();
