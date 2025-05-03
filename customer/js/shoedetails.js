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
        const stockInfo = variant.sizes[sizeKey];
        const btn = document.createElement("button");
        btn.textContent = `${sizeKey} (${stockInfo.stock} left)`; // ❌ stockInfo.stock is undefined
        sizeOptions.appendChild(btn);
      }
      
    
}

// Quantity adjustment
function adjustQuantity(amount) {
    const quantityInput = document.getElementById("quantity");
    let quantity = parseInt(quantityInput.value);
    quantity = isNaN(quantity) ? 1 : quantity + amount;
    if (quantity < 1) quantity = 1;
    quantityInput.value = quantity;
}

function validateQuantity() {
    const quantityInput = document.getElementById("quantity");
    let quantity = parseInt(quantityInput.value);
    if (quantity < 1 || isNaN(quantity)) {
        quantityInput.value = 1;
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
