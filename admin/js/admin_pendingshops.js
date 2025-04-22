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
let emailCell;
let email;

// --- Action confirmation dialog ---
let currentAction = null; // Stores 'approve' or 'reject'
let currentRow = null;    // Stores the table row being acted upon
let currentShopId = null; // Stores the shop ID
const dialog = document.getElementById("confirmationDialog");
const overlay = document.getElementById("overlay");
const rejectionInput = document.getElementById("rejectionReason");
const rejectionContainer = document.getElementById("rejectionReasonContainer");

// Initialize EmailJS (moved to top level)
emailjs.init('gBZ5mCvVmgjo7wn0W');

// Update the confirm action handler to check for rejection reason
document.getElementById("confirmAction")?.addEventListener("click", async function () {
    if (!currentAction || !currentShopId) return;

    let reason = null;
    if (currentAction === "reject") {
        reason = rejectionInput.value.trim();
        if (!reason) {
            showNotification("Please provide a reason for rejection.", "error");
            rejectionInput.style.border = "2px solid red";
            rejectionInput.focus();
            return;
        }
    }

    const shopRef = ref(db, `AR_shoe_users/shop/${currentShopId}`);
    const updateData = {
        status: currentAction === "approve" ? "approved" : "rejected",
        // dateProcessed: new Date().toISOString()
    };

    try {
        // Update shop status first
        await update(shopRef, updateData);
        
        // Send rejection email if needed
        if (currentAction === "reject" && email) {
            const templateParams = {
                email: email,
                from_name: 'Your App Name',
                message: reason || 'Your application has been rejected.',
                reply_to: 'your-default-reply@example.com'
            };
            
            await emailjs.send('service_8i28mes', 'template_btslatu', templateParams);
            console.log('Rejection email sent to', email);
        }

        showNotification(`Shop ${currentAction}ed successfully!`, "success");
        currentRow?.remove();
        checkEmptyTable();
    } catch (error) {
        console.error("Error:", error);
        showNotification(`Failed to ${currentAction} shop: ${error.message}`, "error");
    } finally {
        hideDialog();
    }
});

// Cancel action handler
document.getElementById("cancelAction")?.addEventListener("click", hideDialog);

// Update the hideDialog function to clear and hide the reason input
function hideDialog() {
    dialog?.classList.remove("show");
    overlay?.classList.remove("show");
    rejectionInput.value = ''; // Clear the reason input
    rejectionInput.style.border = ""; // Reset border if it was red
    rejectionContainer.style.display = 'none'; // Hide the container
    currentAction = null;
    currentRow = null;
    currentShopId = null;
}

function checkEmptyTable() {
    const tbody = document.querySelector('tbody');
    if (tbody && tbody.querySelectorAll('tr').length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No pending shops remaining</td></tr>';
    }
}

function showConfirmationDialog(e, actionType) {
    e.preventDefault();
    currentShopId = e.currentTarget.getAttribute('data-id');
    currentAction = actionType;
    currentRow = e.currentTarget.closest("tr");

    // Show/hide rejection textarea based on action type
    if (actionType === 'reject') {
        rejectionContainer.style.display = 'block';
        rejectionInput.style.display = 'block';
    } else {
        rejectionContainer.style.display = 'none';
        rejectionInput.style.display = 'none';
    }

    const shopRef = ref(db, `AR_shoe_users/shop/${currentShopId}`);
    
    onValue(shopRef, (snapshot) => {
        if (snapshot.exists()) {
            const shop = snapshot.val();
            updateDialogContent(shop, actionType, currentRow);
            showDialog();
        } else {
            showNotification("Shop data not found", "error");
        }
    }, { onlyOnce: true });
}

function updateDialogContent(shop, actionType, currentRow) {
    // Get dialog elements - we'll use querySelector to be more flexible
    const dialog = document.querySelector(".confirmation-dialog");
    if (!dialog) {
        console.error("Confirmation dialog not found");
        return;
    }

    // Find elements within the dialog
    const dialogMessage = dialog.querySelector("#dialogMessage, .dialog-message");
    const confirmBtn = dialog.querySelector("#confirmAction, .confirm-action");
    const rejectionInput = dialog.querySelector("#rejectionReason, textarea.rejection-reason");
    
    // Verify essential elements exist
    if (!dialogMessage || !confirmBtn) {
        console.error("Essential dialog elements not found");
        return;
    }

    // Get confirm icon safely
    const confirmIcon = confirmBtn.querySelector('i');
    if (!confirmIcon) {
        console.warn("Confirm button icon not found");
    }

    const username = shop.username || 'N/A';
    const shopName = shop.shopName || 'Unknown Shop';

    // Update dialog message
    dialogMessage.textContent = `Are you sure you want to ${actionType} "${shopName}" (${username})?`;
    
    // Handle rejection case
    if (actionType === 'reject' && rejectionInput) {
        // Show rejection reason input if it exists
        rejectionInput.style.display = 'block';
        rejectionInput.value = '';
        rejectionInput.required = true;
        
        // Get email from table cell
        emailCell = currentRow.querySelector('td:nth-child(4)'); // 4th column
        if (emailCell) {
            email = emailCell.textContent.trim();
            console.log('Email found:', email);
        } else {
            console.error("Email cell (4th td) not found in row");
            email = null;
        }
    } 
    // Handle approval case
    else if (rejectionInput) {
        // Hide rejection reason input if it exists
        rejectionInput.style.display = 'none';
        rejectionInput.required = false;
    }

    // Update button styling if icon exists
    if (confirmIcon) {
        confirmIcon.className = actionType === 'approve' ? 'fas fa-check' : 'fas fa-ban';
        confirmBtn.className = actionType === 'approve' ? 'approve-btn' : 'reject-btn';
    }
}

function showDialog() {
    dialog?.classList.add("show");
    overlay?.classList.add("show");
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = 'notification'; // Reset classes
    notification.classList.add(type); // Add type class (success/error)
    notification.style.display = 'flex'; // Change from 'block' to 'flex'
    notification.classList.add('show'); // Add show class for animation

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500); // Wait for animation to complete
    }, 3000);
}

function createShopRow(shopId, shop, status) {
    const row = document.createElement('tr');
    row.className = 'animate-fade';
    row.setAttribute('data-id', shopId);

    // Basic row content - customize as needed
    row.innerHTML = `
        <td>${shopId.substring(0, 6)}...</td>
        <td>${shop.shopName || 'N/A'}</td>
        <td>${shop.ownerName || 'N/A'}</td>
        <td>${shop.email || 'N/A'}</td>
        <td><a href="#" class="view-link"><i class="fas fa-eye"></i> View</a></td>
        <td>${shop.dateProcessed || 'Pending'}</td>
        ${status === 'rejected' ? `<td></td>` : ''}
        <td>
            ${status === 'pending' ?
            `<button class="approve-btn" data-id="${shopId}"><i class="fas fa-check"></i> Approve</button>
                 <button class="reject-btn" data-id="${shopId}"><i class="fas fa-ban"></i> Reject</button>` :
            status === 'approved' ?
                `<button class="reject-btn" data-id="${shopId}"><i class="fas fa-ban"></i> Reject</button>` :
                `<button class="approve-btn" data-id="${shopId}"><i class="fas fa-check"></i> Approve</button>`}
        </td>
    `;

    // Add event listeners
    row.querySelector('.approve-btn')?.addEventListener('click', (e) => showConfirmationDialog(e, 'approve'));
    row.querySelector('.reject-btn')?.addEventListener('click', (e) => showConfirmationDialog(e, 'reject'));

    return row;
}

// -----------------------------------------add from macmac code---------------------------------------------------
let currentPage = 1;
const rowsPerPage = 10; // Show 10 rows per page
const tableBody = document.querySelector("#pending-shops tbody");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const paginationContainer = document.querySelector(".pagination"); // Container for page number buttons

function updateTableDisplay() {
    if (!tableBody) return; // Guard clause
    const rows = tableBody.querySelectorAll("tr");
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;

    rows.forEach((row, index) => {
        // Hide row by default
        row.classList.remove("show");
        row.style.display = 'none';

        // Show row if it's within the current page range
        if (index >= startIndex && index < endIndex) {
            row.classList.add("show");
            row.style.display = '';
        }
    });
}

function updatePaginationButtons() {
    if (!tableBody) return; // Guard clause
    const rows = tableBody.querySelectorAll("tr");
    const pageCount = Math.ceil(rows.length / rowsPerPage);
    const pageButtons = paginationContainer.querySelectorAll(".page-btn");

    // Update active state for number buttons
    pageButtons.forEach(btn => {
        btn.classList.remove("active");
        if (parseInt(btn.textContent) === currentPage) {
            btn.classList.add("active");
        }
    });

    // Update Previous/Next button disabled states
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === pageCount || pageCount === 0;
}

function createPageButton(pageNumber) {
    const pageBtn = document.createElement("button");
    pageBtn.className = "pagination-btn page-btn";
    pageBtn.textContent = pageNumber;

    if (pageNumber === currentPage) {
        pageBtn.classList.add("active");
    }

    pageBtn.addEventListener("click", () => {
        currentPage = pageNumber;
        setupPagination();
    });

    // Insert the button before the 'Next' button
    paginationContainer.insertBefore(pageBtn, nextBtn);
}

// Search functionality
const searchInput = document.getElementById('shopSearch');
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearch');

// Store the original shops data
let originalShops = [];
let filteredShops = [];

// Modified loadShops function to store data
function loadShops(status, tableBodyId) {
    const shopsRef = ref(db, 'AR_shoe_users/shop');
    const tbody = document.getElementById(tableBodyId);

    if (!tbody) return;

    onValue(shopsRef, (snapshot) => {
        tbody.innerHTML = '';
        originalShops = [];

        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="7">No shops found</td></tr>`;
            return;
        }

        let hasShops = false;
        snapshot.forEach((childSnapshot) => {
            const shop = childSnapshot.val();
            if (shop.status === status) {
                hasShops = true;
                const shopWithId = { ...shop, id: childSnapshot.key };
                originalShops.push(shopWithId);
                const row = createShopRow(childSnapshot.key, shop, status);
                tbody.appendChild(row);
            }
        });

        if (!hasShops) {
            tbody.innerHTML = `<tr><td colspan="7">No ${status} shops found</td></tr>`;
        }

        // Initialize filteredShops with all shops
        filteredShops = [...originalShops];
        
        // Setup pagination after loading data
        setupPagination();
    });
}

function performSearch(searchTerm) {
    const tbody = document.getElementById('pendingShopsTableBody');
    if (!tbody) return;

    if (!searchTerm.trim()) {
        filteredShops = [...originalShops];
    } else {
        filteredShops = originalShops.filter(shop => {
            const searchLower = searchTerm.toLowerCase();
            return (
                (shop.id && shop.id.toLowerCase().includes(searchLower)) ||
                (shop.shopName && shop.shopName.toLowerCase().includes(searchLower)) ||
                (shop.ownerName && shop.ownerName.toLowerCase().includes(searchLower)) ||
                (shop.email && shop.email.toLowerCase().includes(searchLower))
            );
        });
    }

    // Clear current table
    tbody.innerHTML = '';

    // Display filtered results
    if (filteredShops.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No matching shops found</td></tr>';
    } else {
        filteredShops.forEach(shop => {
            const row = createShopRow(shop.id, shop, 'pending');
            tbody.appendChild(row);
        });
    }

    // Reset to first page after search
    currentPage = 1;
    setupPagination();
}

function setupSearchListeners() {
    searchBtn?.addEventListener('click', () => {
        performSearch(searchInput.value.trim());
    });

    clearSearchBtn?.addEventListener('click', () => {
        searchInput.value = '';
        performSearch('');
    });

    searchInput?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value.trim());
        }
    });
}

function setupPagination() {
    const rows = document.querySelectorAll("#pendingShopsTableBody tr");
    const pageCount = Math.ceil(rows.length / rowsPerPage);

    // Clear existing page number buttons (excluding prev/next)
    const existingPageButtons = paginationContainer.querySelectorAll(".page-btn");
    existingPageButtons.forEach(btn => btn.remove());

    // Add page number buttons
    const maxPageButtonsToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtonsToShow / 2));
    let endPage = Math.min(pageCount, startPage + maxPageButtonsToShow - 1);

    // Adjust startPage if endPage hits the limit early
    startPage = Math.max(1, endPage - maxPageButtonsToShow + 1);

    // Add 'First' button if needed
    if (startPage > 1) {
        createPageButton(1);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            paginationContainer.insertBefore(ellipsis, nextBtn);
        }
    }

    // Add page number buttons in the calculated range
    for (let i = startPage; i <= endPage; i++) {
        createPageButton(i);
    }

    // Add 'Last' button if needed
    if (endPage < pageCount) {
        if (endPage < pageCount - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            paginationContainer.insertBefore(ellipsis, nextBtn);
        }
        createPageButton(pageCount);
    }

    updateTableDisplay();
    updatePaginationButtons();
}

// Menu toggle functionality
const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");

menuBtn?.addEventListener("click", function () {
    navLinks.classList.toggle("active");
    menuBtn.innerHTML = navLinks.classList.contains("active") ?
        '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
});

// Navigation button handlers
prevBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        setupPagination();
    }
});

nextBtn?.addEventListener("click", () => {
    if (!tableBody) return;
    const rows = tableBody.querySelectorAll("tr");
    const pageCount = Math.ceil(rows.length / rowsPerPage);

    if (currentPage < pageCount) {
        currentPage++;
        setupPagination();
    }
});

// Logout functionality
const logoutLink = document.querySelector('a[href="/admin/html/admin_login.html"]');
const logoutDialog = document.getElementById('logoutDialog');
const cancelLogout = document.getElementById('cancelLogout');
const confirmLogout = document.getElementById('confirmLogout');

logoutLink?.addEventListener('click', function (e) {
    e.preventDefault();
    logoutDialog.classList.add('show');
    document.getElementById('overlay').classList.add('show');
});

cancelLogout?.addEventListener('click', function () {
    logoutDialog.classList.remove('show');
    document.getElementById('overlay').classList.remove('show');
});

confirmLogout?.addEventListener('click', function () {
    window.location.href = '/admin/html/admin_login.html';
});

document.getElementById('overlay')?.addEventListener('click', function () {
    logoutDialog.classList.remove('show');
    this.classList.remove('show');
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadShops('pending', 'pendingShopsTableBody');
    setupSearchListeners();
    setupPagination();
});