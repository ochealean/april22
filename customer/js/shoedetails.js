import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Firebase Config
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
const auth = getAuth(app);

// HTML Elements
const productName = document.getElementById("productName");
const productShop = document.getElementById("productShop");
const productCode = document.getElementById("productCode");
const productPrice = document.getElementById("productPrice");
const productDescription = document.getElementById("productDescription");
const quantitySelector = document.getElementById("quantitySelector");
const variantOptions = document.getElementById("variantOptions");
const colorOptions = document.getElementById("colorOptions");
const sizeOptions = document.getElementById("sizeOptions");
const wishlistBtn = document.getElementById("wishlistBtn");
const mainProductImage = document.getElementById("mainProductImage");
const reviewsList = document.getElementById("reviewsContainer"); 

// URL Params
const urlParams = new URLSearchParams(window.location.search);
const shoeID = urlParams.get('shoeID');
const shopID = urlParams.get('shopID');

let productData = {};
let selectedVariantKey = null;

// Load product data
function loadProductDetails() {
    const shoeRef = ref(db, `AR_shoe_users/shoe/${shopID}/${shoeID}`);

    get(shoeRef).then(snapshot => {
        if (snapshot.exists()) {
            productData = snapshot.val();
            updateProductInfo();
            loadVariants();
            loadCustomerReviews();  // Load reviews after product details are fetched
        } else {
            console.log("Product not found.");
        }
    }).catch(error => {
        console.error("Error loading product details:", error);
    });
}

// Update general info
function updateProductInfo() {
    productName.textContent = productData.shoeName;
    productShop.textContent = `Shop Name: ${productData.shopName}`;
    productCode.textContent = `Product Code: ${shoeID}`;
    productDescription.textContent = productData.generalDescription || "No description available.";
    mainProductImage.src = productData.defaultImage || "";

    // Set initial variant if exists
    const variantKeys = Object.keys(productData.variants || {});
    if (variantKeys.length > 0) {
        selectedVariantKey = variantKeys[0];
        updatePriceAndSizes(selectedVariantKey);
    }
}

// Load color variants
function loadVariants() {
    colorOptions.innerHTML = '';
    sizeOptions.innerHTML = '';

    const variants = productData.variants;
    if (!variants) return;

    for (const variantKey in variants) {
        const variant = variants[variantKey];
        const btn = document.createElement("button");
        btn.textContent = variant.color;
        btn.addEventListener("click", () => {
            selectedVariantKey = variantKey;
            mainProductImage.src = variant.imageUrl || productData.defaultImage || "";
            updatePriceAndSizes(variantKey);
        });
        colorOptions.appendChild(btn);
    }
}

// Update price and sizes when variant is selected
function updatePriceAndSizes(variantKey) {
    const variant = productData.variants[variantKey];
    productPrice.textContent = `₱${variant.price}`;

    sizeOptions.innerHTML = '';

    console.log("variant.sizes:", variant.sizes);

    for (const sizeKey in variant.sizes) {
        const stock = typeof variant.sizes[sizeKey] === 'object' ? variant.sizes[sizeKey].stock : variant.sizes[sizeKey];
        const btn = document.createElement("button");
        btn.textContent = `${sizeKey} (${stock} left)`;
        sizeOptions.appendChild(btn);
    }
    
}

// Load customer reviews from Firebase
function loadCustomerReviews() {
    const feedbackRef = ref(db, `AR_shoe_users/feedbacks`);

    get(feedbackRef).then(snapshot => {
        if (snapshot.exists()) {
            const feedbacks = snapshot.val();
            displayReviews(feedbacks);
        } else {
            reviewsList.innerHTML = "<p>No reviews yet.</p>";
        }
    }).catch(error => {
        console.error("Error loading reviews:", error);
        reviewsList.innerHTML = "<p>Failed to load reviews. Please try again later.</p>";
    });
}

function getCustomernameUsingID(userID) {
    const userRef = ref(db, `AR_shoe_users/customer/${userID}`);
    return get(userRef).then(snapshot => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            return `${userData.firstName} ${userData.lastName}` || "Anonymous User";  // Return display name or default to "Anonymous User"
        } else {
            return "Anonymous User";  // Default if user not found
        }
    }).catch(error => {
        console.error("Error fetching user data:", error);
        return "Anonymous User";  // Default if error occurs
    });
}

// Display reviews on the page
async function displayReviews(feedbacks) {
    if (reviewsList) reviewsList.innerHTML = '';
    
    // First collect all reviews we need to display
    const reviewsToDisplay = [];
    
    for (const userId in feedbacks) {
        for (const orderID in feedbacks[userId]) {
            const feedback = feedbacks[userId][orderID];
            if (feedback.shoeID === shoeID) {
                reviewsToDisplay.push({
                    userId,
                    feedback
                });
            }
        }
    }

    // If no reviews, show message
    if (reviewsToDisplay.length === 0) {
        reviewsList.innerHTML = "<p>No reviews yet.</p>";
        return;
    }

    // Process each review asynchronously
    for (const review of reviewsToDisplay) {
        try {
            // Await the username lookup
            const username = await getCustomernameUsingID(review.userId);
            // Create review element
            const reviewDiv = document.createElement("div");
            reviewDiv.classList.add("review");

            // Create rating stars
            const starDiv = document.createElement("div");
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement("span");
                star.classList.add("star");
                star.textContent = i <= review.feedback.rating ? "★" : "☆";
                starDiv.appendChild(star);
            }

            // Review content
            const commentDiv = document.createElement("p");
            commentDiv.textContent = review.feedback.comment || "No comment provided.";
            
            const reviewerDiv = document.createElement("p");
            reviewerDiv.textContent = `Reviewed by: ${username}`;

            // Append elements
            reviewDiv.appendChild(starDiv);
            reviewDiv.appendChild(commentDiv);
            reviewDiv.appendChild(reviewerDiv);

            reviewsList.appendChild(reviewDiv);
            
        } catch (error) {
            console.error("Error processing review:", error);
            // Optionally show an error message for this review
        }
    }
}

// Wishlist toggle
wishlistBtn.addEventListener("click", () => {
    console.log("Wishlist clicked");
});

// Logout
document.getElementById("logout_btn").addEventListener("click", function () {
    auth.signOut().then(() => {
        window.location.href = "/customer/html/user_login.html";
    }).catch(error => {
        console.error("Error during logout:", error);
    });
});

// Start
loadProductDetails();
