import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, get, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
const auth = getAuth(app);
const db = getDatabase(app);

let shopLoggedin;
let currentOrderId = null;
let currentUserId = null;

// Expose functions to global scope
window.viewOrderDetails = viewOrderDetails;
window.viewShoeDetails = viewShoeDetails;

async function viewOrderDetails(orderId) {
    currentOrderId = orderId;
    try {
        const transactionsRef = ref(db, 'AR_shoe_users/transactions');
        const snapshot = await get(transactionsRef);

        if (!snapshot.exists()) {
            alert('Order not found');
            return;
        }

        let foundOrder = null;
        snapshot.forEach((userSnapshot) => {
            const userOrders = userSnapshot.val();
            if (userOrders[orderId]) {
                const order = userOrders[orderId];
                const items = order.order_items ? Object.values(order.order_items) :
                    order.item ? [order.item] : [];

                if (items.some(item => item.shopId === shopLoggedin)) {
                    currentUserId = userSnapshot.key; // Set the currentUserId here
                    foundOrder = {
                        ...order,
                        orderId: orderId,
                        userId: userSnapshot.key
                    };
                    return true;
                }
            }
        });

        if (foundOrder) {
            displayOrderModal(foundOrder);
        } else {
            alert('Order not found');
        }
    } catch (error) {
        console.error("Error fetching order:", error);
        alert("Error loading order details");
    }
}

function loadRecentOrders() {
    const ordersRef = ref(db, 'AR_shoe_users/transactions');

    // Use onValue for real-time updates
    onValue(ordersRef, (snapshot) => {
        if (!snapshot.exists()) {
            displayRecentOrders([]);
            return;
        }

        const orders = [];
        snapshot.forEach((userSnapshot) => {
            const userOrders = userSnapshot.val();
            for (const orderId in userOrders) {
                const order = userOrders[orderId];
                const items = order.order_items ? Object.values(order.order_items) :
                    order.item ? [order.item] : [];

                if (items.some(item => item.shopId === shopLoggedin)) {
                    orders.push({
                        ...order,
                        orderId: orderId,
                        userId: userSnapshot.key
                    });
                }
            }
        });

        const recentOrders = orders.sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        ).slice(0, 5);

        displayRecentOrders(recentOrders);
    }, (error) => {
        console.error("Error loading recent orders:", error);
        displayRecentOrders([]);
    });
}

function displayRecentOrders(orders) {
    const ordersTable = document.querySelector('.order-table tbody');
    if (!ordersTable) return;

    ordersTable.innerHTML = orders.length === 0 ?
        '<tr><td colspan="6" style="text-align: center;">No orders found</td></tr>' :
        orders.map(order => {
            const customerName = order.shippingInfo ?
                `${order.shippingInfo.firstName} ${order.shippingInfo.lastName}` :
                'Unknown Customer';

            const orderDate = new Date(order.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const amount = order.totalAmount ?
                `$${order.totalAmount.toFixed(2)}` : '$0.00';

            const status = order.status || 'pending';
            const statusClass = status === 'completed' ? 'shipped' :
                status === 'processing' ? 'pending' :
                    status === 'cancelled' ? 'cancelled' : 'pending';

            return `
                <tr>
                    <td>#${order.orderId}</td>
                    <td>${customerName}</td>
                    <td>${orderDate}</td>
                    <td>${amount}</td>
                    <td><span class="status ${statusClass}">${status}</span></td>
                    <td>
                        <button class="btn btn-view" onclick="viewOrderDetails('${order.orderId}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
}

async function getAllOrdersByShopId(shopId) {
    try {
        const ordersRef = ref(db, 'AR_shoe_users/transactions');
        const snapshot = await get(ordersRef);

        if (!snapshot.exists()) return [];

        const orders = [];
        snapshot.forEach((userSnapshot) => {
            const userOrders = userSnapshot.val();
            for (const orderId in userOrders) {
                const order = userOrders[orderId];
                const items = order.order_items ? Object.values(order.order_items) :
                    order.item ? [order.item] : [];

                if (items.some(item => item.shopId === shopId)) {
                    orders.push({
                        ...order,
                        orderId: orderId,
                        userId: userSnapshot.key
                    });
                }
            }
        });

        return orders;
    } catch (error) {
        console.error("Error fetching orders:", error);
        throw error;
    }
}

function loadShopDashboard() {
    // These will now be real-time listeners
    loadShopStats();
    loadRecentProducts();
    loadRecentOrders();
}

function loadShopStats() {
    const shoesRef = ref(db, `AR_shoe_users/shoe/${shopLoggedin}`);
    onValue(shoesRef, (snapshot) => {
        if (snapshot.exists()) {
            let totalProducts = 0;
            let totalStock = 0;

            snapshot.forEach((childSnapshot) => {
                totalProducts++;
                const shoe = childSnapshot.val();

                if (shoe.variants) {
                    const variants = Array.isArray(shoe.variants) ?
                        shoe.variants : Object.values(shoe.variants || {});

                    variants.forEach(variant => {
                        if (variant.sizes) {
                            const sizes = Array.isArray(variant.sizes) ?
                                variant.sizes : Object.values(variant.sizes || {});

                            sizes.forEach(size => {
                                totalStock += parseInt(size.stock) || 0;
                            });
                        }
                    });
                }
            });

            const productsElement = document.querySelector('.stats-grid .stat-card:nth-child(3) .value');
            const stockElement = document.querySelector('.stats-grid .stat-card:nth-child(4) .value');

            if (productsElement) productsElement.textContent = totalProducts;
            if (stockElement) stockElement.textContent = totalStock;
        }
    });
}

function loadRecentProducts() {
    const shoesRef = ref(db, `AR_shoe_users/shoe/${shopLoggedin}`);
    const recentAddedContainer = document.getElementById('recentAdded');

    onValue(shoesRef, (snapshot) => {
        if (snapshot.exists()) {
            const shoes = [];
            snapshot.forEach((childSnapshot) => {
                const shoe = childSnapshot.val();
                shoe.id = childSnapshot.key;
                shoes.push(shoe);
            });

            const recentShoes = shoes
                .sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0))
                .slice(0, 4);


            displayRecentProducts(recentShoes, recentAddedContainer);
        } else if (recentAddedContainer) {
            recentAddedContainer.innerHTML = '<p>No shoes added yet</p>';
        }
    });
}

function displayRecentProducts(shoes, container) {
    if (!container) return;

    if (shoes.length === 0) {
        container.innerHTML = '<p>No shoes added yet</p>';
        return;
    }

    let html = '<div class="product-list">';

    shoes.forEach(shoe => {
        // Get variants - handle both array and object formats
        const variants = shoe.variants
            ? (Array.isArray(shoe.variants)
                ? shoe.variants
                : Object.values(shoe.variants || {}))
            : [];

        const firstVariant = variants[0] || null;
        const price = firstVariant ? `$${firstVariant.price}` : '$0.00';
        const color = firstVariant ? firstVariant.color : 'No color';
        const imageUrl = shoe.defaultImage || (firstVariant ? firstVariant.imageUrl : null);

        html += `
        <div class="product-card">
            <div class="product-image">
                ${imageUrl
                ? `<img src="${imageUrl}" alt="${shoe.shoeName}" class="shoe-thumbnail">`
                : '<div class="no-image">No Image</div>'
            }
            </div>
            <div class="product-info">
                <div class="product-title">${shoe.shoeName || 'No Name'}</div>
                <div class="product-code">Code: ${shoe.shoeCode || 'N/A'}</div>
                <div class="product-price">${price}</div>
                <div class="product-color">${color}</div>
                <button class="btn btn-view" onclick="viewShoeDetails('${shoe.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function viewShoeDetails(shoeId) {
    window.location.href = `/shopowner/html/shop_inventory.html?shoeId=${shoeId}`;
}

function displayOrderModal(order) {
    const modalContent = document.getElementById('orderDetailsContent');
    const orderDate = new Date(order.date).toLocaleString();

    const items = order.order_items ? Object.values(order.order_items) :
        order.item ? [order.item] : [];

    const itemsHtml = items.map(item => `
        <div class="order-item">
            <img src="${item.imageUrl || 'https://via.placeholder.com/150'}" 
                 alt="${item.name}" class="order-item-image">
            <div class="order-item-details">
                <div class="order-item-title">${item.name}</div>
                <div class="order-item-variant">${item.variantName} (${item.color}) - Size: ${item.size}</div>
                <div>Quantity: ${item.quantity}</div>
                <div class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        </div>
    `).join('');

    modalContent.innerHTML = `
        <div class="order-details-grid">
            <div>
                <div class="order-details-section">
                    <h3>Order Information</h3>
                    <p><strong>Order ID:</strong> ${order.orderId}</p>
                    <p><strong>Date:</strong> ${orderDate}</p>
                    <p><strong>Status:</strong> <span class="status ${order.status}">${order.status}</span></p>
                    <p><strong>Total:</strong> $${order.totalAmount?.toFixed(2) || '0.00'}</p>
                </div>
                
                <div class="order-details-section">
                    <h3>Shipping Information</h3>
                    <p><strong>Name:</strong> ${order.shippingInfo.firstName} ${order.shippingInfo.lastName}</p>
                    <p><strong>Address:</strong> ${order.shippingInfo.address}, ${order.shippingInfo.city}</p>
                    <p><strong>Country:</strong> ${order.shippingInfo.country}</p>
                    <p><strong>ZIP:</strong> ${order.shippingInfo.zip}</p>
                    <p><strong>Phone:</strong> ${order.shippingInfo.phone}</p>
                    <p><strong>Email:</strong> ${order.shippingInfo.email}</p>
                </div>
            </div>
            
            <div>
                <div class="order-details-section">
                    <h3>Order Items</h3>
                    ${itemsHtml}
                </div>
            </div>
        </div>
    `;

    const acceptBtn = document.getElementById('acceptOrderBtn');
    const rejectBtn = document.getElementById('rejectOrderBtn');

    if (order.status === 'pending') {
        acceptBtn.style.display = 'inline-block';
        rejectBtn.style.display = 'inline-block';
    } else {
        acceptBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
    }

    document.getElementById('orderModal').style.display = 'block';
}

async function acceptOrder() {
    if (!currentOrderId || !currentUserId) {
        console.error("Missing order ID or user ID");
        return;
    }

    try {
        const orderRef = ref(db, `AR_shoe_users/transactions/${currentUserId}/${currentOrderId}`);
        await update(orderRef, {
            status: 'accepted',
            updatedAt: new Date().toISOString()
        });

        alert('Order accepted successfully');
        document.getElementById('orderModal').style.display = 'none';
        loadRecentOrders(); // Refresh the orders list
    } catch (error) {
        console.error("Error accepting order:", error);
        alert("Failed to accept order");
    }
}

async function rejectOrder() {
    if (!currentOrderId || !currentUserId) {
        console.error("Missing order ID or user ID");
        return;
    }

    const reason = document.getElementById('rejectionReason').value.trim();
    if (!reason) {
        alert('Please provide a reason for rejection');
        return;
    }

    try {
        const orderRef = ref(db, `AR_shoe_users/transactions/${currentUserId}/${currentOrderId}`);
        await update(orderRef, {
            status: 'rejected',
            rejectionReason: reason,
            updatedAt: new Date().toISOString()
        });

        document.getElementById('rejectionReason').value = '';
        document.getElementById('rejectModal').style.display = 'none';
        document.getElementById('orderModal').style.display = 'none';

        alert('Order rejected successfully');
        loadRecentOrders(); // Refresh the orders list
    } catch (error) {
        console.error("Error rejecting order:", error);
        alert("Failed to reject order");
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = ref(db, `AR_shoe_users/employees/${user.uid}`);
        onValue(userRef, async (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                shopLoggedin = userData.shopId;

                if (userData.role === "employee" || userData.role === "manager") {
                    document.getElementById("addemployeebtn").style.display = "none";
                }

                await loadShopDashboard();
            } else {
                shopLoggedin = user.uid;
                try {
                    const orders = await getAllOrdersByShopId(shopLoggedin);
                    document.getElementById("orderValuedisplay").textContent = orders.length || 0;
                    await loadShopDashboard();
                } catch (error) {
                    console.error("Error loading dashboard:", error);
                }
            }
        }, { onlyOnce: true });
    } else {
        window.location.href = "/user_login.html";
    }
});

window.acceptOrder = acceptOrder;
window.rejectOrder = rejectOrder;

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInventory');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#inventoryTable tbody tr').forEach(row => {
                const name = row.children[1]?.textContent.toLowerCase() || '';
                const code = row.children[2]?.textContent.toLowerCase() || '';
                row.style.display = (name.includes(term) || code.includes(term)) ? '' : 'none';
            });
        });
    }

    const logoutBtn = document.getElementById('logout_btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = '/user_login.html';
            }).catch(console.error);
        });
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });

    document.getElementById('acceptOrderBtn')?.addEventListener('click', acceptOrder);
    document.getElementById('rejectOrderBtn')?.addEventListener('click', () => {
        document.getElementById('rejectModal').style.display = 'block';
    });
    document.getElementById('confirmRejectBtn')?.addEventListener('click', rejectOrder);
    document.getElementById('cancelRejectBtn')?.addEventListener('click', () => {
        document.getElementById('rejectModal').style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
});