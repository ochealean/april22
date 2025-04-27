import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, update, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";

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
const db = getDatabase(app);

// Global variables
let currentAction = null; // Stores 'approve' or 'reject'
let currentRow = null;    // Stores the table row being acted upon
let currentShopId = null; // Stores the shop ID
emailsend_2: {
    var emailCell;
    var email;
}

// DOM elements
const dialog = document.getElementById("confirmationDialog");
const overlay = document.getElementById("overlay");
const logoutDialog = document.getElementById('logoutDialog');
const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");
const logoutLink = document.querySelector('a[href="/admin/html/admin_login.html"]');
const cancelLogout = document.getElementById('cancelLogout');
const confirmLogout = document.getElementById('confirmLogout');
const modal = document.getElementById("ModalDialog");

/* UTILITY FUNCTIONS */
// Checks if a table is empty and displays a message if no rows are present
function checkEmptyTable() {
    const tbody = document.querySelector('tbody');
    if (tbody && tbody.querySelectorAll('tr').length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No pending shops remaining</td></tr>';
    }
}

//  Displays a notification message
//  @param {string} message - The text to display
//  @param {string} type - The notification type (success/error)
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.error("Notification element not found!");
        return;
    }

    // Set notification content and type
    notification.textContent = message;
    notification.className = `notification ${type}`;

    // Trigger the show animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10); // Small timeout to ensure CSS transition works

    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');

        // Reset after transition completes
        setTimeout(() => {
            notification.className = 'notification';
        }, 400); // Matches your CSS transition duration
    }, 3000);
}

// Updates confirmation dialog content based on action type
// @param {Object} shop - Shop data object
// @param {string} actionType - 'approve' or 'reject'
// @param {HTMLElement} currentRow - The table row being acted upon
function updateDialogContent(shop, actionType, currentRow) {
    const dialogMessage = document.getElementById("dialogMessage");
    const confirmBtn = document.getElementById("confirmAction");
    const confirmIcon = confirmBtn.querySelector('i');
    const actionText = confirmBtn.querySelector('.action-text');
    const rejectionInput = document.getElementById("rejectionReason");

    const username = shop.username || 'N/A';
    const shopName = shop.shopName || 'Unknown Shop';

    dialogMessage.textContent = `Are you sure you want to ${actionType} "${shopName}" (${username})?`;

    if (actionType === 'approve') {
        confirmIcon.className = 'fas fa-check';
        actionText.textContent = 'Approve';
        confirmBtn.className = 'approve-btn';
        rejectionInput.style.display = 'none';  // hide reason input
    } else {
        emailsend_3: {
            emailCell = currentRow.querySelector('td:nth-child(4)'); // 4th column
            email = emailCell.textContent.trim();
            console.log('Email:', email);
        }
        confirmIcon.className = 'fas fa-ban';
        actionText.textContent = 'Reject';
        confirmBtn.className = 'reject-btn';
        rejectionInput.style.display = 'block'; // show reason input
        rejectionInput.value = ''; // clear previous input
    }
}

// Shows the confirmation dialog and overlay
function showDialog() {
    dialog?.classList.add("show");
    overlay?.classList.add("show");
}

// Hides all dialogs and resets state
function hideDialog() {
    document.getElementById('shopDetailsModal')?.classList.remove('show');
    dialog?.classList.remove("show");
    overlay?.classList.remove("show");
    modal?.classList.remove("show");
    currentAction = null;
    currentRow = null;
    currentShopId = null;
}

/* SHOP DETAILS MODAL FUNCTIONS */
// Shows the shop details modal and loads data from Firebase
// @param {Event} e - Click event
function showShopModal(e) {
    e.preventDefault();

    // Get the closest view-link element (in case user clicked the icon)
    const viewLink = e.target.closest('.view-link');
    if (!viewLink) return;

    currentShopId = viewLink.getAttribute('data-id');  // Get ID from the link
    const shopRef = ref(db, `AR_shoe_users/shop/${currentShopId}`);

    onValue(shopRef, (snapshot) => {
        if (snapshot.exists()) {
            const shop = snapshot.val();
            // Add deep fallbacks
            const safeShop = {
                ...shop,
                uploads: shop.uploads || {
                    frontSideID: { url: '' },
                    backSideID: { url: '' },
                    licensePreview: { url: '' },
                    permitDocument: { url: '' }
                },
                shopCategory: shop.shopCategory || 'N/A',
                shopAddress: shop.shopAddress || 'N/A',
                ownerPhone: shop.ownerPhone || '',
                shopCity: shop.shopCity || '',
                shopState: shop.shopState || '',
                shopCountry: shop.shopCountry || '',
                shopZip: shop.shopZip || ''
            };
            updateShopModalContent(safeShop);
            document.getElementById('shopDetailsModal').classList.add('show');
            document.getElementById('overlay').classList.add('show');
        } else {
            showNotification("Shop data not found", "error");
        }
    }, { onlyOnce: true });
}

// Updates modal content with shop details
// @param {Object} shop - Complete shop data object
function updateShopModalContent(shop) {
    const modalContent = document.getElementById('modalShopContent');
    const getDocUrl = (doc) => shop.uploads[doc]?.url || 'no-document.png';

    modalContent.innerHTML = `
        <div class="modal-section">
            <h3>Basic Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Shop ID: </span>
                    <span class="info-value">${currentShopId}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Shop Name: </span>
                    <span class="info-value">${shop.shopName || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Category: </span>
                    <span class="info-value">${shop.shopCategory || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Description: </span>
                    <span class="info-value">${shop.shopDescription || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <h3>Owner Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Name: </span>
                    <span class="info-value">${shop.ownerName || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email: </span>
                    <span class="info-value">${shop.email || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Phone: </span>
                    <span class="info-value">${shop.ownerPhone ? '+63 ' + shop.ownerPhone : 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <h3>Location Details</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Address: </span>
                    <span class="info-value">${[
            shop.shopAddress,
            shop.shopCity,
            shop.shopState,
            shop.shopCountry
        ].filter(Boolean).join(', ') || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">ZIP Code: </span>
                    <span class="info-value">${shop.shopZip || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <h3>Business Documents</h3>
            <div class="document-grid">
                ${renderDocumentItem(getDocUrl('frontSideID'), 'Front ID')}
                ${renderDocumentItem(getDocUrl('backSideID'), 'Back ID')}
                ${renderDocumentItem(getDocUrl('licensePreview'), 'Business License')}
                ${renderDocumentItem(getDocUrl('permitDocument'), 'Permit')}
            </div>
        </div>

        <div class="modal-section">
            <h3>Timestamps</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Status Changed Date: </span>
                    <span class="info-value">${formatDisplayDate(shop.dateProcessed) || 'N/A'}</span>
                </div>
                <div class="info-item">
                    ${shop.status === 'approved' ? `
                        <span class="info-label">Approval Date: </span>
                        <span class="info-value">${formatDisplayDate(shop.dateApproved)}</span>
                    ` : ''}
                    
                    ${shop.status === 'rejected' ? `
                        <span class="info-label">Rejection Date: </span>
                        <span class="info-value">${formatDisplayDate(shop.dateRejected)}</span>
                    ` : ''}
                </div>
                <div class="info-item">
                    ${shop.status === 'rejected' ? `
                        <span class="info-label">Reason for Being Rejected: </span>
                    ` : ''}
                </div>
                <div class="info-item">
                    ${shop.status === 'rejected' ? `
                        <span class="info-value">${shop.rejectionReason}</span>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Formats ISO date string to readable format
// @param {string} isoString - ISO date string
// @returns {string} Formatted date string
function formatDisplayDate(isoString) {
    if (!isoString) return 'N/A';

    const date = new Date(isoString);
    if (isNaN(date)) return 'Invalid Date';

    // Format time (1:19 AM)
    const timeString = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    // Format date (April 19, 2025)
    const month = date.toLocaleString('default', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();

    return `${timeString} ${month} ${day}, ${year}`;
}

// Creates HTML for document preview items
// @param {string} url - Document URL
// @param {string} title - Document title
// @returns {string} HTML string for document item
function renderDocumentItem(url, title) {
    return `
    <div class="document-item">
        <div class="document-title">${title}</div>
        <a href="${url}" target="_blank" class="document-preview">
            <img src="${url}" alt="${title}" 
                 onerror="this.onerror=null;this.src='/images/no-document.png'">
        </a>
    </div>`;
}

/* SHOP MANAGEMENT FUNCTIONS */
// * Shows confirmation dialog for approve/reject actions
// * @param {Event} e - Click event
// * @param {string} actionType - 'approve' or 'reject'
function showConfirmationDialog(e, actionType) {
    e.preventDefault();
    currentShopId = e.currentTarget.getAttribute('data-id');
    currentAction = actionType;
    currentRow = e.currentTarget.closest("tr");

    const shopRef = ref(db, `AR_shoe_users/shop/${currentShopId}`);

    onValue(shopRef, (snapshot) => {
        if (snapshot.exists()) {
            const shop = snapshot.val();
            emailsend_1: { // nilagyan ng currentRow
                updateDialogContent(shop, actionType, currentRow);
            }
            showDialog();
        } else {
            showNotification("Shop data not found", "error");
        }
    }, { onlyOnce: true });
}

// ito yung nagdidisplay or nagloload ng value mula firebase into html, 
// kumbaga sya yung kumukuha ng lahat ng values sa database at ididisplay nya sa html
// Loads shops from Firebase and populates table
// @param {string} status - Shop status (pending/approved/rejected)
// @param {string} tableBodyId - ID of target table body
function loadShops(status, tableBodyId) {
    const shopsRef = ref(db, 'AR_shoe_users/shop');
    const tbody = document.getElementById(tableBodyId);

    if (!tbody) return;

    onValue(shopsRef, (snapshot) => {
        tbody.innerHTML = '';

        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="7">No shops found</td></tr>`;
            return;
        }

        let hasShops = false;
        snapshot.forEach((childSnapshot) => {
            const shop = childSnapshot.val();
            if (shop.status === status) {
                hasShops = true;
                const row = createShopRow(childSnapshot.key, shop, status);
                tbody.appendChild(row);
            }
        });

        if (!hasShops) {
            tbody.innerHTML = `<tr><td colspan="7">No ${status} shops found</td></tr>`;
        }
    });
}

// ito yung makikita sa loadShops()
// Creates a table row for shop data
// @param {string} shopId - Firebase shop ID
// @param {Object} shop - Shop data object
// @param {string} status - Current shop status
// @returns {HTMLElement} Table row element
function createShopRow(shopId, shop, status) {
    const row = document.createElement('tr');
    row.className = 'animate-fade';
    row.setAttribute('data-id', shopId);

    const maxLength = 10; // Set your desired character limit
    const reasonText = shop.rejectionReason || 'No reason provided';
    const shortenedText = reasonText.length > maxLength ? reasonText.substring(0, maxLength) + '...' : reasonText;

    row.innerHTML = `
        <td title="${shopId}">${shopId.substring(0, 6)}...</td>
        <td>${shop.shopName || 'N/A'}</td>
        <td>${shop.ownerName || 'N/A'}</td>
        <td>${shop.email || 'N/A'}</td>
        <td><a href="#" data-id="${shopId}" class="view-link"><i class="fas fa-eye"></i> View</a></td>
        <td>${shop.dateProcessed ? formatDisplayDate(shop.dateProcessed) : 'Pending'}</td>
        ${status === 'rejected' ? `<td title="${shortenedText}">${shortenedText || 'No reason'}</td>` : ''}
        <td>
            ${status === 'pending' ?
            `<button class="approve-btn" data-id="${shopId}"><i class="fas fa-check"></i> Approve</button>
                 <button class="reject-btn" data-id="${shopId}"><i class="fas fa-ban"></i> Reject</button>` :
            status === 'approved' ?
                `<button class="reject-btn" data-id="${shopId}"><i class="fas fa-ban"></i> Reject</button>` :
                `<button class="approve-btn" data-id="${shopId}"><i class="fas fa-check"></i> Approve</button>`}
        </td>
    `;

    row.querySelector('.approve-btn')?.addEventListener('click', (e) => showConfirmationDialog(e, 'approve'));
    row.querySelector('.reject-btn')?.addEventListener('click', (e) => showConfirmationDialog(e, 'reject'));
    row.querySelector('.view-link')?.addEventListener('click', (e) => e.preventDefault());

    return row;
}

/* EVENT HANDLERS */
// nandito lahat ng function
// Initializes all event listeners
function initializeEventListeners() {
    document.getElementById('closeShopModal')?.addEventListener('click', function () {
        document.getElementById('shopDetailsModal').classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    });

    // Menu toggle
    menuBtn?.addEventListener("click", function () {
        navLinks?.classList.toggle("active");
    });

    // Action confirmation
    document.getElementById("confirmAction")?.addEventListener("click", function () {
        if (!currentAction || !currentShopId) return;

        const rejectionInput = document.getElementById("rejectionReason");
        let reason = null;

        if (currentAction === "reject") {
            reason = rejectionInput.value.trim();
            if (!reason) {
                showNotification("Please provide a reason for rejection.", "error");

                // Add visual feedback to the textarea
                rejectionInput.style.border = "2px solid red";
                rejectionInput.focus();

                // Remove the red border after 2 seconds
                setTimeout(() => {
                    rejectionInput.style.border = "";
                }, 2000);

                return;
            }
        }

        const shopRef = ref(db, `AR_shoe_users/shop/${currentShopId}`);
        const updateData = {
            status: currentAction === "approve" ? "approved" : "rejected",
            dateProcessed: new Date().toISOString(),  // Update existing dateProcessed
            ...(currentAction === "approve" && { dateApproved: new Date().toISOString() }),
            ...(currentAction === "reject" && { dateRejected: new Date().toISOString() }),
            ...(reason && { rejectionReason: reason })
        };

        update(shopRef, updateData)
            .then(() => {
                showNotification(`Shop ${currentAction}ed successfully!`, "success");
                currentRow?.remove();
                checkEmptyTable();
            })
            .catch((error) => {
                showNotification(`Failed to ${currentAction} shop: ${error.message}`, "error");
            })
            .finally(() => {
                hideDialog();
            });

        emailsend_4: {
            if (currentAction === "reject") {
                emailjs.init('gBZ5mCvVmgjo7wn0W');

                if (!email) {
                    alert('Please enter a recipient email');
                    return;
                }

                const templateParams = {
                    email: email,
                    from_name: 'Your App Name',
                    message: rejectionInput.value,
                    reply_to: 'your-default-reply@example.com'
                };

                emailjs.send('service_8i28mes', 'template_btslatu', templateParams)
                    .then(function (response) {
                        console.log('Email sent!', response.status, response.text);
                        alert('Email sent successfully to ' + email);
                    }, function (error) {
                        console.error('Failed to send', error);
                        alert('Failed to send email: ' + error.text);
                    });
            }
        }
    });

    document.getElementById("cancelAction")?.addEventListener("click", hideDialog);

    overlay?.addEventListener('click', function() {
        // Close all specific dialogs
        document.getElementById('confirmationDialog')?.classList.remove('show');
        document.getElementById('shopDetailsModal')?.classList.remove('show');
        document.getElementById('logoutDialog')?.classList.remove('show');
        document.getElementById('ModalDialog')?.classList.remove('show');
        
        // Also hide the overlay itself
        this.classList.remove('show');
        
        // Clear any rejection reason input
        document.getElementById('rejectionReason').value = '';
        
        // Reset action tracking variables
        currentAction = null;
        currentRow = null;
        currentShopId = null;
    });

    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.view-link')) {
            showShopModal(e);
        }
    });
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadShops('pending', 'pendingShopsTableBody');
    loadShops('approved', 'approvedShopsTableBody');
    loadShops('rejected', 'rejectedShopsTableBody');
});

document.addEventListener("DOMContentLoaded", function () {
    // Logout functionality
    const logoutLink = document.querySelector('a[href="/admin/html/admin_login.html"]');
    const logoutDialog = document.getElementById('logoutDialog');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    logoutLink?.addEventListener('click', function(e) {
        e.preventDefault();
        logoutDialog.classList.add('show');
        document.getElementById('overlay').classList.add('show');
    });

    cancelLogout?.addEventListener('click', function() {
        logoutDialog.classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    });

    confirmLogout?.addEventListener('click', function() {
        window.location.href = '/admin/html/admin_login.html';
    });
});