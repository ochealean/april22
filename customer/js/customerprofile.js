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
let customerData = {};
let originalEmail = '';

// DOM Elements
const elements = {
    // Header
    userNameDisplay: document.getElementById('userName_display2'),
    userProfileImage: document.getElementById('imageProfile'),

    // Profile Header
    profileName: document.querySelector('.profile-name'),
    profileEmail: document.querySelector('.profile-email'),
    profileAvatar: document.getElementById('profilePhotoImg'),
    wishlistCount: document.querySelector('.stat-item .stat-value'),

    // Form Fields
    firstName: document.getElementById('firstName'),
    lastName: document.getElementById('lastName'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    birthdate: document.getElementById('birthdate'),
    address: document.getElementById('address'),
    city: document.getElementById('city'),
    province: document.getElementById('province'),
    zipCode: document.getElementById('zipCode'),
    country: document.getElementById('country'),

    // Password Fields
    currentPassword: document.getElementById('currentPassword'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),

    // Buttons
    logoutBtn: document.getElementById('logout_btn'),
    cancelBtn: document.querySelector('.btn-cancel'),
    saveBtn: document.querySelector('.btn-save'),
    avatarUpload: document.getElementById('profilePhotoUpload'),
    form: document.getElementById('profileForm')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    onAuthStateChanged(auth, user => {
        if (user) {
            loadCustomerProfile(user.uid);
            setupEventListeners();
            setupPasswordToggles();
            setupPasswordValidation(); // Add this line
        } else {
            window.location.href = "/user_login.html#customer";
        }
    });

    // Logout functionality
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', () => {
            elements.logoutBtn.disabled = true;
            elements.logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';

            auth.signOut().then(() => {
                window.location.href = "/user_login.html";
            }).catch((error) => {
                console.error("Logout error:", error);
                alert("Failed to logout. Please try again.");
                elements.logoutBtn.disabled = false;
                elements.logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            });
        });
    }
});

function loadCustomerProfile(userId) {
    const customerRef = ref(db, `AR_shoe_users/customer/${userId}`);

    onValue(customerRef, (snapshot) => {
        if (snapshot.exists()) {
            customerData = snapshot.val();
            console.log('Customer Data:', customerData);
            originalEmail = customerData.email || '';

            // Update UI with customer data
            updateHeader(customerData);
            updateProfileSection(customerData);
            updateFormFields(customerData);

            // Load statistics
            loadCustomerStatistics(userId);
        } else {
            console.error('Customer data not found');
            window.location.href = '/user_login.html';
        }
    });
}

function updateHeader(customerData) {
    // Customer Name
    if (customerData.firstName || customerData.lastName) {
        elements.userNameDisplay.textContent = `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim();
    }

    // Profile Image
    if (customerData.profilePhoto?.profilePhoto?.url) {
        elements.userProfileImage.src = customerData.profilePhoto.profilePhoto.url;
    } else {
        setDefaultAvatar(elements.userProfileImage);
    }
}

function updateProfileSection(customerData) {
    // Customer Name
    if (customerData.firstName || customerData.lastName) {
        elements.profileName.textContent = `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim();
    }

    // Email
    if (customerData.email) {
        elements.profileEmail.textContent = customerData.email;
    }

    // Avatar
    if (customerData.profilePhoto?.profilePhoto?.url) {
        elements.profileAvatar.src = customerData.profilePhoto.profilePhoto.url;
    } else {
        setDefaultAvatar(elements.profileAvatar);
    }
}

function updateFormFields(customerData) {
    // Personal Info
    if (customerData.firstName) elements.firstName.value = customerData.firstName;
    if (customerData.lastName) elements.lastName.value = customerData.lastName;
    if (customerData.email) elements.email.value = customerData.email;
    if (customerData.phone) elements.phone.value = customerData.phone;
    if (customerData.birthday) elements.birthdate.value = customerData.birthday;

    // Address Info
    if (customerData.address) elements.address.value = customerData.address;
    if (customerData.city) elements.city.value = customerData.city;
    if (customerData.state) elements.province.value = customerData.state;
    if (customerData.zip) elements.zipCode.value = customerData.zip;
    if (customerData.country) elements.country.value = customerData.country;
}

function loadCustomerStatistics(userId) {
    // Wishlist Count
    const wishlistRef = ref(db, `AR_shoe_users/wishlist/${userId}`);
    onValue(wishlistRef, (snapshot) => {
        let wishlistCount = 0;

        if (snapshot.exists()) {
            // Count all wishlist items across all shops
            snapshot.forEach(shopSnapshot => {
                wishlistCount += Object.keys(shopSnapshot.val()).length;
            });
        }

        elements.wishlistCount.textContent = wishlistCount;
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
            if (elements.email.value !== originalEmail) {
                if (!elements.currentPassword.value) {
                    throw new Error('Please enter your current password to change email');
                }

                const credential = EmailAuthProvider.credential(
                    originalEmail,
                    elements.currentPassword.value
                );

                await reauthenticateWithCredential(user, credential);
                await updateEmail(user, elements.email.value);
                updates.email = elements.email.value;
                emailChanged = true;
            }

            // Check if password changed
            if (elements.newPassword.value) {
                passwordChanged = await changePassword(
                    user,
                    elements.currentPassword.value,
                    elements.newPassword.value,
                    elements.confirmPassword.value
                );
            }

            // Update customer data (only if password fields are not the only changes)
            if (elements.firstName.value !== customerData.firstName ||
                elements.lastName.value !== customerData.lastName ||
                elements.phone.value !== customerData.phone ||
                elements.birthdate.value !== customerData.birthday ||
                elements.address.value !== customerData.address ||
                elements.city.value !== customerData.city ||
                elements.province.value !== customerData.state ||
                elements.zipCode.value !== customerData.zip ||
                elements.country.value !== customerData.country ||
                avatarFile) {

                updates.firstName = elements.firstName.value;
                updates.lastName = elements.lastName.value;
                updates.phone = elements.phone.value;
                updates.birthday = elements.birthdate.value;
                updates.address = elements.address.value;
                updates.city = elements.city.value;
                updates.state = elements.province.value;
                updates.zip = elements.zipCode.value;
                updates.country = elements.country.value;

                // Upload avatar if changed
                if (avatarFile) {
                    const oldUrl = customerData.profilePhoto?.profilePhoto?.url || null;
                    const avatarUrl = await uploadFile(user.uid, avatarFile, 'customerProfile', oldUrl);

                    updates.profilePhoto = {
                        profilePhoto: {
                            name: avatarFile.name,
                            url: avatarUrl,
                            uploadedAt: new Date().toISOString()
                        }
                    };
                }

                await update(ref(db, `AR_shoe_users/customer/${user.uid}`), updates);
            }

            // Update UI
            elements.profileName.textContent = `${elements.firstName.value} ${elements.lastName.value}`;
            elements.profileEmail.textContent = elements.email.value;
            elements.userNameDisplay.textContent = `${elements.firstName.value} ${elements.lastName.value}`;

            if (passwordChanged) {
                elements.currentPassword.value = '';
                elements.newPassword.value = '';
                elements.confirmPassword.value = '';
                showAlert('Password updated successfully!', 'success');
            } else if (Object.keys(updates).length > 0) {
                showAlert('Profile updated successfully!', 'success');
            }

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
    imgElement.src = "https://via.placeholder.com/150?text=User";
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
        const fileRef = storageRef(storage, `customerProfile/${userId}/${type}_${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        return getDownloadURL(fileRef);
    } catch (error) {
        console.error('Error in uploadFile:', error);
        throw error;
    }
}

function setupPasswordValidation() {
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const passwordError = document.createElement('div');
    passwordError.style.color = 'var(--error)';
    passwordError.style.fontSize = '0.8rem';
    passwordError.style.marginTop = '0.25rem';
    passwordError.style.display = 'none';
    
    confirmPassword.parentNode.appendChild(passwordError);
    
    function validatePasswords() {
        if (newPassword.value && confirmPassword.value) {
            if (newPassword.value !== confirmPassword.value) {
                passwordError.textContent = 'Passwords do not match';
                passwordError.style.display = 'block';
                confirmPassword.style.borderColor = 'var(--error)';
                return false;
            } else if (newPassword.value.length < 6) {
                passwordError.textContent = 'Password must be at least 6 characters';
                passwordError.style.display = 'block';
                confirmPassword.style.borderColor = 'var(--error)';
                return false;
            } else {
                passwordError.style.display = 'none';
                confirmPassword.style.borderColor = 'var(--success)';
                return true;
            }
        }
        return null;
    }
    
    newPassword.addEventListener('input', validatePasswords);
    confirmPassword.addEventListener('input', validatePasswords);
}

// Add this function to handle password changes specifically
async function changePassword(user, currentPassword, newPassword, confirmPassword) {
    try {
        // Validate inputs
        if (!currentPassword) {
            throw new Error('Current password is required');
        }
        
        if (!newPassword) {
            throw new Error('New password is required');
        }
        
        if (newPassword !== confirmPassword) {
            throw new Error('New passwords do not match');
        }
        
        if (newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long');
        }
        
        // Reauthenticate user
        const credential = EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        
        await reauthenticateWithCredential(user, credential);
        
        // Update password
        await updatePassword(user, newPassword);
        
        return true;
    } catch (error) {
        console.error('Error changing password:', error);
        throw error;
    }
}