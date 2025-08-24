import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";
import { getAuth, onAuthStateChanged, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
const storage = getStorage(app);
const auth = getAuth(app);

// State variables
let avatarFile = null;
let licenseFile = null;
let permitFile = null;
let frontIdFile = null;
let backIdFile = null;
let shopData = {};
let originalEmail = '';

// Global variables
let shopLoggedin; // shop ID of the logged-in user
let roleLoggedin; // role of the logged-in user
let sname; //shop name

// Initialize the page
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadShopProfile(user.uid);
        setupEventListeners();
        setupPasswordToggles();
        
        // Also setup event listeners for employee form
        setupEmployeeEventListeners();
    } else {
        window.location.href = "/user_login.html#shop";
    }
});


// DOM Elements
const elements = {
    // Header
    userNameDisplay: document.getElementById('userName_display2'),
    userProfileImage: document.getElementById('imageProfile'),

    // Profile Header
    profileName: document.querySelector('.profile-name'),
    profileEmail: document.querySelector('.profile-email'),
    profileAvatar: document.getElementById('shopLogoImg'),
    orderCount: document.querySelector('.stat-item:nth-child(1) .stat-value'),
    productCount: document.querySelector('.stat-item:nth-child(2) .stat-value'),
    ratingValue: document.querySelector('.stat-item:nth-child(3) .stat-value'),

    // Form Fields
    shopName: document.getElementById('shopName'),
    shopCategory: document.getElementById('shopCategory'),
    shopDescription: document.getElementById('shopDescription'),
    ownerName: document.getElementById('ownerName'),
    ownerEmail: document.getElementById('ownerEmail'),
    ownerPhone: document.getElementById('ownerPhone'),
    website: document.getElementById('website'),
    shopAddress: document.getElementById('shopAddress'),
    shopCity: document.getElementById('shopCity'),
    shopState: document.getElementById('shopState'),
    shopZip: document.getElementById('shopZip'),
    shopCountry: document.getElementById('shopCountry'),
    taxId: document.getElementById('taxId'),

    // Documents
    licensePreview: {
        container: document.querySelector('.document-preview:nth-of-type(1)'),
        icon: document.querySelector('.document-preview:nth-of-type(1) .document-icon'),
        name: document.querySelector('.document-preview:nth-of-type(1) .document-name'),
        date: document.querySelector('.document-preview:nth-of-type(1) .document-upload-date')
    },
    permitDocument: {
        container: document.querySelector('.document-preview:nth-of-type(2)'),
        icon: document.querySelector('.document-preview:nth-of-type(2) .document-icon'),
        name: document.querySelector('.document-preview:nth-of-type(2) .document-name'),
        date: document.querySelector('.document-preview:nth-of-type(2) .document-upload-date')
    },

    // Password Fields
    currentPassword: document.getElementById('currentPassword'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),

    // Buttons
    logoutBtn: document.getElementById('logout_btn'),
    cancelBtn: document.querySelector('.btn-cancel'),
    saveBtn: document.querySelector('.btn-save'),
    viewBtns: document.querySelectorAll('.btn-view'),
    replaceBtns: document.querySelectorAll('.btn-replace'),
    avatarUpload: document.querySelector('.avatar-upload input'),
    form: document.getElementById('profileForm')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    auth.onAuthStateChanged(user => {
        if (user) {
            loadShopProfile(user.uid);
            setupEventListeners();
            setupPasswordToggles();
        } else {
            window.location.href = '/user_login.html#shop';
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
});

function loadShopProfile(userId) {
    // First determine if this is a shop owner or employee
    const employeeRef = ref(db, `AR_shoe_users/employees/${userId}`);
    const shopRef = ref(db, `AR_shoe_users/shop/${userId}`);

    // Check if user is an employee first
    onValue(employeeRef, (employeeSnapshot) => {
        if (employeeSnapshot.exists()) {
            // This is an employee
            const employeeData = employeeSnapshot.val();
            console.log('Employee Data:', employeeData);
            originalEmail = employeeData.email || '';
            
            // Hide shop profile section and show employee section
            document.querySelector('.profile-container').style.display = 'none';
            document.getElementById('employeeProfileSection').style.display = 'block';
            
            // Load employee data
            loadEmployeeProfile(employeeData);
            
            // Set role-based UI elements
            if (employeeData.role.toLowerCase() === "salesperson") {
                document.getElementById("addemployeebtn").style.display = "none";
                document.getElementById("analyticsbtn").style.display = "none";
                document.getElementById("issuereport").style.display = "none";
            }
        } else {
            // Not an employee, check if shop owner
            onValue(shopRef, (shopSnapshot) => {
                if (shopSnapshot.exists()) {
                    // This is a shop owner
                    shopData = shopSnapshot.val();
                    console.log('Shop Data:', shopData);
                    originalEmail = shopData.email || '';
                    
                    // Show shop profile section and hide employee section
                    document.querySelector('.profile-container').style.display = 'block';
                    document.getElementById('employeeProfileSection').style.display = 'none';
                    
                    // Update Header
                    updateHeader(shopData);
                    
                    // Update Profile Section
                    updateProfileSection(shopData);
                    
                    // Update Form Fields
                    updateFormFields(shopData);
                    
                    // Update Documents
                    updateDocuments(shopData);
                    
                    // Load statistics
                    loadShopStatistics(userId);
                } else {
                    console.error('User is neither shop owner nor employee');
                    window.location.href = '/user_login.html';
                }
            });
        }
    });
}

function updateHeader(shopData) {
    // Shop Name
    if (shopData.shopName) {
        elements.userNameDisplay.textContent = shopData.shopName;
    }

    // Profile Image
    if (shopData.uploads?.shopLogo?.url) {
        elements.userProfileImage.src = shopData.uploads.shopLogo.url;
    } else {
        setDefaultAvatar(elements.userProfileImage);
    }
}

function updateProfileSection(shopData) {
    // Shop Name
    if (shopData.shopName) {
        elements.profileName.textContent = shopData.shopName;
    }

    // Email
    if (shopData.email) {
        elements.profileEmail.textContent = shopData.email;
    }

    // Avatar
    if (shopData.uploads?.shopLogo?.url) {
        elements.profileAvatar.src = shopData.uploads.shopLogo.url;
    } else {
        setDefaultAvatar(elements.profileAvatar);
    }
}

function updateFormFields(shopData) {
    // Shop Info
    if (shopData.shopName) elements.shopName.value = shopData.shopName;
    if (shopData.shopCategory) elements.shopCategory.value = shopData.shopCategory;
    if (shopData.shopDescription) elements.shopDescription.value = shopData.shopDescription;

    // Contact Info
    if (shopData.ownerName) elements.ownerName.value = shopData.ownerName;
    if (shopData.email) elements.ownerEmail.value = shopData.email;
    if (shopData.ownerPhone) elements.ownerPhone.value = shopData.ownerPhone;

    // Location Info
    if (shopData.shopAddress) elements.shopAddress.value = shopData.shopAddress;
    if (shopData.shopCity) elements.shopCity.value = shopData.shopCity;
    if (shopData.shopState) elements.shopState.value = shopData.shopState;
    if (shopData.shopZip) elements.shopZip.value = shopData.shopZip;
    if (shopData.shopCountry) elements.shopCountry.value = shopData.shopCountry;

    // Business Info
    if (shopData.taxId) elements.taxId.value = shopData.taxId;
}

function updateDocuments(shopData) {
    // License Preview
    if (elements.licensePreview.container) {
        if (shopData.uploads?.licensePreview) {
            const license = shopData.uploads.licensePreview;
            elements.licensePreview.icon.className = getFileIconClass(license.name);
            elements.licensePreview.name.textContent = license.name;
            elements.licensePreview.date.textContent = `Uploaded: ${formatDate(license.uploadedAt)}`;
            elements.licensePreview.container.style.display = 'flex'; // Make sure it's visible
        } else {
            elements.licensePreview.container.style.display = 'none';
        }
    }

    // Permit Document
    if (elements.permitDocument.container) {
        if (shopData.uploads?.permitDocument) {
            const permit = shopData.uploads.permitDocument;
            elements.permitDocument.icon.className = getFileIconClass(permit.name);
            elements.permitDocument.name.textContent = permit.name;
            elements.permitDocument.date.textContent = `Uploaded: ${formatDate(permit.uploadedAt)}`;
            elements.permitDocument.container.style.display = 'flex'; // Make sure it's visible
        } else {
            elements.permitDocument.container.style.display = 'none';
        }
    }
}

function loadShopStatistics(shopId) {
    // Order Count
    const ordersRef = ref(db, 'AR_shoe_users/transactions');
    onValue(ordersRef, (snapshot) => {
        let orderCount = 0;
        let totalRating = 0;
        let ratingCount = 0;

        snapshot.forEach(userSnapshot => {
            userSnapshot.forEach(orderSnapshot => {
                const order = orderSnapshot.val();
                if (order.shopId === shopId) {
                    orderCount++;

                    // Check for feedback
                    if (order.feedback) {
                        totalRating += order.feedback.rating;
                        ratingCount++;
                    }
                }
            });
        });

        elements.orderCount.textContent = orderCount;

        // Calculate average rating
        const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 'N/A';
        elements.ratingValue.textContent = avgRating;
    });

    // Product Count
    const productsRef = ref(db, `AR_shoe_users/shoe/${shopId}`);
    onValue(productsRef, (snapshot) => {
        elements.productCount.textContent = snapshot.size || 0;
    });
}

function setupPasswordToggles() {
    function setupPasswordToggle(inputId, toggleId) {
        const passwordInput = document.getElementById(inputId);
        const toggleIcon = document.getElementById(toggleId);

        if (!passwordInput || !toggleIcon) return;

        toggleIcon.addEventListener('click', function () {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
            }
        });
    }

    setupPasswordToggle('currentPassword', 'toggleCurrentPassword');
    setupPasswordToggle('newPassword', 'toggleNewPassword');
    setupPasswordToggle('confirmPassword', 'toggleConfirmPassword');
}

function setupEventListeners() {
    // Avatar upload
    elements.avatarUpload.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            avatarFile = file;
            const reader = new FileReader();
            reader.onload = function (e) {
                elements.profileAvatar.src = e.target.result;
                elements.userProfileImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Document view buttons
    elements.viewBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const documentContainer = this.closest('.document-preview');
            const documentType = documentContainer.querySelector('.document-name').textContent;

            if (shopData.uploads) {
                let url = '';
                if (documentType.includes('license') && shopData.uploads.licensePreview) {
                    url = shopData.uploads.licensePreview.url;
                } else if (documentType.includes('permit') && shopData.uploads.permitDocument) {
                    url = shopData.uploads.permitDocument.url;
                }

                if (url) {
                    window.open(url, '_blank');
                } else {
                    alert('Document URL not found');
                }
            }
        });
    });

    // Document replace buttons
    elements.replaceBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const documentContainer = this.closest('.document-preview');
            const documentType = documentContainer.querySelector('.document-name').textContent;

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,.pdf';

            input.onchange = e => {
                const file = e.target.files[0];
                if (file) {
                    if (documentType.includes('license')) {
                        licenseFile = file;
                    } else if (documentType.includes('permit')) {
                        permitFile = file;
                    }

                    // Update preview
                    const icon = documentContainer.querySelector('.document-icon');
                    const name = documentContainer.querySelector('.document-name');
                    const date = documentContainer.querySelector('.document-upload-date');

                    icon.className = getFileIconClass(file.name);
                    name.textContent = file.name;
                    date.textContent = 'Uploaded: Just now';

                    showAlert('Document will be updated when you save your changes', 'info');
                }
            };

            input.click();
        });
    });

    // Form submission
    elements.form.addEventListener('submit', async function (e) {
        e.preventDefault();

        try {
            showLoading(true);
            const user = auth.currentUser;
            const updates = {};
            let emailChanged = false;
            let passwordChanged = false;

            // Check if email changed
            if (elements.ownerEmail.value !== originalEmail) {
                if (!elements.currentPassword.value) {
                    throw new Error('Please enter your current password to change email');
                }

                const credential = EmailAuthProvider.credential(
                    originalEmail,
                    elements.currentPassword.value
                );

                await reauthenticateWithCredential(user, credential);
                await updateEmail(user, elements.ownerEmail.value);
                updates.email = elements.ownerEmail.value;
                emailChanged = true;
            }

            // Check if password changed
            if (elements.newPassword.value) {
                if (elements.newPassword.value !== elements.confirmPassword.value) {
                    throw new Error('New passwords do not match');
                }

                if (!emailChanged && !elements.currentPassword.value) {
                    throw new Error('Please enter your current password to change password');
                }

                if (!emailChanged) {
                    const credential = EmailAuthProvider.credential(
                        originalEmail,
                        elements.currentPassword.value
                    );
                    await reauthenticateWithCredential(user, credential);
                }

                await updatePassword(user, elements.newPassword.value);
                passwordChanged = true;
            }

            // Update shop data
            updates.shopName = elements.shopName.value;
            updates.shopCategory = elements.shopCategory.value;
            updates.shopDescription = elements.shopDescription.value;
            updates.ownerName = elements.ownerName.value;
            updates.ownerPhone = elements.ownerPhone.value;
            updates.shopAddress = elements.shopAddress.value;
            updates.shopCity = elements.shopCity.value;
            updates.shopState = elements.shopState.value;
            updates.shopZip = elements.shopZip.value;
            updates.shopCountry = elements.shopCountry.value;
            updates.taxId = elements.taxId.value;

            // Upload files
            const uploadPromises = [];
            const newUploads = {};

            if (avatarFile) {
                const oldUrl = shopData.uploads?.shopLogo?.url || null;
                uploadPromises.push(uploadFile(user.uid, avatarFile, 'shopLogo', oldUrl).then(url => {
                    newUploads.shopLogo = {
                        name: avatarFile.name,
                        url: url,
                        uploadedAt: new Date().toISOString()
                    };
                }));
            }

            if (licenseFile) {
                const oldUrl = shopData.uploads?.licensePreview?.url || null;
                uploadPromises.push(uploadFile(user.uid, licenseFile, 'license', oldUrl).then(url => {
                    newUploads.licensePreview = {
                        name: licenseFile.name,
                        url: url,
                        uploadedAt: new Date().toISOString()
                    };
                }));
            }

            if (permitFile) {
                const oldUrl = shopData.uploads?.permitDocument?.url || null;
                uploadPromises.push(uploadFile(user.uid, permitFile, 'permit', oldUrl).then(url => {
                    newUploads.permitDocument = {
                        name: permitFile.name,
                        url: url,
                        uploadedAt: new Date().toISOString()
                    };
                }));
            }

            await Promise.all(uploadPromises);

            if (Object.keys(newUploads).length > 0) {
                updates.uploads = {
                    ...(shopData.uploads || {}),
                    ...newUploads
                };
            }

            await update(ref(db, `AR_shoe_users/shop/${user.uid}`), updates);

            // Update UI
            elements.profileName.textContent = elements.shopName.value;
            elements.profileEmail.textContent = elements.ownerEmail.value;
            elements.userNameDisplay.textContent = elements.shopName.value;

            if (passwordChanged) {
                elements.currentPassword.value = '';
                elements.newPassword.value = '';
                elements.confirmPassword.value = '';
            }

            showAlert('Profile updated successfully!', 'success');

        } catch (error) {
            console.error('Error updating profile:', error);
            showAlert(error.message, 'error');
        } finally {
            showLoading(false);
        }
    });

    // Cancel button
    elements.cancelBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to discard your changes?')) {
            window.location.reload();
        }
    });
}

function setDefaultAvatar(imgElement) {
    if (!imgElement) return;
    imgElement.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23ddd'%3E%3Crect width='100' height='100'/%3E%3Ctext x='50%' y='50%' font-size='20' text-anchor='middle' dominant-baseline='middle' fill='%23666'%3EShop Logo%3C/text%3E%3C/svg%3E";
}

function getFileIconClass(filename) {
    if (!filename) return 'fas fa-file document-icon';
    if (filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return 'fas fa-file-image document-icon';
    } else if (filename.match(/\.(pdf)$/i)) {
        return 'fas fa-file-pdf document-icon';
    } else {
        return 'fas fa-file document-icon';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (show) {
        if (!loadingOverlay) {
            const overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '1000';

            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            spinner.style.border = '5px solid #f3f3f3';
            spinner.style.borderTop = '5px solid #3498db';
            spinner.style.borderRadius = '50%';
            spinner.style.width = '50px';
            spinner.style.height = '50px';
            spinner.style.animation = 'spin 1s linear infinite';

            overlay.appendChild(spinner);
            document.body.appendChild(overlay);
        }
    } else {
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
}

function showAlert(message, type) {
    // Remove any existing alerts first
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = 'custom-alert';
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.padding = '15px 20px';
    alertDiv.style.borderRadius = '5px';
    alertDiv.style.color = 'white';
    alertDiv.style.zIndex = '1000';
    alertDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    alertDiv.style.animation = 'slideIn 0.3s ease-out';

    if (type === 'success') {
        alertDiv.style.backgroundColor = '#4CAF50';
    } else if (type === 'error') {
        alertDiv.style.backgroundColor = '#F44336';
    } else if (type === 'info') {
        alertDiv.style.backgroundColor = '#2196F3';
    }

    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Helper function for file uploads
async function uploadFile(userId, file, type, oldUrl = null) {
    try {
        // Delete old file if it exists
        if (oldUrl) {
            try {
                const oldRef = storageRef(storage, oldUrl);
                await deleteObject(oldRef);
                console.log('Old file deleted successfully');
            } catch (error) {
                console.log('No old file to delete or error deleting:', error);
            }
        }

        // Upload new file
        const fileRef = storageRef(storage, `uploads/${userId}/${type}_${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        return getDownloadURL(fileRef);
    } catch (error) {
        console.error('Error in uploadFile:', error);
        throw error;
    }
}

function setupEmployeeEventListeners() {
    const employeeForm = document.getElementById('employeeProfileForm');
    if (!employeeForm) return;
    
    employeeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            showLoading(true);
            const user = auth.currentUser;
            const updates = {};
            let emailChanged = false;
            let passwordChanged = false;
            
            // Get form values
            const fullName = document.getElementById('employeeFullName').value;
            const phone = document.getElementById('employeePhone').value;
            const emergencyName = document.getElementById('emergencyContactName').value;
            const emergencyRelation = document.getElementById('emergencyContactRelation').value;
            const emergencyPhone = document.getElementById('emergencyContactPhone').value;
            const currentPassword = document.getElementById('employeeCurrentPassword').value;
            const newPassword = document.getElementById('employeeNewPassword').value;
            const confirmPassword = document.getElementById('employeeConfirmPassword').value;
            
            // Basic validation
            if (newPassword && newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }
            
            // Check if password is being changed
            if (newPassword) {
                if (!currentPassword) {
                    throw new Error('Please enter your current password to change password');
                }
                
                const credential = EmailAuthProvider.credential(
                    user.email,
                    currentPassword
                );
                
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPassword);
                passwordChanged = true;
            }
            
            // Prepare updates
            updates.name = fullName;
            updates.phone = phone;
            updates.emergencyContact = {
                name: emergencyName,
                relationship: emergencyRelation,
                phone: emergencyPhone
            };
            
            // Handle avatar upload if changed
            const avatarInput = document.getElementById('employeePhotoUpload');
            if (avatarInput.files.length > 0) {
                const avatarFile = avatarInput.files[0];
                const avatarUrl = await uploadFile(user.uid, avatarFile, 'employeeAvatar');
                updates.profilePhoto = {
                    url: avatarUrl,
                    name: avatarFile.name,
                    uploadedAt: new Date().toISOString()
                };
                
                // Update UI
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('employeePhotoImg').src = e.target.result;
                    document.getElementById('imageProfile').src = e.target.result;
                };
                reader.readAsDataURL(avatarFile);
            }
            
            // Update database
            await update(ref(db, `AR_shoe_users/employees/${user.uid}`), updates);
            
            // Update UI
            document.querySelector('#employeeProfileSection .profile-name').textContent = fullName;
            document.getElementById('userName_display2').textContent = fullName;
            
            if (passwordChanged) {
                document.getElementById('employeeCurrentPassword').value = '';
                document.getElementById('employeeNewPassword').value = '';
                document.getElementById('employeeConfirmPassword').value = '';
            }
            
            showAlert('Profile updated successfully!', 'success');
            
        } catch (error) {
            console.error('Error updating employee profile:', error);
            showAlert(error.message, 'error');
        } finally {
            showLoading(false);
        }
    });
    
    // Cancel button for employee form
    const employeeCancelBtn = document.querySelector('#employeeProfileForm .btn-cancel');
    if (employeeCancelBtn) {
        employeeCancelBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to discard your changes?')) {
                window.location.reload();
            }
        });
    }
    
    // Avatar upload for employee
    const employeeAvatarUpload = document.getElementById('employeePhotoUpload');
    if (employeeAvatarUpload) {
        employeeAvatarUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('employeePhotoImg').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// function to load employee profile
function loadEmployeeProfile(employeeData) {
    // Update Header
    document.getElementById('userName_display2').textContent = employeeData.name || 'Employee';
    
    // Update profile image if exists
    if (employeeData.profilePhoto?.url) {
        document.getElementById('employeePhotoImg').src = employeeData.profilePhoto.url;
        document.getElementById('imageProfile').src = employeeData.profilePhoto.url;
    } else {
        setDefaultAvatar(document.getElementById('employeePhotoImg'));
        setDefaultAvatar(document.getElementById('imageProfile'));
    }
    
    // Update Employee Profile Section
    const employeeSection = document.getElementById('employeeProfileSection');
    employeeSection.querySelector('.profile-name').textContent = employeeData.name || 'Employee';
    employeeSection.querySelector('.profile-email').textContent = employeeData.email || '';
    
    // Update Employee Form Fields
    document.getElementById('employeeFullName').value = employeeData.name || '';
    document.getElementById('employeeRole').value = employeeData.role || '';
    document.getElementById('employeeEmail').value = employeeData.email || '';
    document.getElementById('employeePhone').value = employeeData.phone || '';
    
    // Update Emergency Contact Fields
    if (employeeData.emergencyContact) {
        console.log('Emergency Contact Data:', employeeData.emergencyContact);
        document.getElementById('emergencyContactName').value = employeeData.emergencyContact.name || '';
        document.getElementById('emergencyContactRelation').value = employeeData.emergencyContact.relationship || '';
        document.getElementById('emergencyContactPhone').value = employeeData.emergencyContact.phone || '';
    } else {
        // Clear fields if no emergency contact data exists
        document.getElementById('emergencyContactName').value = '';
        document.getElementById('emergencyContactRelation').value = '';
        document.getElementById('emergencyContactPhone').value = '';
    }
    
    // Load employee statistics
    loadEmployeeStatistics(employeeData.shopId);
}

// function for employee statistics
function loadEmployeeStatistics(shopId) {
    // You can implement employee-specific statistics here
    const ordersRef = ref(db, 'AR_shoe_users/transactions');
    onValue(ordersRef, (snapshot) => {
        let ordersProcessed = 0;
        
        snapshot.forEach(userSnapshot => {
            userSnapshot.forEach(orderSnapshot => {
                const order = orderSnapshot.val();
                if (order.shopId === shopId) {
                    // Check if this employee processed the order (you'll need to track this in your data)
                    ordersProcessed++;
                }
            });
        });
        
        document.querySelector('#employeeProfileSection .stat-item:nth-child(1) .stat-value').textContent = ordersProcessed;
    });
}