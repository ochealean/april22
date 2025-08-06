import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
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

let cursedWords = []; // This will store our censored words from Firebase

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // First load the censored words
        await loadCensoredWords();
        
        const stars = document.querySelectorAll('#starRating .star');
        const ratingValue = document.getElementById('ratingValue');
        const feedbackForm = document.getElementById('feedbackForm');
        const submitBtn = document.getElementById('submitBtn');
        const loader = document.getElementById('loader');
        const successMessage = document.getElementById('successMessage');
        const existingFeedbackSection = document.getElementById('existingFeedback');
        const existingStarRating = document.getElementById('existingStarRating');
        const existingStars = existingStarRating.querySelectorAll('.fa-star');
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

        // Check for existing feedback
        const reviewRef = ref(db, `AR_shoe_users/feedbacks/${userID}/${orderID}`);
        const reviewSnapshot = await get(reviewRef);

        const existingFeedback = orderData.feedback || (reviewSnapshot.exists() ? reviewSnapshot.val() : null);

        // Function to update rating display
        const updateRatingDisplay = (stars, rating) => {
            stars.forEach((star, index) => {
                star.style.color = index < rating ? 'gold' : '#ccc';
            });
        };

        // Function to make stars interactive
        const makeStarsInteractive = (stars, ratingVar, isExisting = false) => {
            stars.forEach((star, index) => {
                star.style.cursor = 'pointer';

                star.addEventListener('click', (e) => {
                    if (isExisting) e.stopPropagation();
                    ratingVar = index + 1;
                    updateRatingDisplay(stars, ratingVar);
                    if (!isExisting) ratingValue.value = ratingVar;
                    else saveUpdatedFeedback(ratingVar, existingComment.textContent);
                });

                star.addEventListener('mouseover', () => {
                    stars.forEach((s, i) => {
                        s.style.color = i <= index ? 'lightgray' : '#ccc';
                    });
                });

                star.addEventListener('mouseout', () => {
                    updateRatingDisplay(stars, ratingVar);
                });
            });
        };

        // Function to save updated feedback
        async function saveUpdatedFeedback(rating, comment) {
            try {
                const feedbackData = {
                    orderID,
                    shoeID: orderData.item.shoeId,
                    rating,
                    comment: censorText(comment), // Censor the comment before saving
                    timestamp: Date.now()
                };

                const feedbackRef = ref(db, `AR_shoe_users/feedbacks/${userID}/${orderID}`);
                const transactionFeedbackRef = ref(db, `AR_shoe_users/transactions/${userID}/${orderID}/feedback`);

                await set(feedbackRef, feedbackData);
                await set(transactionFeedbackRef, feedbackData);

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

        if (existingFeedback) {
            // Existing feedback handling
            let currentRating = existingFeedback.rating;
            let currentComment = existingFeedback.comment || 'No comment provided';

            existingFeedbackSection.style.display = 'block';
            feedbackForm.style.display = 'none';

            updateRatingDisplay(existingStars, currentRating);
            existingComment.textContent = currentComment;

            // Make existing stars interactive
            makeStarsInteractive(existingStars, currentRating, true);

            // Set up edit button
            editReviewBtn.onclick = () => {
                existingFeedbackSection.style.display = 'none';
                feedbackForm.style.display = 'block';

                ratingValue.value = currentRating;
                document.getElementById('comment').value = currentComment;
                updateRatingDisplay(stars, currentRating);

                // Make form stars interactive
                makeStarsInteractive(stars, currentRating);
            };
        } else {
            // New feedback handling
            existingFeedbackSection.style.display = 'none';
            feedbackForm.style.display = 'block';

            // Make form stars interactive
            makeStarsInteractive(stars, 0);
        }

        // Feedback submission
        feedbackForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const comment = document.getElementById('comment').value;
            
            if (checkForCursedWords(comment)) {
                alert("Your comment contains inappropriate language. Please revise it.");
                return;
            }

            const rating = parseInt(ratingValue.value);

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
                    comment: censorText(comment), // Censor the comment before saving
                    timestamp: Date.now()
                };

                const feedbackRef = ref(db, `AR_shoe_users/feedbacks/${userID}/${orderID}`);
                const transactionFeedbackRef = ref(db, `AR_shoe_users/transactions/${userID}/${orderID}/feedback`);

                await set(feedbackRef, feedbackData);
                await set(transactionFeedbackRef, feedbackData);

                loader.style.display = 'none';
                successMessage.style.display = 'block';
                successMessage.textContent = "Thank you for your feedback!";

                // Update the displayed feedback
                updateRatingDisplay(existingStars, rating);
                existingComment.textContent = feedbackData.comment; // Show censored version

                // Switch to feedback display view
                feedbackForm.style.display = 'none';
                existingFeedbackSection.style.display = 'block';

                // Make existing stars interactive
                makeStarsInteractive(existingStars, rating, true);

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

function loadCensoredWords() {
    const curseWordsRef = ref(db, 'AR_shoe_users/curseWords');
    
    return new Promise((resolve) => {
        onValue(curseWordsRef, (snapshot) => {
            if (snapshot.exists()) {
                // Convert the object of words into an array
                const wordsObj = snapshot.val();
                cursedWords = Object.values(wordsObj).map(wordData => wordData.word.toLowerCase());
                console.log("Loaded censored words:", cursedWords);
            } else {
                console.log("No censored words found in database");
                cursedWords = []; // Reset to empty array if no words exist
            }
            resolve();
        }, (error) => {
            console.error("Error loading censored words:", error);
            cursedWords = []; // Fallback to empty array if error occurs
            resolve();
        });
    });
}

function checkForCursedWords(comment) {
    if (!comment || !cursedWords.length) return false;
    const lowerComment = comment.toLowerCase();
    return cursedWords.some(word => {
        // Create regex to match whole words only
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowerComment);
    });
}

function censorText(text) {
    if (!text || !cursedWords.length) return text;
    
    return text.split(/\b/).map(word => {
        // Check if the word (case insensitive) is in our cursed words list
        const isCursed = cursedWords.some(cursed => 
            word.toLowerCase() === cursed.toLowerCase()
        );
        
        // If it's a cursed word, replace all but first character with *
        if (isCursed) {
            return word.charAt(0) + '*'.repeat(word.length - 1);
        }
        return word;
    }).join('');
}