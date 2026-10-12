import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const firebaseConfig = {
apiKey: "AIzaSyCMgbjLMHVZLEL_8T8hC3S_9hkJ3IVWYUI",
authDomain: "resqcloud-3e809.firebaseapp.com",
projectId: "resqcloud-3e809",
storageBucket: "resqcloud-3e809.firebasestorage.app",
messagingSenderId: "365277735223",
appId: "1:365277735223:web:7ccf34f5f9854c7b47d2b2"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
