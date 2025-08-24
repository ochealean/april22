import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, update, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

// Global variables
let currentUser = null;
let allOrders = [];

async function fetchAllOrders(userId) {
    try {
        // Only fetch from customizedtransactions (removed boughtshoe)
        const customSnapshot = await get(ref(database, `AR_shoe_users/customizedtransactions/${userId}`));

        const orders = [];

        // Process customizedtransactions orders
        if (customSnapshot.exists()) {
            const customOrders = customSnapshot.val();
            Object.entries(customOrders).forEach(([orderId, order]) => {
                orders.push({
                    orderId,
                    ...order,
                    source: 'customizedtransactions',
                    formattedDate: new Date(order.orderDate || order.addedAt || order.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                });
            });
        }

        console.log("Fetched orders:", orders);
        return orders;
    } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
    }
}

function filterOrdersByStatus(status) {
    if (status === 'all') return allOrders;
    
    return allOrders.filter(order => {
        if (status === 'pending') {
            return order.status === 'pending';
        } else if (status === 'processing') {
            return order.status === 'processing';
        } else if (status === 'history') {
            return order.status === 'completed' || order.status === 'cancelled' || order.status === 'rejected';
        }
        return false;
    });
}

function renderOrders(orders, status) {
    const container = document.getElementById("ordersContainer");
    container.innerHTML = "";

    if (!orders.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-${status === 'pending' ? 'clock' : status === 'processing' ? 'cog' : 'history'}"></i>
                <h3>No ${status.charAt(0).toUpperCase() + status.slice(1)} Orders</h3>
                <p>You don't have any ${status} custom orders at this time.</p>
            </div>
        `;
        return;
    }

    orders.forEach(order => {
        const card = document.createElement("div");
        card.classList.add("order-card");
        card.setAttribute("data-status", order.status || "pending");

        // Determine product name based on whether it's a custom order
        let productName = `Custom ${order.model || "Design"} Shoe`;
        let productImage = order.image || "https://cdn-icons-png.flaticon.com/512/11542/11542598.png";

        // Determine status badge
        let statusBadge = '';
        if (order.status === 'pending') {
            statusBadge = '<span class="status-badge status-pending">Pending</span>';
        } else if (order.status === 'processing') {
            statusBadge = '<span class="status-badge status-processing">Processing</span>';
        } else if (order.status === 'completed') {
            statusBadge = '<span class="status-badge status-completed">Completed</span>';
        } else if (order.status === 'cancelled') {
            statusBadge = '<span class="status-badge status-cancelled">Cancelled</span>';
        } else if (order.status === 'rejected') {
            statusBadge = '<span class="status-badge status-cancelled">Rejected</span>';
        } else {
            statusBadge = `<span class="status-badge status-pending">${order.status || 'Pending'}</span>`;
        }

        // Additional info based on status
        let additionalInfo = '';
        if (order.status === 'processing') {
            additionalInfo = `
                <div class="detail-row">
                    <span class="detail-label">Production Time:</span>
                    <span class="detail-value">${order.productionTime || 'Not specified'}</span>
                </div>
            `;
        } else if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'rejected') {
            // Find the status update timestamp if available
            let statusDate = '';
            if (order.statusUpdates && order.statusUpdates[order.status]) {
                statusDate = new Date(order.statusUpdates[order.status].timestamp).toLocaleDateString();
            }
            
            additionalInfo = `
                <div class="detail-row">
                    <span class="detail-label">${order.status.charAt(0).toUpperCase() + order.status.slice(1)} On:</span>
                    <span class="detail-value">${statusDate || 'Not specified'}</span>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="order-header">
                <span class="order-id">${order.orderId}</span>
                <span class="order-date">${order.formattedDate || "Date not available"}</span>
            </div>
            <div class="order-details">
                <div class="detail-row">
                    <span class="detail-label">Product:</span>
                    <span class="detail-value">${productName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">${statusBadge}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Size:</span>
                    <span class="detail-value">${order.size || "N/A"}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Quantity:</span>
                    <span class="detail-value">${order.quantity || 1}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Price:</span>
                    <span class="detail-value">₱${order.price?.toLocaleString() || order.totalAmount?.toLocaleString() || "N/A"}</span>
                </div>
                ${additionalInfo}
                <img src="${productImage}" alt="Product Image" class="order-image" onerror="this.onerror=null; this.src='https://cdn-icons-png.flaticon.com/512/11542/11542598.png';">
            </div>
            <div class="order-actions">
                <button class="btn btn-view view-order-btn" data-order='${JSON.stringify(order).replace(/'/g, "\\'")}'>
                    <i class="fas fa-eye"></i> View Details
                </button>
                ${(order.status === 'pending') ? 
                `<button class="btn btn-cancel cancel-order-btn" data-order-id="${order.orderId}" data-source="${order.source}">
                    <i class="fas fa-times"></i> Cancel
                </button>` : ''}
            </div>
        `;

        container.appendChild(card);
    });

    // Add event listeners to view buttons
    document.querySelectorAll('.view-order-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const orderData = JSON.parse(e.target.closest('.view-order-btn').getAttribute('data-order'));
            showOrderDetails(orderData);
        });
    });

    // Add event listeners to cancel buttons
    document.querySelectorAll('.cancel-order-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const orderId = e.target.closest('.cancel-order-btn').getAttribute('data-order-id');
            const source = e.target.closest('.cancel-order-btn').getAttribute('data-source');
            cancelOrder(orderId, source);
        });
    });
}

function showOrderDetails(order) {
    const modal = document.getElementById("orderModal");
    
    // Determine product name
    let productName = `Custom ${order.model || "Design"} Shoe`;
    
    // Determine status badge
    let statusBadge = '';
    if (order.status === 'pending') {
        statusBadge = '<span class="status-badge status-pending">Pending</span>';
    } else if (order.status === 'processing') {
        statusBadge = '<span class="status-badge status-processing">Processing</span>';
    } else if (order.status === 'completed') {
        statusBadge = '<span class="status-badge status-completed">Completed</span>';
    } else if (order.status === 'cancelled') {
        statusBadge = '<span class="status-badge status-cancelled">Cancelled</span>';
    } else if (order.status === 'rejected') {
        statusBadge = '<span class="status-badge status-cancelled">Rejected</span>';
    } else {
        statusBadge = `<span class="status-badge status-pending">${order.status || 'Pending'}</span>`;
    }
    
    // Safely populate modal elements - check if they exist first
    const setTextContent = (elementId, content) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = content;
        }
    };
    
    const setInnerHTML = (elementId, content) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = content;
        }
    };
    
    // Populate modal with order details
    setTextContent("modalOrderId", order.orderId);
    setTextContent("modalOrderDate", order.formattedDate || "Date not available");
    setInnerHTML("modalOrderStatus", statusBadge);
    setTextContent("modalPaymentMethod", order.paymentMethod || "Not specified");
    setTextContent("modalPaymentStatus", order.status || "Pending");
    
    // Set image safely
    const shoeImage = document.getElementById("modalShoeImage");
    if (shoeImage) {
        shoeImage.src = order.image || "https://cdn-icons-png.flaticon.com/512/11542/11542598.png";
        shoeImage.onerror = function() {
            this.src = "https://cdn-icons-png.flaticon.com/512/11542/11542598.png";
        };
    }
    
    setTextContent("modalShoeModel", productName);
    setTextContent("modalShoeSize", order.size || "N/A");
    
    // Extract color from selections if available
    let shoeColor = "Not specified";
    if (order.selections) {
        if (order.selections.bodyColor) {
            shoeColor = order.selections.bodyColor;
        } else if (order.selections.midsoleColor) {
            shoeColor = order.selections.midsoleColor;
        } else if (order.selections.heelColor) {
            shoeColor = order.selections.heelColor;
        }
    }
    setTextContent("modalShoeColor", shoeColor);
    
    // Customization details
    let soleType = "Standard";
    let upperMaterial = "Not specified";
    let lacesType = "Standard";
    let additionalFeatures = "None";
    
    if (order.selections) {
        if (order.selections.sole) {
            soleType = order.selections.sole.id || "Standard";
        }
        if (order.selections.upper) {
            upperMaterial = order.selections.upper.id || "Not specified";
        }
        if (order.selections.laces) {
            lacesType = order.selections.laces.id || "Standard";
        }
        if (order.selections.insole) {
            additionalFeatures = order.selections.insole.id || "None";
        }
        if (order.selections.midsole) {
            additionalFeatures = order.selections.midsole.id || "None";
        }
    }
    
    setTextContent("modalSoleType", `${soleType} ${order.selections?.sole?.price ? '(+₱' + order.selections.sole.price + ')' : ''}`);
    setTextContent("modalUpperMaterial", `${upperMaterial} ${order.selections?.upper?.price ? '(+₱' + order.selections.upper.price + ')' : ''}`);
    setTextContent("modalLacesType", `${lacesType} ${order.selections?.laces?.price ? '(+₱' + order.selections.laces.price + ')' : ''}`);
    setTextContent("modalAdditionalFeatures", `${additionalFeatures} ${order.selections?.insole?.price ? '(+₱' + order.selections.insole.price + ')' : ''}`);
    
    // Show customer info if available
    if (order.shippingInfo) {
        setTextContent("modalCustomerName", `${order.shippingInfo.firstName} ${order.shippingInfo.lastName}`);
        setTextContent("modalCustomerAddress", `${order.shippingInfo.address}, ${order.shippingInfo.city}, ${order.shippingInfo.country}`);
        setTextContent("modalCustomerContact", order.shippingInfo.phone || "Not specified");
    } else if (currentUser) {
        setTextContent("modalCustomerName", `${currentUser.firstName} ${currentUser.lastName}`);
        setTextContent("modalCustomerAddress", currentUser.address || "Not specified");
        setTextContent("modalCustomerContact", currentUser.phone || "Not specified");
    }
    
    // Calculate estimated delivery (order date + production time)
    let estDelivery = "Not specified";
    if (order.orderDate && order.productionTime) {
        const orderDate = new Date(order.orderDate);
        const daysMatch = order.productionTime.match(/(\d+)/);
        if (daysMatch) {
            const daysToAdd = parseInt(daysMatch[1]);
            orderDate.setDate(orderDate.getDate() + daysToAdd);
            estDelivery = orderDate.toLocaleDateString();
        }
    }
    setTextContent("modalEstDelivery", estDelivery);
    
    // Order summary
    const basePrice = order.basePrice || 0;
    const customizationPrice = order.customizationPrice || 0;
    const shippingPrice = 200; // Fixed shipping cost
    const totalPrice = order.price || order.totalAmount || (basePrice + customizationPrice + shippingPrice);
    
    // Update order summary in the modal using querySelector
    const basePriceEl = document.querySelector('.modal-body .detail-row:nth-child(1) .detail-value');
    const customizationPriceEl = document.querySelector('.modal-body .detail-row:nth-child(2) .detail-value');
    const shippingPriceEl = document.querySelector('.modal-body .detail-row:nth-child(3) .detail-value');
    const totalPriceEl = document.querySelector('.modal-body .detail-row:nth-child(4) .detail-value');
    
    if (basePriceEl) basePriceEl.textContent = `₱${basePrice.toLocaleString()}`;
    if (customizationPriceEl) customizationPriceEl.textContent = `+₱${customizationPrice.toLocaleString()}`;
    if (shippingPriceEl) shippingPriceEl.textContent = `₱${shippingPrice.toLocaleString()}`;
    if (totalPriceEl) totalPriceEl.textContent = `₱${totalPrice.toLocaleString()}`;
    
    // Show the modal
    if (modal) {
        modal.style.display = "flex";
    }
}

async function cancelOrder(orderId, source) {
    try {
        if (!currentUser) {
            alert('You must be logged in to cancel orders');
            return;
        }

        if (!confirm(`Are you sure you want to cancel order ${orderId}? This action cannot be undone.`)) {
            return;
        }

        // Show loading state
        const cancelButton = document.querySelector(`.cancel-order-btn[data-order-id="${orderId}"]`);
        const originalHTML = cancelButton.innerHTML;
        cancelButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Canceling...';
        cancelButton.disabled = true;

        // Get the order details first
        const orderRef = ref(database, `AR_shoe_users/${source}/${currentUser.uid}/${orderId}`);
        const orderSnapshot = await get(orderRef);
        
        if (!orderSnapshot.exists()) {
            throw new Error('Order not found');
        }

        const orderData = orderSnapshot.val();

        // Update the order status to 'cancelled'
        const updates = {
            status: 'cancelled',
            cancelledAt: Date.now(),
            statusUpdates: {
                ...(orderData.statusUpdates || {}),
                cancelled: {
                    status: 'cancelled',
                    timestamp: Date.now(),
                    message: 'Order was cancelled by customer'
                }
            }
        };

        await update(orderRef, updates);

        // Refresh the orders list
        allOrders = await fetchAllOrders(currentUser.uid);
        
        // Get current active tab
        const activeTab = document.querySelector('.order-tab.active').getAttribute('data-tab');
        const filteredOrders = filterOrdersByStatus(activeTab);
        renderOrders(filteredOrders, activeTab);

        alert(`Order ${orderId} has been successfully cancelled.`);

    } catch (error) {
        console.error('Error cancelling order:', error);
        alert(`Failed to cancel order: ${error.message}`);

        // Restore button state if error occurs
        const cancelButton = document.querySelector(`.cancel-order-btn[data-order-id="${orderId}"]`);
        if (cancelButton) {
            cancelButton.innerHTML = originalHTML;
            cancelButton.disabled = false;
        }
    }
}

// Set up real-time listeners for database changes
function setupRealtimeListeners(userId) {
    // Listen for changes in customizedtransactions
    const customRef = ref(database, `AR_shoe_users/customizedtransactions/${userId}`);
    onValue(customRef, async (snapshot) => {
        console.log("Real-time update detected in customizedtransactions");
        allOrders = await fetchAllOrders(userId);
        
        // Get current active tab
        const activeTab = document.querySelector('.order-tab.active').getAttribute('data-tab');
        const filteredOrders = filterOrdersByStatus(activeTab);
        renderOrders(filteredOrders, activeTab);
    });
}

// Initialize the page
function initPage() {
    // Set up tab switching
    const orderTabs = document.querySelectorAll('.order-tab');
    orderTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            orderTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Get the tab to show
            const tabToShow = this.getAttribute('data-tab');
            
            // Filter and render orders for this tab
            const filteredOrders = filterOrdersByStatus(tabToShow);
            renderOrders(filteredOrders, tabToShow);
        });
    });

    // Set up modal close functionality
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeModalXBtn = document.querySelector('.close-modal');
    const orderModal = document.getElementById('orderModal');
    
    closeModalBtn.addEventListener('click', function() {
        orderModal.style.display = 'none';
    });
    
    closeModalXBtn.addEventListener('click', function() {
        orderModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === orderModal) {
            orderModal.style.display = 'none';
        }
    });

    // Set up mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    
    mobileMenuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    });

    sidebarOverlay.addEventListener('click', function() {
        sidebar.classList.remove('active');
        this.classList.remove('active');
    });
}

// Detect logged-in user and fetch orders
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Fetch user details
        const userRef = ref(database, `AR_shoe_users/customer/${user.uid}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            currentUser = { ...currentUser, ...userData };
            
            // Update UI with user info
            const userNameDisplay = document.getElementById("userName_display2");
            const userAvatar = document.getElementById("imageProfile");
            
            if (userNameDisplay) {
                userNameDisplay.textContent = `${userData.firstName} ${userData.lastName}`;
            }
            
            if (userAvatar && userData.profilePhoto) {
                userAvatar.src = userData.profilePhoto.profilePhoto?.url || "/errorimage.jpg";
            } else if (userAvatar) {
                userAvatar.src = "/errorimage.jpg";
            }
        }

        // Show loading state
        document.getElementById("ordersContainer").innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading your orders...</p>
            </div>
        `;

        // Fetch all orders
        allOrders = await fetchAllOrders(user.uid);
        
        // Set up real-time listeners
        setupRealtimeListeners(user.uid);
        
        // Initialize the page
        initPage();
        
        // Render pending orders by default
        const pendingOrders = filterOrdersByStatus('pending');
        renderOrders(pendingOrders, 'pending');
    } else {
        console.log("No user is signed in.");
        document.getElementById("ordersContainer").innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-slash"></i>
                <p>Please log in to view your orders.</p>
            </div>
        `;
    }
});

// Logout functionality
document.getElementById('logout_btn').addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut().then(() => {
            window.location.href = '/user_login.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
        });
    }
});