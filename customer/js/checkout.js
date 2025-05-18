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
function getMultipleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const cartIDs = urlParams.get('items')?.split(',') || [];
    return cartIDs.filter(id => id.length > 0); // Filter out empty strings
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
                        userData.country ='Philippines';
                        document.getElementById('country').value = userData.country || '';
                        console.log("Country value set to:", userData.country);
                    }
                    console.log("User data loaded successfully:", userData.country);

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


// Function to load order summary
// Updated loadOrderSummary
// eto yung nakikita natin na nagdidisplay ng data from database to UI
async function loadOrderSummary() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = "/user_login.html";
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const method = urlParams.get('method');
    
    if (method === "buyNow") {
        // Handle buy now flow
        const orderItem = {
            shopId: urlParams.get('shopId'),
            shoeId: urlParams.get('shoeId'),
            variantKey: urlParams.get('variantKey'),
            sizeKey: urlParams.get('sizeKey'),
            size: urlParams.get('size'),
            quantity: parseInt(urlParams.get('quantity')) || 1,
            price: parseFloat(urlParams.get('price')) || 0,
            name: urlParams.get('shoeName'),
            variantName: urlParams.get('variantName'),
            color: urlParams.get('color'),
            imageUrl: urlParams.get('image')
        };
        displaySingleItemOrder(orderItem);
    } 
    else if (method === "cartOrder") {
        const urlParams = new URLSearchParams(window.location.search);
        console.log("URL Parameters:", urlParams);
        // Handle cart order flow
        const cartIds = getCartOrderIds();
        if (cartIds.length > 0) {
            await displayMultipleItemOrder(cartIds);
        } else {
            document.getElementById('orderItems').innerHTML = '<p>No items selected for checkout</p>';
        }
    }
    else {
        // Handle regular cart flow
        try {
            const cartRef = ref(db, `AR_shoe_users/carts/${user.uid}`);
            const snapshot = await get(cartRef);

            if (!snapshot.exists()) {
                document.getElementById('orderItems').innerHTML = '<p>Your cart is empty</p>';
                document.getElementById('orderSummary').innerHTML = '';
                return;
            }

            const cartData = snapshot.val();
            const cartArray = Array.isArray(cartData) ? cartData : Object.values(cartData);
            await displayMultipleItemOrder(cartArray.map((_, index) => index.toString()));
        } catch (error) {
            console.error("Error loading order summary:", error);
            alert("Failed to load your cart. Please try again.");
        }
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
// Function to place order
async function placeOrder() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = "/user_login.html";
        return;
    }

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

    const urlParams = new URLSearchParams(window.location.search);
    const method = urlParams.get('method');
    let orderItems = [];

    if (method === "buyNow") {
        // Single item order
        orderItems = [{
            shopId: urlParams.get('shopId'),
            shoeId: urlParams.get('shoeId'),
            variantKey: urlParams.get('variantKey'),
            shopName: urlParams.get('shopName'),
            sizeKey: urlParams.get('sizeKey'),
            size: urlParams.get('size'),
            quantity: parseInt(urlParams.get('quantity')) || 1,
            price: parseFloat(urlParams.get('price')) || 0,
            name: urlParams.get('shoeName'),
            variantName: urlParams.get('variantName'),
            color: urlParams.get('color'),
            imageUrl: urlParams.get('image') || 'https://via.placeholder.com/150'
        }];
    } else if (method === "cartOrder") {
        // Multi-item order from cart
        const cartIds = getCartOrderIds();
        if (cartIds.length === 0) {
            alert('No items selected for checkout');
            return;
        }

        const cartRef = ref(db, `AR_shoe_users/carts/${user.uid}`);
        const snapshot = await get(cartRef);
        
        if (snapshot.exists()) {
            const fullCart = snapshot.val();
            orderItems = cartIds.map(id => {
                const item = fullCart[id];
                console.log("Item from cart:", item);
                if (!item) return null;
                
                return {
                    ...item,
                    cartId: id,
                    name: item.name || item.shoeName || 'Unknown Product',
                    variantName: item.variantName || 'Default Variant',
                    color: item.color || 'Unknown Color',
                    imageUrl: item.image || 'https://via.placeholder.com/150',
                    price: parseFloat(item.price) || 0,
                    quantity: parseInt(item.quantity) || 1
                };
            }).filter(Boolean);
        }
    }

    if (orderItems.length === 0) {
        alert('No items to order');
        return;
    }

    try {
        // Create a separate order for each item
        for (const item of orderItems) {
            // Generate unique order ID for each item
            const orderId = generateOrderId();
            
            // Calculate totals for this single item
            const subtotal = item.price * item.quantity;
            const tax = subtotal * 0.1;
            const shipping = 5.00;
            const total = subtotal + tax + shipping;

            // Create the order structure
            const order = {
                orderId: orderId,
                userId: user.uid,
                shippingInfo: shippingInfo,
                date: new Date().toISOString(),
                status: 'pending',
                totalAmount: total,
                item: {
                    shopId: item.shopId || '',
                    shoeId: item.shoeId || '',
                    variantKey: item.variantKey || '',
                    shopName: item.shopName || '',
                    sizeKey: item.sizeKey || '',
                    size: item.size || '',
                    quantity: parseInt(item.quantity) || 1,
                    price: parseFloat(item.price) || 0,
                    name: item.name || item.shoeName || 'Unknown Product',
                    variantName: item.variantName || 'Default Variant',
                    color: item.color || 'Unknown Color',
                    imageUrl: item.imageUrl // Directly use the cart item's imageUrl
                }
            };

            console.log("Order to be saved:", order);

            // Save the order to Firebase
            await set(ref(db, `AR_shoe_users/transactions/${user.uid}/${orderId}`), order);

            // Reduce stock for this item
            await reduceStock([item]);

            // Remove this item from cart if this was a cart order
            if (method === "cartOrder" && item.cartId) {
                await set(ref(db, `AR_shoe_users/carts/${user.uid}/${item.cartId}`), null);
            }
        }

        // Show confirmation for the last order (you might want to modify this to show all)
        showOrderConfirmationModal({
            orderId: generateOrderId(), // This will show a new ID, you might want to track all IDs
            shippingInfo: shippingInfo,
            totalAmount: orderItems.reduce((sum, item) => sum + (item.price * item.quantity * 1.1) + 5, 0)
        });
    } catch (error) {
        console.error("Error placing order:", error);
        alert("Error placing your order. Please try again.");
    }
}

// Helper function to reduce stock after placing the order
async function reduceStock(orderItems) {
    const updates = {};
    
    // Prepare all stock updates
    for (const item of orderItems) {
        // Construct the correct path based on your database structure
        const stockPath = `AR_shoe_users/shoe/${item.shopId}/${item.shoeId}/variants/${item.variantKey}/sizes/${item.sizeKey}/${item.size}/stock`;
        try {
            const snapshot = await get(ref(db, stockPath));
            if (snapshot.exists()) {
                const currentStock = snapshot.val();
                if (typeof currentStock === 'number') {
                    updates[stockPath] = currentStock - item.quantity;
                    console.log(`Updating stock for ${item.shoeId}: ${currentStock} -> ${currentStock - item.quantity}`);
                } else {
                    console.error(`Invalid stock value for ${item.shoeId}:`, currentStock);
                }
            } else {
                console.error(`Stock path not found: ${stockPath}`);
            }
        } catch (error) {
            console.error(`Error getting stock for item ${item.shoeId}:`, error);
        }
    }

    // Execute all updates at once
    if (Object.keys(updates).length > 0) {
        try {
            console.log("Applying stock updates:", updates);
            await update(ref(db), updates);
            console.log("Stock updates completed successfully");
        } catch (error) {
            console.error("Error updating stock:", error);
            throw error;
        }
    } else {
        console.warn("No stock updates to apply");
    }
}


// Function to show order confirmation modal
function showOrderConfirmationModal(order) {
    const modal = document.getElementById('orderConfirmationModal');
    const orderIdDisplay = document.getElementById('orderIdDisplay');
    // const orderEmailDisplay = document.getElementById('orderEmailDisplay');
    const modalOrderSummary = document.getElementById('modalOrderSummary');
    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
    const closeModal = document.querySelector('.close-modal');

    // Set order details in modal
    orderIdDisplay.textContent = order.orderId;
    // orderEmailDisplay.textContent = order.shippingInfo.email;

    // Calculate summary for modal
    const subtotal = order.totalAmount - (order.totalAmount * 0.1) - 5.00; // Reverse calculate subtotal
    const tax = order.totalAmount * 0.1;
    const shipping = 5.00;

    // Create order summary for modal
    modalOrderSummary.innerHTML = `
        <div class="order-summary-item">
            <span>Subtotal</span>
            <span>₱${subtotal.toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Tax (10%)</span>
            <span>₱${tax.toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Shipping</span>
            <span>₱${shipping.toFixed(2)}</span>
        </div>
        <div class="order-summary-item order-total">
            <span>Total</span>
            <span>₱${order.totalAmount.toFixed(2)}</span>
        </div>
    `;

    // Show modal
    modal.style.display = 'block';

    // Close modal when clicking X
    closeModal.onclick = function() {
        modal.style.display = 'none';
        window.location.href = '/customer/html/customer_dashboard.html';
    };

    // Continue shopping button
    continueShoppingBtn.onclick = function() {
        modal.style.display = 'none';
        window.location.href = '/customer/html/customer_dashboard.html';
    };

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
            window.location.href = '/customer/html/customer_dashboard.html';
        }
    };
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
            <p class="cart-item-price">₱${(item.price * item.quantity).toFixed(2)}</p>
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
            <span>₱${subtotal.toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Tax (10%)</span>
            <span>₱${tax.toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Shipping</span>
            <span>₱${shipping.toFixed(2)}</span>
        </div>
        <div class="order-summary-item order-total">
            <span>Total</span>
            <span>₱${total.toFixed(2)}</span>
        </div>
    `;
}

async function displayMultipleItemOrder(cartIDs) {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = "/user_login.html";
        return;
    }

    const cartRef = ref(db, `AR_shoe_users/carts/${user.uid}`);
    const snapshot = await get(cartRef);

    if (!snapshot.exists()) {
        document.getElementById('orderItems').innerHTML = '<p>Your cart is empty</p>';
        return;
    }

    const fullCart = snapshot.val();
    console.log("Full cart data:", fullCart);
    
    // Get the specific cart items based on the provided IDs
    const itemsToDisplay = cartIDs
        .map(id => {
            // Handle both array and object formats
            const item = Array.isArray(fullCart) ? fullCart[parseInt(id)] : fullCart[id];
            return item ? { ...item, id } : null;
        })
        .filter(Boolean);

    console.log("Items to display:", itemsToDisplay);

    // Rest of your existing displayMultipleItemOrder function...
    const cartWithDetails = await Promise.all(itemsToDisplay.map(async item => {
        try {
            const shoeRef = ref(db, `AR_shoe_users/shoe/${item.shopId}/${item.shoeId}`);
            const shoeSnap = await get(shoeRef);

            if (!shoeSnap.exists()) {
                console.error("Shoe not found:", item.shoeId);
                return null;
            }

            const shoeData = shoeSnap.val();
            console.log("Shoe data:", shoeData);
            
            // Handle variant data
            const variantKey = item.variantKey || Object.keys(shoeData.variants)[item.variantIndex || 0];
            const variant = shoeData.variants[variantKey];
            
            if (!variant) {
                console.error("Variant not found:", variantKey);
                return null;
            }

            // Find the correct size
            const sizeEntry = Object.entries(variant.sizes).find(
                ([key, sizeObj]) => {
                    const sizeValue = Object.keys(sizeObj)[0];
                    return sizeValue === item.size || key === item.sizeKey;
                }
            );

            if (!sizeEntry) {
                console.error("Size not found for item:", item);
                return null;
            }

            const [sizeKey, sizeObj] = sizeEntry;
            const sizeValue = Object.keys(sizeObj)[0];
            const stock = sizeObj[sizeValue].stock;

            return {
                ...item,
                name: shoeData.shoeName,
                price: parseFloat(variant.price),
                imageUrl: variant.imageUrl || shoeData.defaultImage || 'https://via.placeholder.com/150',
                variantName: variant.variantName,
                color: variant.color,
                size: sizeValue,
                availableStock: stock
            };
        } catch (error) {
            console.error("Error processing item:", item, error);
            return null;
        }
    }));

    // Rest of your display logic...
    const validItems = cartWithDetails.filter(Boolean);
    console.log("Valid items:", validItems);

    const container = document.getElementById('orderItems');
    container.innerHTML = '';

    if (validItems.length === 0) {
        container.innerHTML = '<p>No valid items found in your cart</p>';
        return;
    }

    validItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image" 
                 onerror="this.src='https://via.placeholder.com/150'">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>${item.variantName} (${item.color})</p>
                <p>Size: ${item.size}</p>
                <p>Quantity: ${item.quantity}</p>
                <p class="cart-item-price">₱${(item.price * item.quantity).toFixed(2)}</p>
                ${item.availableStock < item.quantity ? 
                    `<p class="stock-warning">Only ${item.availableStock} left in stock!</p>` : ''}
            </div>
        `;
        container.appendChild(div);
    });

    updateOrderSummary(validItems);
}

function updateOrderSummary(items) {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const shipping = items.length > 0 ? 5.00 : 0;
    const total = subtotal + tax + shipping;

    document.getElementById('orderSummary').innerHTML = `
        <div class="order-summary-item">
            <span>Subtotal</span>
            <span>₱${subtotal.toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Tax (10%)</span>
            <span>₱${tax.toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Shipping</span>
            <span>₱${shipping.toFixed(2)}</span>
        </div>
        <div class="order-summary-item order-total">
            <span>Total</span>
            <span>₱${total.toFixed(2)}</span>
        </div>
    `;
}

function getCartOrderIds() {
    const params = new URLSearchParams(window.location.search);
    const ids = [];
    
    // Get all parameters that start with 'cartOrder_'
    params.forEach((value, key) => {
        if (key.startsWith('cartOrder_')) {
            ids.push(value);
        }
    });
    
    return ids;
}