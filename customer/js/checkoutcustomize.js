import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, child, set } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
const db = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const shippingForm = document.getElementById('shippingForm');
const confirmOrderBtn = document.getElementById('confirmOrderBtn');
const backToCustomizeBtn = document.getElementById('backToCustomizeBtn');
const orderConfirmationModal = document.getElementById('orderConfirmationModal');
const viewOrderBtn = document.getElementById('viewOrderBtn');

// Order data from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');
let orderData = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load user profile
    loadUserProfile();
    
    // Load order data if orderId exists in URL
    if (orderId) {
        loadOrderData(orderId);
    } else {
        // If no orderId, redirect back to customize page
        window.location.href = '/customer/html/customizeshoe.html';
    }
    
    // Initialize event listeners
    initializeEventListeners();
});

// Load user profile data
function loadUserProfile() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const userProfile = document.getElementById('imageProfile');
            const userName = document.getElementById('userName_display2');
            
            // Set default values
            userProfile.src = 'https://via.placeholder.com/150?text=User';
            userName.textContent = 'Guest';
            
            // Get user data from Realtime Database
            get(child(ref(db), `AR_shoe_users/customer/${user.uid}`))
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        updateUserProfile(userData, userProfile, userName);
                        prefillShippingForm(userData);
                    }
                })
                .catch((error) => {
                    console.error('Error getting user data:', error);
                });
        }
    });
}

// Update user profile display
function updateUserProfile(userData, userProfile, userName) {
    if (userData.profilePhoto && userData.profilePhoto.profilePhoto && userData.profilePhoto.profilePhoto.url) {
        userProfile.src = userData.profilePhoto.profilePhoto.url;
    }
    if (userData.firstName || userData.lastName) {
        userName.textContent = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    }
}

// Prefill shipping form with user data
function prefillShippingForm(userData) {
    document.getElementById('firstName').value = userData.firstName || '';
    document.getElementById('lastName').value = userData.lastName || '';
    document.getElementById('address').value = userData.address || '';
    document.getElementById('city').value = userData.city || '';
    document.getElementById('zip').value = userData.zip || '';
    document.getElementById('state').value = userData.state || 'Bataan';
    document.getElementById('country').value = userData.country || 'Philippines';
    document.getElementById('phone').value = userData.phone || '';
    document.getElementById('email').value = userData.email || '';
}

// Load order data from Firebase
async function loadOrderData(orderId) {
    try {
        const userId = await getCurrentUserId();
        const orderRef = ref(db, `AR_shoe_users/boughtshoe/${userId}/${orderId}`);
        
        get(orderRef).then((snapshot) => {
            if (snapshot.exists()) {
                orderData = snapshot.val();
                displayOrderDetails(orderData);
            } else {
                console.error('Order not found');
                window.location.href = '/customer/html/customizeshoe.html';
            }
        });
    } catch (error) {
        console.error('Error loading order data:', error);
        window.location.href = '/customer/html/customizeshoe.html';
    }
}

// Display order details on the page
function displayOrderDetails(order) {
    // Set model name
    document.getElementById('checkoutModelName').textContent = getModelDisplayName(order.model);
    document.getElementById('checkoutSize').textContent = order.size;
    document.getElementById('checkoutProductionTime').textContent = order.productionTime;
    document.getElementById('checkoutTotalPrice').textContent = `₱${order.price.toFixed(2)}`;
    
    // Set modal order details
    document.getElementById('modalOrderNumber').textContent = orderId;
    document.getElementById('modalOrderTotal').textContent = `₱${order.price.toFixed(2)}`;
    document.getElementById('modalDeliveryDate').textContent = order.productionTime;
    
    // Display customization details
    const customizationDetails = document.getElementById('customizationDetails');
    customizationDetails.innerHTML = '';
    
    if (order.model === 'classic') {
        // Classic shoe customization
        const selections = order.selections;
        
        // Sole
        addCustomizationDetail(customizationDetails, 'Sole', selections.sole.id, selections.sole.price);
        
        // Upper
        addCustomizationDetail(customizationDetails, 'Upper', selections.upper.id, selections.upper.price);
        addColorDetail(customizationDetails, 'Upper Color', selections.upper.color);
        
        // Laces
        addCustomizationDetail(customizationDetails, 'Laces', selections.laces.id, selections.laces.price);
        addColorDetail(customizationDetails, 'Laces Color', selections.laces.color);
        
        // Body and Heel colors
        addColorDetail(customizationDetails, 'Body Color', selections.bodyColor);
        addColorDetail(customizationDetails, 'Heel Color', selections.heelColor);
        
        // Set preview images
        document.getElementById('checkoutSoleImage').src = selections.sole.image;
        document.getElementById('checkoutUpperImage').src = selections.upper.image;
        document.getElementById('checkoutLacesImage').src = selections.laces.image;
        
    } else if (order.model === 'runner') {
        // Runner shoe customization
        const selections = order.selections;
        
        // Sole
        addCustomizationDetail(customizationDetails, 'Sole', selections.sole.id, selections.sole.price);
        
        // Upper
        addCustomizationDetail(customizationDetails, 'Upper', selections.upper.id, selections.upper.price);
        
        // Colors
        addColorDetail(customizationDetails, 'Body Color', selections.bodyColor);
        addColorDetail(customizationDetails, 'Collar Color', selections.collarColor);
        
        // Set preview images
        document.getElementById('checkoutSoleImage').src = selections.sole.image;
        document.getElementById('checkoutUpperImage').src = selections.upper.image;
        
    } else if (order.model === 'basketball') {
        // Basketball shoe customization
        const selections = order.selections;
        
        // Sole
        addCustomizationDetail(customizationDetails, 'Sole', selections.sole.id, selections.sole.price);
        
        // Upper
        addCustomizationDetail(customizationDetails, 'Upper', selections.upper.id, selections.upper.price);
        
        // Colors
        addColorDetail(customizationDetails, 'Mudguard Color', selections.mudguardColor);
        addColorDetail(customizationDetails, 'Heel Color', selections.heelColor);
        
        // Set preview images
        document.getElementById('checkoutSoleImage').src = selections.sole.image;
        document.getElementById('checkoutUpperImage').src = selections.upper.image;
        
    } else if (order.model === 'slipon') {
        // Slipon shoe customization
        const selections = order.selections;
        
        // Midsole
        addCustomizationDetail(customizationDetails, 'Midsole', selections.midsole.id, selections.midsole.price);
        
        // Colors
        addColorDetail(customizationDetails, 'Midsole Color', selections.midsoleColor);
        addColorDetail(customizationDetails, 'Outsole Color', selections.outsoleColor);
        
        // Set preview images
        document.getElementById('checkoutSoleImage').src = selections.midsole.image;
    }
}

// Helper function to add customization detail row
function addCustomizationDetail(container, label, value, price) {
    const detailRow = document.createElement('div');
    detailRow.className = 'detail-row';
    
    detailRow.innerHTML = `
        <span class="detail-label">${label}:</span>
        <span class="detail-value">${value} (+₱${price.toFixed(2)})</span>
    `;
    
    container.appendChild(detailRow);
}

// Helper function to add color detail row
function addColorDetail(container, label, color) {
    const detailRow = document.createElement('div');
    detailRow.className = 'detail-row';
    
    detailRow.innerHTML = `
        <span class="detail-label">${label}:</span>
        <span class="detail-value">
            <span class="color-indicator" style="background-color: ${color};"></span>
            ${color}
        </span>
    `;
    
    container.appendChild(detailRow);
}

// Helper function to get display name for model
function getModelDisplayName(model) {
    const modelNames = {
        'classic': 'Classic Sneaker',
        'runner': 'Running Shoe',
        'basketball': 'Basketball Shoe',
        'slipon': 'Slip-On Shoe'
    };
    return modelNames[model] || model;
}

// Get current user ID
function getCurrentUserId() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                resolve(user.uid);
            } else {
                reject('No user logged in');
            }
        });
    });
}

// Initialize event listeners
function initializeEventListeners() {
    // Mobile sidebar toggle
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
    
    // Back to customize button
    backToCustomizeBtn.addEventListener('click', () => {
        window.location.href = '/customer/html/customizeshoe.html';
    });
    
    // View order button in modal
    viewOrderBtn.addEventListener('click', () => {
        window.location.href = `/customer/html/customization_pendingOrders.html?orderId=${orderId}`;
    });
    
    // Form submission
    shippingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            confirmOrderBtn.disabled = true;
            confirmOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            // Update order with shipping and payment info
            await updateOrderWithShippingInfo();
            
            // Show confirmation modal
            orderConfirmationModal.style.display = 'flex';
            
        } catch (error) {
            console.error('Error confirming order:', error);
            alert('There was an error confirming your order. Please try again.');
            confirmOrderBtn.disabled = false;
            confirmOrderBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Order';
        }
    });
}

// Update order with shipping information
async function updateOrderWithShippingInfo() {
    const userId = await getCurrentUserId();
    const orderRef = ref(db, `AR_shoe_users/boughtshoe/${userId}/${orderId}`);
    
    // Get form values
    const shippingInfo = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        zip: document.getElementById('zip').value,
        country: document.getElementById('country').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value
    };
    
    // Get payment method
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    // Update order data
    const updates = {
        ...orderData,
        shippingInfo: shippingInfo,
        paymentMethod: paymentMethod,
        status: 'processing',
        statusUpdates: {
            ...orderData.statusUpdates,
            processing: {
                status: 'processing',
                timestamp: Date.now(),
                message: 'Order is being processed'
            }
        }
    };
    
    // Update in boughtshoe
    await set(orderRef, updates);
    
    // Also update in transactions
    const transactionRef = ref(db, `AR_shoe_users/customizedtransactions/${userId}/${orderId}`);
    await set(transactionRef, {
        ...updates,
        date: new Date().toISOString(),
        item: {
            name: `Custom ${orderData.model} shoe`,
            price: orderData.price,
            quantity: 1,
            size: orderData.size,
            isCustom: true,
            image: orderData.image
        },
        status: "pending",
        totalAmount: orderData.price,
        userId: userId,
        shippingInfo: shippingInfo,
        paymentMethod: paymentMethod
    });
}