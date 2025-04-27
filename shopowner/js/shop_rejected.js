import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAuPALylh11cTArigeGJZmLwrFwoAsNPSI",
    authDomain: "opportunity-9d3bf.firebaseapp.com",
    databaseURL: "https://opportunity-9d3bf-default-rtdb.firebaseio.com",
    projectId: "opportunity-9d3bf",
    storageBucket: "opportunity-9d3bf.firebasestorage.app",
    messagingSenderId: "57906230058",
    appId: "1:57906230058:web:2d7cd9cc68354722536453",
    measurementId: "G-QC2JSR1FJW"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('userId');
    const shopId = localStorage.getItem('shopId');
    const reapplyBtn = document.getElementById('reapplyBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const reasonsList = document.getElementById('rejectionReasonsList');

    const params = new URLSearchParams(window.location.search);
    const shop_ID = params.get("shopID"); // di mo na need local storage

    // if (!userId || !shopId) {
    //     window.location.href = '/user_login.html';
    //     // walang ganyan
    //     // window.location.href = '/shopowner/html/shopowner_login.html';
    //     return;
    // }

    // Load rejection reasons

    // try mong balik sa shopId na local storage mo yung shop_ID na nilagay ko para makita mo difference
    const shopRef = ref(db, `AR_shoe_users/shop/${shop_ID}`);
    onValue(shopRef, (snapshot) => {
        if (snapshot.exists()) {
            const shop = snapshot.val();
            const rejectionReason = shop.rejectionReason || "No specific reason provided";

            // Split reasons by newlines or bullet points
            const reasons = rejectionReason.split('\n').filter(r => r.trim() !== '');

            if (reasons.length === 0) {
                reasons.push("No specific reason provided");
            }

            reasonsList.innerHTML = reasons.map(reason =>
                `<li>${reason.trim()}</li>`
            ).join('');
        }
    });

    // Reapply button
    reapplyBtn.addEventListener('click', () => {
        // Redirect to registration page with shop ID for editing
        // window.location.href = `/shopowner/html/shop_reapply.html?shopId=${shopId}&reapply=true`;
        window.location.href = `/shopowner/html/shop_reapply.html?shopID=${shop_ID}`;
    });

    // Logout button
    // logoutBtn.addEventListener('click', () => {
    //     signOut(auth).then(() => {
    //         localStorage.removeItem('userId');
    //         localStorage.removeItem('shopId');
    //         localStorage.removeItem('userRole');
    //         window.location.href = '/shopowner/html/shopowner_login.html';
    //     }).catch((error) => {
    //         console.error("Logout error:", error);
    //     });
    // });
});