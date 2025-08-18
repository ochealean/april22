import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, get, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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

// Initialize Firebase with v11 syntax
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

// DOM Elements
const issueResponsesTable = document.getElementById('issueResponsesTable');
const issueDetailsModal = document.getElementById('issueDetailsModal');
const modalIssueContent = document.getElementById('modalIssueContent');
const closeModalBtn = document.querySelector('.close-modal');
const overlay = document.getElementById('overlay');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearch');
const searchInput = document.getElementById('issueSearch');
const notification = document.getElementById('notification');
const logoutBtn = document.getElementById('logout_btn');

// Pagination variables
let currentPage = 1;
const rowsPerPage = 10;
let allIssues = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "/shopowner/html/shopowner_login.html";
        } else {
            loadIssueResponses(); // Call this only after user is confirmed
            setupEventListeners();
        }
    });
});


function checkAuthState() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "/shopowner/html/shopowner_login.html";
        }
    });
}

function loadIssueResponses() {
    const userId = auth.currentUser?.uid;
    console.log('Current User ID:', userId);
    if (!userId) return;

    const issuesRef = ref(database, 'AR_shoe_users/issueReports');
    
    onValue(issuesRef, (snapshot) => {
        allIssues = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const issue = childSnapshot.val();
                console.log('Issue:', issue);
                // Only show issues that have admin responses
                if (issue.adminResponses && Object.keys(issue.adminResponses).length > 0) {
                    allIssues.push({
                        id: childSnapshot.key,
                        ...issue
                    });
                }
            });
            
            // Reverse to show newest first
            allIssues.reverse();
            displayIssues(allIssues);
            setupPagination();
        }
    });
}



        function displayIssues(issues) {
            issueResponsesTable.innerHTML = '';
            
            if (issues.length === 0) {
                issueResponsesTable.innerHTML = '<tr><td colspan="6">No issue responses found</td></tr>';
                return;
            }
            
            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = Math.min(startIndex + rowsPerPage, issues.length);
            const paginatedIssues = issues.slice(startIndex, endIndex);
            
            paginatedIssues.forEach(issue => {
                const row = document.createElement('tr');
                
                // Get the latest response
                let latestResponse = { timestamp: 0 };
                if (issue.adminResponses) {
                    const responses = Object.values(issue.adminResponses);
                    latestResponse = responses.reduce((latest, current) => 
                        current.timestamp > latest.timestamp ? current : latest, { timestamp: 0 });
                }
                
                row.innerHTML = `
                    <td>${issue.orderID.substring(0, 8)}</td>
                    <td>${getIssueTypeLabel(issue.issueType)}</td>
                    <td class="status-${issue.status || 'pending'}">${issue.status ? 
                        issue.status.charAt(0).toUpperCase() + issue.status.slice(1) : 'Pending'}</td>
                    <td>${formatDisplayDate(issue.timestamp)}</td>
                    <td>${latestResponse.timestamp ? formatDisplayDate(latestResponse.timestamp) : 'No responses'}</td>
                    <td>
                        <button class="action-btn view-btn" data-id="${issue.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                `;
                
                // Make sure to use event delegation or attach the listener properly
                row.querySelector('.view-btn').addEventListener('click', () => showIssueDetails(issue.id));
                issueResponsesTable.appendChild(row);
            });
        }

        function showIssueDetails(issueId) {
            const issueRef = ref(database, `AR_shoe_users/issueReports/${issueId}`);

            get(issueRef).then(snapshot => {
                if (snapshot.exists()) {
                    const issue = snapshot.val();
                    updateModalContent(issueId, issue);
                    // Use classList.add instead of style.display
                    document.getElementById('issueDetailsModal').classList.add('show');
                } else {
                    showNotification('Issue report not found', 'error');
                }
            }).catch(error => {
                showNotification(`Error fetching issue: ${error.message}`, 'error');
            });
        }

        function updateModalContent(issueId, issue) {
            document.getElementById('modalIssueTitle').textContent = `Issue Report #${issueId.substring(0, 8)}`;
            
            // Format photos if they exist
            let photosHTML = '<p>No photos submitted</p>';
            if (issue.photoURLs && issue.photoURLs.length > 0) {
                photosHTML = issue.photoURLs.map(url => 
                    `<div class="document-item">
                        <a href="${url}" target="_blank" class="document-preview">
                            <img src="${url}" alt="Issue photo">
                        </a>
                    </div>`
                ).join('');
            }
            
            // Format admin responses if they exist
            let responsesHTML = '<p>No responses yet</p>';
            if (issue.adminResponses) {
                responsesHTML = Object.entries(issue.adminResponses)
                    .sort(([a], [b]) => b - a) // Sort by timestamp descending
                    .map(([timestamp, response]) => `
                        <div class="response-item">
                            <div class="response-header">
                                <span class="response-date">${formatDisplayDate(parseInt(timestamp))}</span>
                                <span class="response-status ${'status-' + response.status}">
                                    Status: ${response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                                </span>
                            </div>
                            <div class="response-message">${response.message}</div>
                        </div>
                    `).join('');
            }
            
             modalIssueContent.innerHTML = `
                <div class="modal-section">
                    <h3>Issue Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Order ID: </span>
                            <span class="info-value">${issue.orderID}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Issue Type: </span>
                            <span class="info-value">${getIssueTypeLabel(issue.issueType)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Current Status: </span>
                            <span class="info-value status-${issue.status || 'pending'}">
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
                        ${issue.photoURLs && issue.photoURLs.length > 0 ? 
                            issue.photoURLs.map(url => 
                                `<div class="document-item">
                                    <img src="${url}" alt="Issue photo">
                                </div>`
                            ).join('') : '<p>No photos submitted</p>'}
                    </div>
                </div>
                
                <div class="modal-section">
                    <h3>Admin Responses</h3>
                    <div class="responses-container">
                        ${issue.adminResponses ? 
                            Object.entries(issue.adminResponses)
                                .sort(([a], [b]) => b - a)
                                .map(([timestamp, response]) => `
                                    <div class="response-item">
                                        <div class="response-header">
                                            <span class="response-date">${formatDisplayDate(parseInt(timestamp))}</span>
                                            <span class="response-status status-${response.status}">
                                                Status: ${response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                                            </span>
                                        </div>
                                        <div class="response-message">${response.message}</div>
                                    </div>`
                                ).join('') : '<p>No responses yet</p>'}
                    </div>
                </div>
            `;
        }

        function setupEventListeners() {
            // Modal close button
            // closeModalBtn.addEventListener('click', () => {
            //     issueDetailsModal.style.display = 'none';
            //     overlay.style.display = 'none';
            // });

             document.querySelector('.close-btn').addEventListener('click', () => {
                document.getElementById('issueDetailsModal').classList.remove('show');
            });
            
            // Pagination buttons
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    displayIssues(allIssues);
                    updatePaginationButtons();
                }
            });
            
            nextBtn.addEventListener('click', () => {
                const pageCount = Math.ceil(allIssues.length / rowsPerPage);
                if (currentPage < pageCount) {
                    currentPage++;
                    displayIssues(allIssues);
                    updatePaginationButtons();
                }
            });
            
            // Search functionality
            searchBtn.addEventListener('click', performSearch);
            clearSearchBtn.addEventListener('click', clearSearch);
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') performSearch();
            });
            
            // Logout button
            logoutBtn.addEventListener('click', () => {
                auth.signOut().then(() => {
                    window.location.href = '/shopowner/html/shopowner_login.html';
                }).catch(error => {
                    showNotification(`Logout failed: ${error.message}`, 'error');
                });
            });
            
            // Overlay click
            // overlay.addEventListener('click', () => {
            //     issueDetailsModal.style.display = 'none';
            //     overlay.style.display = 'none';
            // });

            document.querySelector('.sidebar-overlay').addEventListener('click', () => {
                document.getElementById('issueDetailsModal').classList.remove('show');
            });
        }

        function performSearch() {
            const searchTerm = searchInput.value.trim().toLowerCase();
            
            if (!searchTerm) {
                clearSearch();
                return;
            }
            
            const filteredIssues = allIssues.filter(issue => {
                return issue.orderID.toLowerCase().includes(searchTerm) ||
                    issue.issueType.toLowerCase().includes(searchTerm) ||
                    (issue.status && issue.status.toLowerCase().includes(searchTerm));
            });
            
            if (filteredIssues.length === 0) {
                showNotification('No matching issues found', 'info');
            }
            
            currentPage = 1;
            displayIssues(filteredIssues);
            setupPagination();
        }

        function clearSearch() {
            searchInput.value = '';
            currentPage = 1;
            displayIssues(allIssues);
            setupPagination();
        }

        function setupPagination() {
            const pageCount = Math.ceil(allIssues.length / rowsPerPage);
            const paginationContainer = document.querySelector('.pagination');
            
            // Clear existing page buttons
            const existingPageButtons = paginationContainer.querySelectorAll('.page-btn');
            existingPageButtons.forEach(btn => btn.remove());
            
            // Add page buttons
            for (let i = 1; i <= pageCount; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = 'pagination-btn page-btn';
                pageBtn.textContent = i;
                
                if (i === currentPage) {
                    pageBtn.classList.add('active');
                }
                
                pageBtn.addEventListener('click', () => {
                    currentPage = i;
                    displayIssues(allIssues);
                    updatePaginationButtons();
                });
                
                paginationContainer.insertBefore(pageBtn, nextBtn);
            }
            
            updatePaginationButtons();
        }

        function updatePaginationButtons() {
            const pageCount = Math.ceil(allIssues.length / rowsPerPage);
            
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === pageCount || pageCount === 0;
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
            const month = date.toLocaleString('default', { month: 'short' });
            const day = date.getDate();
            const year = date.getFullYear();
            
            return `${month} ${day}, ${year} ${timeString}`;
        }

        function showNotification(message, type) {
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'flex';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }