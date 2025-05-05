import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, set, get, off } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase config
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
const auth = getAuth();
const db = getDatabase(app);

let cartItems = [];

// Auth state listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadCart(user.uid);
        loadUserProfile(user.uid);
    } else {
        window.location.href = "/user_login.html";
    }
});

// Load cart from Firebase
async function loadCart(userId) {
    const cartRef = ref(db, `AR_shoe_users/carts/${userId}`);
    onValue(cartRef, async (snapshot) => {
        if (!snapshot.exists()) {
            createCartSummary();
            showEmptyCart();
            return;
        }

        const cartData = snapshot.val();
        console.log("Cart data:", cartData);
        cartItems = await Promise.all(Object.entries(cartData).map(async ([cartId, item]) => {
            try {
                const shoeRef = ref(db, `AR_shoe_users/shoe/${item.shopId}/${item.shoeId}`);
                const shoeSnap = await get(shoeRef);
        
                if (!shoeSnap.exists()) return null;
        
                const shoeData = shoeSnap.val();
                const variant = shoeData.variants?.[item.variantKey];
                if (!variant) return null;
        
                const sizeObj = variant.sizes?.[item.sizeKey];
                if (!sizeObj) return null;
        
                const sizeValue = Object.keys(sizeObj)[0];
                if (!sizeValue) return null;
        
                const stock = sizeObj[sizeValue]?.stock || 0;
        
                return {
                    cartId,
                    shopId: item.shopId,
                    shoeId: item.shoeId,
                    variantKey: item.variantKey,
                    sizeKey: item.sizeKey,
                    quantity: item.quantity || 1,
                    shoeName: shoeData.shoeName,
                    price: parseFloat(variant.price),
                    imageUrl: variant.imageUrl || shoeData.defaultImage,
                    variantName: variant.variantName,
                    color: variant.color,
                    size: sizeValue,
                    availableStock: stock
                };
            } catch (err) {
                console.error(err);
                return null;
            }
        }));

        cartItems = cartItems.filter(item => item !== null);
        console.log("Cart items:", cartItems);
        renderCart();
    });
}

// Render cart items
function renderCart() {
    const cartContainer = document.getElementById("cartContainer");
    const cartSummaryContainer = document.getElementById("cartsummarycontainer");
    cartContainer.innerHTML = "";
    cartSummaryContainer.innerHTML = "";

    if (cartItems.length === 0) {
        createCartSummary();
        showEmptyCart();
        return;
    }

    const cartItemsSection = document.createElement('div');
    cartItemsSection.className = 'cart-items';

    cartItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-select">
                <input type="checkbox" class="cart-item-checkbox" data-cartid="${item.cartId}" checked>
            </div>

            <div class="cart-item-picture">
                <img src="${item.imageUrl}" alt="${item.shoeName}" class="cart-item-image" 
                     onerror="this.src='https://via.placeholder.com/150'">
            </div>

            <div class="cart-item-details">
                <h3 class="cart-item-name">${item.shoeName}</h3>
                <p class="cart-item-variant">${item.variantName} (${item.color}) - Size: ${item.size}</p>
                <p class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</p>

                <div class="quantity-controls">
                    <button class="quantity-btn" data-cartid="${item.cartId}" data-change="-1">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" 
                           min="1" max="${item.availableStock}" data-cartid="${item.cartId}">
                    <button class="quantity-btn" data-cartid="${item.cartId}" data-change="1">+</button>
                </div>

                <div class="cta-btn">
                    <button class="delete-btn" data-cartid="${item.cartId}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    <button class="feedback-btn" data-cartid="${item.cartId}">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                </div>
            </div>
        `;

        cartItemsSection.appendChild(itemElement);
    });

    cartContainer.appendChild(cartItemsSection);

    // Add event listeners
    setupCartEventListeners();
    createCartSummary();
}

// Setup cart event listeners
function setupCartEventListeners() {
    // Delete button handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const cartId = e.target.dataset.cartid;
            const confirmDelete = confirm("Are you sure you want to delete this item?");
            if (!confirmDelete) return;
    
            try {
                await set(ref(db, `AR_shoe_users/carts/${auth.currentUser.uid}/${cartId}`), null);
                cartItems = cartItems.filter(item => item.cartId !== cartId);
                renderCart();
            } catch (error) {
                console.error("Error deleting item:", error);
            }
        });
    });

    // Quantity button handlers
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const cartId = e.target.dataset.cartid;
            const change = parseInt(e.target.dataset.change);
            const item = cartItems.find(i => i.cartId === cartId);
            if (!item) return;

            const newQty = item.quantity + change;
            if (newQty >= 1 && newQty <= item.availableStock) {
                item.quantity = newQty;
                await set(ref(db, `AR_shoe_users/carts/${auth.currentUser.uid}/${cartId}/quantity`), newQty);
                renderCart();
            }
        });
    });

    // Quantity input handlers
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            const cartId = e.target.dataset.cartid;
            const value = parseInt(e.target.value);
            const item = cartItems.find(i => i.cartId === cartId);
            if (!item) return;

            if (!isNaN(value) && value >= 1 && value <= item.availableStock) {
                item.quantity = value;
                await set(ref(db, `AR_shoe_users/carts/${auth.currentUser.uid}/${cartId}/quantity`), value);
                renderCart();
            } else {
                e.target.value = item.quantity; // Reset to previous value
            }
        });
    });

    // Checkbox handlers
    document.querySelectorAll('.cart-item-checkbox').forEach(cb => {
        cb.addEventListener('change', updateTotals);
    });

    // View Details button handlers
    document.querySelectorAll('.feedback-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cartId = e.target.dataset.cartid;
            const item = cartItems.find(i => i.cartId === cartId);
            if (item) {
                window.location.href = `/customer/html/product_details.html?shopId=${item.shopId}&shoeId=${item.shoeId}`;
            }
        });
    });
}

// Create cart summary
function createCartSummary() {
    const cartSummaryContainer = document.getElementById("cartsummarycontainer");
    cartSummaryContainer.innerHTML = '';

    const summary = document.createElement('div');
    summary.className = 'cart-summary';
    summary.id = 'cart-summary';

    summary.innerHTML = `
        <div class="summary-row">
            <span>Subtotal</span>
            <span id="subtotal">$0.00</span>
        </div>
        <div class="summary-row">
            <span>Tax (10%)</span>
            <span id="tax">$0.00</span>
        </div>
        <div class="summary-row">
            <span>Shipping</span>
            <span id="shipping">$5.00</span>
        </div>
        <div class="summary-row summary-total">
            <span>Total</span>
            <span id="total">$0.00</span>
        </div>
        <button class="checkout-btn" id="checkoutBtn">Proceed to Checkout</button>
        <a href="/customer/html/customer_dashboard.html" class="continue-shopping">
            <i class="fas fa-arrow-left"></i> Continue Shopping
        </a>
    `;

    cartSummaryContainer.appendChild(summary);

    // Add checkout button handler
    document.getElementById("checkoutBtn")?.addEventListener("click", () => {
        const checkedItems = Array.from(document.querySelectorAll('.cart-item-checkbox:checked'))
            .map(cb => {
                const cartId = cb.dataset.cartid;
                return cartItems.find(item => item.cartId === cartId);
            })
            .filter(Boolean);

        if (checkedItems.length === 0) {
            alert("Please select at least one item to proceed to checkout.");
            return;
        }

        // Prepare checkout URL with all selected items
        const params = new URLSearchParams();
        params.append("method", "cartOrder");
        
        checkedItems.forEach((item, index) => {
            params.append(`cartOrder_${index + 1}`, item.cartId);
        });

        window.location.href = `checkout.html?${params.toString()}`;
    });

    updateTotals();
}

// Update order totals
function updateTotals() {
    const checkedCartIds = Array.from(document.querySelectorAll('.cart-item-checkbox:checked'))
        .map(cb => cb.dataset.cartid);
    const selectedItems = cartItems.filter(item => checkedCartIds.includes(item.cartId));

    const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const shipping = selectedItems.length > 0 ? 5.0 : 0.0;
    const total = subtotal + tax + shipping;

    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const shippingEl = document.getElementById('shipping');
    const totalEl = document.getElementById('total');

    if (subtotalEl) subtotalEl.innerText = `$${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.innerText = `$${tax.toFixed(2)}`;
    if (shippingEl) shippingEl.innerText = `$${shipping.toFixed(2)}`;
    if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
}

// Show empty cart message
function showEmptyCart() {
    const cartContainer = document.getElementById("cartContainer");
    cartContainer.innerHTML = `
        <div id="emptyCartMessage">
            Your cart is empty.
            <a href="/customer/html/customer_dashboard.html" class="continue-shopping">
                Continue Shopping
            </a>
        </div>
    `;
}

// Load and display user profile
function loadUserProfile(userId) {
    const userRef = ref(db, `AR_shoe_users/customer/${userId}`);
    get(userRef).then(snapshot => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            displayUserProfile(userData);
        } else {
            console.log("No user profile data found.");
        }
    }).catch(error => {
        console.error("Error loading user profile:", error);
    });
}

// Display user profile
function displayUserProfile(userData) {
    const userNameDisplay = document.getElementById("userName_display1");
    const imageProfile = document.getElementById("imageProfile");
    
    if (userNameDisplay) {
        userNameDisplay.textContent = `${userData.firstName || ''} ${userData.lastName || ''}`;
    }
    
    if (imageProfile) {
        imageProfile.src = userData.profilePhoto?.profilePhoto?.url || 'https://via.placeholder.com/150';
        imageProfile.onerror = () => {
            imageProfile.src = 'https://via.placeholder.com/150';
        };
    }
}