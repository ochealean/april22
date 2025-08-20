import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, onValue, ref, get, set, push } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
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

let cursedWords = []; // This will store our censored words from Firebase

// Mobile sidebar toggle functionality
document.addEventListener('DOMContentLoaded', function () {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (mobileToggle && sidebar && overlay) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
});

function updateQuantityLimit() {
    if (selectedColor && selectedSize) {
        const available = variants[selectedColor]?.sizes[selectedSize];
        if (available) {
            maxAvailableQty = available;
            document.getElementById("quantity").max = maxAvailableQty;
            document.getElementById("availableStock").textContent = `Available: ${maxAvailableQty}`;
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
    
    if (isNaN(qty)) qty = 1;
    if (qty < 1) qty = 1;
    if (qty > maxAvailableQty) qty = maxAvailableQty;
    
    quantityInput.value = qty;
}

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
const userNameDisplay = document.getElementById("userName_display2");
const userAvatar = document.getElementById("imageProfile");

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
            
            // Check if user is logged in before checking wishlist status
            const user = auth.currentUser;
            if (user) {
                isWishlisted();
                loadUserProfile(user.uid);
            } else {
                // Set default user info if not logged in
                userNameDisplay.textContent = "Guest User";
                userAvatar.src = "https://randomuser.me/api/portraits/men/32.jpg";
            }
            
            loadCustomerReviews();
        } else {
            console.log("Product not found.");
        }
    }).catch(error => {
        console.error("Error loading product details:", error);
    });
}

// Load user profile
function loadUserProfile(userId) {
    const userRef = ref(db, `AR_shoe_users/customer/${userId}`);
    
    get(userRef).then(snapshot => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            userNameDisplay.textContent = `${userData.firstName} ${userData.lastName}`;
            
            // Set user avatar if available
            if (userData.profilePicture) {
                userAvatar.src = userData.profilePicture;
            } else {
                userAvatar.src = "https://randomuser.me/api/portraits/men/32.jpg";
            }
        }
    }).catch(error => {
        console.error("Error loading user profile:", error);
    });
}

function loadCensoredWords() {
    const curseWordsRef = ref(db, 'AR_shoe_users/curseWords');
    
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
    }, (error) => {
        console.error("Error loading censored words:", error);
        cursedWords = []; // Fallback to empty array if error occurs
    });
}

// Call this function when your script initializes
loadCensoredWords();

function isWishlisted() {
    const user = auth.currentUser;
    if (!user) {
        console.log("User not logged in");
        return;
    }

    const wishlistRef = ref(db, `AR_shoe_users/wishlist/${user.uid}/${shopID}/${shoeID}`);
    
    get(wishlistRef).then((snapshot) => {
        const icon = wishlistBtn.querySelector("i");
        if (snapshot.exists()) {
            // Item is in wishlist - set active state
            wishlistBtn.classList.add("active");
            icon.classList.remove("far");
            icon.classList.add("fas");
            icon.style.color = "red";
        } else {
            // Item not in wishlist - set inactive state
            wishlistBtn.classList.remove("active");
            icon.classList.remove("fas");
            icon.classList.add("far");
            icon.style.color = "";
        }
    }).catch((error) => {
        console.error("Error checking wishlist status:", error);
    });
}

// Update general info
function updateProductInfo() {
    console.log("Product Data:", productData);
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

        const colorDiv = document.createElement("div");
        colorDiv.className = "color-option";
        colorDiv.textContent = variant.color;
        colorDiv.onclick = (event) => {
            event.stopPropagation();
            selectedVariantKey = variantKey;
            mainProductImage.src = variant.imageUrl || productData.defaultImage || "";
            updatePriceAndSizes(variantKey);
            selectColor(variantKey);
            
            // Hide quantity controls when color changes
            quantitySelector.classList.remove("visible");
            clearSizeSelection();
        };

        colorOptions.appendChild(colorDiv);
    }
}

function selectSize(variantKey, sizeKey) {
    const allSizeDivs = sizeOptions.querySelectorAll(".size-option");
    allSizeDivs.forEach(div => div.classList.remove("selected"));

    const selectedDiv = Array.from(allSizeDivs).find(div =>
        div.textContent.trim().startsWith(sizeKey)
    );
    if (selectedDiv) {
        selectedDiv.classList.add("selected");
    }

    console.log(`Selected size: ${sizeKey} from ${variantKey}`);
    // You can store the selected sizeKey in a global variable if needed
}

function selectColor(selectedKey) {
    const allColorDivs = colorOptions.querySelectorAll(".color-option");
    allColorDivs.forEach(div => div.classList.remove("selected"));

    const selectedDiv = Array.from(allColorDivs).find(div => div.textContent.trim() === productData.variants[selectedKey].color);
    if (selectedDiv) selectedDiv.classList.add("selected");
}

// Update price and sizes when variant is selected
function updatePriceAndSizes(variantKey) {
    const variant = productData.variants[variantKey];
    productPrice.textContent = `₱${variant.price}`;
    sizeOptions.innerHTML = '';

    console.log("variant.sizes:", variant.sizes);

    for (const sizeKey in variant.sizes) {
        const sizeGroup = variant.sizes[sizeKey];
        for (const actualSize in sizeGroup) {
            const stockInfo = sizeGroup[actualSize];
            const stock = stockInfo.stock;

            const sizeDiv = document.createElement("div");
            sizeDiv.className = "size-option";
            sizeDiv.textContent = `${actualSize} (${stock})`;
            
            // Add disabled class if stock is 0
            if (stock <= 0) {
                sizeDiv.classList.add("disabled");
                sizeDiv.style.opacity = "0.5";
                sizeDiv.style.cursor = "not-allowed";
                sizeDiv.onclick = null; // Disable click
            } else {
                sizeDiv.onclick = (event) => {
                    event.stopPropagation();

                    // Remove .selected from all size options
                    const allSizeDivs = sizeOptions.querySelectorAll(".size-option");
                    allSizeDivs.forEach(div => div.classList.remove("selected"));

                    // Add .selected to the clicked size
                    sizeDiv.classList.add("selected");

                    selectedColor = productData.variants[variantKey].color;
                    selectedSize = actualSize;
                    maxAvailableQty = stock;

                    // Show quantity controls
                    quantitySelector.classList.add("visible");
                    
                    // Set max quantity and current value
                    const quantityInput = document.getElementById("quantity");
                    quantityInput.max = stock;
                    quantityInput.value = 1;

                    const stockText = document.getElementById("availableStock");
                    if (stockText) stockText.textContent = `Available: ${stock}`;
                    
                    // Enable buttons when size is selected
                    buyNowBtn.disabled = false;
                    addToCartBtn.disabled = false;
                };
            }

            sizeOptions.appendChild(sizeDiv);
        }
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
            return `${ userData.firstName} ${userData.lastName}` || "Anonymous User" ;  // Return display name or default to "Anonymous User"
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
    if (reviewsList) reviewsList.innerHTML = '<div class="loading">Loading reviews...</div>';

    // Calculate review counts per rating
    const ratingCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    const reviewsToDisplay = [];

    console.log("Feedbacks data:", feedbacks);
    for (const userId in feedbacks) {
        console.log("Processing feedbacks for user:", userId);
        for (const orderID in feedbacks[userId]) {
            console.log("Processing order ID:", orderID);
            const feedback = feedbacks[userId][orderID];
            console.log("Feedback data:", feedback);
            if (feedback.shoeID === shoeID) {
                reviewsToDisplay.push({
                    userId,
                    feedback
                });
                // Count ratings (1-5 stars only)
                if (feedback.rating >= 1 && feedback.rating <= 5) {
                    ratingCounts[feedback.rating]++;
                }
            }
        }
    }

    // Update the filter buttons with counts
    updateRatingFilters(ratingCounts);

    // Calculate and display average rating
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

    // If no reviews, show message
    if (reviewsToDisplay.length === 0) {
        reviewsList.innerHTML = "<p>No reviews yet.</p>";
        return;
    }

    reviewsList.innerHTML = '';

    // Process each review asynchronously
    for (const review of reviewsToDisplay) {
        try {
            // Await the username lookup
            const username = await getCustomernameUsingID(review.userId);

            // Create review element
            const reviewDiv = document.createElement("div");
            reviewDiv.classList.add("review-item");
            reviewDiv.dataset.rating = review.feedback.rating;

            // Create review header
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
            
            // Create stars
            const starsDiv = document.createElement("div");
            starsDiv.classList.add("review-stars");
            
            for (let i = 1; i <= 5; i++) {
                const starIcon = document.createElement("i");
                starIcon.classList.add(i <= review.feedback.rating ? "fas" : "far");
                starIcon.classList.add("fa-star");
                starsDiv.appendChild(starIcon);
            }
            
            // Create comment
            const commentP = document.createElement("p");
            commentP.textContent = censoredText(review.feedback.comment) || "No comment provided.";
            
            // Append all elements
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
    
    // Clear existing filters
    filtersContainer.innerHTML = '';
    
    // Total count for "All" filter
    const totalReviews = Object.values(ratingCounts).reduce((a, b) => a + b, 0);
    
    // Create filter buttons from 5 stars to 1 star
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
    
    // Add "All" filter at the end
    const allFilter = document.createElement('div');
    allFilter.className = 'stars-filter active';
    allFilter.dataset.rating = '0';
    allFilter.onclick = () => filterReviews(0);
    allFilter.innerHTML = `
        <div class="text">All Reviews (${totalReviews})</div>
    `;
    filtersContainer.appendChild(allFilter);
}

// Filter reviews by star rating
window.filterReviews = function(rating) {
    const reviewItems = document.querySelectorAll('.review-item');
    const filters = document.querySelectorAll('.stars-filter');
    
    // Update active filter button
    filters.forEach(filter => {
        filter.classList.remove('active');
        if (parseInt(filter.dataset.rating) === rating) {
            filter.classList.add('active');
        }
    });
    
    // Show/hide reviews based on filter
    reviewItems.forEach(item => {
        item.style.display = (rating === 0 || parseInt(item.dataset.rating) === rating) 
            ? 'block' 
            : 'none';
    });
}

wishlistBtn.addEventListener("click", function() {
    toggleWishlist(this);
});

function toggleWishlist(btnElement) {
    const user = auth.currentUser;
    if (!user) {
        alert("Please log in to use the wishlist");
        window.location.href = "/customer/html/user_login.html";
        return;
    }

    const userID = user.uid;
    const wishlistRef = ref(db, `AR_shoe_users/wishlist/${userID}/${shopID}/${shoeID}`);
    const icon = btnElement.querySelector("i");

    get(wishlistRef).then((snapshot) => {
        if (snapshot.exists()) {
            // Item is in wishlist - remove it
            set(wishlistRef, null)
                .then(() => {
                    console.log("Shoe removed from wishlist");
                    btnElement.classList.remove("active");
                    icon.classList.remove("fas");
                    icon.classList.add("far");
                    icon.style.color = "";
                })
                .catch((error) => {
                    console.error("Error removing from wishlist:", error);
                });
        } else {
            // Item not in wishlist - add it
            set(wishlistRef, {
                shoeId: shoeID,
                shopId: shopID,
                shoeName: productData.shoeName,
                price: productData.variants[selectedVariantKey].price,
                image: productData.variants[selectedVariantKey].imageUrl || productData.defaultImage,
                addedAt: new Date().toISOString()
            })
                .then(() => {
                    console.log("Shoe added to wishlist");
                    btnElement.classList.add("active");
                    icon.classList.remove("far");
                    icon.classList.add("fas");
                    icon.style.color = "red";
                })
                .catch((error) => {
                    console.error("Error adding to wishlist:", error);
                });
        }
    }).catch((error) => {
        console.error("Error checking wishlist status:", error);
        alert("Error accessing wishlist");
    });
}

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

// Identify HTML buttons
const buyNowBtn = document.getElementById("buyNowBtn");
const addToCartBtn = document.getElementById("addToCartBtn");

// Helper to get selected size
function getSelectedSize() {
    return selectedSize;
}

// BUY NOW
buyNowBtn.addEventListener("click", async () => {
    const check = canAddToCartOrBuy();
    if (!check.canProceed) {
        alert(check.message);
        return;
    }

    try {
        console.log("[Buy Now] Button clicked - Starting process");

        // Get product data
        const variant = productData.variants[selectedVariantKey];
        const quantity = parseInt(document.getElementById("quantity").value) || 1;

        // Find the sizeKey
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

        // Prepare URL parameters
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

        console.log("Redirecting to checkout with params:", params.toString());
        window.location.href = `/customer/html/checkout.html?${params.toString()}`;

    } catch (error) {
        console.error("Error in Buy Now process:", error);
        alert("An error occurred. Please try again.");
    }
});

// ADD TO CART
addToCartBtn.addEventListener("click", async () => {
    const check = canAddToCartOrBuy();
    if (!check.canProceed) {
        alert(check.message);
        return;
    }

    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

    const variant = productData.variants[selectedVariantKey];

    // Find the sizeKey that corresponds to the selected size
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

window.adjustQuantity = function (change) {
    const quantityInput = document.getElementById("quantity");
    let currentValue = parseInt(quantityInput.value) || 1;
    currentValue += change;
    
    // Ensure quantity stays within bounds
    if (currentValue < 1) currentValue = 1;
    if (currentValue > maxAvailableQty) currentValue = maxAvailableQty;
    
    quantityInput.value = currentValue;
};

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

    return `${ month }/${day}/${ year } ${ hours }:${ minutes }`;
}

// Calculate and display average rating
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

    if (reviewCount === 0) {
        return 0;
    }

    return (totalRating / reviewCount).toFixed(1);
}

function canAddToCartOrBuy() {
    // Check if size is selected
    if (!selectedSize) {
        return { canProceed: false, message: "Please select a size first." };
    }
    
    // Get the variant and check stock
    const variant = productData.variants[selectedVariantKey];
    let stock = 0;
    
    // Find the stock for selected size
    for (const sizeObj of Object.values(variant.sizes)) {
        if (sizeObj[selectedSize]) {
            stock = sizeObj[selectedSize].stock;
            break;
        }
    }
    
    // Check if stock is available
    if (stock <= 0) {
        return { canProceed: false, message: "This item is out of stock." };
    }
    
    return { canProceed: true };
}

function clearSizeSelection() {
    selectedSize = null;
    buyNowBtn.disabled = true;
    addToCartBtn.disabled = true;
    quantitySelector.classList.remove("visible");
}

// Initialize buttons as disabled
buyNowBtn.disabled = true;
addToCartBtn.disabled = true;

function censoredText(text) {
    if (!text) return text; // Return empty or null text as is
    
    let censored = text;
    
    // Check each word in the text against our censored words list
    cursedWords.forEach(word => {
        // Create a regex that matches the word with word boundaries
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        censored = censored.replace(regex, '****');
    });
    
    return censored;
}