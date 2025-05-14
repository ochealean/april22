import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, set, push, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

// Product state
let selectedColor = null;
let selectedSize = null;
let maxAvailableQty = 1;
let productData = {};
let selectedVariantKey = null;
let productVariants = [];

// HTML Elements
const productName = document.getElementById("productName");
const productShop = document.getElementById("productShop");
const productCode = document.getElementById("productCode");
const productPrice = document.getElementById("productPrice");
const productDescription = document.getElementById("productDescription");
const quantitySelector = document.getElementById("quantitySelector");
const variantDisplay = document.getElementById("variantDisplay");
const wishlistBtn = document.getElementById("wishlistBtn");
const mainProductImage = document.getElementById("mainProductImage");
const reviewsList = document.getElementById("reviewsContainer");

// URL Params
const urlParams = new URLSearchParams(window.location.search);
const shoeID = urlParams.get('shoeID');
const shopID = urlParams.get('shopID');

// Initialize the page
onAuthStateChanged(auth, (user) => {
    if (user) {
        verifyUserAccount(user.uid);
        setupRealtimeListeners();
    } else {
        window.location.href = "/user_login.html";
    }
});

// Utility Functions
function verifyUserAccount(userId) {
    get(ref(db, `AR_shoe_users/customer/${userId}`))
        .then((snapshot) => {
            if (!snapshot.exists()) {
                alert("Account does not exist");
                auth.signOut();
            }
        });
}

function setupRealtimeListeners() {
    // Product data listener
    const shoeRef = ref(db, `AR_shoe_users/shoe/${shopID}/${shoeID}`);
    onValue(shoeRef, (snapshot) => {
        if (snapshot.exists()) {
            productData = snapshot.val();
            updateProductInfo();
            loadVariants();
            updateSelectedVariant();
            setupWishlistButton(); // Add this line
        } else {
            console.log("Product not found.");
        }
    });

    // Reviews listener
    const feedbackRef = ref(db, `AR_shoe_users/feedbacks`);
    onValue(feedbackRef, (snapshot) => {
        if (snapshot.exists()) {
            displayReviews(snapshot.val());
        } else {
            reviewsList.innerHTML = "<p>No reviews yet.</p>";
        }
    });
}

function updateProductInfo() {
    productName.textContent = productData.shoeName;
    productShop.textContent = `Shop: ${productData.shopName}`;
    productCode.textContent = `Product Code: ${shoeID}`;
    productDescription.textContent = productData.generalDescription || "No description available.";
    mainProductImage.src = productData.defaultImage || "";

    // Initialize variants array from product data
    productVariants = Object.entries(productData.variants || {}).map(([key, variant]) => ({
        ...variant,
        key
    }));

    displayVariantButtons();
}

function loadVariants() {
    if (!productData.variants) return;

    // Set the first variant as selected if none is selected
    if (!selectedVariantKey) {
        const variantKeys = Object.keys(productData.variants);
        if (variantKeys.length > 0) {
            selectedVariantKey = variantKeys[0];
        }
    }
}

function updateSelectedVariant() {
    if (selectedVariantKey && productData.variants[selectedVariantKey]) {
        const variant = productData.variants[selectedVariantKey];
        productPrice.textContent = `₱${variant.price}`;
        mainProductImage.src = variant.imageUrl || productData.defaultImage || "";

        // Update selected size if it still exists
        if (selectedSize) {
            const sizeExists = Object.values(variant.sizes).some(sizeObj =>
                Object.keys(sizeObj)[0] === selectedSize
            );
            if (!sizeExists) {
                selectedSize = null;
            }
        }

        updateButtonStates(selectedSize ? maxAvailableQty : 0);
    }
}

// Variant Button Functions
function displayVariantButtons() {
    variantDisplay.innerHTML = '';

    productVariants.forEach(variant => {
        Object.entries(variant.sizes).forEach(([sizeKey, sizeData]) => {
            const size = Object.keys(sizeData)[0];
            const stock = sizeData[size].stock;
            const isSelected = variant.key === selectedVariantKey && size === selectedSize;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = `variant-btn ${isSelected ? 'selected' : ''} ${stock <= 0 ? 'out-of-stock' : ''}`;
            button.innerHTML = `
                        ${variant.color} ${size}(${stock})
                        ${stock <= 0 ? '<span class="stock-label">Out of stock</span>' : ''}
                    `;
            button.dataset.variantKey = variant.key;
            button.dataset.size = size;
            button.dataset.stock = stock;

            if (stock > 0) {
                button.onclick = () => selectVariant(variant.key, size, stock);
            }

            variantDisplay.appendChild(button);
        });
    });
}

function selectVariant(variantKey, size, stock) {
    selectedVariantKey = variantKey;
    selectedSize = size;
    maxAvailableQty = stock;

    // Update UI
    document.getElementById("quantity").max = stock;
    document.getElementById("quantity").value = 1;
    document.getElementById("availableStock").textContent = `Available: ${stock}`;

    // Update selected variant in product display
    const variant = productData.variants[variantKey];
    productPrice.textContent = `₱${variant.price}`;
    mainProductImage.src = variant.imageUrl || productData.defaultImage || "";

    // Update button states
    updateButtonStates(stock);
    displayVariantButtons(); // Refresh to show selected state
}

function updateButtonStates(stock) {
    const buyNowBtn = document.getElementById("buyNowBtn");
    const addToCartBtn = document.getElementById("addToCartBtn");

    if (stock <= 0 || !selectedSize) {
        buyNowBtn.disabled = true;
        addToCartBtn.disabled = true;
        buyNowBtn.classList.add("disabled");
        addToCartBtn.classList.add("disabled");
    } else {
        buyNowBtn.disabled = false;
        addToCartBtn.disabled = false;
        buyNowBtn.classList.remove("disabled");
        addToCartBtn.classList.remove("disabled");
    }
}

// Quantity Functions
function adjustQuantity(change) {
    const quantityInput = document.getElementById("quantity");
    let qty = parseInt(quantityInput.value) + change;
    qty = Math.max(1, Math.min(qty, maxAvailableQty));
    quantityInput.value = qty;
}

// Review Functions
async function displayReviews(feedbacks) {
    reviewsList.innerHTML = '<div class="loading">Loading reviews...</div>';

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const reviewsToDisplay = [];

    // Process feedbacks
    for (const userId in feedbacks) {
        for (const orderID in feedbacks[userId]) {
            const feedback = feedbacks[userId][orderID];
            if (feedback.shoeID === shoeID) {
                reviewsToDisplay.push({ userId, feedback });
                if (feedback.rating >= 1 && feedback.rating <= 5) {
                    ratingCounts[feedback.rating]++;
                }
            }
        }
    }

    updateRatingFilters(ratingCounts);

    if (reviewsToDisplay.length === 0) {
        reviewsList.innerHTML = "<p>No reviews yet.</p>";
        return;
    }

    // Display reviews
    reviewsList.innerHTML = '';
    for (const review of reviewsToDisplay) {
        try {
            const username = await getCustomerName(review.userId);
            const reviewElement = createReviewElement(username, review.feedback);
            reviewsList.appendChild(reviewElement);
        } catch (error) {
            console.error("Error processing review:", error);
        }
    }
}

async function getCustomerName(userId) {
    const userRef = ref(db, `AR_shoe_users/customer/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        const userData = snapshot.val();
        return `${userData.firstName} ${userData.lastName}` || "Anonymous User";
    }
    return "Anonymous User";
}

function createReviewElement(username, feedback) {
    const reviewDiv = document.createElement("div");
    reviewDiv.className = "review-item";
    reviewDiv.dataset.rating = feedback.rating;

    reviewDiv.innerHTML = `
                <div class="review-header">
                    <span class="review-author">${username}</span>
                    <span class="review-date">${formatTimestamp(feedback.timestamp)}</span>
                </div>
                <div class="review-stars">
                    ${'<i class="fas fa-star"></i>'.repeat(feedback.rating)}
                    ${'<i class="far fa-star"></i>'.repeat(5 - feedback.rating)}
                </div>
                <p>${feedback.comment || "No comment provided."}</p>
            `;

    return reviewDiv;
}

function updateRatingFilters(ratingCounts) {
    const filtersContainer = document.querySelector('.review-filters');
    if (!filtersContainer) return;

    const totalReviews = Object.values(ratingCounts).reduce((a, b) => a + b, 0);

    filtersContainer.innerHTML = `
                <div class="stars-filter active" data-rating="0" onclick="filterReviews(0)">
                    <div class="text">All Reviews (${totalReviews})</div>
                </div>
                ${[5, 4, 3, 2, 1].map(rating => `
                    <div class="stars-filter" data-rating="${rating}" onclick="filterReviews(${rating})">
                        <div class="stars">
                            ${'<i class="fas fa-star"></i>'.repeat(rating)}
                        </div>
                        <div class="text">${rating} Star${rating !== 1 ? 's' : ''} (${ratingCounts[rating]})</div>
                    </div>
                `).join('')}
            `;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Event Handlers
document.getElementById('logout_btn')?.addEventListener('click', () => {
    auth.signOut();
});

document.getElementById("quantity").addEventListener("change", function () {
    let qty = parseInt(this.value);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > maxAvailableQty) qty = maxAvailableQty;
    this.value = qty;
});

document.getElementById("buyNowBtn").addEventListener("click", handleBuyNow);
document.getElementById("addToCartBtn").addEventListener("click", handleAddToCart);

// Global functions
window.adjustQuantity = adjustQuantity;
window.filterReviews = filterReviews;

function filterReviews(rating) {
    const reviewItems = document.querySelectorAll('.review-item');
    const filters = document.querySelectorAll('.stars-filter');

    filters.forEach(filter => {
        filter.classList.toggle('active', parseInt(filter.dataset.rating) === rating);
    });

    reviewItems.forEach(item => {
        item.style.display = (rating === 0 || parseInt(item.dataset.rating) === rating) ? 'block' : 'none';
    });
}

async function handleBuyNow() {
    if (!validateSelection()) return;

    const variant = productData.variants[selectedVariantKey];
    const quantity = parseInt(document.getElementById("quantity").value) || 1;

    const params = new URLSearchParams({
        method: "buyNow",
        shopId: shopID,
        shoeId: shoeID,
        variantKey: selectedVariantKey,
        size: selectedSize,
        quantity: quantity,
        price: variant.price,
        shoeName: productData.shoeName,
        variantName: variant.variantName || "Standard",
        color: variant.color || "Default",
        image: variant.imageUrl || productData.defaultImage || "",
        shopName: productData.shopName || "Unknown Shop"
    });

    window.location.href = `/customer/html/checkout.html?${params.toString()}`;
}

async function handleAddToCart() {
    if (!validateSelection()) return;

    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

    const variant = productData.variants[selectedVariantKey];
    const quantity = parseInt(document.getElementById("quantity").value) || 1;

    const cartItem = {
        shopId: shopID,
        shoeId: shoeID,
        variantKey: selectedVariantKey,
        size: selectedSize,
        shoeName: productData.shoeName,
        variantName: variant.variantName || "",
        color: variant.color || "",
        price: variant.price,
        image: variant.imageUrl || productData.defaultImage || "",
        quantity: quantity,
        addedAt: new Date().toISOString()
    };

    try {
        const cartRef = ref(db, `AR_shoe_users/carts/${user.uid}/${generateId()}`);
        await set(cartRef, cartItem);
        alert("Item added to cart successfully!");
    } catch (error) {
        console.error("Error adding to cart:", error);
        alert("Failed to add item to cart");
    }
}

function validateSelection() {
    if (maxAvailableQty <= 0) {
        alert("This item is out of stock");
        return false;
    }

    if (!selectedVariantKey) {
        alert("Please select a variant");
        return false;
    }

    if (!selectedSize) {
        alert("Please select a size");
        return false;
    }

    return true;
}

function generateId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 18; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Wishlist Functions
function setupWishlistButton() {
    const user = auth.currentUser;
    if (!user) return;

    const wishlistRef = ref(db, `AR_shoe_users/wishlist/${user.uid}/${shopID}/${shoeID}`);
    
    get(wishlistRef).then((snapshot) => {
        const icon = wishlistBtn.querySelector('i');
        if (snapshot.exists()) {
            // Product is in wishlist
            wishlistBtn.classList.add('active');
            icon.classList.remove('far');
            icon.classList.add('fas');
            icon.style.color = "#dc3545";
        } else {
            // Product is not in wishlist
            wishlistBtn.classList.remove('active');
            icon.classList.remove('fas');
            icon.classList.add('far');
            icon.style.color = "";
        }
    });
}

async function toggleWishlist() {
    const user = auth.currentUser;
    if (!user) {
        alert("Please log in to add to wishlist");
        return;
    }

    const wishlistRef = ref(db, `AR_shoe_users/wishlist/${user.uid}/${shopID}/${shoeID}`);
    const icon = wishlistBtn.querySelector('i');

    get(wishlistRef).then((snapshot) => {
        if (snapshot.exists()) {
            // Remove from wishlist
            set(wishlistRef, null).then(() => {
                wishlistBtn.classList.remove('active');
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = "";
                alert("Removed from wishlist");
            });
        } else {
            // Add to wishlist
            set(wishlistRef, true).then(() => {
                wishlistBtn.classList.add('active');
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = "#dc3545";
                alert("Added to wishlist");
            });
        }
    });
}

// Make it available globally
window.toggleWishlist = toggleWishlist;