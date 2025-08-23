import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, child, set, remove } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
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
const backButton = document.querySelector('.back-button');

// Order data from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');
let orderData = null;
let orderConfirmed = false;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, loading user profile...');
    // Load user profile
    loadUserProfile();
    
    // Load order data if orderId exists in URL
    if (orderId) {
        console.log('Order ID found:', orderId);
        loadOrderData(orderId);
    } else {
        console.log('No order ID found, redirecting...');
        // If no orderId, redirect back to customize page
        window.location.href = '/customer/html/customizeshoe.html';
    }
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Add beforeunload event to handle browser/tab closing
    window.addEventListener('beforeunload', handleBeforeUnload);
});

// Handle beforeunload event
function handleBeforeUnload(e) {
    if (!orderConfirmed && orderId) {
        // Delete the order if not confirmed
        deleteOrderFromDatabase();
        
        // Standard way to show confirmation dialog
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
}

// Delete order from database
async function deleteOrderFromDatabase() {
    try {
        const userId = await getCurrentUserId();
        
        // Remove from boughtshoe
        const boughtshoeRef = ref(db, `AR_shoe_users/boughtshoe/${userId}/${orderId}`);
        await remove(boughtshoeRef);
        
        // Remove from customizedtransactions if exists
        const transactionRef = ref(db, `AR_shoe_users/customizedtransactions/${userId}/${orderId}`);
        await remove(transactionRef);
        
        console.log('Order deleted successfully');
    } catch (error) {
        console.error('Error deleting order:', error);
    }
}

// Load user profile data
function loadUserProfile() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
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
                        console.log('User data retrieved:', userData);
                        updateUserProfile(userData, userProfile, userName);
                        prefillShippingForm(userData);
                    } else {
                        console.log('No user data found in database');
                        // Remove readonly if no user data exists
                        removeReadOnlyFromForm();
                    }
                })
                .catch((error) => {
                    console.error('Error getting user data:', error);
                    // Remove readonly on error
                    removeReadOnlyFromForm();
                });
        } else {
            console.log('No user authenticated');
            // Remove readonly if no user is authenticated
            removeReadOnlyFromForm();
        }
    });
}

function removeReadOnlyFromForm() {
    const formFields = [
        'firstName', 'lastName', 'address', 'city', 'zip', 
        'state', 'country', 'phone', 'email'
    ];
    
    formFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.removeAttribute('readonly');
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

// Prefill shipping form with user data and function with fallbacks
function prefillShippingForm(userData) {
    console.log('Prefilling form with:', userData);
    
    // Default values
    const defaults = {
        'firstName': '',
        'lastName': '',
        'address': '',
        'city': '',
        'zip': '',
        'state': 'Bataan',
        'country': 'Philippines',
        'phone': '',
        'email': ''
    };
    
    // Merge user data with defaults
    const formData = { ...defaults, ...userData };
    
    // Fill text input fields
    const textFields = ['firstName', 'lastName', 'address', 'city', 'zip', 'state', 'phone', 'email'];
    
    textFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.value = formData[field] || '';
        }
    });
    
    // Handle country select
    const countrySelect = document.getElementById('country');
    if (countrySelect) {
        // Try to find the option with the user's country
        const options = countrySelect.options;
        let found = false;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === formData.country) {
                countrySelect.selectedIndex = i;
                found = true;
                break;
            }
        }
        
        // If country not found in options, select Philippines as default
        if (!found) {
            for (let i = 0; i < options.length; i++) {
                if (options[i].value === 'Philippines') {
                    countrySelect.selectedIndex = i;
                    break;
                }
            }
        }
    }
    
    console.log('Form pre-filled successfully');
}

// Load order data from Firebase
async function loadOrderData(orderId) {
    try {
        const userId = await getCurrentUserId();
        const orderRef = ref(db, `AR_shoe_users/boughtshoe/${userId}/${orderId}`);
        
        get(orderRef).then((snapshot) => {
            if (snapshot.exists()) {
                orderData = snapshot.val();
                console.log('Order data loaded:', orderData);
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
    console.log('Displaying order details:', order);
    
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
    
    // Clear all preview images first
    document.getElementById('checkoutSoleImage').src = '';
    document.getElementById('checkoutUpperImage').src = '';
    document.getElementById('checkoutLacesImage').src = '';
    document.getElementById('checkoutTongueImage').src = '';
    
    const selections = order.selections;
     
    if (order.model === 'classic') {
        // Classic shoe customization
        // Sole
        if (selections.sole) {
            addCustomizationDetail(customizationDetails, 'Sole', selections.sole.id, selections.sole.price);
            document.getElementById('checkoutSoleImage').src = selections.sole.image;
        }
        
        // Upper
        if (selections.upper) {
            addCustomizationDetail(customizationDetails, 'Upper', selections.upper.id, selections.upper.price);
            if (selections.upper.color) {
                addColorDetail(customizationDetails, 'Upper Color', selections.upper.color);
            }
            document.getElementById('checkoutUpperImage').src = selections.upper.image;
        }
        
        // Laces
        if (selections.laces) {
            addCustomizationDetail(customizationDetails, 'Laces', selections.laces.id, selections.laces.price);
            if (selections.laces.color) {
                addColorDetail(customizationDetails, 'Laces Color', selections.laces.color);
            }
            document.getElementById('checkoutLacesImage').src = selections.laces.image;
        }
        
        // NEW: Insole
        if (selections.insole) {
            addCustomizationDetail(customizationDetails, 'Insole', selections.insole.id, selections.insole.price);
            // If insole has an image, you could display it
            if (selections.insole.image && selections.insole.image !== '#') {
                // You might want to add a new image element for insole or use an existing one
                document.getElementById('checkoutTongueImage').src = selections.insole.image;
            }
        }
        
        // Body and Heel colors
        if (selections.bodyColor) {
            addColorDetail(customizationDetails, 'Body Color', selections.bodyColor);
        }
        if (selections.heelColor) {
            addColorDetail(customizationDetails, 'Heel Color', selections.heelColor);
        }
        
    } else if (order.model === 'runner') {
        // Runner shoe customization
        // Sole
        if (selections.sole) {
            addCustomizationDetail(customizationDetails, 'Sole', selections.sole.id, selections.sole.price);
            document.getElementById('checkoutSoleImage').src = selections.sole.image;
        }
        
        // Upper
        if (selections.upper) {
            addCustomizationDetail(customizationDetails, 'Upper', selections.upper.id, selections.upper.price);
            document.getElementById('checkoutUpperImage').src = selections.upper.image;
        }
        
        // NEW: Insole
        if (selections.insole) {
            addCustomizationDetail(customizationDetails, 'Insole', selections.insole.id, selections.insole.price);
            if (selections.insole.image && selections.insole.image !== '#') {
                document.getElementById('checkoutTongueImage').src = selections.insole.image;
            }
        }
        
        // Colors
        if (selections.bodyColor) {
            addColorDetail(customizationDetails, 'Body Color', selections.bodyColor);
        }
        if (selections.collarColor) {
            addColorDetail(customizationDetails, 'Collar Color', selections.collarColor);
        }
        
        // Laces
        if (selections.laces) {
            addCustomizationDetail(customizationDetails, 'Laces', selections.laces.id, selections.laces.price);
            if (selections.laces.color) {
                addColorDetail(customizationDetails, 'Laces Color', selections.laces.color);
            }
            document.getElementById('checkoutLacesImage').src = selections.laces.image;
        }
        
    } else if (order.model === 'basketball') {
        // Basketball shoe customization
        // Sole
        if (selections.sole) {
            addCustomizationDetail(customizationDetails, 'Sole', selections.sole.id, selections.sole.price);
            document.getElementById('checkoutSoleImage').src = selections.sole.image;
        }
        
        // Upper
        if (selections.upper) {
            addCustomizationDetail(customizationDetails, 'Upper', selections.upper.id, selections.upper.price);
            document.getElementById('checkoutUpperImage').src = selections.upper.image;
        }
        
        // NEW: Insole
        if (selections.insole) {
            addCustomizationDetail(customizationDetails, 'Insole', selections.insole.id, selections.insole.price);
            if (selections.insole.image && selections.insole.image !== '#') {
                document.getElementById('checkoutTongueImage').src = selections.insole.image;
            }
        }
        
        // Colors
        if (selections.mudguardColor) {
            addColorDetail(customizationDetails, 'Mudguard Color', selections.mudguardColor);
        }
        if (selections.heelColor) {
            addColorDetail(customizationDetails, 'Heel Color', selections.heelColor);
        }
        if (selections.bodyColor) {
            addColorDetail(customizationDetails, 'Body Color', selections.bodyColor);
        }
        
        // Laces
        if (selections.laces) {
            addCustomizationDetail(customizationDetails, 'Laces', selections.laces.id, selections.laces.price);
            if (selections.laces.color) {
                addColorDetail(customizationDetails, 'Laces Color', selections.laces.color);
            }
            document.getElementById('checkoutLacesImage').src = selections.laces.image;
        }
        
    } else if (order.model === 'slipon') {
        // Slipon shoe customization
        // Midsole
        if (selections.midsole) {
            addCustomizationDetail(customizationDetails, 'Midsole', selections.midsole.id, selections.midsole.price);
            document.getElementById('checkoutSoleImage').src = selections.midsole.image;
        }
        
        // NEW: Insole
        if (selections.insole) {
            addCustomizationDetail(customizationDetails, 'Insole', selections.insole.id, selections.insole.price);
            if (selections.insole.image && selections.insole.image !== '#') {
                document.getElementById('checkoutTongueImage').src = selections.insole.image;
            }
        }
        
        // Colors
        if (selections.midsoleColor) {
            addColorDetail(customizationDetails, 'Midsole Color', selections.midsoleColor);
        }
        if (selections.outsoleColor) {
            addColorDetail(customizationDetails, 'Outsole Color', selections.outsoleColor);
        }
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
    backToCustomizeBtn.addEventListener('click', async () => {
        if (!orderConfirmed) {
            const confirmCancel = confirm('Are you sure you want to cancel this order? Your custom design will be lost.');
            if (confirmCancel) {
                await deleteOrderFromDatabase();
                window.location.href = '/customer/html/customizeshoe.html';
            }
        } else {
            window.location.href = '/customer/html/customizeshoe.html';
        }
    });
    
    // Back button (arrow)
    backButton.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!orderConfirmed) {
            const confirmCancel = confirm('Are you sure you want to cancel this order? Your custom design will be lost.');
            if (confirmCancel) {
                await deleteOrderFromDatabase();
                window.location.href = '/customer/html/customizeshoe.html';
            }
        } else {
            window.location.href = '/customer/html/customizeshoe.html';
        }
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
            
            // Mark order as confirmed
            orderConfirmed = true;
            
            // Show confirmation modal
            orderConfirmationModal.style.display = 'flex';
            
        } catch (error) {
            console.error('Error confirming order:', error);
            alert('There was an error confirming your order. Please try again.');
            confirmOrderBtn.disabled = false;
            confirmOrderBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Order';
        }
    });
    
    // Handle browser back button
    window.addEventListener('popstate', async () => {
        if (!orderConfirmed) {
            const confirmCancel = confirm('Are you sure you want to cancel this order? Your custom design will be lost.');
            if (confirmCancel) {
                await deleteOrderFromDatabase();
            }
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