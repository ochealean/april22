import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, update, set, get, off } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Global variables to store dashboard data
let shopLoggedin = null;
let currentUserId = null;
let roleLoggedin = null;
let sname = '';
let dashboardData = {
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    recentOrders: [],
    topProducts: []
};

// Initialize the dashboard
function initDashboard() {
    // Load all dashboard data
    loadDashboardData();
    
    // Set up real-time listeners
    setupRealtimeListeners();
    
}

// Load all dashboard data
function loadDashboardData() {
    const user = auth.currentUser;
    if (!user || !shopLoggedin) return;

    // Reference to shop data
    const shopRef = ref(db, `AR_shoe_users/shoe/${shopLoggedin}`);
    
    // Get shop data once
    get(shopRef).then((snapshot) => {
        if (snapshot.exists()) {
            const shoes = snapshot.val();
            dashboardData.totalProducts = Object.keys(shoes).length;
            updateDashboardUI();
        }
    }).catch((error) => {
        console.error("Error loading products:", error);
    });

    // Load orders
    loadOrders();
    
    // Load customers (you'll need to implement this based on your DB structure)
    loadCustomers();
}

// Load orders data - Updated to match your database structure
function loadOrders() {
    const ordersRef = ref(db, 'AR_shoe_users/transactions');
    
    onValue(ordersRef, (snapshot) => {
        if (snapshot.exists()) {
            const allTransactions = snapshot.val();
            const shopOrders = [];
            let totalSales = 0;
            let orderCount = 0;
            
            // Iterate through all customer transactions
            for (const customerId in allTransactions) {
                const customerOrders = allTransactions[customerId];
                
                for (const orderId in customerOrders) {
                    const order = customerOrders[orderId];
                    
                    if (order.item && order.item.shopId === shopLoggedin) {
                        const formattedOrder = {
                            id: orderId,
                            customerId: customerId,
                            customerName: order.shippingInfo ? 
                                `${order.shippingInfo.firstName} ${order.shippingInfo.lastName}` : 
                                'Unknown Customer',
                            customerPhone: order.shippingInfo?.phone || 'N/A',
                            shippingAddress: order.shippingInfo ? 
                                `${order.shippingInfo.address}, ${order.shippingInfo.city}, ${order.shippingInfo.country}` : 
                                'No address provided',
                            orderDate: order.date || new Date().toISOString(),
                            status: order.status || 'pending',
                            totalAmount: order.totalAmount || 0,
                            subtotal: order.item.price * (order.item.quantity || 1),
                            shippingFee: (order.totalAmount || 0) - (order.item.price * (order.item.quantity || 1)),
                            items: [{
                                shoeName: order.item.name,
                                color: order.item.color,
                                size: order.item.size,
                                quantity: order.item.quantity || 1,
                                price: order.item.price,
                                imageUrl: order.item.imageUrl
                            }]
                        };
                        
                        shopOrders.push(formattedOrder);
                        totalSales += parseFloat(formattedOrder.totalAmount) || 0;
                        orderCount++;
                    }
                }
            }
            
            // Sort by date (newest first)
            shopOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
            
            // Update dashboard data
            dashboardData.recentOrders = shopOrders.slice(0, 5);
            dashboardData.totalSales = totalSales;
            dashboardData.totalOrders = orderCount;
            
            updateDashboardUI();
        }
    }, (error) => {
        console.error("Error loading orders:", error);
        showStatusMessage("Failed to load orders", 'error');
    });
}

// Load customers data
function loadCustomers() {
    const customersRef = ref(db, 'AR_shoe_users/customer');
    
    onValue(customersRef, (snapshot) => {
        if (snapshot.exists()) {
            const customers = snapshot.val();
            dashboardData.totalCustomers = Object.keys(customers).length;
            updateDashboardUI();
        }
    });
}

// Update the dashboard UI with current data
function updateDashboardUI() {
    // Only update DOM elements if they exist
    const totalSalesEl = document.getElementById('totalSales');
    const totalOrdersEl = document.getElementById('totalOrders');
    const totalProductsEl = document.getElementById('totalProducts');
    const totalCustomersEl = document.getElementById('totalCustomers');
    
    if (totalSalesEl) totalSalesEl.textContent = `₱ ${dashboardData.totalSales.toFixed(2)}`;
    if (totalOrdersEl) totalOrdersEl.textContent = dashboardData.totalOrders;
    if (totalProductsEl) totalProductsEl.textContent = dashboardData.totalProducts;
    if (totalCustomersEl) totalCustomersEl.textContent = dashboardData.totalCustomers;
    
    // Update orders table
    updateOrdersTable();
    
    // Update top products
    updateTopProducts();
}

// Update orders table
function updateOrdersTable() {
    const tableBody = document.getElementById('ordersTableBody');
    tableBody.innerHTML = '';
    
    if (dashboardData.recentOrders.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 2rem;">
                No recent orders found
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    dashboardData.recentOrders.forEach(order => {
        const row = document.createElement('tr');
        
        // Format date
        const orderDate = new Date(order.orderDate);
        const formattedDate = orderDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        // Determine status
        let statusClass = 'pending';
        let statusIcon = 'fa-clock';
        let statusText = 'Pending';
        
        if (order.status === 'completed' || order.status === 'shipped') {
            statusClass = 'shipped';
            statusIcon = 'fa-check-circle';
            statusText = 'Completed';
        } else if (order.status === 'cancelled') {
            statusClass = 'cancelled';
            statusIcon = 'fa-times-circle';
            statusText = 'Cancelled';
        }
        
        row.innerHTML = `
            <td>#${order.id.substring(0, 8)}</td>
            <td>${order.customerName || 'Unknown Customer'}</td>
            <td>${formattedDate}</td>
            <td>₱ ${parseFloat(order.totalAmount).toFixed(2)}</td>
            <td><span class="status ${statusClass}"><i class="fas ${statusIcon}"></i> ${statusText}</span></td>
            <td><button class="btn btn-view" data-orderid="${order.id}" data-customerid="${order.customerId}">View</button></td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.btn-view').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-orderid');
            const customerId = this.getAttribute('data-customerid');
            viewOrderDetails(orderId, customerId);
        });
    });
}

// Update top products
function updateTopProducts() {
    const productsGrid = document.getElementById('topProductsGrid');
    productsGrid.innerHTML = '';
    
    // In a real app, you would query your database for top products
    // For now, we'll just show an empty state
    productsGrid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-shoe-prints"></i>
            <h3>No Products Added</h3>
            <p>Start by adding your first product to showcase in your store</p>
            <button class="btn btn-primary" onclick="window.location.href='/shopowner/html/shopowner_addshoe.html'">
                <i class="fas fa-plus"></i> Add First Product
            </button>
        </div>
    `;
}

// View order details in modal
function viewOrderDetails(orderId, customerId) {
    // Find the order in our data
    const order = dashboardData.recentOrders.find(o => o.id === orderId && o.customerId === customerId);
    if (!order) return;
    
    // Update modal content
    const modalContent = document.getElementById('orderDetailsContent');
    modalContent.innerHTML = `
        <div class="order-details-grid">
            <div>
                <div class="order-details-section">
                    <h3><i class="fas fa-user"></i> Customer Information</h3>
                    <p><strong>Name:</strong> ${order.customerName || 'Unknown'}</p>
                    <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
                </div>
                
                <div class="order-details-section">
                    <h3><i class="fas fa-truck"></i> Shipping Address</h3>
                    <p>${order.shippingAddress || 'No address provided'}</p>
                </div>
            </div>
            
            <div>
                <div class="order-details-section">
                    <h3><i class="fas fa-receipt"></i> Order Summary</h3>
                    ${order.items.map(item => `
                        <div class="order-item">
                            <img src="${item.imageUrl || 'https://via.placeholder.com/150x150?text=No+Image'}" 
                                 alt="${item.shoeName}" class="order-item-image">
                            <div class="order-item-details">
                                <div class="order-item-title">${item.shoeName}</div>
                                <div class="order-item-variant">Color: ${item.color} | Size: ${item.size}</div>
                                <div class="order-item-variant">Quantity: ${item.quantity}</div>
                                <div class="order-item-price">₱ ${parseFloat(item.price).toFixed(2)}</div>
                            </div>
                        </div>
                    `).join('')}
                    
                    <div class="order-summary">
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span>₱ ${parseFloat(order.subtotal).toFixed(2)}</span>
                        </div>
                        <div class="summary-row">
                            <span>Shipping:</span>
                            <span>₱ ${parseFloat(order.shippingFee || 0).toFixed(2)}</span>
                        </div>
                        <div class="summary-row total">
                            <span>Total:</span>
                            <span>₱ ${parseFloat(order.totalAmount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Show the modal
    document.getElementById('orderModal').style.display = 'block';
    
    // Set up action buttons
    document.getElementById('acceptOrderBtn').onclick = () => processOrder(orderId, customerId, 'completed');
    document.getElementById('rejectOrderBtn').onclick = () => {
        document.getElementById('orderModal').style.display = 'none';
        document.getElementById('rejectModal').style.display = 'block';
    };
    document.getElementById('confirmRejectBtn').onclick = () => {
        const reason = document.getElementById('rejectionReason').value;
        if (reason.trim() === '') {
            alert('Please provide a reason for rejection');
            return;
        }
        processOrder(orderId, customerId, 'cancelled', reason);
    };
}

// Process order (accept/reject)
function processOrder(orderId, customerId, action, reason = '') {
    const updates = {};
    const orderRef = ref(db, `AR_shoe_users/transactions/${customerId}/${orderId}`);
    
    // Get current order data first
    get(orderRef).then((snapshot) => {
        if (snapshot.exists()) {
            const orderData = snapshot.val();
            
            // Prepare updates
            const updatedOrder = {
                ...orderData,
                status: action,
                updatedAt: new Date().toISOString()
            };
            
            if (action === 'cancelled' && reason) {
                updatedOrder.rejectionReason = reason;
            }
            
            // Update the order
            return set(orderRef, updatedOrder);
        } else {
            throw new Error("Order not found");
        }
    })
    .then(() => {
        alert(`Order ${action} successfully`);
        document.getElementById('orderModal').style.display = 'none';
        document.getElementById('rejectModal').style.display = 'none';
        
        // Reload orders to reflect changes
        loadOrders();
    })
    .catch((error) => {
        console.error("Error updating order:", error);
        alert("Failed to update order status");
    });
}

// Set up real-time listeners
function setupRealtimeListeners() {
    // Listen for changes in orders
    const ordersRef = ref(db, 'AR_shoe_users/transactions');
    onValue(ordersRef, (snapshot) => {
        loadOrders(); // This will call updateDashboardUI() when done
    });
    
    // Listen for changes in products
    const productsRef = ref(db, `AR_shoe_users/shoe/${shopLoggedin}`);
    onValue(productsRef, (snapshot) => {
        if (snapshot.exists()) {
            dashboardData.totalProducts = Object.keys(snapshot.val()).length;
            updateDashboardUI();
        }
    });
    
    // Add listener for customers
    const customersRef = ref(db, 'AR_shoe_users/customer');
    onValue(customersRef, (snapshot) => {
        if (snapshot.exists()) {
            dashboardData.totalCustomers = Object.keys(snapshot.val()).length;
            updateDashboardUI();
        }
    });
}

// Initialize the dashboard when auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        
        // Fetch shop data
        const shopRef = ref(db, `AR_shoe_users/employees/${user.uid}`);
        onValue(shopRef, (snapshot) => {
            const shopData = snapshot.val();
            
            if (shopData) {
                roleLoggedin = shopData.role;
                shopLoggedin = shopData.shopId;
                sname = shopData.shopName || '';
            } else {
                // If not an employee, check if they're a shop owner
                const ownerShopRef = ref(db, `AR_shoe_users/shop/${user.uid}`);
                get(ownerShopRef).then((shopSnapshot) => {
                    if (shopSnapshot.exists()) {
                        roleLoggedin = "Shop Owner";
                        shopLoggedin = user.uid;
                        sname = shopSnapshot.val().shopName || 'My Shop';
                    } else {
                        roleLoggedin = "Shop Owner";
                        sname = 'My Shop';
                        shopLoggedin = user.uid;
                    }
                    
                    // Initialize dashboard after we have the shop ID
                    initDashboard();
                });
                return;
            }
            
            // Initialize dashboard after we have the shop ID
            initDashboard();
        }, (error) => {
            console.error("Error fetching shop data:", error);
            shopLoggedin = user.uid;
            sname = 'Unknown Shop';
            initDashboard();
        });
    } else {
        // Redirect to login if not authenticated
        window.location.href = "/user_login.html";
    }
});

// Page loader
window.addEventListener('load', function() {
    setTimeout(function() {
        document.querySelector('.page-loader').style.opacity = '0';
        setTimeout(function() {
            document.querySelector('.page-loader').style.display = 'none';
        }, 500);
    }, 1500); // 1.5 seconds is more reasonable
});

// Modal handling
document.addEventListener('DOMContentLoaded', function() {
    // Close modals when close buttons are clicked
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            document.getElementById('orderModal').style.display = 'none';
            document.getElementById('rejectModal').style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('orderModal')) {
            document.getElementById('orderModal').style.display = 'none';
        }
        if (event.target === document.getElementById('rejectModal')) {
            document.getElementById('rejectModal').style.display = 'none';
        }
    });
    
    // Mobile menu toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileToggle) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
        
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
});

// Logout functionality
document.getElementById('logout_btn')?.addEventListener('click', function() {
    signOut(auth).then(() => {
        window.location.href = "/user_login.html";
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
});