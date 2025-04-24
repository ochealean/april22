import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAuPALylh11cTArigeGJZmLwrFwoAsNPSI",
    authDomain: "opportunity-9d3bf.firebaseapp.com",
    databaseURL: "https://opportunity-9d3bf-default-rtdb.firebaseio.com",
    projectId: "opportunity-9d3bf",
    storageBucket: "opportunity-9d3bf.appspot.com",
    messagingSenderId: "57906230058",
    appId: "1:57906230058:web:2d7cd9cc68354722536453",
    measurementId: "G-QC2JSR1FJW"
};

// Initialize Firebase
let app;
try {
    app = getApp();
} catch (e) {
    app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);
const db = getDatabase(app);

// Login form handler
document.getElementById('employeeLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('employeeEmail').value.trim();
    const password = document.getElementById('employeePassword').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Check if the user is an employee
        const snapshot = await get(child(ref(db), `AR_shoe_users/employees/${uid}`));
        if (snapshot.exists()) {
            // Employee found
            alert("Login successful!");
            window.location.href = '/shopowner/html/shop_dashboard.html'; // change to your actual employee dashboard
        } else {
            throw new Error("Not registered as an employee.");
        }
    } catch (error) {
        document.getElementById('errorMessage').textContent = error.message;
        console.error("Login failed:", error);
    }
});
