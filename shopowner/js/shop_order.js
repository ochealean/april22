import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, update, set, get, off } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Your Firebase config
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

let shopLoggedin;
let currentOrderId = null;
let currentUserId = null;

// Initialize the page
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, `AR_shoe_users/employees/${user.uid}`);
        onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                shopLoggedin = userData.shopId;
                loadOrders();
            } else {
                shopLoggedin = user.uid;
                loadOrders();
            }
        }, { onlyOnce: true });
    } else {
        window.location.href = "/user_login.html";
    }
});

// Load orders with filtering
function loadOrders() {
    const ordersRef = ref(db, 'AR_shoe_users/transactions');
    onValue(ordersRef, (snapshot) => {
        if (!snapshot.exists()) {
            document.getElementById('ordersTableBody').innerHTML = 
                '<tr><td colspan="6" style="text-align: center;">No orders found</td></tr>';
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

        displayOrders(orders);
    });
}

// Display orders with filtering
function displayOrders(orders) {
    const statusFilter = document.getElementById('statusFilter').value;
    const filteredOrders = statusFilter === 'all' 
        ? orders 
        : orders.filter(order => order.status === statusFilter);

    const sortedOrders = filteredOrders.sort((a, b) => 
        new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = sortedOrders.map(order => createOrderRow(order)).join('');
}

// Create order row HTML
function createOrderRow(order) {
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

    // Action buttons based on status
    let actionButtons = '';
    if (status === 'pending') {
        actionButtons = `
            <button class="btn btn-accept" onclick="acceptOrder('${order.orderId}', '${order.userId}')">
                <i class="fas fa-check"></i> Accept
            </button>
            <button class="btn btn-reject" onclick="showRejectModal('${order.orderId}', '${order.userId}')">
                <i class="fas fa-times"></i> Reject
            </button>
        `;
    } else if (status === 'accepted') { // line 123 redirect to track.html
        actionButtons = `
            <button class="btn btn-track" onclick="trackbtn('${order.orderId}', '${order.userId}')">
                <i class="fas fa-plus"></i> Add Track Status
            </button>
        `;
    }
     else {
        actionButtons = `<span class="no-actions">No actions available</span>`;
    }

    return `
        <tr>
            <td>#${order.orderId}</td>
            <td>${customerName}</td>
            <td>${orderDate}</td>
            <td>${amount}</td>
            <td><span class="status ${statusClass}">${status}</span></td>
            <td class="actions">${actionButtons}</td>
        </tr>
    `;
}

// Accept order function
window.acceptOrder = async function(orderId, userId) {
    try {
        const orderRef = ref(db, `AR_shoe_users/transactions/${userId}/${orderId}`);
        await update(orderRef, {
            status: 'accepted',
            updatedAt: new Date().toISOString()
        });
        alert('Order accepted successfully');
    } catch (error) {
        console.error("Error accepting order:", error);
        alert("Failed to accept order");
    }
};

// Show reject modal
window.showRejectModal = function(orderId, userId) {
    const modal = document.getElementById('rejectModal');
    if (!modal) return;

    currentOrderId = orderId;
    currentUserId = userId;
    modal.style.display = 'block';
};

window.trackbtn = function(orderID, userId) {window.location.href = `trackform.html?orderID=${orderID}&userID=${userId}`;
}


// Reject order function
window.rejectOrder = async function() {
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
        alert('Order rejected successfully');
    } catch (error) {
        console.error("Error rejecting order:", error);
        alert("Failed to reject order");
    }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Status filter change
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', loadOrders);
    }

    const confirmBtn = document.getElementById('confirmRejectBtn');
    const cancelBtn = document.getElementById('cancelRejectBtn');
    const closeModalBtn = document.querySelector('.close-modal');
    const rejectModal = document.getElementById('rejectModal');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', rejectOrder);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            rejectModal.style.display = 'none';
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            rejectModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === rejectModal) {
            rejectModal.style.display = 'none';
        }
    });
});
