import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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
const database = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const ordersTable = document.getElementById('ordersTable');
const orderTabs = document.querySelectorAll('.order-tab');
const searchInput = document.getElementById('orderSearch');
const searchBtn = document.getElementById('searchBtn');
const clearSearch = document.getElementById('clearSearch');
const orderModal = document.getElementById('orderModal');
const rejectionModal = document.getElementById('rejectionModal');
const rejectionForm = document.getElementById('rejectionForm');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// Global variables
let allOrders = [];
let filteredOrders = [];
let currentTab = 'pending';
let currentPage = 1;
const ordersPerPage = 10;
let currentRejectOrderId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load orders when user is authenticated
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadAllOrders();
            setupEventListeners();
        } else {
            console.log("No user is signed in.");
            // Show login prompt or redirect
        }
    });
});

// Load all orders from both boughtshoe and transactions
async function loadAllOrders() {
    try {
        // Show loading state
        ordersTable.querySelector('tbody').innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px;">
                    <i class="fas fa-spinner fa-spin"></i> Loading orders...
                </td>
            </tr>
        `;

        // Fetch all orders from boughtshoe
        const boughtShoeRef = ref(database, 'AR_shoe_users/boughtshoe');
        const boughtShoeSnapshot = await get(boughtShoeRef);
        
        // Fetch all orders from transactions
        const transactionsRef = ref(database, 'AR_shoe_users/transactions');
        const transactionsSnapshot = await get(transactionsRef);

        allOrders = [];

        // Process boughtshoe orders
        if (boughtShoeSnapshot.exists()) {
            boughtShoeSnapshot.forEach((userOrders) => {
                userOrders.forEach((order) => {
                    const orderData = order.val();
                    allOrders.push({
                        ...orderData,
                        orderId: order.key,
                        userId: userOrders.key,
                        source: 'boughtshoe'
                    });
                });
            });
        }

        // Process transactions orders
        if (transactionsSnapshot.exists()) {
            transactionsSnapshot.forEach((userOrders) => {
                userOrders.forEach((order) => {
                    const orderData = order.val();
                    // Only add if not already in boughtshoe
                    if (!allOrders.some(o => o.orderId === order.key)) {
                        allOrders.push({
                            ...orderData,
                            orderId: order.key,
                            userId: userOrders.key,
                            source: 'transactions'
                        });
                    }
                });
            });
        }

        // Sort by date (newest first)
        allOrders.sort((a, b) => {
            const dateA = a.orderDate || a.date || a.addedAt;
            const dateB = b.orderDate || b.date || b.addedAt;
            return new Date(dateB) - new Date(dateA);
        });

        // Initial render
        filterAndRenderOrders();
        
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersTable.querySelector('tbody').innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: var(--error);">
                    <i class="fas fa-exclamation-circle"></i> Failed to load orders. Please try again.
                </td>
            </tr>
        `;
    }
}

// Filter orders based on current tab and search term
function filterAndRenderOrders() {
    const searchTerm = searchInput.value.toLowerCase();
    
    filteredOrders = allOrders.filter(order => {
        // Filter by status
        let statusMatch = false;
        if (currentTab === 'pending') {
            statusMatch = order.status === 'pending';
        } else if (currentTab === 'processing') {
            statusMatch = order.status === 'processing' || order.status === 'shipped';
        } else if (currentTab === 'completed') {
            statusMatch = ['completed', 'cancelled', 'rejected'].includes(order.status);
        }
        
        // Filter by search term if present
        if (searchTerm) {
            const orderIdMatch = order.orderId.toLowerCase().includes(searchTerm);
            const customerNameMatch = (
                (order.shippingInfo?.firstName?.toLowerCase().includes(searchTerm)) ||
                (order.shippingInfo?.lastName?.toLowerCase().includes(searchTerm)) ||
                (order.userName?.toLowerCase().includes(searchTerm)));
            const emailMatch = order.shippingInfo?.email?.toLowerCase().includes(searchTerm);
            
            return statusMatch && (orderIdMatch || customerNameMatch || emailMatch);
        }
        
        return statusMatch;
    });
    
    renderOrders();
    updatePagination();
}

// Render orders to the table
function renderOrders() {
    const tbody = ordersTable.querySelector('tbody');
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px;">
                    <i class="fas fa-box-open"></i> No orders found
                </td>
            </tr>
        `;
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = Math.min(startIndex + ordersPerPage, filteredOrders.length);
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    
    tbody.innerHTML = paginatedOrders.map(order => {
        const orderDate = order.orderDate || order.date || order.addedAt;
        const formattedDate = new Date(orderDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const customerName = order.shippingInfo ? 
            `${order.shippingInfo.firstName || ''} ${order.shippingInfo.lastName || ''}`.trim() : 
            'Unknown Customer';
        
        const orderType = order.isCustom ? 'Custom Shoe' : 'Pre-made';
        
        let statusBadge = '';
        if (order.status === 'pending') {
            statusBadge = '<span class="status-badge status-pending">Pending</span>';
        } else if (order.status === 'processing' || order.status === 'shipped') {
            statusBadge = '<span class="status-badge status-processing">In Process</span>';
        } else if (order.status === 'completed') {
            statusBadge = '<span class="status-badge status-completed">Completed</span>';
        } else if (order.status === 'cancelled' || order.status === 'rejected') {
            statusBadge = '<span class="status-badge status-cancelled">Cancelled</span>';
        }
        
        // Action buttons based on status
        let actionButtons = '';
        if (order.status === 'pending') {
            actionButtons = `
                <button class="action-btn btn-view" data-order-id="${order.orderId}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn btn-process" data-order-id="${order.orderId}">
                    <i class="fas fa-cog"></i> Process
                </button>
                <button class="action-btn btn-reject" data-order-id="${order.orderId}">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
        } else if (order.status === 'processing' || order.status === 'shipped') {
            actionButtons = `
                <button class="action-btn btn-view" data-order-id="${order.orderId}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn btn-complete" data-order-id="${order.orderId}">
                    <i class="fas fa-check"></i> Complete
                </button>
            `;
        } else {
            actionButtons = `
                <button class="action-btn btn-view" data-order-id="${order.orderId}">
                    <i class="fas fa-eye"></i> View
                </button>
            `;
        }
        
        return `
            <tr>
                <td>#${order.orderId}</td>
                <td>${customerName}</td>
                <td>${formattedDate}</td>
                <td>${orderType}</td>
                <td>${statusBadge}</td>
                <td>₱${order.price?.toFixed(2) || '0.00'}</td>
                <td>${actionButtons}</td>
            </tr>
        `;
    }).join('');
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const paginationNumbers = document.querySelectorAll('.pagination-number');
    
    // Clear existing numbers
    paginationNumbers.forEach(btn => btn.remove());
    
    // Add page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn pagination-number ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderOrders();
            updatePagination();
        });
        
        nextBtn.parentNode.insertBefore(pageBtn, nextBtn);
    }
    
    // Update prev/next buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// Process order
async function processOrder(orderId) {
    try {
        // Find the order in our local data first
        const order = allOrders.find(o => o.orderId === orderId);
        if (!order) throw new Error('Order not found');
        
        // Update status locally
        order.status = 'processing';
        order.statusUpdates = order.statusUpdates || {};
        order.statusUpdates.processing = {
            status: 'processing',
            timestamp: Date.now(),
            message: 'Order is being processed by admin'
        };
        
        // Update in Firebase
        const orderRef = ref(database, `AR_shoe_users/${order.source}/${order.userId}/${orderId}`);
        await set(orderRef, order);
        
        // Also update in transactions if different
        if (order.source === 'boughtshoe') {
            const transactionRef = ref(database, `AR_shoe_users/transactions/${order.userId}/${orderId}`);
            await set(transactionRef, {
                ...order,
                status: 'processing'
            });
        }
        
        // Refresh display
        filterAndRenderOrders();
        alert(`Order #${orderId} is now being processed!`);
        
    } catch (error) {
        console.error('Error processing order:', error);
        alert(`Failed to process order: ${error.message}`);
    }
}

// Complete order
async function completeOrder(orderId) {
    try {
        const order = allOrders.find(o => o.orderId === orderId);
        if (!order) throw new Error('Order not found');
        
        // Update status locally
        order.status = 'completed';
        order.statusUpdates = order.statusUpdates || {};
        order.statusUpdates.completed = {
            status: 'completed',
            timestamp: Date.now(),
            message: 'Order was completed successfully'
        };
        
        // Update in Firebase
        const orderRef = ref(database, `AR_shoe_users/${order.source}/${order.userId}/${orderId}`);
        await set(orderRef, order);
        
        // Also update in transactions if different
        if (order.source === 'boughtshoe') {
            const transactionRef = ref(database, `AR_shoe_users/transactions/${order.userId}/${orderId}`);
            await set(transactionRef, {
                ...order,
                status: 'completed'
            });
        }
        
        // Refresh display
        filterAndRenderOrders();
        alert(`Order #${orderId} has been marked as completed!`);
        
    } catch (error) {
        console.error('Error completing order:', error);
        alert(`Failed to complete order: ${error.message}`);
    }
}

// Reject order
async function rejectOrder(orderId, reason) {
    try {
        const order = allOrders.find(o => o.orderId === orderId);
        if (!order) throw new Error('Order not found');
        
        // Update status locally
        order.status = 'rejected';
        order.statusUpdates = order.statusUpdates || {};
        order.statusUpdates.rejected = {
            status: 'rejected',
            timestamp: Date.now(),
            message: `Order was rejected by admin. Reason: ${reason}`
        };
        
        // Update in Firebase
        const orderRef = ref(database, `AR_shoe_users/${order.source}/${order.userId}/${orderId}`);
        await set(orderRef, order);
        
        // Also update in transactions if different
        if (order.source === 'boughtshoe') {
            const transactionRef = ref(database, `AR_shoe_users/transactions/${order.userId}/${orderId}`);
            await set(transactionRef, {
                ...order,
                status: 'rejected'
            });
        }
        
        // If it's a non-custom order, restore stock
        if (!order.isCustom && order.shoeId && order.shopId) {
            await restoreStock(order);
        }
        
        // Refresh display
        filterAndRenderOrders();
        alert(`Order #${orderId} has been rejected successfully!`);
        
    } catch (error) {
        console.error('Error rejecting order:', error);
        alert(`Failed to reject order: ${error.message}`);
    }
}

// Restore stock for non-custom orders
async function restoreStock(order) {
    try {
        const { shoeId, shopId, size, quantity = 1 } = order;
        
        // Get current stock
        const shoeRef = ref(database, `AR_shoe_users/shoe/${shopId}/${shoeId}`);
        const shoeSnapshot = await get(shoeRef);
        
        if (shoeSnapshot.exists()) {
            const shoeData = shoeSnapshot.val();
            const variantKey = order.variantKey || 'variant_0';
            const sizeKey = order.sizeKey || `size_${size}`;
            
            if (shoeData.variants && shoeData.variants[variantKey] && shoeData.variants[variantKey].sizes) {
                const sizes = shoeData.variants[variantKey].sizes;
                
                // Find the size object (handles both numeric and string size keys)
                let sizeObj = null;
                for (const key in sizes) {
                    if (sizes[key][size] !== undefined) {
                        sizeObj = sizes[key][size];
                        break;
                    }
                }
                
                if (sizeObj) {
                    // Update stock
                    const newStock = (sizeObj.stock || 0) + quantity;
                    
                    // Need to update the specific size object in the nested structure
                    const updates = {};
                    for (const key in sizes) {
                        if (sizes[key][size] !== undefined) {
                            updates[`variants/${variantKey}/sizes/${key}/${size}/stock`] = newStock;
                            break;
                        }
                    }
                    
                    await update(ref(database, `AR_shoe_users/shoe/${shopId}/${shoeId}`), updates);
                }
            }
        }
    } catch (error) {
        console.error('Error restoring stock:', error);
        // Don't fail the whole rejection if stock restore fails
    }
}

// View order details
async function viewOrderDetails(orderId) {
    try {
        const order = allOrders.find(o => o.orderId === orderId);
        if (!order) throw new Error('Order not found');
        
        // Update modal header
        document.querySelector('.modal-header h2').textContent = `Order Details - #${order.orderId}`;
        
        // Customer info
        const shippingInfo = order.shippingInfo || {};
        document.getElementById('modalCustomerName').textContent = 
            `${shippingInfo.firstName || ''} ${shippingInfo.lastName || ''}`.trim() || 'Unknown Customer';
        document.getElementById('modalCustomerEmail').textContent = shippingInfo.email || 'N/A';
        document.getElementById('modalCustomerPhone').textContent = shippingInfo.phone || 'N/A';
        
        // Shipping info
        document.getElementById('modalShippingAddress').textContent = shippingInfo.address || 'N/A';
        document.getElementById('modalShippingCity').textContent = shippingInfo.city || 'N/A';
        document.getElementById('modalShippingZip').textContent = shippingInfo.zip || 'N/A';
        document.getElementById('modalShippingCountry').textContent = shippingInfo.country || 'N/A';
        
        // Payment info
        document.getElementById('modalPaymentMethod').textContent = order.paymentMethod || 'N/A';
        document.getElementById('modalPaymentStatus').textContent = 'Paid'; // Assuming all orders are paid
        
        // Order summary
        document.getElementById('modalOrderType').textContent = order.isCustom ? 'Custom Shoe' : 'Pre-made';
        document.getElementById('modalOrderModel').textContent = order.model ? 
            `${order.model.charAt(0).toUpperCase() + order.model.slice(1)} Shoe` : 'N/A';
        document.getElementById('modalOrderSize').textContent = order.size || 'N/A';
        document.getElementById('modalProductionTime').textContent = order.productionTime || 'N/A';
        document.getElementById('modalOrderTotal').textContent = `₱${order.price?.toFixed(2) || '0.00'}`;
        
        // Customization details (for custom orders)
        if (order.isCustom && order.selections) {
            const selections = order.selections;
            let customizationHTML = '';
            
            if (order.model === 'classic') {
                customizationHTML = `
                    <div class="detail-row">
                        <div class="detail-label">Sole:</div>
                        <div class="detail-value">${selections.sole?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Upper:</div>
                        <div class="detail-value">${selections.upper?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Laces:</div>
                        <div class="detail-value">${selections.laces?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Body Color:</div>
                        <div class="detail-value">
                            <span class="color-indicator" style="background-color: ${selections.bodyColor || '#fff'};"></span>
                            ${selections.bodyColor || 'White'}
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Heel Color:</div>
                        <div class="detail-value">
                            <span class="color-indicator" style="background-color: ${selections.heelColor || '#ccc'};"></span>
                            ${selections.heelColor || 'Gray'}
                        </div>
                    </div>
                `;
            } else if (order.model === 'runner') {
                customizationHTML = `
                    <div class="detail-row">
                        <div class="detail-label">Sole:</div>
                        <div class="detail-value">${selections.sole?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Upper:</div>
                        <div class="detail-value">${selections.upper?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Body Color:</div>
                        <div class="detail-value">
                            <span class="color-indicator" style="background-color: ${selections.bodyColor || '#fff'};"></span>
                            ${selections.bodyColor || 'White'}
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Collar Color:</div>
                        <div class="detail-value">
                            <span class="color-indicator" style="background-color: ${selections.collarColor || '#fff'};"></span>
                            ${selections.collarColor || 'White'}
                        </div>
                    </div>
                `;
            } else if (order.model === 'basketball') {
                customizationHTML = `
                    <div class="detail-row">
                        <div class="detail-label">Sole:</div>
                        <div class="detail-value">${selections.sole?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Upper:</div>
                        <div class="detail-value">${selections.upper?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Mudguard Color:</div>
                        <div class="detail-value">
                            <span class="color-indicator" style="background-color: ${selections.mudguardColor || '#000'};"></span>
                            ${selections.mudguardColor || 'Black'}
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Heel Color:</div>
                        <div class="detail-value">
                            <span class="color-indicator" style="background-color: ${selections.heelColor || '#ccc'};"></span>
                            ${selections.heelColor || 'Gray'}
                        </div>
                    </div>
                `;
            } else if (order.model === 'slipon') {
                customizationHTML = `
                    <div class="detail-row">
                        <div class="detail-label">Midsole:</div>
                        <div class="detail-value">${selections.midsole?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Midsole Color:</div>
                        <div class="detail-value">
                            <span class="color-indicator" style="background-color: ${selections.midsoleColor || '#fff'};"></span>
                            ${selections.midsoleColor || 'White'}
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Outsole Color:</div>
                        <div class="detail-value">
                            <span class="color-indicator" style="background-color: ${selections.outsoleColor || '#ccc'};"></span>
                            ${selections.outsoleColor || 'Gray'}
                        </div>
                    </div>
                `;
            }
            
            document.getElementById('modalCustomizationDetails').innerHTML = customizationHTML;
            
            // Set preview images if available
            if (order.model === 'classic') {
                document.getElementById('modalSoleImage').src = selections.sole?.image || '';
                document.getElementById('modalUpperImage').src = selections.upper?.image || '';
                document.getElementById('modalLacesImage').src = selections.laces?.image || '';
            } else if (order.model === 'runner' || order.model === 'basketball') {
                document.getElementById('modalSoleImage').src = selections.sole?.image || '';
                document.getElementById('modalUpperImage').src = selections.upper?.image || '';
            } else if (order.model === 'slipon') {
                document.getElementById('modalSoleImage').src = selections.midsole?.image || '';
            }
        } else {
            // For non-custom orders
            document.getElementById('modalCustomizationDetails').innerHTML = `
                <div class="detail-row">
                    <div class="detail-label">Product:</div>
                    <div class="detail-value">${order.shoeName || 'Unknown Product'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Variant:</div>
                    <div class="detail-value">${order.variantName || 'Standard'}</div>
                </div>
            `;
            
            // Set product image
            document.getElementById('modalSoleImage').src = order.image || '';
        }
        
        // Show modal
        orderModal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error viewing order details:', error);
        alert(`Failed to load order details: ${error.message}`);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    orderTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            orderTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            currentPage = 1;
            filterAndRenderOrders();
        });
    });
    
    // Search functionality
    searchBtn.addEventListener('click', () => {
        currentPage = 1;
        filterAndRenderOrders();
    });
    
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        currentPage = 1;
        filterAndRenderOrders();
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            filterAndRenderOrders();
        }
    });
    
    // Pagination
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderOrders();
            updatePagination();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderOrders();
            updatePagination();
        }
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal, #closeModalBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            orderModal.style.display = 'none';
        });
    });
    
    // Rejection modal
    document.getElementById('cancelRejectionBtn').addEventListener('click', () => {
        rejectionModal.style.display = 'none';
        rejectionForm.reset();
    });
    
    rejectionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const reason = document.getElementById('rejectionReason').value.trim();
        
        if (!reason) {
            alert('Please provide a reason for rejection');
            return;
        }
        
        rejectOrder(currentRejectOrderId, reason);
        rejectionModal.style.display = 'none';
        rejectionForm.reset();
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === orderModal) {
            orderModal.style.display = 'none';
        }
        if (e.target === rejectionModal) {
            rejectionModal.style.display = 'none';
            rejectionForm.reset();
        }
    });
    
    // Delegate table button events
    ordersTable.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        const orderId = target.dataset.orderId;
        if (!orderId) return;
        
        if (target.classList.contains('btn-view')) {
            viewOrderDetails(orderId);
        } else if (target.classList.contains('btn-process')) {
            if (confirm(`Mark order #${orderId} as processing?`)) {
                processOrder(orderId);
            }
        } else if (target.classList.contains('btn-complete')) {
            if (confirm(`Mark order #${orderId} as completed?`)) {
                completeOrder(orderId);
            }
        } else if (target.classList.contains('btn-reject')) {
            currentRejectOrderId = orderId;
            document.getElementById('rejectOrderId').textContent = `#${orderId}`;
            rejectionModal.style.display = 'flex';
        }
    });
}