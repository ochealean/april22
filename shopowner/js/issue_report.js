import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getStorage, ref as storageRef, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";

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
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize EmailJS
emailjs.init('gBZ5mCvVmgjo7wn0W');

// Global variables
let currentIssueId = null;
let currentUserEmail = null;
let currentPage = 1;
const rowsPerPage = 10;
let shopLoggedin; // shop ID of the logged-in user
let roleLoggedin; // role of the logged-in user
let sname; //shop name

// DOM Elements
const issueTableBody = document.getElementById("issueReportsTableBody");
const responseDialog = document.getElementById("responseDialog");
const overlay = document.getElementById("overlay");
const adminResponse = document.getElementById("adminResponse");
const responseStatus = document.getElementById("responseStatus");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const paginationContainer = document.querySelector(".pagination");
const searchInput = document.getElementById("issueSearch");
const searchBtn = document.getElementById("searchBtn");
const clearSearchBtn = document.getElementById("clearSearch");

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupEventListeners();
    loadIssueReports();
});

function checkAuthState() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "/admin/html/admin_login.html";
        } else {
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
        }
    });
}

function setupEventListeners() {
    // Response dialog buttons
    document.getElementById("confirmResponse")?.addEventListener("click", submitResponse);
    document.getElementById("cancelResponse")?.addEventListener("click", hideResponseDialog);

    // Modal close button
    document.getElementById("closeIssueModal")?.addEventListener("click", () => {
        document.getElementById("issueDetailsModal").classList.remove("show");
        overlay.classList.remove("show");
    });

    // Pagination
    prevBtn?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            setupPagination();
        }
    });

    nextBtn?.addEventListener("click", () => {
        const rows = issueTableBody.querySelectorAll("tr");
        const pageCount = Math.ceil(rows.length / rowsPerPage);

        if (currentPage < pageCount) {
            currentPage++;
            setupPagination();
        }
    });

    // Search functionality
    searchBtn?.addEventListener("click", performSearch);
    clearSearchBtn?.addEventListener("click", clearSearch);
    searchInput?.addEventListener("keyup", (e) => {
        if (e.key === "Enter") performSearch();
    });

    // Logout functionality
    const logoutLink = document.querySelector('a[href="/admin/html/admin_login.html"]');
    logoutLink?.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('logoutDialog').classList.add('show');
        overlay.classList.add('show');
    });

    document.getElementById('cancelLogout')?.addEventListener('click', function () {
        document.getElementById('logoutDialog').classList.remove('show');
        overlay.classList.remove('show');
    });

    document.getElementById('confirmLogout')?.addEventListener('click', function () {
        signOut(auth).then(() => {
            window.location.href = '/admin/html/admin_login.html';
        }).catch((error) => {
            showNotification(`Logout failed: ${error.message}`, "error");
        });
    });

    // Overlay click
    overlay?.addEventListener('click', function () {
        document.getElementById('responseDialog').classList.remove('show');
        document.getElementById('issueDetailsModal').classList.remove('show');
        document.getElementById('logoutDialog').classList.remove('show');
        this.classList.remove('show');
    });
}

function loadIssueReports() {
    const issuesRef = ref(db, 'AR_shoe_users/issueReports');

    onValue(issuesRef, (snapshot) => {
        issueTableBody.innerHTML = '';

        if (!snapshot.exists()) {
            issueTableBody.innerHTML = '<tr><td colspan="9">No issue reports found</td></tr>';
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const issue = childSnapshot.val();
            const row = createIssueRow(childSnapshot.key, issue);
            issueTableBody.appendChild(row);
        });

        setupPagination();
    });
}

function createIssueRow(issueId, issue) {
    const row = document.createElement('tr');
    row.className = 'animate-fade';
    row.setAttribute('data-id', issueId);

    // Format status with appropriate class
    const statusClass = `status-${issue.status || 'pending'}`;
    const statusText = issue.status ?
        issue.status.charAt(0).toUpperCase() + issue.status.slice(1) :
        'Pending';

    // Create photos preview
    let photosHTML = 'No photos';
    if (issue.photoURLs && issue.photoURLs.length > 0) {
        photosHTML = issue.photoURLs.map(url =>
            `<img src="${url}" class="photo-thumbnail" alt="Issue photo" data-url="${url}">`
        ).join('');
    }

    // Truncate description for table view
    const truncatedDesc = issue.description.length > 50 ?
        issue.description.substring(0, 50) + '...' :
        issue.description;

    row.innerHTML = `
        <td>${issueId.substring(0, 6)}...</td>
        <td>${issue.orderID.substring(0, 8)}</td>
        <td>${issue.userID.substring(0, 6)}...</td>
        <td>${getIssueTypeLabel(issue.issueType)}</td>
        <td>
            <div class="issue-description" title="${issue.description}">
                ${truncatedDesc}
            </div>
        </td>
        <td>${photosHTML}</td>
        <td class="${statusClass}">${statusText}</td>
        <td>${formatDisplayDate(issue.timestamp)}</td>
        <td>
            <button class="view-btn" data-id="${issueId}"><i class="fas fa-eye"></i> View</button>
            <button class="response-btn" data-id="${issueId}"><i class="fas fa-reply"></i> Respond</button>
        </td>
    `;

    // Add event listeners to buttons
    row.querySelector('.view-btn')?.addEventListener('click', (e) => showIssueDetails(e, issueId));
    row.querySelector('.response-btn')?.addEventListener('click', (e) => showResponseDialog(e, issueId));

    // Add click event to photo thumbnails to view larger
    row.querySelectorAll('.photo-thumbnail').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(img.getAttribute('data-url'), '_blank');
        });
    });

    return row;
}

function getIssueTypeLabel(type) {
    const types = {
        'damaged': 'Damaged Product',
        'wrong_item': 'Wrong Item',
        'missing_item': 'Missing Item',
        'quality': 'Quality Issue',
        'other': 'Other'
    };
    return types[type] || type;
}

function showIssueDetails(e, issueId) {
    e.preventDefault();
    currentIssueId = issueId;

    const issueRef = ref(db, `AR_shoe_users/issueReports/${issueId}`);

    get(issueRef).then((snapshot) => {
        if (snapshot.exists()) {
            const issue = snapshot.val();
            updateIssueModalContent(issueId, issue);
            document.getElementById('issueDetailsModal').classList.add('show');
            overlay.classList.add('show');
        } else {
            showNotification("Issue report not found", "error");
        }
    }).catch((error) => {
        showNotification(`Error loading issue: ${error.message}`, "error");
    });
}

function updateIssueModalContent(issueId, issue) {
    const modalContent = document.getElementById('modalIssueContent');
    const modalTitle = document.getElementById('modalIssueTitle');

    modalTitle.textContent = `Issue Report #${issueId.substring(0, 8)}`;

    // Format photos if they exist
    let photosHTML = '<p>No photos submitted</p>';
    if (issue.photoURLs && issue.photoURLs.length > 0) {
        photosHTML = issue.photoURLs.map(url =>
            `<div class="document-item">
                <a href="${url}" target="_blank" class="document-preview">
                    <img src="${url}" alt="Issue photo" style="max-height: 200px;">
                </a>
            </div>`
        ).join('');
    }

    // Format admin responses if they exist
    let responsesHTML = '<p>No responses yet</p>';
    if (issue.adminResponses) {
        responsesHTML = Object.entries(issue.adminResponses).map(([timestamp, response]) => `
            <div class="response-item">
                <div class="response-header">
                    <span class="response-date">${formatDisplayDate(parseInt(timestamp))}</span>
                    <span class="response-status">Status: ${response.status}</span>
                </div>
                <div class="response-message">${response.message}</div>
            </div>
        `).join('');
    }

    modalContent.innerHTML = `
        <div class="modal-section">
            <h3>Issue Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Order ID: </span>
                    <span class="info-value">${issue.orderID}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">User ID: </span>
                    <span class="info-value">${issue.userID}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Issue Type: </span>
                    <span class="info-value">${getIssueTypeLabel(issue.issueType)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Current Status: </span>
                    <span class="info-value ${`status-${issue.status}`}">
                        ${issue.status ? issue.status.charAt(0).toUpperCase() + issue.status.slice(1) : 'Pending'}
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Date Reported: </span>
                    <span class="info-value">${formatDisplayDate(issue.timestamp)}</span>
                </div>
            </div>
        </div>
        
        <div class="modal-section">
            <h3>Issue Description</h3>
            <div class="issue-description-full">
                ${issue.description}
            </div>
        </div>
        
        <div class="modal-section">
            <h3>Submitted Photos</h3>
            <div class="document-grid">
                ${photosHTML}
            </div>
        </div>
        
        <div class="modal-section">
            <h3>Admin Responses</h3>
            <div class="responses-container">
                ${responsesHTML}
            </div>
        </div>
    `;
}

function showResponseDialog(e, issueId) {
    e.preventDefault();
    e.stopPropagation();

    currentIssueId = issueId;
    adminResponse.value = '';
    responseStatus.value = 'processing';

    // Get user email from the issue report
    const issueRef = ref(db, `AR_shoe_users/issueReports/${issueId}`);
    get(issueRef).then((snapshot) => {
        if (snapshot.exists()) {
            const issue = snapshot.val();

            // Get user email from users node
            const userRef = ref(db, `AR_shoe_users/users/${issue.userID}`);
            return get(userRef).then((userSnapshot) => {
                if (userSnapshot.exists()) {
                    currentUserEmail = userSnapshot.val().email;
                }
                return issue;
            });
        }
        return null;
    }).then((issue) => {
        if (issue) {
            document.getElementById('dialogMessage').textContent =
                `Respond to issue report for Order #${issue.orderID.substring(0, 8)}`;
            responseDialog.classList.add('show');
            overlay.classList.add('show');
        }
    }).catch((error) => {
        showNotification(`Error preparing response: ${error.message}`, "error");
    });
}

function hideResponseDialog() {
    responseDialog.classList.remove('show');
    overlay.classList.remove('show');
    currentIssueId = null;
    currentUserEmail = null;
}

async function submitResponse() {
    const responseText = adminResponse.value.trim();
    const newStatus = responseStatus.value;

    if (!responseText) {
        // Add visual feedback to the textarea
        adminResponse.style.border = "2px solid red";
        adminResponse.focus();

        // Remove the red border after 2 seconds
        setTimeout(() => {
            adminResponse.style.border = "";
        }, 2000);
        showNotification("Please enter a response message", "error");
        return;
    }

    if (!currentIssueId) {
        showNotification("No issue selected", "error");
        return;
    }

    try {
        const timestamp = Date.now();
        const responseData = {
            message: responseText,
            status: newStatus,
            timestamp: timestamp,
            adminId: auth.currentUser.uid
        };

        // Update the issue report with the new response
        const updates = {
            [`adminResponses/${timestamp}`]: responseData,
            status: newStatus,
            resolved: newStatus === 'resolved'
        };

        const issueRef = ref(db, `AR_shoe_users/issueReports/${currentIssueId}`);
        await update(issueRef, updates);

        // Send email notification to user if email is available
        if (currentUserEmail) {
            try {
                const templateParams = {
                    to_email: currentUserEmail,
                    from_name: 'Shoe Portal Admin',
                    subject: `Update on your issue report`,
                    message: `Your issue report has been updated. Status: ${newStatus}\n\nAdmin Response:\n${responseText}`,
                    reply_to: 'no-reply@shoeportal.com'
                };

                await emailjs.send('service_8i28mes', 'template_btslatu', templateParams);
                console.log('Notification email sent');
            } catch (emailError) {
                console.error('Failed to send email:', emailError);
                // Don't fail the whole operation if email fails
            }
        }

        showNotification("Response submitted successfully", "success");
        hideResponseDialog();
    } catch (error) {
        console.error("Error submitting response:", error);
        showNotification(`Failed to submit response: ${error.message}`, "error");
    }
}

// Search functionality
function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (!searchTerm) {
        clearSearch();
        return;
    }

    const rows = issueTableBody.querySelectorAll("tr");
    let hasResults = false;

    rows.forEach(row => {
        const rowData = row.textContent.toLowerCase();
        if (rowData.includes(searchTerm)) {
            row.style.display = '';
            hasResults = true;
        } else {
            row.style.display = 'none';
        }
    });

    if (!hasResults) {
        showNotification("No matching issues found", "info");
    }

    currentPage = 1;
    setupPagination();
}

function clearSearch() {
    searchInput.value = '';
    const rows = issueTableBody.querySelectorAll("tr");
    rows.forEach(row => row.style.display = '');
    currentPage = 1;
    setupPagination();
}

// Pagination functions
function setupPagination() {
    const rows = issueTableBody.querySelectorAll("tr:not([style*='display: none'])");
    const pageCount = Math.ceil(rows.length / rowsPerPage);

    // Clear existing page buttons
    const existingPageButtons = paginationContainer.querySelectorAll(".page-btn");
    existingPageButtons.forEach(btn => btn.remove());

    // Add page buttons
    for (let i = 1; i <= pageCount; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "pagination-btn page-btn";
        pageBtn.textContent = i;

        if (i === currentPage) {
            pageBtn.classList.add("active");
        }

        pageBtn.addEventListener("click", () => {
            currentPage = i;
            updateTableDisplay();
            updatePaginationButtons();
        });

        paginationContainer.insertBefore(pageBtn, nextBtn);
    }

    updateTableDisplay();
    updatePaginationButtons();
}

function updateTableDisplay() {
    const rows = issueTableBody.querySelectorAll("tr:not([style*='display: none'])");
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;

    rows.forEach((row, index) => {
        row.style.display = (index >= startIndex && index < endIndex) ? '' : 'none';
    });
}

function updatePaginationButtons() {
    const rows = issueTableBody.querySelectorAll("tr:not([style*='display: none'])");
    const pageCount = Math.ceil(rows.length / rowsPerPage);

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === pageCount || pageCount === 0;
}

function formatDisplayDate(timestamp) {
    if (!timestamp) return 'N/A';

    const date = new Date(timestamp);
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

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = 'notification';
    notification.classList.add(type);
    notification.style.display = 'flex';
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500);
    }, 3000);
}

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