import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, query, orderByChild, equalTo, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
const auth = getAuth();
const db = getDatabase(app);

// DOM Elements
const serialNumberInput = document.getElementById('serialNumber');
const validateBtn = document.getElementById('validateBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const resultsContainer = document.getElementById('resultsContainer');
const resultSerial = document.getElementById('resultSerial');
const resultModel = document.getElementById('resultModel');
const resultShop = document.getElementById('resultShop');
const resultStatus = document.getElementById('resultStatus');
const resultDate = document.getElementById('resultDate');
const resultValidatedDate = document.getElementById('resultValidatedDate');
const resultFrontImage = document.getElementById('resultFrontImage');
const resultBackImage = document.getElementById('resultBackImage');
const resultTopImage = document.getElementById('resultTopImage');
const resultReason = document.getElementById('resultReason');
const reasonSection = document.getElementById('reasonSection');

// Hide body until authenticated
document.body.style.display = 'none';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            get(ref(db, `AR_shoe_users/customer/${user.uid}`))
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        document.getElementById('userName_display2').textContent = userData.firstName + " " + userData.lastName;
                        document.getElementById('imageProfile').src = userData.profilePhoto?.profilePhoto?.url || "https://cdn-icons-png.flaticon.com/512/11542/11542598.png";
                        document.body.style.display = '';
                    } else {
                        alert("Account does not exist");
                        auth.signOut();
                    }
                });
        } else {
            window.location.href = "/user_login.html";
        }
    });
});

// Initialize all event listeners
function initializeEventListeners() {
    // Mobile sidebar toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (mobileToggle && sidebar && overlay) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // Validate button click
    validateBtn.addEventListener('click', validateShoe);

    // Enter key press in serial number input
    serialNumberInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            validateShoe();
        }
    });

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
}

// Validate shoe function
async function validateShoe() {
    const serialNumber = serialNumberInput.value.trim();
    
    // Validate input
    if (!serialNumber) {
        showError('Please enter a serial number');
        return;
    }
    
    // Show loading spinner
    loadingSpinner.style.display = 'block';
    errorMessage.style.display = 'none';
    resultsContainer.style.display = 'none';
    
    try {
        // Query the database for the serial number
        // CORRECTED PATH: Looking in shoeVerification instead of validations
        const validationsRef = ref(db, 'AR_shoe_users/shoeVerification');
        const validationQuery = query(validationsRef, orderByChild('serialNumber'), equalTo(serialNumber));
        
        const snapshot = await get(validationQuery);
        
        if (snapshot.exists()) {
            // Get the first result (should be only one with this serial number)
            const validationData = Object.values(snapshot.val())[0];
            displayValidationResults(validationData);
        } else {
            showError('No validation record found for this serial number');
        }
    } catch (error) {
        console.error('Error validating shoe:', error);
        showError('An error occurred while validating the shoe. Please try again.');
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Display validation results
function displayValidationResults(validationData) {
    // Update the UI with validation data
    resultSerial.textContent = validationData.serialNumber || 'N/A';
    resultModel.textContent = validationData.shoeModel || 'N/A';
    
    // Get shop name from shop data if available
    if (validationData.shopId) {
        getShopName(validationData.shopId).then(shopName => {
            resultShop.textContent = shopName || validationData.shopId;
        });
    } else {
        resultShop.textContent = 'N/A';
    }
    
    resultDate.textContent = formatDate(validationData.submittedDate) || 'N/A';
    resultValidatedDate.textContent = formatDate(validationData.validatedDate) || 'Pending';
    
    // Set status with appropriate badge class
    const status = validationData.status || 'pending';
    resultStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    resultStatus.className = 'status-badge ';
    
    switch(status.toLowerCase()) {
        case 'approved':
        case 'verified':
        case 'legit':
            resultStatus.classList.add('status-legit');
            break;
        case 'rejected':
        case 'fake':
        case 'invalid':
            resultStatus.classList.add('status-fake');
            break;
        default:
            resultStatus.classList.add('status-pending');
    }
    
    // Set images
    if (validationData.images) {
        resultFrontImage.src = validationData.images.front || 
                              'https://cdn-icons-png.flaticon.com/512/11542/11542598.png';
        resultBackImage.src = validationData.images.back || 
                             'https://cdn-icons-png.flaticon.com/512/11542/11542598.png';
        resultTopImage.src = validationData.images.top || 
                            'https://cdn-icons-png.flaticon.com/512/11542/11542598.png';
    } else {
        // Use placeholder images if no images are available
        resultFrontImage.src = 'https://cdn-icons-png.flaticon.com/512/11542/11542598.png';
        resultBackImage.src = 'https://cdn-icons-png.flaticon.com/512/11542/11542598.png';
        resultTopImage.src = 'https://cdn-icons-png.flaticon.com/512/11542/11542598.png';
    }
    
    // Set validation reason/notes
    const reason = validationData.validationNotes || validationData.reason || validationData.notes;
    if (reason) {
        resultReason.textContent = reason;
        reasonSection.style.display = 'block';
    } else {
        reasonSection.style.display = 'none';
    }
    
    // Show results container
    resultsContainer.style.display = 'block';
}

// Get shop name from shop ID
async function getShopName(shopId) {
    try {
        const shopRef = ref(db, `AR_shoe_users/shop/${shopId}`);
        const snapshot = await get(shopRef);
        
        if (snapshot.exists()) {
            const shopData = snapshot.val();
            return shopData.shopName || shopId;
        }
        return shopId; // Return ID if shop data not found
    } catch (error) {
        console.error('Error fetching shop data:', error);
        return shopId;
    }
}

// Show error message
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
    resultsContainer.style.display = 'none';
}

// Format date function
function formatDate(timestamp) {
    if (!timestamp) return null;
    
    // Handle both timestamp objects and date strings
    let date;
    if (typeof timestamp === 'object' && timestamp.seconds) {
        // Firebase timestamp object
        date = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'string') {
        // ISO string or other date string
        date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
        // Unix timestamp
        date = new Date(timestamp);
    } else {
        return null;
    }
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Close modal when clicking outside (if you add modals later)
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        // Close modal logic if needed
    }
});

// Escape key to close modals
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close modal logic if needed
    }
});