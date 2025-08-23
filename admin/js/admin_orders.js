// admin_orders.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    get, 
    update,
    set
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
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

// Load all orders from both customizedtransactions and boughtshoe
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

        // Fetch all orders from customizedtransactions
        const customizedTransactionsRef = ref(database, 'AR_shoe_users/customizedtransactions');
        const customizedTransactionsSnapshot = await get(customizedTransactionsRef);
        
        // Fetch all orders from boughtshoe
        const boughtShoeRef = ref(database, 'AR_shoe_users/boughtshoe');
        const boughtShoeSnapshot = await get(boughtShoeRef);

        allOrders = [];

        // Process customizedtransactions orders
        if (customizedTransactionsSnapshot.exists()) {
            customizedTransactionsSnapshot.forEach((userOrders) => {
                userOrders.forEach((order) => {
                    const orderData = order.val();
                    allOrders.push({
                        ...orderData,
                        orderId: order.key,
                        userId: userOrders.key,
                        source: 'customizedtransactions',
                        isCustom: true
                    });
                });
            });
        }

        // Process boughtshoe orders
        if (boughtShoeSnapshot.exists()) {
            boughtShoeSnapshot.forEach((userOrders) => {
                userOrders.forEach((order) => {
                    const orderData = order.val();
                    // Only add if not already in customizedtransactions
                    if (!allOrders.some(o => o.orderId === order.key)) {
                        allOrders.push({
                            ...orderData,
                            orderId: order.key,
                            userId: userOrders.key,
                            source: 'boughtshoe',
                            isCustom: orderData.isCustom || false
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
            statusMatch = order.status === 'processing';
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
        } else if (order.status === 'processing') {
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
        } else if (order.status === 'processing') {
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
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
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
        await update(orderRef, {
            status: 'processing',
            statusUpdates: order.statusUpdates
        });
        
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
        await update(orderRef, {
            status: 'completed',
            statusUpdates: order.statusUpdates
        });
        
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
        await update(orderRef, {
            status: 'rejected',
            statusUpdates: order.statusUpdates
        });
        
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
        
        // Get modal body elements
        const modalBody = document.querySelector('.modal-body');
        
        // Create order details HTML based on the order type
        let orderDetailsHTML = '';
        
        if (order.isCustom) {
            // Custom order details
            const selections = order.selections || {};
            
            orderDetailsHTML = `
                <div class="order-details-grid">
                    <div>
                        <div class="detail-section">
                            <h3><i class="fas fa-user"></i> Customer Information</h3>
                            <div class="detail-row">
                                <div class="detail-label">Name:</div>
                                <div class="detail-value">${order.shippingInfo?.firstName || ''} ${order.shippingInfo?.lastName || ''}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Email:</div>
                                <div class="detail-value">${order.shippingInfo?.email || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Phone:</div>
                                <div class="detail-value">${order.shippingInfo?.phone || 'N/A'}</div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h3><i class="fas fa-truck"></i> Shipping Information</h3>
                            <div class="detail-row">
                                <div class="detail-label">Address:</div>
                                <div class="detail-value">${order.shippingInfo?.address || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">City:</div>
                                <div class="detail-value">${order.shippingInfo?.city || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">ZIP Code:</div>
                                <div class="detail-value">${order.shippingInfo?.zip || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Country:</div>
                                <div class="detail-value">${order.shippingInfo?.country || 'N/A'}</div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h3><i class="fas fa-credit-card"></i> Payment Information</h3>
                            <div class="detail-row">
                                <div class="detail-label">Method:</div>
                                <div class="detail-value">${order.paymentMethod || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Status:</div>
                                <div class="detail-value">Paid</div>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div class="detail-section">
                            <h3><i class="fas fa-shopping-bag"></i> Order Summary</h3>
                            <div class="shoe-preview-container">
                                <img src="${order.image || 'https://via.placeholder.com/200x120?text=No+Image'}" alt="Shoe Preview" class="component-preview">
                            </div>
                            
                            <div class="detail-row">
                                <div class="detail-label">Order Type:</div>
                                <div class="detail-value">Custom Shoe</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Model:</div>
                                <div class="detail-value">${order.model ? order.model.charAt(0).toUpperCase() + order.model.slice(1) : 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Size:</div>
                                <div class="detail-value">${order.size || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Production Time:</div>
                                <div class="detail-value">${order.productionTime || 'N/A'}</div>
                            </div>
                            
                            <h3 style="margin-top: 1.5rem;"><i class="fas fa-palette"></i> Customization</h3>
            `;
            
            // Add customization details based on model type
            if (order.model === 'classic') {
                orderDetailsHTML += `
                    <div class="detail-row">
                        <div class="detail-label">Body Color:</div>
                        <div class="detail-value">${selections.bodyColor || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Laces:</div>
                        <div class="detail-value">${selections.laces?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Laces Color:</div>
                        <div class="detail-value">${selections.laces?.color || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Insole Type:</div>
                        <div class="detail-value">${selections.insole?.id || 'N/A'}</div>
                    </div>
                `;
            } else if (order.model === 'runner') {
                orderDetailsHTML += `
                    <div class="detail-row">
                        <div class="detail-label">Body Color:</div>
                        <div class="detail-value">${selections.bodyColor || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Laces:</div>
                        <div class="detail-value">${selections.laces?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Laces Color:</div>
                        <div class="detail-value">${selections.laces?.color || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Insole Type:</div>
                        <div class="detail-value">${selections.insole?.id || 'N/A'}</div>
                    </div>
                `;
            } else if (order.model === 'basketball') {
                orderDetailsHTML += `
                    <div class="detail-row">
                        <div class="detail-label">Body Color:</div>
                        <div class="detail-value">${selections.bodyColor || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Laces:</div>
                        <div class="detail-value">${selections.laces?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Laces Color:</div>
                        <div class="detail-value">${selections.laces?.color || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Insole Type:</div>
                        <div class="detail-value">${selections.insole?.id || 'N/A'}</div>
                    </div>
                `;
            } else if (order.model === 'slipon') {
                orderDetailsHTML += `
                    <div class="detail-row">
                        <div class="detail-label">Midsole:</div>
                        <div class="detail-value">${selections.midsole?.id || 'Standard'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Midsole Color:</div>
                        <div class="detail-value">${selections.midsoleColor || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Outsole Color:</div>
                        <div class="detail-value">${selections.outsoleColor || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Insole Type:</div>
                        <div class="detail-value">${selections.insole?.id || 'N/A'}</div>
                    </div>
                `;
            }
            
            orderDetailsHTML += `
                            <div class="detail-row" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--gray-light);">
                                <div class="detail-label" style="font-weight: 600;">Total:</div>
                                <div class="detail-value" style="font-weight: 600;">₱${order.price?.toFixed(2) || '0.00'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Pre-made order details
            orderDetailsHTML = `
                <div class="order-details-grid">
                    <div>
                        <div class="detail-section">
                            <h3><i class="fas fa-user"></i> Customer Information</h3>
                            <div class="detail-row">
                                <div class="detail-label">Name:</div>
                                <div class="detail-value">${order.shippingInfo?.firstName || ''} ${order.shippingInfo?.lastName || ''}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Email:</div>
                                <div class="detail-value">${order.shippingInfo?.email || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Phone:</div>
                                <div class="detail-value">${order.shippingInfo?.phone || 'N/A'}</div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h3><i class="fas fa-truck"></i> Shipping Information</h3>
                            <div class="detail-row">
                                <div class="detail-label">Address:</div>
                                <div class="detail-value">${order.shippingInfo?.address || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">City:</div>
                                <div class="detail-value">${order.shippingInfo?.city || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">ZIP Code:</div>
                                <div class="detail-value">${order.shippingInfo?.zip || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Country:</div>
                                <div class="detail-value">${order.shippingInfo?.country || 'N/A'}</div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h3><i class="fas fa-credit-card"></i> Payment Information</h3>
                            <div class="detail-row">
                                <div class="detail-label">Method:</div>
                                <div class="detail-value">${order.paymentMethod || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Status:</div>
                                <div class="detail-value">Paid</div>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div class="detail-section">
                            <h3><i class="fas fa-shopping-bag"></i> Order Summary</h3>
                            <div class="shoe-preview-container">
                                <img src="${order.imageUrl || order.image || 'https://via.placeholder.com/200x120?text=No+Image'}" alt="Shoe Preview" class="component-preview">
                            </div>
                            
                            <div class="detail-row">
                                <div class="detail-label">Order Type:</div>
                                <div class="detail-value">Pre-made Shoe</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Product:</div>
                                <div class="detail-value">${order.shoeName || 'Unknown Product'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Variant:</div>
                                <div class="detail-value">${order.variantName || 'Standard'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Size:</div>
                                <div class="detail-value">${order.size || 'N/A'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Color:</div>
                                <div class="detail-value">${order.color || 'N/A'}</div>
                            </div>
                            
                            <div class="detail-row" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--gray-light);">
                                <div class="detail-label" style="font-weight: 600;">Total:</div>
                                <div class="detail-value" style="font-weight: 600;">₱${order.price?.toFixed(2) || '0.00'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Add action buttons
        orderDetailsHTML += `
            <div class="modal-actions">
                <button class="action-btn btn-cancel" id="closeModalBtn"><i class="fas fa-times"></i> Close</button>
        `;
        
        if (order.status === 'pending') {
            orderDetailsHTML += `
                <button class="action-btn btn-process" id="processOrderBtn" data-order-id="${order.orderId}"><i class="fas fa-cog"></i> Mark as Processing</button>
                <button class="action-btn btn-reject" id="modalRejectBtn" data-order-id="${order.orderId}"><i class="fas fa-times"></i> Reject</button>
            `;
        } else if (order.status === 'processing') {
            orderDetailsHTML += `
                <button class="action-btn btn-complete" id="completeOrderBtn" data-order-id="${order.orderId}"><i class="fas fa-check"></i> Mark as Completed</button>
            `;
        }
        
        orderDetailsHTML += `</div>`;
        
        // Update modal content
        modalBody.innerHTML = orderDetailsHTML;
        
        // Add event listeners to action buttons
        const processBtn = document.getElementById('processOrderBtn');
        if (processBtn) {
            processBtn.addEventListener('click', () => {
                processOrder(order.orderId);
                orderModal.style.display = 'none';
            });
        }
        
        const completeBtn = document.getElementById('completeOrderBtn');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => {
                completeOrder(order.orderId);
                orderModal.style.display = 'none';
            });
        }
        
        const modalRejectBtn = document.getElementById('modalRejectBtn');
        if (modalRejectBtn) {
            modalRejectBtn.addEventListener('click', () => {
                currentRejectOrderId = order.orderId;
                document.getElementById('rejectOrderId').textContent = `#${order.orderId}`;
                rejectionModal.style.display = 'flex';
                orderModal.style.display = 'none';
            });
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
    document.querySelector('.close-modal').addEventListener('click', () => {
        orderModal.style.display = 'none';
    });
    
    document.addEventListener('click', (e) => {
        if (e.target.id === 'closeModalBtn') {
            orderModal.style.display = 'none';
        }
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
    
    // Mobile menu toggle
    const menuBtn = document.querySelector('.menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', function() {
            document.querySelector('.nav-links').classList.toggle('active');
        });
    }
}