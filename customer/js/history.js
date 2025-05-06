// history.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase configuration
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
const auth = getAuth(app);
const db = getDatabase(app);

// Main function that runs when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, load their profile and orders
            loadUserProfile(user.uid);
            loadOrderHistory(user.uid);

            // Set up event listeners
            setupEventListeners(user.uid);
        } else {
            // No user is signed in, redirect to login
            window.location.href = "/user_login.html";
        }
    });
});

// Load user profile information
function loadUserProfile(userId) {
    const userRef = ref(db, `AR_shoe_users/customer/${userId}`);
    onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.val();

            // Update profile picture if available
            const profileImg = document.getElementById('imageProfile');
            if (userData.profilePhoto?.profilePhoto?.url) {
                profileImg.src = userData.profilePhoto.profilePhoto.url;
            } else {
                profileImg.src = "https://via.placeholder.com/150";
            }

            // Update username display
            const userNameDisplay = document.getElementById('userName_display2');
            if (userData.firstName && userData.lastName) {
                userNameDisplay.textContent = `${userData.firstName} ${userData.lastName}`;
            } else if (userData.username) {
                userNameDisplay.textContent = userData.username;
            }
        }
    });
}

// Load order history for the user
function loadOrderHistory(userId, statusFilter = 'all') {
    const ordersRef = ref(db, `AR_shoe_users/transactions/${userId}`);

    onValue(ordersRef, (snapshot) => {
        const purchaseHistoryContainer = document.querySelector('.purchase-history');

        if (!snapshot.exists()) {
            // No orders found
            purchaseHistoryContainer.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-box-open"></i>
                    <h3>No Orders Yet</h3>
                    <p>You haven't placed any orders yet. Start shopping to see your order history here.</p>
                    <a href="/customer/html/browse.html" class="btn-shop">Shop Now</a>
                </div>
            `;
            return;
        }

        // Clear existing content
        purchaseHistoryContainer.innerHTML = '';

        // Convert orders to array and sort by date (newest first)
        const orders = [];
        snapshot.forEach((orderSnapshot) => {
            const order = orderSnapshot.val();
            order.orderId = orderSnapshot.key;
            orders.push(order);
        });

        orders.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Filter orders based on status
        const filteredOrders = statusFilter === 'all'
            ? orders
            : orders.filter(order => order.status === statusFilter);

        if (filteredOrders.length === 0) {
            purchaseHistoryContainer.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-filter"></i>
                    <h3>No Orders Match Your Filter</h3>
                    <p>Try changing your filter criteria to see more orders.</p>
                </div>
            `;
            return;
        }

        // Display each order
        filteredOrders.forEach(order => {
            displayOrderCard(order, userId);
        });
    });
}

// Display a single order card
function displayOrderCard(order, userId) {
    const purchaseHistoryContainer = document.querySelector('.purchase-history');

    // Skip rendering if status is rejected, delivered, or cancelled
    if (['rejected', 'delivered', 'cancelled'].includes(status)) return null;

    // Format date
    const orderDate = new Date(order.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Determine status class and text
    let statusClass, statusText;
    switch (order.status.toLowerCase()) {
        case 'rejected':
            statusClass = 'status-rejected';
            statusText = 'Rejected by Shop';
            break;
        case 'delivered':
            statusClass = 'status-delivered';
            statusText = 'Delivered';
            break;
        case 'completed':
            statusClass = 'status-delivered';
            statusText = 'Delivered';
            break;
        case 'cancelled':
            statusClass = 'status-cancelled';
            statusText = 'Cancelled';
            break;
        default:
            return null; // Skip rendering for other statuses
    }

    // Get the item(s)
    const items = order.item ? [order.item] : (order.order_items ? Object.values(order.order_items) : []);

    console.log('Items:', items);
    // Generate HTML for each item
    const itemsHTML = items.map(item => `
        <div class="order-item">
            <img src="${item.imageUrl || 'https://via.placeholder.com/80'}" alt="Product" class="item-image">
            <div class="item-details">
                <div class="item-name">${item.name || 'Unknown Product'}</div>
                <div class="item-variant">Color: ${item.color || 'N/A'}, Size: ${item.size || 'N/A'}</div>
                <div class="item-price">$${(item.price || 0).toFixed(2)}</div>
            </div>
            <div class="item-quantity">Qty: ${item.quantity || 1}</div>
        </div>
    `).join('');

    // Generate rejection info if order was rejected
    let rejectionHTML = '';
    if (order.status === 'rejected') {
        rejectionHTML = `
            <div class="rejection-info">
                <div class="rejection-title">
                    <i class="fas fa-store-alt"></i>
                    <span>Rejected by: <span class="rejection-shop">${order.item.shopName || 'Shop'}</span></span>
                </div>
                <div class="rejection-reason">
                    <strong>Reason:</strong> ${order.rejectionReason || 'No reason provided'}
                </div>
            </div>
        `;
    }

    // Generate cancellation info if order was cancelled
    if (order.status === 'cancelled') {
        rejectionHTML = `
            <div class="rejection-info">
                <div class="rejection-title">
                    <i class="fas fa-times-circle"></i>
                    <span>Cancelled by: <span class="rejection-shop">You</span></span>
                </div>
                <div class="rejection-reason">
                    <strong>Reason:</strong> Order was cancelled upon customer request.
                </div>
            </div>
        `;
    }

    // Determine which buttons to show based on order status
    let actionButtons = '';
    if (order.status.toLowerCase() === 'delivered') {
        actionButtons = `
            <button class="btn btn-reorder">Reorder</button>
            <button class="btn btn-review">Leave Review</button>
        `;
    } else if (order.status.toLowerCase() === 'rejected' || order.status.toLowerCase() === 'cancelled') {
        actionButtons = `
            <button class="btn btn-reorder">Find Similar</button>
        `;
    }

    // Create the order card HTML
    const orderCardHTML = `
        <div class="order-card" data-order-id="${order.orderId}">
            <div class="order-header">
                <div>
                    <span class="order-id">Order #${order.orderId}</span>
                    <span class="order-date"> - ${orderDate}</span>
                </div>
                <span class="order-status ${statusClass}">${statusText}</span>
            </div>
            <div class="order-body">
                <div class="order-items">
                    ${itemsHTML}
                </div>
                ${rejectionHTML}
            </div>
            <div class="order-footer">
                <div class="order-total">Total: $${(order.totalAmount || 0).toFixed(2)}</div>
                <div class="order-actions">
                    ${actionButtons}
                </div>
            </div>
        </div>
    `;

    // Add the order card to the container
    purchaseHistoryContainer.insertAdjacentHTML('beforeend', orderCardHTML);
}

// Helper function to get shop name
function getShopName(shopId) {
    if (!shopId) return 'Unknown Shop';

    const shopRef = ref(db, `AR_shoe_users/shop/${shopId}`);
    let shopName = 'Loading...';

    onValue(shopRef, (snapshot) => {
        if (snapshot.exists()) {
            const shopData = snapshot.val();
            shopName = shopData.shopName || 'Unknown Shop';
        }
    }, { onlyOnce: true });

    return shopName;
}

// Set up event listeners
function setupEventListeners(userId) {
    // Status filter change
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            loadOrderHistory(userId, e.target.value);
        });
    }

    // Time filter change
    const timeFilter = document.getElementById('timeFilter');
    if (timeFilter) {
        timeFilter.addEventListener('change', (e) => {
            console.log('Time filter changed to:', e.target.value);
        });
    }

    // Search functionality
    const searchInput = document.querySelector('.search-orders');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            console.log('Searching for:', e.target.value);
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout_btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = "/user_login.html";
            }).catch((error) => {
                console.error("Logout error:", error);
            });
        });
    }

    // Track order button click handler
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('btn-review')) {
            const orderCard = e.target.closest('.order-card');
            if (orderCard) {
                const orderId = orderCard.getAttribute('data-order-id');
                window.location.href = `/customer/html/feedback.html?orderId=${orderId}&userId=${userId}`;
            }
        }
    });
}

// Function to display order details when order ID is provided
window.displayOrderDetails = function (orderId, userId) {
    const orderRef = ref(db, `AR_shoe_users/transactions/${userId}/${orderId}`);

    onValue(orderRef, (snapshot) => {
        if (snapshot.exists()) {
            const order = snapshot.val();
            order.orderId = orderId;

            // Clear the container and display just this order
            const purchaseHistoryContainer = document.querySelector('.purchase-history');
            purchaseHistoryContainer.innerHTML = '';
            displayOrderCard(order, userId);
        } else {
            console.error("Order not found:", orderId);
        }
    }, { onlyOnce: true });
};