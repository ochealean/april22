import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, set, off, get } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Initialize Firebase
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
const auth = getAuth();
const db = getDatabase(app);

// Store references to listeners
let userListener = null;
let cartListener = null;

// Hide body initially
document.body.style.display = 'none';


// Set up realtime listener for user data
async function setupUserListener(user) {
    return new Promise((resolve, reject) => {
        userListener = onValue(ref(db, `AR_shoe_users/customer/${user.uid}`), 
            async (snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    updateUserProfile(userData);
                    
                    try {
                        await setupCartListener(user.uid);
                        setupEventListeners(user.uid);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    alert("Account does not exist");
                    await signOut(auth);
                    reject(new Error("Account does not exist"));
                }
            }, 
            (error) => {
                console.error("Error loading user data:", error);
                reject(error);
            }
        );
    });
}

// Update user profile display
function updateUserProfile(userData) {
    if (document.getElementById('userName_display1')) {
        document.getElementById('userName_display1').textContent = userData.firstName;
    }
    if (document.getElementById('imageProfile')) {
        document.getElementById('imageProfile').src = userData.profilePhoto?.profilePhoto?.url || 
            "https://firebasestorage.googleapis.com/v0/b/opportunity-9d3bf.appspot.com/o/profile%2Fdefault_profile.png?alt=media&token=5f1a4b8c-7e6b-4f1c-8a2d-0e5f3b7c4a2e";
    }
    document.body.style.display = '';
}

// Add this function to fetch all cart items
async function fetchAllCartItems(userId) {
    try {
        const cartRef = ref(db, `AR_shoe_users/carts/${userId}`);
        const snapshot = await get(cartRef);
        
        if (snapshot.exists()) {
            // Convert the cart object to an array if it's not already
            const cartItems = snapshot.val();
            return Array.isArray(cartItems) ? cartItems : Object.values(cartItems);
        } else {
            return []; // Return empty array if cart is empty
        }
    } catch (error) {
        console.error("Error fetching cart items:", error);
        throw error;
    }
}

// Update the processCartItems function to include cartId
async function processCartItems(userId, cart) {
    if (!cart || Object.keys(cart).length === 0) {
        showEmptyCart();
        return;
    }
    
    showCartContainer();
    
    try {
        const cartWithDetails = await Promise.all(Object.entries(cart).map(async ([cartId, item]) => {
            try {
                // Get shoe details
                const shoeRef = ref(db, `AR_shoe_users/shoe/${item.shopId}/${item.shoeId}`);
                const shoeSnapshot = await get(shoeRef);
                
                if (!shoeSnapshot.exists()) {
                    console.warn(`Shoe not found: ${item.shopId}/${item.shoeId}`);
                    return null;
                }
                
                const shoeData = shoeSnapshot.val();
                const variant = shoeData.variants[item.variantKey];
                
                // Get size details
                const sizeObj = variant.sizes[item.sizeKey];
                const sizeValue = Object.keys(sizeObj)[0];
                const stock = sizeObj[sizeValue].stock;
                
                return {
                    ...item,
                    cartId: cartId, // Preserve the cartId
                    shoeName: shoeData.shoeName,
                    shopName: shoeData.shopName,
                    price: parseFloat(variant.price),
                    imageUrl: variant.imageUrl || shoeData.defaultImage,
                    variantName: variant.variantName,
                    color: variant.color,
                    size: sizeValue,
                    availableStock: stock,
                    maxQuantity: stock
                };
            } catch (error) {
                console.error(`Error processing cart item ${item.shoeId}:`, error);
                return null;
            }
        }));
        
        // Filter out any null items (where shoe wasn't found)
        const validCartItems = cartWithDetails.filter(item => item !== null);
        
        // Update cart in Firebase if some items were invalid
        if (validCartItems.length !== Object.keys(cart).length) {
            await updateCartInFirebase(userId, validCartItems);
        }
        
        // Display the cart items
        displayCartItems(validCartItems);
        
        return validCartItems;
    } catch (error) {
        console.error("Error processing cart:", error);
        alert("Failed to load your cart. Please try again.");
        throw error;
    }
}

// Update the setupCartListener to handle the object structure
async function setupCartListener(userId) {
    return new Promise((resolve) => {
        if (cartListener) off(cartListener);
        
        const cartRef = ref(db, `AR_shoe_users/carts/${userId}`);
        cartListener = onValue(cartRef, async (snapshot) => {
            if (snapshot.exists()) {
                const cart = snapshot.val();
                await processCartItems(userId, cart);
                resolve(cart);
            } else {
                showEmptyCart();
                resolve({});
            }
        }, (error) => {
            console.error("Cart listener error:", error);
            reject(error);
        });
    });
}

// Example usage in your auth state handler:
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Set up user listener
            await setupUserListener(user);
            
            // Fetch and process cart items
            const cartItems = await fetchAllCartItems(user.uid);
            await processCartItems(user.uid, cartItems);
            
            // Now you have all cart items available
            console.log("All cart items:", cartItems);
            
        } catch (error) {
            console.error("Initialization error:", error);
        }
    } else {
        // User signed out
        cleanupListeners();
        window.location.href = "/user_login.html";
    }
});

// Display cart items with checkboxes
function displayCartItems(cartItems) {
    const cartContainer = document.getElementById('cartContainer');
    cartContainer.innerHTML = '';
    
    const cartItemsSection = document.createElement('div');
    cartItemsSection.className = 'cart-items';
    
    // Convert cart object to array if needed
    const itemsArray = Array.isArray(cartItems) ? cartItems : Object.values(cartItems);
    
    itemsArray.forEach((item) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-select">
                <input type="checkbox" class="cart-item-checkbox" data-cartid="${item.cartId}" id="item-${item.cartId}">
                <label for="item-${item.cartId}"></label>
            </div>
            <img src="${item.imageUrl}" alt="${item.shoeName}" class="cart-item-image">
            <div class="cart-item-details">
                <h3 class="cart-item-name">${item.shoeName}</h3>
                <p class="cart-item-variant">${item.variantName} (${item.color}) - Size: ${item.size}</p>
                <p class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</p>
                
                <div class="quantity-controls">
                    <button class="quantity-btn" data-cartid="${item.cartId}" data-change="-1">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
                           max="${item.availableStock}" data-cartid="${item.cartId}">
                    <button class="quantity-btn" data-cartid="${item.cartId}" data-change="1">+</button>
                </div>
                
                <button class="remove-btn" data-cartid="${item.cartId}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        cartItemsSection.appendChild(itemElement);
    });
    
    cartContainer.appendChild(cartItemsSection);
    createCartSummary(itemsArray);
}

// Create cart summary section
function createCartSummary(cartItems) {
    const cartContainer = document.getElementById('cartContainer');
    const cartSummarySection = document.createElement('div');
    cartSummarySection.className = 'cart-summary';
    
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const shipping = 5.00;
    const total = subtotal + tax + shipping;
    
    cartSummarySection.innerHTML = `
        <div class="summary-row">
            <span>Subtotal</span>
            <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Tax (10%)</span>
            <span>$${tax.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Shipping</span>
            <span>$${shipping.toFixed(2)}</span>
        </div>
        <div class="summary-row summary-total">
            <span>Total</span>
            <span>$${total.toFixed(2)}</span>
        </div>
        <button class="checkout-btn" id="checkoutBtn">
            Proceed to Checkout
        </button>
    `;
    
    cartContainer.appendChild(cartSummarySection);
}

// Update quantity functions to work with cartId
async function updateQuantity(cartId, change) {
    try {
        const userId = auth.currentUser.uid;
        const cartRef = ref(db, `AR_shoe_users/carts/${userId}/${cartId}/quantity`);
        const snapshot = await get(cartRef);
        
        if (snapshot.exists()) {
            const currentQuantity = snapshot.val();
            const newQuantity = currentQuantity + change;
            
            if (newQuantity < 1) return;
            
            await set(cartRef, newQuantity);
        }
    } catch (error) {
        console.error("Error updating quantity:", error);
        alert("Failed to update quantity. Please try again.");
    }
}

async function updateQuantityInput(cartId, value) {
    try {
        const userId = auth.currentUser.uid;
        const newQuantity = parseInt(value);
        
        if (isNaN(newQuantity)) return;
        
        await set(ref(db, `AR_shoe_users/carts/${userId}/${cartId}/quantity`), newQuantity);
    } catch (error) {
        console.error("Error updating quantity:", error);
        alert("Failed to update quantity. Please try again.");
    }
}

async function removeItem(cartId) {
    try {
        const userId = auth.currentUser.uid;
        await set(ref(db, `AR_shoe_users/carts/${userId}/${cartId}`), null);
    } catch (error) {
        console.error("Error removing item:", error);
        alert("Failed to remove item. Please try again.");
    }
}


// Helper functions
function showEmptyCart() {
    document.getElementById('emptyCartMessage').style.display = 'block';
    document.getElementById('cartContainer').style.display = 'none';
}

function showCartContainer() {
    document.getElementById('emptyCartMessage').style.display = 'none';
    document.getElementById('cartContainer').style.display = 'block';
}

function cleanupListeners() {
    if (userListener) off(userListener);
    if (cartListener) off(cartListener);
}

// Update the event listeners to use cartId
function setupEventListeners(userId) {
    // Logout button
    document.getElementById('logout_btn')?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log("User signed out");
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    });

    // Delegated event listeners for cart operations
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('quantity-btn') && e.target.dataset.cartid) {
            const cartId = e.target.dataset.cartid;
            const change = parseInt(e.target.dataset.change);
            await updateQuantity(cartId, change);
        }
        
        if ((e.target.classList.contains('remove-btn') || e.target.closest('.remove-btn')) && e.target.dataset.cartid) {
            const btn = e.target.classList.contains('remove-btn') ? e.target : e.target.closest('.remove-btn');
            const cartId = btn.dataset.cartid;
            await removeItem(cartId);
        }
    });

    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('quantity-input') && e.target.dataset.cartid) {
            const cartId = e.target.dataset.cartid;
            await updateQuantityInput(cartId, e.target.value);
        }
        
        if (e.target.classList.contains('cart-item-checkbox')) {
            // Handle checkbox selection if needed
            console.log('Checkbox changed for cart item:', e.target.dataset.cartid);
        }
    });

    document.getElementById('checkoutBtn')?.addEventListener('click', async () => {
        // Get selected items
        const selectedItems = Array.from(document.querySelectorAll('.cart-item-checkbox:checked'))
            .map(checkbox => checkbox.dataset.cartid);
        
        if (selectedItems.length === 0) {
            alert('Please select at least one item to checkout');
            return;
        }
        
        // Store selected items for checkout
        sessionStorage.setItem('selectedCartItems', JSON.stringify(selectedItems));
        window.location.href = '/checkout.html';
    });
}

// Update the addToCart function to include cartId
window.addToCart = async function(cartItem) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please login to add items to cart');
        return false;
    }

    try {
        // Generate a unique cart item ID
        const cartItemId = generateCartItemId();
        
        // Create the cart item structure
        const cartItemData = {
            shopId: cartItem.shopId,
            shoeId: cartItem.shoeId,
            variantKey: cartItem.variantKey,
            sizeKey: cartItem.sizeKey,
            quantity: cartItem.quantity || 1,
            addedAt: new Date().toISOString()
        };

        // Save to Firebase with the cartItemId as key
        const cartRef = ref(db, `AR_shoe_users/carts/${user.uid}/${cartItemId}`);
        await set(cartRef, cartItemData);
        
        console.log("Item added to cart successfully");
        return true;
        
    } catch (error) {
        console.error("Error adding to cart:", error);
        alert("Failed to add item to cart");
        return false;
    }
};