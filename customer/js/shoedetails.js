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

        const colorDiv = document.createElement("div");
        colorDiv.className = "color-option";
        colorDiv.textContent = variant.color;
        colorDiv.onclick = (event) => {
            event.stopPropagation();
            selectedVariantKey = variantKey;
            mainProductImage.src = variant.imageUrl || productData.defaultImage || "";
            updatePriceAndSizes(variantKey);
            selectColor(variantKey); // optional: for managing selection highlight
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
        const sizeGroup = variant.sizes[sizeKey]; // e.g., { 8: { stock: 88 } }

        for (const actualSize in sizeGroup) {
            const stockInfo = sizeGroup[actualSize]; // e.g., { stock: 88 }
            const stock = stockInfo.stock;

            const sizeDiv = document.createElement("div");
            sizeDiv.className = "size-option";
            sizeDiv.textContent = `${actualSize} (${stock})`;
            sizeDiv.onclick = (event) => {
                event.stopPropagation();

                // Remove .selected from all size options
                const allSizeDivs = sizeOptions.querySelectorAll(".size-option");
                allSizeDivs.forEach(div => div.classList.remove("selected"));

                // Add .selected to the clicked size
                sizeDiv.classList.add("selected");

                selectedColor = productData.variants[variantKey].color;  // update color context
                selectedSize = actualSize;  // track selected size
                maxAvailableQty = stock;

                quantitySelector.max = stock;
                quantitySelector.value = 1;

                // Optional: Show available stock
                const stockText = document.getElementById("availableStock");
                if (stockText) stockText.textContent = `Available: ${stock}`;
            };




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

// Identify HTML buttons
const buyNowBtn = document.getElementById("buyNowBtn");
const addToCartBtn = document.getElementById("addToCartBtn");

// Helper to get selected size
function getSelectedSize() {
    return selectedSize;
}


// BUY NOW
buyNowBtn.addEventListener("click", async () => {
    try {
        console.log("[Buy Now] Button clicked - Starting process");

        // Verify selections
        if (!selectedVariantKey) {
            alert("Please select a color first.");
            return;
        }

        const selectedSize = getSelectedSize();
        if (!selectedSize) {
            alert("Please select a size first.");
            return;
        }

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

        // Prepare URL parameters (matching your current URL structure)
        const params = new URLSearchParams({
            method: "buyNow",
            shopId: shopID,
            shoeId: shoeID,
            variantKey: selectedVariantKey,
            sizeKey: sizeKey,  // This is crucial for checkout.js
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
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

    if (!selectedVariantKey) return alert("Please select a color.");
    const selectedSize = getSelectedSize();
    if (!selectedSize) return alert("Please select a size.");

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
        sizeKey: sizeKey, // Use the sizeKey instead of the size value
        shoeName: productData.shoeName,
        variantName: variant.variantName || "",
        color: variant.color || "",
        size: selectedSize, // Keep the actual size value as well if needed
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
    if (currentValue < 1) currentValue = 1;
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