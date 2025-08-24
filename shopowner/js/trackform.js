// Use consistent versions (all v10.11.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, onValue, push, update, remove } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

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
const auth = getAuth(app);  // Now this will work properly
const db = getDatabase(app);

// Global variables
let shopLoggedin; // shop ID of the logged-in user
let roleLoggedin; // role of the logged-in user
let sname; //shop name

// Get orderID and userID from URL
const urlParams = new URLSearchParams(window.location.search);
const orderID = urlParams.get("orderID");
const userID = urlParams.get("userID");

if (!orderID || !userID) {
    alert("Missing orderID or userID in URL");
    throw new Error("No orderID or userID provided");
}



// Initialize the page
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Fetch shop name from database
        const shopRef = ref(db, `AR_shoe_users/employees/${user.uid}`);
        onValue(shopRef, (snapshot) => {
            const shopData = snapshot.val();
            console.log("shopData: ", shopData);

            // this will run if the user a Employee NOT a shop owner
            if (shopData) {
                roleLoggedin = shopData.role;
                shopLoggedin = shopData.shopId;
                console.log("shopLoggedin: ", shopLoggedin);
                sname = shopData.shopName || ''; // Initialize with empty string if not available

                // Set role-based UI elements
                if (shopData.role.toLowerCase() === "manager") {
                    document.getElementById("addemployeebtn").style.display = "none";
                } else if (shopData.role.toLowerCase() === "salesperson") {
                    document.getElementById("addemployeebtn").style.display = "none";
                    document.getElementById("analyticsbtn").style.display = "none";
                }

            } else {
                // this will run if the user is a shop owner
                roleLoggedin = "Shop Owner"; // Default role
                sname = 'Shop Owner'; // Default shop name
                shopLoggedin = user.uid;
            }
        }, (error) => {
            console.error("Error fetching shop data:", error);
            shopLoggedin = user.uid; // Fallback to user UID
            sname = 'Unknown Shop';
        });
    } else {
        window.location.href = "/user_login.html";
    }
});

// DOM elements
const domElements = {
    orderTitle: document.querySelector(".order-title"),
    customerName: document.querySelector(".meta-value:nth-child(2)"),
    orderDate: document.querySelector(".meta-item:nth-child(2) .meta-value"),
    itemCount: document.querySelector(".meta-item:nth-child(3) .meta-value"),
    orderTotal: document.querySelector(".meta-item:nth-child(4) .meta-value"),
    carrierInput: document.getElementById("carrier"),
    trackingNumberInput: document.getElementById("trackingNumber"),
    shipDateInput: document.getElementById("shipDate"),
    estDeliveryInput: document.getElementById("estDelivery"),
    shippingNotesInput: document.getElementById("shippingNotes"),
    updateList: document.getElementById("updateList"),
    addUpdateBtn: document.getElementById("addUpdateBtn"),
    updateModal: document.getElementById("updateModal"),
    closeModal: document.getElementById("closeModal"),
    cancelUpdate: document.getElementById("cancelUpdate"),
    trackingForm: document.getElementById("trackingForm"),
    updateForm: document.getElementById("updateForm")
};

// Initialize the application
function init() {
    setupEventListeners();
    loadOrderData();
}

// Set up all event listeners
function setupEventListeners() {
    // Modal handling
    if (domElements.addUpdateBtn) {
        domElements.addUpdateBtn.addEventListener("click", () => {
            if (domElements.updateModal) {
                domElements.updateModal.style.display = "flex";
                // Set current datetime as default
                const now = new Date();
                const datetimeLocal = now.toISOString().slice(0, 16);
                document.getElementById("updateDate").value = datetimeLocal;
            }
        });
    }

    if (domElements.closeModal) {
        domElements.closeModal.addEventListener("click", () => {
            if (domElements.updateModal) domElements.updateModal.style.display = "none";
        });
    }

    if (domElements.cancelUpdate) {
        domElements.cancelUpdate.addEventListener("click", () => {
            if (domElements.updateModal) domElements.updateModal.style.display = "none";
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === domElements.updateModal) {
            domElements.updateModal.style.display = "none";
        }
    });

    // Save shipping info
    if (domElements.trackingForm) {
        domElements.trackingForm.addEventListener("submit", (e) => {
            e.preventDefault();
            saveShippingInfo();
        });
    }

    // Add status update
    if (domElements.updateForm) {
        domElements.updateForm.addEventListener("submit", (e) => {
            e.preventDefault();
            addStatusUpdate();
        });
    }

    // Delete update (delegated event)
    if (domElements.updateList) {
        domElements.updateList.addEventListener("click", (e) => {
            const deleteBtn = e.target.closest(".btn-danger");
            if (deleteBtn) {
                const updateID = deleteBtn.dataset.id;
                if (confirm("Are you sure you want to delete this update?")) {
                    deleteStatusUpdate(updateID);
                }
            }
        });
    }
}

// Load order data from Firebase
function loadOrderData() {
    const userOrdersRef = ref(db, `AR_shoe_users/transactions/${userID}/${orderID}`);

    onValue(userOrdersRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            alert("Order not found");
            return;
        }

        updateOrderInfo(data);
        updateShippingInfo(data);
        renderStatusUpdates(data.statusUpdates || {});
    }, {
        onlyOnce: false // Keep listening for updates
    });
}


// Update order information display
function updateOrderInfo(data) {
    if (domElements.orderTitle) {
        domElements.orderTitle.textContent = `Order #${orderID}`;
    }

    if (domElements.customerName && data.shippingInfo) {
        const firstName = data.shippingInfo.firstName || '';
        const lastName = data.shippingInfo.lastName || '';
        domElements.customerName.textContent = `${firstName} ${lastName}`.trim() || "N/A";
    }

    if (domElements.orderDate && data.date) {
        domElements.orderDate.textContent = new Date(data.date).toLocaleDateString();
    }

    if (domElements.itemCount) {
        const quantity = data.item?.quantity || 1;
        domElements.itemCount.textContent = quantity;
    }

    if (domElements.orderTotal && data.totalAmount) {
        domElements.orderTotal.textContent = `₱${data.totalAmount.toFixed(2)}`;
    }
}

// Update shipping information form
function updateShippingInfo(data) {
    if (!data.shipping) return;

    if (domElements.carrierInput) domElements.carrierInput.value = data.shipping.carrier || "";
    if (domElements.trackingNumberInput) domElements.trackingNumberInput.value = data.shipping.trackingNumber || "";
    if (domElements.shipDateInput) domElements.shipDateInput.value = data.shipping.shipDate || "";
    if (domElements.estDeliveryInput) domElements.estDeliveryInput.value = data.shipping.estDelivery || "";
    if (domElements.shippingNotesInput) domElements.shippingNotesInput.value = data.shipping.notes || "";
}

// Render status updates to the list
function renderStatusUpdates(updates) {
    if (!domElements.updateList) return;

    // Get reference to the empty state element
    const emptyState = document.getElementById("emptyUpdatesState");
    
    // Check if there are any updates
    const hasUpdates = updates && Object.keys(updates).length > 0;
    
    // Show/hide empty state based on whether updates exist
    if (emptyState) {
        emptyState.style.display = hasUpdates ? "none" : "block";
    }
    
    // Clear the update list
    domElements.updateList.innerHTML = "";

    // If no updates, return early
    if (!hasUpdates) return;

    // Convert updates object to array and sort by timestamp (newest first)
    const sortedUpdates = Object.entries(updates)
        .map(([id, update]) => ({ id, ...update }))
        .sort((a, b) => b.timestamp - a.timestamp);

    sortedUpdates.forEach(update => {
        addUpdateToDOM(update.id, update);
    });
}

// Add a single update to the DOM
function addUpdateToDOM(updateID, update) {
    if (!domElements.updateList) return;

    const item = document.createElement("li");
    item.className = "update-item";
    item.innerHTML = `
        <div class="update-header">
            <span class="update-date">${formatDateTime(update.timestamp)}</span>
            <span class="update-status">${update.status}</span>
        </div>
        <p class="update-message">${update.message}</p>
        ${update.location ? `<p class="update-location">${update.location}</p>` : ''}
        <div class="update-actions">
            <button class="btn btn-danger" data-id="${updateID}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    domElements.updateList.appendChild(item);
}

// Format timestamp for display
function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString();
}

// Save shipping information to Firebase
function saveShippingInfo() {
    const shippingData = {
        carrier: domElements.carrierInput?.value || "",
        trackingNumber: domElements.trackingNumberInput?.value || "",
        shipDate: domElements.shipDateInput?.value || "",
        estDelivery: domElements.estDeliveryInput?.value || "",
        notes: domElements.shippingNotesInput?.value || ""
    };

    update(ref(db, `AR_shoe_users/transactions/${userID}/${orderID}/shipping`), shippingData)
        .then(() => alert("Shipping info updated successfully!"))
        .catch(error => {
            console.error("Error saving shipping info:", error);
            alert("Failed to save shipping info");
        });
}

// Add a new status update
function addStatusUpdate() {
    const status = document.getElementById("updateStatus")?.value;
    const datetime = document.getElementById("updateDate")?.value;
    const message = document.getElementById("updateMessage")?.value;
    const location = document.getElementById("updateLocation")?.value;

    if (!status || !datetime || !message) {
        alert("Please fill in all required fields");
        return;
    }

    const updateData = {
        status,
        timestamp: new Date(datetime).getTime(),
        message,
        location: location || null
    };
    const updatesStatus = {
        status: status
    };

    const updatesRef = ref(db, `AR_shoe_users/transactions/${userID}/${orderID}/statusUpdates`);

    push(updatesRef, updateData)
        .then(() => {
            domElements.updateModal.style.display = "none";
            domElements.updateForm.reset();
        })
        .catch(error => {
            console.error("Error adding status update:", error);
            alert("Failed to add status update");
        });

        console.log("ref update data:",` AR_shoe_users/transactions/${userID}/${orderID}`);
    const updatesStatusRef = ref(db, `AR_shoe_users/transactions/${userID}/${orderID}`);

    update(updatesStatusRef, updatesStatus)
    console.log(updatesStatus);
}

// Delete a status update
function deleteStatusUpdate(updateID) {
    remove(ref(db, `AR_shoe_users/transactions/${userID}/${orderID}/statusUpdates/${updateID}`))
        .catch(error => {
            console.error("Error deleting update:", error);
            alert("Failed to delete update");
        });
}

// Initialize the application
init();

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