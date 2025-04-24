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

// Main auth state handler
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Auth state: User is logged in", user.uid);
        
        // Remove previous listener if exists
        if (userListener) off(userListener);
        
        try {
            // Set up realtime listener for user data
            await setupUserListener(user);
        } catch (error) {
            console.error("Error setting up user listener:", error);
            alert("Error loading user data. Please try again.");
        }
    } else {
        // User is signed out - clean up
        cleanupListeners();
        console.log("Auth state: User is logged out");
        window.location.href = "/user_login.html";
    }
});

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

// Set up realtime cart listener
async function setupCartListener(userId) {
    return new Promise((resolve) => {
        if (cartListener) off(cartListener);
        
        const cartRef = ref(db, `AR_shoe_users/carts/${userId}`);
        cartListener = onValue(cartRef, async (snapshot) => {
            if (snapshot.exists()) {
                let cart = snapshot.val();
                cart = Array.isArray(cart) ? cart : Object.values(cart);
                await processCartItems(userId, cart);
                resolve();
            } else {
                showEmptyCart();
                resolve();
            }
        });
    });
}

// Process cart items with real-time updates
async function processCartItems(userId, cart) {
    if (cart.length === 0) {
        showEmptyCart();
        return;
    }
    
    showCartContainer();
    
    try {
        const cartWithDetails = await Promise.all(cart.map(async (item) => {
            try {
                const shoeRef = ref(db, `AR_shoe_users/shoe/${item.shopId}/${item.shoeId}`);
                const snapshot = await get(shoeRef);
                
                if (!snapshot.exists()) {
                    console.error(`Shoe not found: ${item.shopId}/${item.shoeId}`);
                    return null;
                }
                
                const shoeData = snapshot.val();
                const variant = shoeData.variants[item.variantIndex];
                const sizeInfo = variant.sizes.find(s => s.size === item.size);
                
                return {
                    ...item,
                    name: shoeData.shoeName,
                    price: parseFloat(variant.price),
                    imageUrl: variant.imageUrl || shoeData.defaultImage,
                    variantName: variant.variantName,
                    color: variant.color,
                    availableStock: sizeInfo ? sizeInfo.stock : 0
                };
            } catch (error) {
                console.error(`Error loading shoe details for ${item.shopId}/${item.shoeId}:`, error);
                return null;
            }
        }));
        
        const validCartItems = cartWithDetails.filter(item => item !== null);
        
        if (validCartItems.length !== cart.length) {
            await updateCartInFirebase(userId, validCartItems);
        }
        
        displayCartItems(validCartItems);
    } catch (error) {
        console.error("Error processing cart:", error);
        alert("Failed to load your cart. Please try again.");
        throw error;
    }
}

// Display cart items
function displayCartItems(cartItems) {
    const cartContainer = document.getElementById('cartContainer');
    cartContainer.innerHTML = '';
    
    const cartItemsSection = document.createElement('div');
    cartItemsSection.className = 'cart-items';
    
    cartItems.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <h3 class="cart-item-name">${item.name}</h3>
                <p class="cart-item-variant">${item.variantName} (${item.color}) - Size: ${item.size}</p>
                <p class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</p>
                
                <div class="quantity-controls">
                    <button class="quantity-btn" data-index="${index}" data-change="-1">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
                           max="${item.availableStock}" data-index="${index}">
                    <button class="quantity-btn" data-index="${index}" data-change="1">+</button>
                </div>
                
                <button class="remove-btn" data-index="${index}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        cartItemsSection.appendChild(itemElement);
    });
    
    cartContainer.appendChild(cartItemsSection);
    createCartSummary(cartItems);
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

// Update cart in Firebase
async function updateCartInFirebase(userId, cartItems) {
    try {
        const cartData = cartItems.map(item => ({
            shopId: item.shopId,
            shoeId: item.shoeId,
            variantIndex: item.variantIndex,
            size: item.size,
            quantity: item.quantity
        }));
        
        const cartRef = ref(db, `AR_shoe_users/carts/${userId}`);
        await set(cartRef, cartData);
    } catch (error) {
        console.error("Error updating cart in Firebase:", error);
        throw error;
    }
}

// Cart manipulation functions
async function updateQuantity(index, change) {
    try {
        const userId = auth.currentUser.uid;
        const cartRef = ref(db, `AR_shoe_users/carts/${userId}`);
        const snapshot = await get(cartRef);
        
        if (snapshot.exists()) {
            let cart = snapshot.val();
            cart = Array.isArray(cart) ? cart : Object.values(cart);
            
            const newQuantity = cart[index].quantity + change;
            if (newQuantity < 1) return;
            
            cart[index].quantity = newQuantity;
            await set(cartRef, cart);
        }
    } catch (error) {
        console.error("Error updating quantity:", error);
        alert("Failed to update quantity. Please try again.");
    }
}

async function updateQuantityInput(index, value) {
    try {
        const userId = auth.currentUser.uid;
        const cartRef = ref(db, `AR_shoe_users/carts/${userId}`);
        const snapshot = await get(cartRef);
        
        if (snapshot.exists()) {
            let cart = snapshot.val();
            cart = Array.isArray(cart) ? cart : Object.values(cart);
            
            const newQuantity = parseInt(value);
            if (isNaN(newQuantity)) return;
            
            cart[index].quantity = newQuantity;
            await set(cartRef, cart);
        }
    } catch (error) {
        console.error("Error updating quantity:", error);
        alert("Failed to update quantity. Please try again.");
    }
}

async function removeItem(index) {
    try {
        const userId = auth.currentUser.uid;
        const cartRef = ref(db, `AR_shoe_users/carts/${userId}`);
        const snapshot = await get(cartRef);
        
        if (snapshot.exists()) {
            let cart = snapshot.val();
            cart = Array.isArray(cart) ? cart : Object.values(cart);
            
            cart.splice(index, 1);
            await set(cartRef, cart);
        }
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

// Event listeners setup
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
        if (e.target.classList.contains('quantity-btn')) {
            const index = parseInt(e.target.dataset.index);
            const change = parseInt(e.target.dataset.change);
            await updateQuantity(index, change);
        }
        
        if (e.target.classList.contains('remove-btn') || e.target.closest('.remove-btn')) {
            const btn = e.target.classList.contains('remove-btn') ? e.target : e.target.closest('.remove-btn');
            const index = parseInt(btn.dataset.index);
            await removeItem(index);
        }
    });

    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const index = parseInt(e.target.dataset.index);
            await updateQuantityInput(index, e.target.value);
        }
    });

    document.getElementById('checkoutBtn')?.addEventListener('click', () => {
        window.location.href = '/checkout.html';
    });
}