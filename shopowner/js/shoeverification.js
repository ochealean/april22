// shoeverification.js - UPDATED VERSION
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";

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
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Global variables
let shopLoggedin = null;
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeAppFunctionality();
    setupAuthStateListener();
});

function initializeAppFunctionality() {
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

    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            
            // Load validation history if that tab is selected
            if (tabId === 'validation-history') {
                loadValidationHistory();
            }
        });
    });
    
    // Image upload functionality
    const imageUploads = [
        { container: 'frontViewUpload', input: 'frontView', preview: 'frontViewPreview' },
        { container: 'backViewUpload', input: 'backView', preview: 'backViewPreview' },
        { container: 'topViewUpload', input: 'topView', preview: 'topViewPreview' }
    ];
    
    imageUploads.forEach(item => {
        const container = document.getElementById(item.container);
        const input = document.getElementById(item.input);
        const preview = document.getElementById(item.preview);
        const removeBtn = container.querySelector('.remove-image');
        
        container.addEventListener('click', () => {
            input.click();
        });
        
        input.addEventListener('change', () => {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    removeBtn.style.display = 'flex';
                    container.querySelector('i').style.display = 'none';
                    container.querySelector('p').style.display = 'none';
                }
                
                reader.readAsDataURL(input.files[0]);
            }
        });
        
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            input.value = '';
            preview.style.display = 'none';
            removeBtn.style.display = 'none';
            container.querySelector('i').style.display = 'block';
            container.querySelector('p').style.display = 'block';
        });
    });
    
    // Form submission
    const validationForm = document.getElementById('shoeValidationForm');
    if (validationForm) {
        validationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitShoeForValidation();
        });
    }
    
    // Modal functionality
    const modal = document.getElementById('validationModal');
    const closeModal = document.querySelector('.modal-close');
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    // Logout functionality
    const logoutBtn = document.getElementById('logout_btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                signOut(auth).then(() => {
                    window.location.href = '/user_login.html';
                }).catch((error) => {
                    console.error('Logout error:', error);
                });
            }
        });
    }
}

function setupAuthStateListener() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const userRef = ref(db, `AR_shoe_users/employees/${user.uid}`);
            
            onValue(userRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    shopLoggedin = userData.shopId;
                    
                    // Update profile header for employees
                    updateProfileHeader(userData);
                    
                    // Role-based UI adjustments
                    if (userData.role.toLowerCase() === "manager") {
                        document.getElementById("addemployeebtn").style.display = "none";
                    } else if (userData.role.toLowerCase() === "salesperson") {
                        document.getElementById("addemployeebtn").style.display = "none";
                        document.getElementById("analyticsbtn").style.display = "none";
                    }
                } else {
                    shopLoggedin = user.uid;
                    
                    // This is a shop owner, fetch shop data
                    const shopRef = ref(db, `AR_shoe_users/shop/${user.uid}`);
                    onValue(shopRef, (shopSnapshot) => {
                        if (shopSnapshot.exists()) {
                            const shopData = shopSnapshot.val();
                            // Update profile header for shop owners
                            updateProfileHeader(shopData);
                        }
                    }, { onlyOnce: true });
                }
            }, { onlyOnce: true });
        } else {
            window.location.href = "/user_login.html";
        }
    });
}

// Function to update profile header
function updateProfileHeader(userData) {
    const profilePicture = document.getElementById('profilePicture');
    const userFullname = document.getElementById('userFullname');
    
    if (!profilePicture || !userFullname) return;
    
    // Set profile name
    if (userData.name) {
        userFullname.textContent = userData.name;
    } else if (userData.shopName) {
        userFullname.textContent = userData.shopName;
    } else if (userData.ownerName) {
        userFullname.textContent = userData.ownerName;
    }
    
    // Set profile picture
    if (userData.profilePhoto && userData.profilePhoto.url) {
        profilePicture.src = userData.profilePhoto.url;
    } else if (userData.uploads && userData.uploads.shopLogo && userData.uploads.shopLogo.url) {
        profilePicture.src = userData.uploads.shopLogo.url;
    } else {
        // Set default avatar if no image available
        profilePicture.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23ddd'%3E%3Crect width='100' height='100'/%3E%3Ctext x='50%' y='50%' font-size='20' text-anchor='middle' dominant-baseline='middle' fill='%23666'%3EProfile%3C/text%3E%3C/svg%3E";
    }
}

async function submitShoeForValidation() {
    // Basic validation
    const serialNumber = document.getElementById('serialNumber').value;
    const shoeModel = document.getElementById('shoeModel').value;
    const description = document.getElementById('description').value;
    const frontView = document.getElementById('frontView').files[0];
    const backView = document.getElementById('backView').files[0];
    const topView = document.getElementById('topView').files[0];
    
    if (!serialNumber || !shoeModel || !description) {
        alert('Please fill in all required fields.');
        return;
    }
    
    if (!frontView || !backView || !topView) {
        alert('Please upload all three required images.');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('#shoeValidationForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        // Upload images to Firebase Storage
        const frontViewUrl = await uploadImage(frontView, `shoeValidation/${currentUser.uid}/${serialNumber}_front`);
        const backViewUrl = await uploadImage(backView, `shoeValidation/${currentUser.uid}/${serialNumber}_back`);
        const topViewUrl = await uploadImage(topView, `shoeValidation/${currentUser.uid}/${serialNumber}_top`);
        
        // Prepare validation data
        const validationData = {
            serialNumber,
            shoeModel,
            description,
            images: {
                front: frontViewUrl,
                back: backViewUrl,
                top: topViewUrl
            },
            status: "pending",
            submittedBy: currentUser.uid,
            shopId: shopLoggedin,
            submittedDate: new Date().toISOString(),
            validatedDate: null,
            validatorId: null,
            validationNotes: ""
        };
        
        // Save to Firebase Realtime Database
        const validationRef = ref(db, 'AR_shoe_users/shoeVerification');
        const newValidationRef = push(validationRef);
        await set(newValidationRef, validationData);
        
        // Show success message
        alert('Shoe submitted successfully for validation! You will be notified once it has been reviewed.');
        
        // Reset form
        document.getElementById('shoeValidationForm').reset();
        
        // Reset image previews
        const imageUploads = [
            { container: 'frontViewUpload', preview: 'frontViewPreview' },
            { container: 'backViewUpload', preview: 'backViewPreview' },
            { container: 'topViewUpload', preview: 'topViewPreview' }
        ];
        
        imageUploads.forEach(item => {
            const preview = document.getElementById(item.preview);
            const removeBtn = document.getElementById(item.container).querySelector('.remove-image');
            const container = document.getElementById(item.container);
            
            preview.style.display = 'none';
            removeBtn.style.display = 'none';
            container.querySelector('i').style.display = 'block';
            container.querySelector('p').style.display = 'block';
        });
        
    } catch (error) {
        console.error("Error submitting validation:", error);
        alert('Error submitting shoe for validation: ' + error.message);
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function uploadImage(file, path) {
    const storageReference = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(storageReference, file);
    
    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => {
                // Progress monitoring can be added here
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
            },
            (error) => {
                reject(error);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    resolve(downloadURL);
                });
            }
        );
    });
}

function loadValidationHistory() {
    const validationRef = ref(db, 'AR_shoe_users/shoeVerification');
    
    onValue(validationRef, (snapshot) => {
        const validationData = snapshot.val();
        const tableBody = document.querySelector('.validation-table tbody');
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        if (validationData) {
            // Convert object to array and filter by current user's shop
            const validationsArray = Object.entries(validationData)
                .filter(([key, value]) => value.shopId === shopLoggedin)
                .map(([key, value]) => ({ id: key, ...value }));
            
            if (validationsArray.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No validation history found</td></tr>';
                return;
            }
            
            // Sort by submission date (newest first)
            validationsArray.sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));
            
            // Add rows to table
            validationsArray.forEach(validation => {
                const row = document.createElement('tr');
                
                // Format date for display
                const submittedDate = new Date(validation.submittedDate);
                const formattedDate = submittedDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                // Determine status class and text based on your existing CSS
                let statusClass = 'status-pending';
                let statusText = 'Pending';
                
                if (validation.status === 'verified') {
                    statusClass = 'status-legit'; // Using your existing CSS class
                    statusText = 'Verified';
                } else if (validation.status === 'invalid') {
                    statusClass = 'status-fake'; // Using your existing CSS class
                    statusText = 'Invalid';
                }
                
                row.innerHTML = `
                    <td>${validation.serialNumber}</td>
                    <td>${validation.shoeModel}</td>
                    <td>${formattedDate}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td><button class="action-btn view-details" data-id="${validation.id}">View Details</button></td>
                `;
                
                tableBody.appendChild(row);
            });
            
            // Add event listeners to view buttons
            document.querySelectorAll('.view-details').forEach(button => {
                button.addEventListener('click', (e) => {
                    const validationId = e.target.getAttribute('data-id');
                    showValidationDetails(validationId);
                });
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No validation history found</td></tr>';
        }
    }, {
        onlyOnce: true
    });
}

function showValidationDetails(validationId) {
    const validationRef = ref(db, `AR_shoe_users/shoeVerification/${validationId}`);
    
    onValue(validationRef, (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // Populate modal with data
            document.getElementById('modal-serial').textContent = data.serialNumber;
            document.getElementById('modal-model').textContent = data.shoeModel;
            document.getElementById('modal-description').textContent = data.description;
            
            // Determine status class and text based on your existing CSS
            let statusClass = 'status-pending';
            let statusText = 'Pending';
            
            if (data.status === 'verified') {
                statusClass = 'status-legit'; // Using your existing CSS class
                statusText = 'Verified';
            } else if (data.status === 'invalid') {
                statusClass = 'status-fake'; // Using your existing CSS class
                statusText = 'Invalid';
            }
            
            document.getElementById('modal-status').innerHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;
            
            // Set validation notes or default message
            const reasonText = data.validationNotes || 
                (data.status === 'pending' 
                    ? 'This submission is currently under review by our authentication team. Typically takes 24-48 hours to complete.'
                    : 'No validation notes provided.');
                    
            document.getElementById('modal-reason-text').textContent = reasonText;
            
            // Set images
            document.getElementById('modal-front').src = data.images.front;
            document.getElementById('modal-back').src = data.images.back;
            document.getElementById('modal-top').src = data.images.top;
            
            // Show the modal
            document.getElementById('validationModal').classList.add('active');
        }
    }, {
        onlyOnce: true
    });
}