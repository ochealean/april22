import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, update, set, get, off } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
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

let userID;

// Hide body initially
document.body.style.display = 'none';

// Add this at the beginning of your checkout.js, after the imports
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        method: params.get('method'),
        shopId: params.get('shopId'),
        shoeId: params.get('shoeId'),
        variantKey: params.get('variantKey'),
        sizeKey: params.get('sizeKey'),
        size: params.get('size'),
        quantity: parseInt(params.get('quantity')) || 1,
        price: parseFloat(params.get('price')) || 0,
        shoeName: params.get('shoeName'),
        variantName: params.get('variantName'),
        color: params.get('color'),
        image: params.get('image')
    };
}

// Check auth state and load user data
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log("Auth state: User is logged in", user.uid);
        console.log("User email: ", user.email);
        userID = user.uid;

        get(ref(db, `AR_shoe_users/customer/${user.uid}`))
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();

                    // Update profile display elements
                    if (document.getElementById('userName_display1')) {
                        document.getElementById('userName_display1').textContent = userData.firstName;
                    }
                    if (document.getElementById('userName_display2')) {
                        document.getElementById('userName_display2').textContent = userData.firstName + " " + userData.lastName;
                    }
                    if (document.getElementById('imageProfile')) {
                        document.getElementById('imageProfile').src = userData.profilePhoto?.profilePhoto?.url || "https://firebasestorage.googleapis.com/v0/b/opportunity-9d3bf.appspot.com/o/profile%2Fdefault_profile.png?alt=media&token=5f1a4b8c-7e6b-4f1c-8a2d-0e5f3b7c4a2e";
                    }

                    // Autofill checkout form fields with user data
                    if (document.getElementById('firstName')) {
                        document.getElementById('firstName').value = userData.firstName || '';
                    }
                    if (document.getElementById('lastName')) {
                        document.getElementById('lastName').value = userData.lastName || '';
                    }
                    if (document.getElementById('email')) {
                        document.getElementById('email').value = user.email || '';
                    }
                    if (document.getElementById('phone')) {
                        document.getElementById('phone').value = userData.phone || '';
                    }
                    if (document.getElementById('address')) {
                        document.getElementById('address').value = userData.address || '';
                    }
                    if (document.getElementById('city')) {
                        document.getElementById('city').value = userData.city || '';
                    }
                    if (document.getElementById('zip')) {
                        document.getElementById('zip').value = userData.zip || '';
                    }
                    if (document.getElementById('country')) {
                        document.getElementById('country').value = userData.country || '';
                    }

                    document.body.style.display = '';

                    // Load order summary
                    loadOrderSummary();

                    // Set up event listeners after form is populated
                    setupEventListeners();
                } else {
                    alert("Account does not exist");
                    signOut(auth);
                }
            })
            .catch((error) => {
                console.error("Error loading user data:", error);
                alert("Error loading user data. Please try again.");
            });
    } else {
        // User is signed out
        console.log("Auth state: User is logged out");
        window.location.href = "/user_login.html";
    }
});

// Function to set up all event listeners
function setupEventListeners() {
    // Place order button
    document.getElementById('placeOrderBtn')?.addEventListener('click', function () {
        if (validateForm()) {
            placeOrder();
        }
    });

    // Logout button if exists
    document.getElementById('logout_btn')?.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("User signed out");
        }).catch((error) => {
            console.error("Error signing out: ", error);
        });
    });
}

// Function to get cart from Firebase
async function getCart(userId) {
    try {
        // 1. First check localStorage (for Buy Now flow)
        const localCart = JSON.parse(localStorage.getItem('cart'));
        if (localCart && localCart.length > 0) {
            console.log("Using local cart data:", localCart);
            return localCart;
        }

        // 2. Fallback to Firebase (for regular cart flow)
        const cartRef = ref(db, `AR_shoe_users/carts/${userId}`);
        const snapshot = await get(cartRef);

        if (snapshot.exists()) {
            console.log("Firebase cart data:", snapshot.val());
            let cart = snapshot.val();
            return Array.isArray(cart) ? cart : Object.values(cart);
        }

        return [];
    } catch (error) {
        console.error("Cart error:", error);
        return [];
    }
}

// Function to load order summary
// Updated loadOrderSummary
// eto yung nakikita natin na nagdidisplay ng data from database to UI
async function loadOrderSummary() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = "/user_login.html";
        return;
    }

    const urlParams = getUrlParams();
    if (urlParams.method === "buyNow" && urlParams.shoeId) {
        const orderItem = {
            shopId: urlParams.shopId,
            shoeId: urlParams.shoeId,
            variantKey: urlParams.variantKey,
            sizeKey: urlParams.sizeKey,
            size: urlParams.size,
            quantity: urlParams.quantity,
            price: urlParams.price,
            name: urlParams.shoeName,
            variantName: urlParams.variantName,
            color: urlParams.color,
            imageUrl: urlParams.image
        };
        displaySingleItemOrder(orderItem);
        return;
    }

    try {
        // 🔥 Fetch full cart from Firebase
        const cartRef = ref(db, `AR_shoe_users/carts/${user.uid}`);
        const snapshot = await get(cartRef);

        if (!snapshot.exists()) {
            document.getElementById('orderItems').innerHTML = '<p>Your cart is empty</p>';
            document.getElementById('orderSummary').innerHTML = '';
            return;
        }

        const cartData = snapshot.val();
        const cartArray = Array.isArray(cartData) ? cartData : Object.values(cartData);

        const cartWithDetails = await Promise.all(cartArray.map(async item => {
            const shoeRef = ref(db, `AR_shoe_users/shoe/${item.shopId}/${item.shoeId}`);
            const shoeSnap = await get(shoeRef);

            if (!shoeSnap.exists()) return null;

            const shoeData = shoeSnap.val();
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
        }));

        const validCartItems = cartWithDetails.filter(item => item !== null);

        const orderItemsContainer = document.getElementById('orderItems');
        orderItemsContainer.innerHTML = '';

        validCartItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>${item.variantName} (${item.color})</p>
                    <p>Size: ${item.size}</p>
                    <p>Quantity: ${item.quantity}</p>
                    <p class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</p>
                    ${item.availableStock < item.quantity ? '<p class="stock-warning">Only ' + item.availableStock + ' left in stock!</p>' : ''}
                </div>
            `;
            orderItemsContainer.appendChild(itemElement);
        });

        const subtotal = validCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.1;
        const shipping = 5.00;
        const total = subtotal + tax + shipping;

        document.getElementById('orderSummary').innerHTML = `
            <div class="order-summary-item"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
            <div class="order-summary-item"><span>Tax (10%)</span><span>$${tax.toFixed(2)}</span></div>
            <div class="order-summary-item"><span>Shipping</span><span>$${shipping.toFixed(2)}</span></div>
            <div class="order-summary-item order-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
        `;

    } catch (error) {
        console.error("Error loading order summary:", error);
        alert("Failed to load your cart. Please try again.");
    }
}


// Form validation function
function validateForm() {
    const shippingForm = document.getElementById('shippingForm');
    const requiredFields = shippingForm.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = 'red';
            isValid = false;
        } else {
            field.style.borderColor = '#ddd';
        }
    });

    if (!isValid) {
        alert('Please fill in all required fields');
        return false;
    }

    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;

    if (!paymentMethod) {
        alert('Please select a payment method');
        return false;
    }

    return true;
}

// Helper function to generate unique Order ID (ORD-lengthInt13-charLength6)
function generateOrderId() {
    // Create a timestamp (milliseconds since epoch)
    const timestamp = Date.now().toString();

    // Generate a random alphanumeric string (length 6)
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();

    // Combine them to create a unique order ID (ORD-lengthInt13-charLength6)
    return `ORD-${timestamp}-${randomStr}`;
}

// Function to place order
async function placeOrder() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = "/user_login.html";
        return;
    }

    // Collect form values (shipping information)
    const shippingInfo = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        zip: document.getElementById('zip').value,
        country: document.getElementById('country').value
    };

    // Collect order summary from URL (for "buyNow" flow)
    const urlParams = getUrlParams();
    const orderItem = {
        shopId: urlParams.shopId,
        shoeId: urlParams.shoeId,
        variantKey: urlParams.variantKey,
        sizeKey: urlParams.sizeKey,
        size: urlParams.size,
        quantity: urlParams.quantity,
        price: urlParams.price,
        name: urlParams.shoeName,
        variantName: urlParams.variantName,
        color: urlParams.color,
        imageUrl: urlParams.image
    };

    // Create order ID
    const orderId = generateOrderId();

    // Create the order object to save to Firebase
    const order = {
        orderId: orderId,
        userId: user.uid,
        shippingInfo: shippingInfo,
        items: [orderItem], // Single item for "buyNow" case
        totalAmount: (orderItem.price * orderItem.quantity) + 5.00 + ((orderItem.price * orderItem.quantity) * 0.1), // Subtotal + shipping + tax
        date: new Date().toISOString()
    };

    try {
        // Set the order in the user's transaction node in Firebase
        await set(ref(db, `AR_shoe_users/transactions/${user.uid}/${orderId}`), order);

        // After successfully placing the order, reduce stock for each ordered item
        await reduceStock(order.items);

        // Optionally: Clear the cart after placing the order (if not 'buyNow')
        if (urlParams.method !== 'buyNow') {
            await set(ref(db, `AR_shoe_users/carts/${user.uid}`), null);
        }

        // Show order confirmation modal
        showOrderConfirmationModal(order);
    } catch (error) {
        console.error("Error placing order:", error);
        alert("Error placing your order. Please try again.");
    }
}

// Helper function to reduce stock after placing the order
async function reduceStock(orderItems) {
    for (const item of orderItems) {
        const stockRef = ref(db, `AR_shoe_users/shoe/${item.shopId}/${item.shoeId}/variants/${item.variantKey}/sizes/${item.sizeKey}/${item.size}`);

        // Use get() to fetch stock data once
        try {
            const snapshot = await get(stockRef);
            if (snapshot.exists()) {
                const stockData = snapshot.val();
                const newStock = stockData.stock - item.quantity;

                console.log("New stock for item:", item.shoeId, "is", newStock);

                // Update the stock in Firebase
                await update(stockRef, {
                    stock: newStock
                });
            } else {
                console.error("Stock data not found for item:", item);
            }
        } catch (error) {
            console.error("Error fetching stock data:", error);
        }
    }
}


// Function to show order confirmation modal
function showOrderConfirmationModal(order) {
    const modal = document.getElementById('orderConfirmationModal');
    const orderIdDisplay = document.getElementById('orderIdDisplay');
    const orderEmailDisplay = document.getElementById('orderEmailDisplay');
    const modalOrderSummary = document.getElementById('modalOrderSummary');
    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
    const closeModal = document.querySelector('.close-modal');

    // Set order details in modal
    orderIdDisplay.textContent = order.orderId;
    orderEmailDisplay.textContent = order.shippingInfo.email;

    // Create order summary for modal
    modalOrderSummary.innerHTML = `
        <div class="order-summary-item">
            <span>Subtotal</span>
            <span>$${(order.items[0].price * order.items[0].quantity).toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Tax (10%)</span>
            <span>$${((order.items[0].price * order.items[0].quantity) * 0.1).toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Shipping</span>
            <span>$5.00</span>
        </div>
        <div class="order-summary-item order-total">
            <span>Total</span>
            <span>$${order.totalAmount.toFixed(2)}</span>
        </div>
    `;

    // Show modal
    modal.style.display = 'block';

    // Close modal when clicking X
    closeModal.onclick = function () {
        modal.style.display = 'none';
        window.location.href = '/customer/html/customer_dashboard.html'; // Redirect to dashboard
    }

    // Continue shopping button
    continueShoppingBtn.onclick = function () {
        modal.style.display = 'none';
        window.location.href = '/customer/html/customer_dashboard.html'; // Redirect to dashboard
    }

    // Close modal when clicking outside
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
            window.location.href = '/customer/html/customer_dashboard.html'; // Redirect to dashboard
        }
    }
}


// Helper function to update stock after purchase
// Helper function to update stock after purchase
async function updateStock(cartItems) {
    try {
        // We'll need to fetch each item's full details to get the sizes array
        await Promise.all(cartItems.map(async item => {
            const shoeRef = ref(db, `AR_shoe_users/shoe/${item.shopId}/${item.shoeId}`);
            const snapshot = await get(shoeRef);

            if (snapshot.exists()) {
                const shoeData = snapshot.val();
                const variant = shoeData.variants[item.variantIndex];
                const sizeIndex = variant.sizes.findIndex(s => s.size === item.size);

                if (sizeIndex !== -1) {
                    // Create a reference to the specific size's stock
                    const stockRef = ref(db,
                        `AR_shoe_users/shoe/${item.shopId}/${item.shoeId}/variants/${item.variantIndex}/sizes/${sizeIndex}/stock`
                    );

                    // Calculate new stock value
                    const newStock = variant.sizes[sizeIndex].stock - item.quantity;

                    // Update just this stock value
                    await set(stockRef, newStock);
                }
            }
        }));
    } catch (error) {
        console.error("Error updating stock:", error);
        throw error;
    }
}

// Helper function to find size index
function findSizeIndex(sizesArray, size) {
    return sizesArray.findIndex(s => s.size === size);
}

// Helper function to display single item order from URL parameters
function displaySingleItemOrder(item) {
    const orderItemsContainer = document.getElementById('orderItems');
    orderItemsContainer.innerHTML = '';

    const itemElement = document.createElement('div');
    itemElement.className = 'cart-item';
    itemElement.innerHTML = `
        <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image">
        <div class="cart-item-details">
            <h4>${item.name}</h4>
            <p>${item.variantName} (${item.color})</p>
            <p>Size: ${item.size}</p>
            <p>Quantity: ${item.quantity}</p>
            <p class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</p>
        </div>
    `;
    orderItemsContainer.appendChild(itemElement);

    // Calculate and display order summary
    const subtotal = item.price * item.quantity;
    const tax = subtotal * 0.1; // 10% tax
    const shipping = 5.00; // Flat rate shipping
    const total = subtotal + tax + shipping;

    document.getElementById('orderSummary').innerHTML = `
        <div class="order-summary-item">
            <span>Subtotal</span>
            <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Tax (10%)</span>
            <span>$${tax.toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Shipping</span>
            <span>$${shipping.toFixed(2)}</span>
        </div>
        <div class="order-summary-item order-total">
            <span>Total</span>
            <span>$${total.toFixed(2)}</span>
        </div>
    `;
}