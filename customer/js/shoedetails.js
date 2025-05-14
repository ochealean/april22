import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, set, push } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
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

let selectedColor = null;
let selectedSize = null;
let maxAvailableQty = 1; // Default
let productData = {};
let selectedVariantKey = null;

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

// Utility Functions
function updateQuantityLimit() {
    if (selectedColor && selectedSize) {
        const variant = productData.variants[selectedVariantKey];
        if (variant) {
            for (const sizeKey in variant.sizes) {
                const sizeGroup = variant.sizes[sizeKey];
                for (const actualSize in sizeGroup) {
                    if (actualSize === selectedSize) {
                        maxAvailableQty = sizeGroup[actualSize].stock;
                        document.getElementById("quantity").max = maxAvailableQty;
                        document.getElementById("availableStock").textContent = `Available: ${maxAvailableQty}`;
                        return;
                    }
                }
            }
        }
    }
}

function adjustQuantity(change) {
    const quantityInput = document.getElementById("quantity");
    let qty = parseInt(quantityInput.value) + change;
    if (qty < 1) qty = 1;
    if (qty > maxAvailableQty) qty = maxAvailableQty;
    quantityInput.value = qty;
}

function validateQuantity() {
    const quantityInput = document.getElementById("quantity");
    let qty = parseInt(quantityInput.value);
    if (qty < 1) qty = 1;
    if (qty > maxAvailableQty) qty = maxAvailableQty;
    quantityInput.value = qty;
}

function generate18CharID() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 18; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function formatTimestamp(timestamp) {
    let date = new Date(timestamp);
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let day = String(date.getDate()).padStart(2, '0');
    let year = date.getFullYear();
    let hours = String(date.getHours()).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
}

// Product Functions
function loadProductDetails() {
    const shoeRef = ref(db, `AR_shoe_users/shoe/${shopID}/${shoeID}`);

    get(shoeRef).then(snapshot => {
        if (snapshot.exists()) {
            productData = snapshot.val();
            updateProductInfo();
            loadVariants();
            loadCustomerReviews();
        } else {
            console.log("Product not found.");
        }
    }).catch(error => {
        console.error("Error loading product details:", error);
    });
    updateButtonStates(0);
}

function updateProductInfo() {
    productName.textContent = productData.shoeName;
    productShop.textContent = `Shop Name: ${productData.shopName}`;
    productCode.textContent = `Product Code: ${shoeID}`;
    productDescription.textContent = productData.generalDescription || "No description available.";
    mainProductImage.src = productData.defaultImage || "";

    const variantKeys = Object.keys(productData.variants || {});
    if (variantKeys.length > 0) {
        selectedVariantKey = variantKeys[0];
        updatePriceAndSizes(selectedVariantKey);
    }
}

function loadVariants() {
    colorOptions.innerHTML = '';
    sizeOptions.innerHTML = '';

    const variants = productData.variants;
    if (!variants) return;

    for (const variantKey in variants) {
        const variant = variants[variantKey];

        const colorDiv = document.createElement("div");
        colorDiv.className = "color-option";
        colorDiv.textContent = variant.color;
        colorDiv.onclick = (event) => {
            event.stopPropagation();
            selectedVariantKey = variantKey;
            mainProductImage.src = variant.imageUrl || productData.defaultImage || "";
            updatePriceAndSizes(variantKey);
            selectColor(variantKey);
        };

        colorOptions.appendChild(colorDiv);
    }
}

function selectColor(selectedKey) {
    const allColorDivs = colorOptions.querySelectorAll(".color-option");
    allColorDivs.forEach(div => div.classList.remove("selected"));

    const selectedDiv = Array.from(allColorDivs).find(div => 
        div.textContent.trim() === productData.variants[selectedKey].color
    );
    if (selectedDiv) selectedDiv.classList.add("selected");
}

function updatePriceAndSizes(variantKey) {
    const variant = productData.variants[variantKey];
    productPrice.textContent = `₱${variant.price}`;
    sizeOptions.innerHTML = '';

    for (const sizeKey in variant.sizes) {
        const sizeGroup = variant.sizes[sizeKey];
        
        for (const actualSize in sizeGroup) {
            const stockInfo = sizeGroup[actualSize];
            const stock = stockInfo.stock;

            const sizeDiv = document.createElement("div");
            sizeDiv.className = "size-option";
            sizeDiv.textContent = `${actualSize} (${stock})`;
            
            if (stock <= 0) {
                sizeDiv.classList.add("out-of-stock");
            }
            
            sizeDiv.onclick = (event) => {
                event.stopPropagation();
                
                if (stock <= 0) return;

                const allSizeDivs = sizeOptions.querySelectorAll(".size-option");
                allSizeDivs.forEach(div => div.classList.remove("selected"));

                sizeDiv.classList.add("selected");

                selectedColor = productData.variants[variantKey].color;
                selectedSize = actualSize;
                maxAvailableQty = stock;

                const quantityInput = document.getElementById("quantity");
                quantityInput.max = stock;
                quantityInput.value = 1;

                const stockText = document.getElementById("availableStock");
                if (stockText) stockText.textContent = `Available: ${stock}`;
                
                updateButtonStates(stock);
            };

            sizeOptions.appendChild(sizeDiv);
        }
    }
}

function updateButtonStates(stock) {
    const buyNowBtn = document.getElementById("buyNowBtn");
    const addToCartBtn = document.getElementById("addToCartBtn");
    
    if (stock <= 0) {
        buyNowBtn.disabled = true;
        addToCartBtn.disabled = true;
        buyNowBtn.title = "This item is out of stock";
        addToCartBtn.title = "This item is out of stock";
        buyNowBtn.classList.add("disabled");
        addToCartBtn.classList.add("disabled");
    } else {
        buyNowBtn.disabled = false;
        addToCartBtn.disabled = false;
        buyNowBtn.title = "";
        addToCartBtn.title = "";
        buyNowBtn.classList.remove("disabled");
        addToCartBtn.classList.remove("disabled");
    }
}

// Review Functions
async function getCustomernameUsingID(userID) {
    const userRef = ref(db, `AR_shoe_users/customer/${userID}`);
    return get(userRef).then(snapshot => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            return `${userData.firstName} ${userData.lastName}` || "Anonymous User";
        } else {
            return "Anonymous User";
        }
    }).catch(error => {
        console.error("Error fetching user data:", error);
        return "Anonymous User";
    });
}

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

async function displayReviews(feedbacks) {
    if (reviewsList) reviewsList.innerHTML = '<div class="loading">Loading reviews...</div>';

    const ratingCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    const reviewsToDisplay = [];

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

    const averageRating = calculateAverageRating(feedbacks);
    const averageRatingElement = document.getElementById('averageRating');
    
    if (averageRatingElement) {
        if (averageRating > 0) {
            averageRatingElement.innerHTML = `
                <span class="average-rating" style="font-size: 0.8em; color: var(--warning);">
                    ${averageRating} <i class="fas fa-star"></i> (${Object.values(ratingCounts).reduce((a, b) => a + b, 0)})
                </span>
            `;
        } else {
            averageRatingElement.innerHTML = `
                <span class="average-rating" style="font-size: 0.8em; color: var(--gray-dark);">
                    (No ratings yet)
                </span>
            `;
        }
    }

    if (reviewsToDisplay.length === 0) {
        reviewsList.innerHTML = "<p>No reviews yet.</p>";
        return;
    }

    reviewsList.innerHTML = '';

    for (const review of reviewsToDisplay) {
        try {
            const username = await getCustomernameUsingID(review.userId);
            
            const reviewDiv = document.createElement("div");
            reviewDiv.classList.add("review-item");
            reviewDiv.dataset.rating = review.feedback.rating;

            const headerDiv = document.createElement("div");
            headerDiv.classList.add("review-header");
            
            const authorSpan = document.createElement("span");
            authorSpan.classList.add("review-author");
            authorSpan.textContent = username;
            
            const dateSpan = document.createElement("span");
            dateSpan.classList.add("review-date");
            dateSpan.textContent = formatTimestamp(review.feedback.timestamp);
            
            headerDiv.appendChild(authorSpan);
            headerDiv.appendChild(dateSpan);
            
            const starsDiv = document.createElement("div");
            starsDiv.classList.add("review-stars");
            
            for (let i = 1; i <= 5; i++) {
                const starIcon = document.createElement("i");
                starIcon.classList.add(i <= review.feedback.rating ? "fas" : "far");
                starIcon.classList.add("fa-star");
                starsDiv.appendChild(starIcon);
            }
            
            const commentP = document.createElement("p");
            commentP.textContent = review.feedback.comment || "No comment provided.";
            
            reviewDiv.appendChild(headerDiv);
            reviewDiv.appendChild(starsDiv);
            reviewDiv.appendChild(commentP);
            
            reviewsList.appendChild(reviewDiv);
        } catch (error) {
            console.error("Error processing review:", error);
        }
    }
}

function updateRatingFilters(ratingCounts) {
    const filtersContainer = document.querySelector('.review-filters');
    if (!filtersContainer) return;
    
    filtersContainer.innerHTML = '';
    const totalReviews = Object.values(ratingCounts).reduce((a, b) => a + b, 0);
    
    for (let rating = 5; rating >= 1; rating--) {
        const filter = document.createElement('div');
        filter.className = 'stars-filter';
        filter.dataset.rating = rating;
        filter.onclick = () => filterReviews(rating);
        
        filter.innerHTML = `
            <div class="stars">
                ${'<i class="fas fa-star"></i>'.repeat(rating)}
                ${'<i class="far fa-star"></i>'.repeat(5 - rating)}
            </div>
            <div class="text">${rating} Star${rating !== 1 ? 's' : ''} (${ratingCounts[rating]})</div>
        `;
        
        filtersContainer.appendChild(filter);
    }
    
    const allFilter = document.createElement('div');
    allFilter.className = 'stars-filter active';
    allFilter.dataset.rating = '0';
    allFilter.onclick = () => filterReviews(0);
    allFilter.innerHTML = `<div class="text">All Reviews (${totalReviews})</div>`;
    filtersContainer.appendChild(allFilter);
}

function calculateAverageRating(feedbacks) {
    let totalRating = 0;
    let reviewCount = 0;

    for (const userId in feedbacks) {
        for (const orderID in feedbacks[userId]) {
            const feedback = feedbacks[userId][orderID];
            if (feedback.shoeID === shoeID) {
                totalRating += feedback.rating;
                reviewCount++;
            }
        }
    }

    return reviewCount === 0 ? 0 : (totalRating / reviewCount).toFixed(1);
}

window.filterReviews = function (rating) {
    const reviewItems = document.querySelectorAll('.review-item');
    const filters = document.querySelectorAll('.stars-filter');

    filters.forEach(filter => {
        filter.classList.remove('active');
        if (parseInt(filter.dataset.rating) === rating) {
            filter.classList.add('active');
        }
    });

    reviewItems.forEach(item => {
        item.style.display = (rating === 0 || parseInt(item.dataset.rating) === rating) ? 'block' : 'none';
    });
};

// Event Listeners
document.getElementById("logout_btn").addEventListener("click", function () {
    auth.signOut().then(() => {
        window.location.href = "/customer/html/user_login.html";
    }).catch(error => {
        console.error("Error during logout:", error);
    });
});

document.getElementById("quantity").addEventListener("change", validateQuantity);

wishlistBtn.addEventListener("click", () => {
    console.log("Wishlist clicked");
});

document.getElementById("buyNowBtn").addEventListener("click", async () => {
    try {
        if (maxAvailableQty <= 0) {
            alert("This item is out of stock");
            return;
        }

        if (!selectedVariantKey) {
            alert("Please select a color first.");
            return;
        }

        const selectedSize = getSelectedSize();
        if (!selectedSize) {
            alert("Please select a size first.");
            return;
        }

        const variant = productData.variants[selectedVariantKey];
        const quantity = parseInt(document.getElementById("quantity").value) || 1;

        let sizeKey = null;
        for (const [key, sizeObj] of Object.entries(variant.sizes)) {
            const sizeValue = Object.keys(sizeObj)[0];
            if (sizeValue === selectedSize) {
                sizeKey = key;
                break;
            }
        }

        if (!sizeKey) {
            console.error("Size key not found for size:", selectedSize);
            alert("Invalid size selection");
            return;
        }

        const params = new URLSearchParams({
            method: "buyNow",
            shopId: shopID,
            shoeId: shoeID,
            variantKey: selectedVariantKey,
            sizeKey: sizeKey,
            size: selectedSize,
            quantity: quantity,
            price: variant.price,
            shoeName: productData.shoeName,
            variantName: variant.variantName || "Standard",
            color: variant.color || "Default",
            image: variant.imageUrl || productData.defaultImage || "https://via.placeholder.com/150",
            shopName: productData.shopName || "Unknown Shop"
        });

        window.location.href = `/customer/html/checkout.html?${params.toString()}`;
    } catch (error) {
        console.error("Error in Buy Now process:", error);
        alert("An error occurred. Please try again.");
    }
});

document.getElementById("addToCartBtn").addEventListener("click", async () => {
    if (maxAvailableQty <= 0) {
        alert("This item is out of stock");
        return;
    }
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

    if (!selectedVariantKey) return alert("Please select a color.");
    const selectedSize = getSelectedSize();
    if (!selectedSize) return alert("Please select a size.");

    const variant = productData.variants[selectedVariantKey];

    let sizeKey = null;
    for (const [key, sizeObj] of Object.entries(variant.sizes)) {
        if (Object.keys(sizeObj)[0] === selectedSize) {
            sizeKey = key;
            break;
        }
    }

    if (!sizeKey) return alert("Invalid size selection");

    const cartItem = {
        shopId: shopID,
        shoeId: shoeID,
        variantKey: selectedVariantKey,
        sizeKey: sizeKey,
        shoeName: productData.shoeName,
        variantName: variant.variantName || "",
        color: variant.color || "",
        size: selectedSize,
        price: variant.price,
        image: variant.imageUrl || productData.defaultImage || "",
        quantity: parseInt(document.getElementById("quantity").value || 1),
        addedAt: new Date().toISOString()
    };

    const cartItemId = generate18CharID();
    const cartRef = ref(db, `AR_shoe_users/carts/${user.uid}/${cartItemId}`);

    try {
        await set(cartRef, cartItem);
        alert("Item added to cart successfully!");
    } catch (error) {
        console.error("Error adding to cart:", error);
        alert("Failed to add item to cart");
    }
});

// Initialize
loadProductDetails();

// Global functions
window.adjustQuantity = adjustQuantity;