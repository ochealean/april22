import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase configuration
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
const app = initializeApp(firebaseConfig);

// Get Firebase services
const db = getDatabase(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", async () => {
    const stars = document.querySelectorAll('.star');
    const ratingValue = document.getElementById('ratingValue');
    const feedbackForm = document.getElementById('feedbackForm');
    const submitBtn = document.getElementById('submitBtn');
    const loader = document.getElementById('loader');
    const successMessage = document.getElementById('successMessage');

    const urlParams = new URLSearchParams(window.location.search);
    const orderID = urlParams.get("orderId");
    const userID = urlParams.get("userId");
    if (!orderID) {
        alert("Missing order ID");
        return;
    }

    const orderRef = ref(db, `AR_shoe_users/transactions/${userID}/${orderID}`);
    const snapshot = await get(orderRef);

    if (!snapshot.exists()) {
        alert("Order not found.");
        return;
    }

    const orderData = snapshot.val();
    console.log(orderData);

    // Fill shoe details
    document.getElementById('shoeImage').src = orderData.item.imageUrl;
    document.getElementById('shoeName').textContent = orderData.item.name;
    document.getElementById('shoeId').textContent = `Product ID: ${orderData.item.shoeID}`;
    document.getElementById('shopName').textContent = `From: ${orderData.item.shopName}`;

    // Get the authenticated user
    onAuthStateChanged(auth, user => {
        if (user) {
            document.getElementById('userName_display2').textContent = user.displayName || "Guest User";
            document.getElementById('imageProfile').src = user.photoURL || "https://example.com/default-profile.jpg";
        } else {
            document.getElementById('userName_display2').textContent = "Guest User";
            document.getElementById('imageProfile').src = "https://example.com/default-profile.jpg";
        }
    });

    // Rating stars behavior
    stars.forEach(star => {
        star.addEventListener('click', function () {
            const rating = parseInt(this.dataset.rating);
            ratingValue.value = rating;
            stars.forEach((s, i) => s.classList.toggle('active', i < rating));
        });

        star.addEventListener('mouseover', function () {
            const hoverRating = parseInt(this.dataset.rating);
            stars.forEach((s, i) => {
                s.style.color = i < hoverRating ? 'var(--star-color)' : '#ccc';
            });
        });

        star.addEventListener('mouseout', function () {
            const rating = parseInt(ratingValue.value);
            stars.forEach((s, i) => {
                s.style.color = i < rating ? 'var(--star-color)' : '#ccc';
            });
        });
    });

    // Feedback submission
    feedbackForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const rating = parseInt(ratingValue.value);
        const comment = document.getElementById('comment').value;

        if (rating === 0) {
            alert("Please select a rating.");
            return;
        }

        submitBtn.disabled = true;
        loader.style.display = 'block';
        submitBtn.querySelector('span').textContent = 'Submitting...';

        const feedbackData = {
            orderID: userID,
            shoeID: orderID,
            rating,
            comment,
            timestamp: Date.now()
        };

        const feedbackRef = ref(db, `AR_shoe_users/feedbacks/${userID}/${orderID}`);
        await set(feedbackRef, feedbackData);

        loader.style.display = 'none';
        submitBtn.style.display = 'none';
        successMessage.style.display = 'block';

        setTimeout(() => {
            feedbackForm.reset();
            ratingValue.value = '0';
            stars.forEach(s => s.classList.remove('active'));
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = 'Submit Feedback';
            submitBtn.style.display = 'flex';
            successMessage.style.display = 'none';
        }, 3000);
    });
});
