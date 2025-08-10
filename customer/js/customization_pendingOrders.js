import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, update, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
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

async function fetchPendingOrders(userId) {
    try {
        const ordersRef = ref(database, `AR_shoe_users/boughtshoe/${userId}`);
        const snapshot = await get(ordersRef);

        if (snapshot.exists()) {
            const orders = snapshot.val();
            return Object.entries(orders).map(([orderId, order]) => ({ 
                orderId, 
                ...order,
                // Format the date for display
                formattedDate: new Date(order.orderDate || order.addedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
    }
}

function renderOrders(orders) {
    const container = document.getElementById("ordersContainer");
    container.innerHTML = "";

    if (!orders.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>No pending orders found.</p>
            </div>
        `;
        return;
    }

    orders.forEach(order => {
        const card = document.createElement("div");
        card.classList.add("order-card");

        // Determine product name based on whether it's a custom order or regular shoe
        let productName = "Custom Shoe";
        let productImage = order.image || "https://via.placeholder.com/100x60?text=No+Image";
        
        if (!order.isCustom) {
            productName = order.shoeName || "Unknown Product";
        } else {
            productName = `Custom ${order.model} shoe`;
        }

        card.innerHTML = `
            <div class="order-header">
                <span class="order-id">Order #${order.orderId}</span>
                <span class="order-date">${order.formattedDate || "Date not available"}</span>
            </div>
            <div class="order-details">
                <div class="detail-row">
                    <span class="detail-label">Product:</span>
                    <span class="detail-value">${productName}</span>
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
                    <span class="detail-value">₱${order.price?.toLocaleString() || "N/A"}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="status-badge status-pending">${order.status || "Pending"}</span>
                </div>
                <img src="${productImage}" alt="Product Image" class="order-image">
            </div>
            <div class="order-actions">
                <button class="btn btn-process" data-order-id="${order.orderId}">Process</button>
                <button class="btn btn-cancel" data-order-id="${order.orderId}">Cancel</button>
            </div>
        `;

        container.appendChild(card);
    });

    // Add event listeners to buttons
    document.querySelectorAll('.btn-process').forEach(button => {
        button.addEventListener('click', (e) => {
            const orderId = e.target.getAttribute('data-order-id');
            processOrder(orderId);
        });
    });

    document.querySelectorAll('.btn-cancel').forEach(button => {
        button.addEventListener('click', (e) => {
            const orderId = e.target.getAttribute('data-order-id');
            cancelOrder(orderId);
        });
    });
}

function processOrder(orderId) {
    console.log(`Processing order ${orderId}`);
    // Add your order processing logic here
    alert(`Order ${orderId} is being processed`);
}

async function cancelOrder(orderId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in to cancel orders');
            return;
        }

        if (!confirm(`Are you sure you want to cancel order ${orderId}? This action cannot be undone.`)) {
            return;
        }

        // Show loading state
        const cancelButton = document.querySelector(`.btn-cancel[data-order-id="${orderId}"]`);
        const originalText = cancelButton.textContent;
        cancelButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Canceling...';
        cancelButton.disabled = true;

        // Get the order details first
        const orderRef = ref(database, `AR_shoe_users/boughtshoe/${user.uid}/${orderId}`);
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
                ...orderData.statusUpdates,
                cancelled: {
                    status: 'cancelled',
                    timestamp: Date.now(),
                    message: 'Order was cancelled by customer'
                }
            }
        };

        // Update in both boughtshoe and transactions
        await Promise.all([
            set(orderRef, { ...orderData, ...updates }),
            set(ref(database, `AR_shoe_users/customizedtransactions/${user.uid}`), { 
                ...orderData, 
                ...updates,
                status: 'cancelled'
            })
        ]);

        // If it's a non-custom order, restore stock (if applicable)
        if (!orderData.isCustom && orderData.shoeId && orderData.shopId) {
            await restoreStock(orderData);
        }

        // Refresh the orders list
        const orders = await fetchPendingOrders(user.uid);
        renderOrders(orders);

        alert(`Order ${orderId} has been successfully cancelled.`);

    } catch (error) {
        console.error('Error cancelling order:', error);
        alert(`Failed to cancel order: ${error.message}`);

        // Restore button state if error occurs
        const cancelButton = document.querySelector(`.btn-cancel[data-order-id="${orderId}"]`);
        if (cancelButton) {
            cancelButton.textContent = originalText;
            cancelButton.disabled = false;
        }
    }
}

async function restoreStock(orderData) {
    try {
        const { shoeId, shopId, size, quantity = 1 } = orderData;
        
        // Get current stock
        const shoeRef = ref(database, `AR_shoe_users/shoe/${shopId}/${shoeId}`);
        const shoeSnapshot = await get(shoeRef);
        
        if (shoeSnapshot.exists()) {
            const shoeData = shoeSnapshot.val();
            const variantKey = orderData.variantKey || 'variant_0';
            const sizeKey = orderData.sizeKey || `size_${size}`;
            
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
        // Don't fail the whole cancellation if stock restore fails
    }
}

// Detect logged-in user and fetch orders
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Also fetch user details to display name
        const userRef = ref(database, `AR_shoe_users/customer/${user.uid}`);
        const userSnapshot = await get(userRef);
        let userName = "Customer";
        
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            userName = `${userData.firstName} ${userData.lastName}`;
        }

        document.getElementById("ordersContainer").innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading orders for ${userName}...</p>
            </div>
        `;

        const orders = await fetchPendingOrders(user.uid);
        renderOrders(orders);
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