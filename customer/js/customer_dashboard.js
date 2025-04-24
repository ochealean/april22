import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
// Add 'set' to your existing imports
import { getDatabase, ref, get, onValue, set } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getDatabase(app);

document.body.style.display = 'none';

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log("Auth state: User is logged in", user.uid);
        console.log("User email: ", user.email);

        get(ref(db, `AR_shoe_users/customer/${user.uid}`))
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    document.getElementById('userName_display1').textContent = userData.firstName;
                    document.getElementById('userName_display2').textContent = userData.firstName + " " + userData.lastName;
                    document.getElementById('imageProfile').src = userData.profilePhoto?.profilePhoto?.url || "https://firebasestorage.googleapis.com/v0/b/opportunity-9d3bf.appspot.com/o/profile%2Fdefault_profile.png?alt=media&token=5f1a4b8c-7e6b-4f1c-8a2d-0e5f3b7c4a2e";
                    document.body.style.display = '';
                    
                    // Load all shoes after user data is loaded
                    loadAllShoes();
                } else {
                    alert("Account does not exist");
                    auth.signOut();
                }
            });
    } else {
        // User is signed out
        console.log("Auth state: User is logged out");
        window.location.href = "/user_login.html";
    }
});

// Function to load all shoes from all shop owners
function loadAllShoes() {
    const shoesRef = ref(db, 'AR_shoe_users/shoe/');
    
    onValue(shoesRef, (snapshot) => {
        const shoesContainer = document.getElementById('shoesContainer');
        if (!shoesContainer) return;
        
        shoesContainer.innerHTML = ''; // Clear previous content
        
        if (snapshot.exists()) {
            const allShoes = [];
            
            // Iterate through each shop
            snapshot.forEach((shopSnapshot) => {
                const shopId = shopSnapshot.key;
                
                // Iterate through each shoe in the shop
                shopSnapshot.forEach((shoeSnapshot) => {
                    const shoeData = shoeSnapshot.val();
                    shoeData.shopId = shopId;
                    shoeData.shoeId = shoeSnapshot.key;
                    allShoes.push(shoeData);
                });
            });
            
            // Display shoes in the UI
            if (allShoes.length > 0) {
                allShoes.forEach(shoe => {
                    displayShoe(shoe);
                });
            } else {
                shoesContainer.innerHTML = '<p class="no-shoes">No shoes available at the moment.</p>';
            }
        } else {
            shoesContainer.innerHTML = '<p class="no-shoes">No shoes available at the moment.</p>';
        }
    });
}

// Function to display a single shoe in the UI
function displayShoe(shoe) {
    const shoesContainer = document.getElementById('shoesContainer');
    
    // Create shoe card
    const shoeCard = document.createElement('div');
    shoeCard.className = 'shoe-card';
    
    // Use the first variant's image if no default image exists
    const displayImage = shoe.defaultImage || 
                        (shoe.variants && shoe.variants.length > 0 && shoe.variants[0].imageUrl) || 
                        'https://via.placeholder.com/300';
    
    // Get the lowest price from all variants
    let lowestPrice = null;
    if (shoe.variants && shoe.variants.length > 0) {
        lowestPrice = Math.min(...shoe.variants.map(v => parseFloat(v.price)));
    }
    
    shoeCard.innerHTML = `
        <div class="shoe-image">
            <img src="${displayImage}" alt="${shoe.shoeName}">
        </div>
        <div class="shoe-details">
            <h3>${shoe.shoeName}</h3>
            <p class="shoe-code">Code: ${shoe.shoeCode}</p>
            <p class="shoe-description">${shoe.generalDescription || 'No description available'}</p>
            ${lowestPrice ? `<p class="shoe-price">From $${lowestPrice.toFixed(2)}</p>` : '<p class="shoe-price">Price not available</p>'}
            <div class="shoe-variants">
                ${shoe.variants && shoe.variants.length > 0 ? 
                    `<p>Available in ${shoe.variants.length} color${shoe.variants.length > 1 ? 's' : ''}</p>` : 
                    '<p>No variants available</p>'}
            </div>
            <button class="btn-view" onclick="viewShoeDetails('${shoe.shopId}', '${shoe.shoeId}')">
                View Details
            </button>
        </div>
    `;
    
    shoesContainer.appendChild(shoeCard);
}

// Global variables to track selected options
let selectedVariantIndex = 0;
let selectedSize = null;
let currentShoeData = null;

// Enhanced viewShoeDetails function
window.viewShoeDetails = async function(shopId, shoeId) {
    const shoeRef = ref(db, `AR_shoe_users/shoe/${shopId}/${shoeId}`);
    
    try {
        const snapshot = await get(shoeRef);
        if (!snapshot.exists()) {
            alert('Shoe not found');
            return;
        }
        
        currentShoeData = snapshot.val();
        currentShoeData.shopId = shopId;
        currentShoeData.shoeId = shoeId;
        
        // Reset selection
        selectedVariantIndex = 0;
        selectedSize = null;
        
        // Update modal content
        updateProductModalContent(currentShoeData);
        
        // Show modal
        document.getElementById('productDetailsModal').classList.add('show');
        document.body.classList.add('modal-open');
        
    } catch (error) {
        console.error("Error fetching shoe details:", error);
        alert('Error loading shoe details');
    }
};

function updateProductModalContent(shoe) {
    // Set modal title
    document.getElementById('productModalTitle').textContent = shoe.shoeName;
    
    // Get first variant for default display
    const defaultVariant = shoe.variants[selectedVariantIndex];
    
    // Generate variants HTML
    let variantsHtml = shoe.variants.map((variant, index) => `
        <div class="variant-option ${index === selectedVariantIndex ? 'selected' : ''}" 
             onclick="selectVariant(${index})">
            <div class="variant-header">
                <span class="variant-name">${variant.variantName}</span>
                <span class="variant-price">$${variant.price}</span>
            </div>
            <div>
                ${variant.imageUrl ? `<img src="${variant.imageUrl}" class="variant-image">` : ''}
                <span>Color: ${variant.color}</span>
            </div>
            <div class="variant-sizes">
                ${variant.sizes.map(size => `
                    <div class="size-option 
                        ${size.stock <= 0 ? 'out-of-stock' : ''}
                        ${selectedVariantIndex === index && selectedSize === size.size ? 'selected' : ''}"
                        onclick="event.stopPropagation(); selectSize(${index}, '${size.size}')">
                        ${size.size}
                        ${size.stock > 0 ? `(${size.stock})` : '(out)'}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    // Set modal body content
    document.getElementById('productModalBody').innerHTML = `
        <div class="product-details-container">
            <div class="product-main-image">
                <img src="${defaultVariant.imageUrl || shoe.defaultImage || 'https://via.placeholder.com/300'}">
            </div>
            <div class="product-info">
                <h2 class="product-name">Shop Name: ${shoe.shopName}</h2>
                <div class="product-code">Product Code: ${shoe.shoeCode}</div>
                <div class="product-price">$${defaultVariant.price}</div>
                <div class="product-description">
                    <h4>Description</h4>
                    <p>${shoe.generalDescription || 'No description available'}</p>
                </div>
            </div>
        </div>
        <div class="product-variants">
            <h3>Available Variants</h3>
            ${variantsHtml}
        </div>
    `;
    
    // Update button states based on selection
    updateButtonStates();
}

// Function to select a variant
window.selectVariant = function(index) {
    selectedVariantIndex = index;
    selectedSize = null; // Reset size selection when variant changes
    updateProductModalContent(currentShoeData);
};

// Function to select a size
window.selectSize = function(variantIndex, size) {
    if (variantIndex !== selectedVariantIndex) {
        selectedVariantIndex = variantIndex;
    }
    
    // Check if size is in stock
    const variant = currentShoeData.variants[variantIndex];
    const sizeInfo = variant.sizes.find(s => s.size === size);
    
    if (sizeInfo && sizeInfo.stock > 0) {
        selectedSize = size;
        updateProductModalContent(currentShoeData);
    }
};

// Function to update button states
function updateButtonStates() {
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    
    if (selectedSize === null) {
        addToCartBtn.disabled = true;
        buyNowBtn.disabled = true;
        addToCartBtn.title = "Please select a size first";
        buyNowBtn.title = "Please select a size first";
    } else {
        addToCartBtn.disabled = false;
        buyNowBtn.disabled = false;
        addToCartBtn.title = "";
        buyNowBtn.title = "";
    }
}

// Close modal function
window.closeProductModal = function() {
    document.getElementById('productDetailsModal').classList.remove('show');
    document.body.classList.remove('modal-open');
};

// Add to cart function - define this before it's used
window.addToCart = async function(cartItem) {  // Added async here
    const user = auth.currentUser;
    if (!user) {
        alert('Please login to add items to cart');
        return false;
    }

    try {
        // 1. Update localStorage immediately with minimal data
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Create minimal cart item
        const minimalCartItem = {
            shopId: cartItem.shopId,
            shoeId: cartItem.shoeId,
            variantIndex: cartItem.variantIndex,
            size: cartItem.size,
            quantity: cartItem.quantity || 1
        };
        
        // Check for existing item
        const existingIndex = cart.findIndex(i => 
            i.shoeId === minimalCartItem.shoeId && 
            i.variantIndex === minimalCartItem.variantIndex && 
            i.size === minimalCartItem.size
        );

        if (existingIndex >= 0) {
            cart[existingIndex].quantity += minimalCartItem.quantity;
        } else {
            cart.push(minimalCartItem);
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));

        // 2. Update Firebase
        const cartRef = ref(db, `AR_shoe_users/carts/${user.uid}`);
        await set(cartRef, cart);
        
        console.log("Cart updated in both localStorage and Firebase");
        return true;
        
    } catch (error) {
        console.error("Error saving cart:", error);
        alert("Failed to add item to cart");
        return false;
    }
};

// Then modify your existing addToCartBtn event listener to use this function
document.getElementById('addToCartBtn').addEventListener('click', function() {
    if (!currentShoeData || selectedSize === null) return;
    
    const selectedVariant = currentShoeData.variants[selectedVariantIndex];
    const sizeInfo = selectedVariant.sizes.find(s => s.size === selectedSize);
    
    if (sizeInfo && sizeInfo.stock > 0) {
        const cartItem = {
            shopId: currentShoeData.shopId,
            shoeId: currentShoeData.shoeId,
            shoeName: currentShoeData.shoeName,
            variantIndex: selectedVariantIndex,
            variantName: selectedVariant.variantName,
            color: selectedVariant.color,
            size: selectedSize,
            price: selectedVariant.price,
            image: selectedVariant.imageUrl || currentShoeData.defaultImage,
            quantity: 1
        };
        
        // Store shopID and userID in localStorage temporarily
        const user = auth.currentUser;
        if (user) {
            localStorage.setItem('currentShop', JSON.stringify({
                shopId: currentShoeData.shopId,
                userId: user.uid
            }));
        }
        
        // Add to cart
        addToCart(cartItem);
        closeProductModal();
    }
});

// Modified Buy Now function
document.getElementById('buyNowBtn').addEventListener('click', function() {
    if (!currentShoeData || selectedSize === null) return;
    
    const minimalCartItem = {
        shopId: currentShoeData.shopId,
        shoeId: currentShoeData.shoeId,
        variantIndex: selectedVariantIndex,
        size: selectedSize,
        quantity: 1
    };
    
    // Save only the minimal data to localStorage
    localStorage.setItem('cart', JSON.stringify([minimalCartItem]));
    
    // Redirect to checkout
    window.location.href = 'checkout.html';
});

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeProductModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeProductModal();
    }
});

document.getElementById('logout_btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log("User signed out");
    }).catch((error) => {
        console.error("Error signing out: ", error);
    });
});