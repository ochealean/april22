import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, update, set, get, off } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase configuration
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
const database = getDatabase(app);
const auth = getAuth(app);

// DOM elements
const ordersContainer = document.getElementById('ordersContainer');

// Function to fetch and display pending orders
function fetchPendingOrders() {
    const ordersRef = ref(database, `AR_shoe_users/boughtshoe`);

    get(ordersRef).then((snapshot) => {
        ordersContainer.innerHTML = '';
        if (!snapshot.exists()) {
            showEmptyState();
            return;
        }

        let hasPendingOrders = false;

        snapshot.forEach((orderSnap) => {
            if (orderSnap.hasChild('pending')) {
                hasPendingOrders = true;
                const orderData = orderSnap.child('pending').val();
                displayOrder(orderSnap.key, orderData);
            }
        });

        if (!hasPendingOrders) {
            showEmptyState();
        }
    }).catch((error) => {
        console.error('Error fetching orders:', error);
        showErrorState();
    });
}



function showEmptyState() {
    ordersContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-box-open"></i>
            <h2>No Pending Orders</h2>
            <p>You don't have any pending orders at the moment.</p>
        </div>
    `;
}

function showErrorState() {
    ordersContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Error Loading Orders</h2>
            <p>There was an error loading your orders. Please try again.</p>
        </div>
    `;
}

// Function to display an order card
function displayOrder(orderId, orderData) {
    // Format the date
    const orderDate = new Date(orderData.addedAt || orderData.orderDate);
    const formattedDate = orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Get model name with proper capitalization
    const modelName = orderData.model ? 
        orderData.model.charAt(0).toUpperCase() + orderData.model.slice(1) : 
        'Custom Shoe';
    
    // Create order card HTML
    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';
    orderCard.innerHTML = `
        <div class="order-header">
            <span class="order-id">${orderId}</span>
            <span class="order-date">${formattedDate}</span>
        </div>
        
        <div class="order-details">
            <div class="detail-row">
                <span class="detail-label">Model:</span>
                <span class="detail-value">${modelName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Size:</span>
                <span class="detail-value">${orderData.size || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Price:</span>
                <span class="detail-value">₱${orderData.price?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                    <span class="status-badge status-pending">Pending</span>
                </span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Production:</span>
                <span class="detail-value">${orderData.productionTime || 'N/A'}</span>
            </div>
        </div>
        
        ${orderData.image ? `<img src="${orderData.image}" alt="Order Image" class="order-image">` : ''}
        
        <div class="order-actions">
            <button class="btn btn-process" data-order-id="${orderId}">
                <i class="fas fa-check"></i> Mark as Processed
            </button>
            <button class="btn btn-cancel" data-order-id="${orderId}">
                <i class="fas fa-times"></i> Cancel Order
            </button>
        </div>
    `;
    
    ordersContainer.appendChild(orderCard);
    
    // Add event listeners to buttons
    orderCard.querySelector('.btn-process').addEventListener('click', () => updateOrderStatus(orderId, 'processed'));
    orderCard.querySelector('.btn-cancel').addEventListener('click', () => updateOrderStatus(orderId, 'cancelled'));
}

// Function to update order status
function updateOrderStatus(orderId, newStatus) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        alert('You need to be logged in to update orders.');
        return;
    }

    console.log(`Updating order ${orderId} to status: ${newStatus}`);
    
    const updates = {
        status: newStatus,
        [`statusUpdates/${newStatus}`]: {
            status: newStatus,
            timestamp: Date.now(),
            message: newStatus === 'processed' ? 
                'Order is being processed' : 
                'Order has been cancelled'
        }
    };
    
    update(ref(database, `AR_shoe_users/boughtshoe/${userId}/${orderId}`), updates)
        .then(() => {
            alert(`Order ${orderId} has been ${newStatus}.`);
            fetchPendingOrders(userId); // Refresh the list
        })
        .catch((error) => {
            console.error('Error updating order:', error);
            alert('There was an error updating the order. Please try again.');
        });
}

// Initialize the page when DOM is loaded and user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, fetch their pending orders
            fetchPendingOrders(user.uid);
        } else {
            // User is not signed in, redirect to login
            window.location.href = '/login.html';
        }
    });
});