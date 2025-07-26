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
    try {
        const stars = document.querySelectorAll('.star');
        const ratingValue = document.getElementById('ratingValue');
        const feedbackForm = document.getElementById('feedbackForm');
        const submitBtn = document.getElementById('submitBtn');
        const loader = document.getElementById('loader');
        const successMessage = document.getElementById('successMessage');
        const existingFeedbackSection = document.getElementById('existingFeedback');
        const existingStarRating = document.getElementById('existingStarRating');
        const existingComment = document.getElementById('existingComment');
        const editReviewBtn = document.getElementById('editReviewBtn');

        const urlParams = new URLSearchParams(window.location.search);
        const orderID = urlParams.get("orderId");
        const userID = urlParams.get("userId");

        if (!orderID || !userID) {
            alert("Missing order or user information");
            window.location.href = "/";
            return;
        }

        const orderRef = ref(db, `AR_shoe_users/transactions/${userID}/${orderID}`);
        const orderSnapshot = await get(orderRef);

        if (!orderSnapshot.exists()) {
            alert("Order not found.");
            return;
        }

        const orderData = orderSnapshot.val();

        // Fill shoe details
        document.getElementById('shoeImage').src = orderData.item.imageUrl;
        document.getElementById('shoeName').textContent = orderData.item.name;
        document.getElementById('shoeId').textContent = `Product ID: ${orderData.item.shoeId}`;
        document.getElementById('shopName').textContent = `From: ${orderData.item.shopName || 'Unknown Shop'}`;

        // Handle user auth state
        onAuthStateChanged(auth, user => {
            const userNameElement = document.getElementById('userName_display2');
            const userImageElement = document.getElementById('imageProfile');

            if (user) {
                userNameElement.textContent = user.displayName || "Guest User";
                userImageElement.src = user.photoURL || "/images/default-profile.jpg";
            } else {
                userNameElement.textContent = "Guest User";
                userImageElement.src = "/images/default-profile.jpg";
            }
        });

        // Check for existing feedback (both in transactions and feedbacks collections)
        const reviewRef = ref(db, `AR_shoe_users/feedbacks/${userID}/${orderID}`);
        const reviewSnapshot = await get(reviewRef);

        // Use feedback from either transactions or feedbacks collection
        const existingFeedback = orderData.feedback || (reviewSnapshot.exists() ? reviewSnapshot.val() : null);

        // Function to update rating display
        const updateRatingDisplay = (stars, rating) => {
            stars.forEach((star, index) => {
                star.style.color = index < rating ? 'gold' : '#ccc';
            });
        };

        if (existingFeedback) {
            // Existing feedback handling
            let currentRating = existingFeedback.rating;
            let currentComment = existingFeedback.comment || 'No comment provided';

            // Show existing feedback section
            existingFeedbackSection.style.display = 'block';
            feedbackForm.style.display = 'none';

            // Get all star elements in both sections
            const existingStars = existingStarRating.querySelectorAll('.fa-star');
            
            // Initialize rating display
            updateRatingDisplay(existingStars, currentRating);
            
            // Display existing comment
            existingComment.textContent = currentComment;

            // Make existing stars interactive
            existingStars.forEach((star, index) => {
                star.style.cursor = 'pointer';
                star.dataset.rating = index + 1; // Add rating data attribute
                
                star.addEventListener('click', () => {
                    currentRating = index + 1;
                    updateRatingDisplay(existingStars, currentRating);
                    
                    // Update the hidden form value
                    ratingValue.value = currentRating;
                    
                    // Automatically save the new rating
                    saveUpdatedFeedback(currentRating, currentComment);
                });

                star.addEventListener('mouseover', () => {
                    if (existingFeedbackSection.style.display === 'block') {
                        for (let i = 0; i <= index; i++) {
                            existingStars[i].style.color = 'lightgray';
                        }
                    }
                });

                star.addEventListener('mouseout', () => {
                    if (existingFeedbackSection.style.display === 'block') {
                        updateRatingDisplay(existingStars, currentRating);
                    }
                });
            });

            // Set up edit button
            editReviewBtn.onclick = () => {
                existingFeedbackSection.style.display = 'none';
                feedbackForm.style.display = 'block';

                // Populate form with existing values
                ratingValue.value = currentRating;
                document.getElementById('comment').value = currentComment;

                // Highlight stars to match existing rating
                stars.forEach((star, index) => {
                    star.classList.toggle('active', index < currentRating);
                    star.style.color = index < currentRating ? 'gold' : '#ccc';
                });
            };
        } else {
            // New feedback handling
            existingFeedbackSection.style.display = 'none';
            feedbackForm.style.display = 'block';

            // Rating stars behavior
            stars.forEach(star => {
                star.addEventListener('click', function () {
                    const rating = parseInt(this.dataset.rating);
                    ratingValue.value = rating;
                    stars.forEach((s, i) => {
                        s.classList.toggle('active', i < rating);
                        s.style.color = i < rating ? 'gold' : '#ccc';
                    });
                });

                star.addEventListener('mouseover', function () {
                    if (ratingValue.value === '0') {
                        const hoverRating = parseInt(this.dataset.rating);
                        stars.forEach((s, i) => {
                            s.style.color = i < hoverRating ? 'lightgray' : '#ccc';
                        });
                    }
                });

                star.addEventListener('mouseout', function () {
                    const rating = parseInt(ratingValue.value);
                    stars.forEach((s, i) => {
                        s.style.color = i < rating ? 'gold' : '#ccc';
                    });
                });
            });
        }

        // Function to save updated feedback
        async function saveUpdatedFeedback(rating, comment) {
            try {
                const feedbackData = {
                    orderID,
                    shoeID: orderData.item.shoeId,
                    rating,
                    comment,
                    timestamp: Date.now()
                };

                // Update both collections separately
                const feedbackRef = ref(db, `AR_shoe_users/feedbacks/${userID}/${orderID}`);
                const transactionFeedbackRef = ref(db, `AR_shoe_users/transactions/${userID}/${orderID}/feedback`);

                await set(feedbackRef, feedbackData);
                await set(transactionFeedbackRef, feedbackData);

                // Show success message briefly
                successMessage.style.display = 'block';
                successMessage.textContent = "Rating updated!";
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 2000);

            } catch (error) {
                console.error("Error updating feedback:", error);
                alert("Failed to update rating. Please try again.");
            }
        }

        // Feedback submission (works for both new and edited reviews)
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

            try {
                const feedbackData = {
                    orderID,
                    shoeID: orderData.item.shoeId,
                    rating,
                    comment,
                    timestamp: Date.now()
                };

                // Update both collections separately
                const feedbackRef = ref(db, `AR_shoe_users/feedbacks/${userID}/${orderID}`);
                const transactionFeedbackRef = ref(db, `AR_shoe_users/transactions/${userID}/${orderID}/feedback`);

                await set(feedbackRef, feedbackData);
                await set(transactionFeedbackRef, feedbackData);

                loader.style.display = 'none';
                successMessage.style.display = 'block';
                successMessage.textContent = "Thank you for your feedback!";

                // Update the displayed feedback
                const existingStars = existingStarRating.querySelectorAll('.fa-star');
                updateRatingDisplay(existingStars, rating);
                existingComment.textContent = comment;

                // Switch to feedback display view
                feedbackForm.style.display = 'none';
                existingFeedbackSection.style.display = 'block';

                // Reset form state
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.querySelector('span').textContent = 'Submit Feedback';
                    successMessage.style.display = 'none';
                }, 3000);

            } catch (error) {
                console.error("Error submitting feedback:", error);
                alert("Failed to submit feedback. Please try again.");
                submitBtn.disabled = false;
                loader.style.display = 'none';
                submitBtn.querySelector('span').textContent = 'Submit Feedback';
            }
        });
    } catch (error) {
        console.error("Error initializing feedback form:", error);
        alert("An error occurred while loading the page.");
    }
});