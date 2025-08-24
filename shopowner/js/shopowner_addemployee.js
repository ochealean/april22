// shopowner_addemployee.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";

// Firebase config
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
const auth = getAuth(app);
const db = getDatabase(app);

// Global variables
let shopOwnerUid = null;
let shopName = null;
let lastEmployeeNumber = 0;

// DOM Elements
const addEmployeeForm = document.getElementById('addEmployeeForm');
const employeeNameInput = document.getElementById('employeeName');
const employeeEmailInput = document.getElementById('employeeEmail');
const employeeRoleInput = document.getElementById('employeeRole');
const employeePhoneInput = document.getElementById('employeePhone');
const employeePasswordInput = document.getElementById('employeePassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const logoutBtn = document.getElementById('logout_btn');
const generateEmployeesBtn = document.getElementById('generateEmployees');
const createBatchEmployeesBtn = document.getElementById('createBatchEmployees');
const batchPreview = document.getElementById('batchPreview');
const employeeCountInput = document.getElementById('employeeCount');
const batchEmployeeRoleInput = document.getElementById('batchEmployeeRole');
const emailDomainInput = document.getElementById('emailDomain');

// Initialize the application
function init() {
    setupAuthStateListener();
    setupEventListeners();
    setupPasswordValidation();
    setupPhoneNumberFormatting();
    setupBatchCreation();
}

// Set up authentication state listener
function setupAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            shopOwnerUid = user.uid;
            loadShopData(user.uid);
            loadLastEmployeeNumber(user.uid);
        } else {
            window.location.href = '/user_login.html';
        }
    });
}

// Load shop data
async function loadShopData(uid) {
    try {
        const shopRef = ref(db, `AR_shoe_users/shop/${uid}`);
        const snapshot = await get(shopRef);
        if (snapshot.exists()) {
            shopName = snapshot.val().shopName;
        }
    } catch (error) {
        console.error("Error loading shop data:", error);
    }
}

// Load last employee number from database
async function loadLastEmployeeNumber(shopId) {
    try {
        const numberRef = ref(db, `AR_shoe_users/shop/${shopId}/lastEmployeeNumber`);
        const snapshot = await get(numberRef);
        lastEmployeeNumber = snapshot.exists() ? snapshot.val() : 0;
    } catch (error) {
        console.error("Error loading last employee number:", error);
    }
}

// Update last employee number in database
async function updateLastEmployeeNumber(shopId, newNumber) {
    try {
        await update(ref(db, `AR_shoe_users/shop/${shopId}`), {
            lastEmployeeNumber: newNumber
        });
        lastEmployeeNumber = newNumber;
    } catch (error) {
        console.error("Error updating last employee number:", error);
    }
}

// Set up event listeners
function setupEventListeners() {
    if (addEmployeeForm) {
        addEmployeeForm.addEventListener('submit', handleFormSubmit);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    if (generateEmployeesBtn) {
        generateEmployeesBtn.addEventListener('click', generateBatchEmployees);
    }

    if (createBatchEmployeesBtn) {
        createBatchEmployeesBtn.addEventListener('click', createBatchEmployees);
    }
}

// Set up password validation
function setupPasswordValidation() {
    if (employeePasswordInput) {
        employeePasswordInput.addEventListener('input', validatePassword);
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePassword);
    }
}

// Set up phone number formatting
function setupPhoneNumberFormatting() {
    if (employeePhoneInput) {
        employeePhoneInput.addEventListener('input', formatPhoneNumber);
    }
}

// Set up batch creation functionality
function setupBatchCreation() {
    const creationOptions = document.querySelectorAll('.creation-option');
    const singleCreation = document.getElementById('singleCreation');
    const batchCreation = document.getElementById('batchCreation');

    creationOptions.forEach(option => {
        option.addEventListener('click', () => {
            creationOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            if (option.dataset.type === 'single') {
                singleCreation.style.display = 'block';
                batchCreation.style.display = 'none';
            } else {
                singleCreation.style.display = 'none';
                batchCreation.style.display = 'block';
            }
        });
    });
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    if (!shopOwnerUid) {
        alert("Please sign in as a shop owner first.");
        return;
    }

    // Validate password match
    if (employeePasswordInput.value !== confirmPasswordInput.value) {
        alert("Passwords don't match!");
        return;
    }

    const employeeData = {
        name: employeeNameInput.value.trim(),
        email: employeeEmailInput.value.trim(),
        role: employeeRoleInput.value,
        phone: employeePhoneInput.value.trim(),
        password: employeePasswordInput.value.trim(),
    };

    // Validate required fields
    if (!employeeData.name || !employeeData.email || !employeeData.role || !employeeData.password) {
        alert("Please fill all required fields.");
        return;
    }

    try {
        // Create employee account with verification email (default behavior)
        await createEmployeeAccount(employeeData, { sendVerificationEmail: true });
        alert(`Employee ${employeeData.name} created successfully!`);
        e.target.reset();
    } catch (error) {
        console.error("Error creating employee:", error);
        handleEmployeeCreationError(error);
    }
}

// Create employee account
async function createEmployeeAccount(employeeData, options = { sendVerificationEmail: true }) {
    if (!shopOwnerUid) {
        throw new Error("Shop owner not authenticated. Please sign in first.");
    }

    // Reuse existing secondary app if already initialized
    let secondaryApp;
    try {
        secondaryApp = getApp("Secondary");
    } catch (e) {
        secondaryApp = initializeApp(firebaseConfig, "Secondary");
    }

    const secondaryAuth = getAuth(secondaryApp);

    try {
        console.log("Attempting to create user:", employeeData.email);
        const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            employeeData.email,
            employeeData.password
        );

        // Only send verification email if option is true (default for single creation)
        if (options.sendVerificationEmail) {
            console.log("Sending verification email");
            await sendEmailVerification(userCredential.user);
        }

        console.log("Saving employee data to database");
        await set(ref(db, `AR_shoe_users/employees/${userCredential.user.uid}`), {
            name: employeeData.name,
            email: employeeData.email,
            role: employeeData.role,
            phone: employeeData.phone,
            shopId: shopOwnerUid,
            shopName: shopName,
            dateAdded: new Date().toISOString(),
            status: 'active'
        });

        console.log("Employee account created successfully");
        return { success: true };
    } catch (error) {
        console.error("Error during employee creation:", {
            code: error.code,
            message: error.message,
            stack: error.stack
        });

        // Handle specific Firebase errors
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('This email is already registered');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Please enter a valid email address');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('Password is too weak (minimum 6 characters)');
        }

        throw error;
    }
}

auth.onIdTokenChanged((user) => {
    if (user) {
        user.getIdToken().catch((error) => {
            console.error("Token refresh failed:", error);
            // Handle token refresh failure (e.g., force logout)
        });
    }
});

// Generate batch employees
async function generateBatchEmployees() {
    const count = parseInt(employeeCountInput.value);
    const role = batchEmployeeRoleInput.value;
    const domain = emailDomainInput.value.trim() || 'yourcompany.com';

    if (count < 1 || count > 100) {
        alert('Please enter a number between 1 and 100');
        return;
    }

    if (!domain.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
        alert('Please enter a valid email domain (e.g., company.com)');
        return;
    }

    batchPreview.innerHTML = '';

    for (let i = 1; i <= count; i++) {
        const employeeNum = (lastEmployeeNumber + i).toString().padStart(3, '0');
        const username = `employee${employeeNum}`;
        const email = `${username}@${domain}`;
        const password = generatePassword();

        const accountDiv = document.createElement('div');
        accountDiv.className = 'batch-account';
        accountDiv.innerHTML = `
            <div>
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Role:</strong> ${role}</p>
            </div>
            <div>
                <p><strong>Password:</strong> ${password}</p>
                <p><small>Email will ${document.getElementById('sendEmails').checked ? '' : 'not '}be sent</small></p>
                ${document.getElementById('sendEmails').checked && !document.getElementById('includePasswordInEmail').checked ?
                '<p><small>Password will not be included in email</small></p>' : ''}
            </div>
            <input type="hidden" name="batchUsername[]" value="${username}">
            <input type="hidden" name="batchEmail[]" value="${email}">
            <input type="hidden" name="batchPassword[]" value="${password}">
            <input type="hidden" name="batchRole[]" value="${role}">
        `;

        batchPreview.appendChild(accountDiv);
    }

    batchPreview.classList.add('active');
    createBatchEmployeesBtn.disabled = false;
}

// Create batch employees
async function createBatchEmployees() {
    const accounts = [];
    const accountDivs = batchPreview.querySelectorAll('.batch-account');
    
    // Show loading state
    createBatchEmployeesBtn.disabled = true;
    createBatchEmployeesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Employees...';
    
    accountDivs.forEach(div => {
        accounts.push({
            username: div.querySelector('input[name="batchUsername[]"]').value,
            email: div.querySelector('input[name="batchEmail[]"]').value,
            password: div.querySelector('input[name="batchPassword[]"]').value,
            role: div.querySelector('input[name="batchRole[]"]').value
        });
    });
    
    try {
        // Create all accounts as default accounts (not in Firebase Auth)
        for (const account of accounts) {
            // Generate a unique ID for the default account
            const employeeId = `default_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            
            await set(ref(db, `AR_shoe_users/employees/${employeeId}`), {
                name: account.username,
                email: account.email,
                role: account.role,
                phone: '',
                shopId: shopOwnerUid,
                shopName: shopName,
                dateAdded: new Date().toISOString(),
                status: 'default', // Mark as default account
                tempPassword: account.password, // Store temp password for later activation
                isDefaultAccount: true // Flag to identify default accounts
            });
        }

        // Update the last employee number
        const newLastNumber = lastEmployeeNumber + accounts.length;
        await updateLastEmployeeNumber(shopOwnerUid, newLastNumber);
        
        alert(`Successfully created ${accounts.length} default employee accounts!`);
        
        // Reset the form
        batchPreview.innerHTML = '';
        batchPreview.classList.remove('active');
        createBatchEmployeesBtn.innerHTML = '<i class="fas fa-save"></i> Create All Employees';
        createBatchEmployeesBtn.disabled = false;
    } catch (error) {
        console.error('Error creating accounts:', error);
        alert('Error creating accounts. Please check console for details.');
        createBatchEmployeesBtn.disabled = false;
        createBatchEmployeesBtn.innerHTML = '<i class="fas fa-save"></i> Create All Employees';
    }
}

// Generate random password
function generatePassword() {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";

    // Ensure at least one of each character type
    password += getRandomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    password += getRandomChar("abcdefghijklmnopqrstuvwxyz");
    password += getRandomChar("0123456789");
    password += getRandomChar("!@#$%^&*");

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }

    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

function getRandomChar(charSet) {
    return charSet[Math.floor(Math.random() * charSet.length)];
}

// Validate password
function validatePassword() {
    const password = employeePasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Check password requirements
    document.getElementById('reqLength').style.color = password.length >= 8 ? 'green' : 'red';
    document.getElementById('reqUppercase').style.color = /[A-Z]/.test(password) ? 'green' : 'red';
    document.getElementById('reqLowercase').style.color = /[a-z]/.test(password) ? 'green' : 'red';
    document.getElementById('reqNumber').style.color = /[0-9]/.test(password) ? 'green' : 'red';
    document.getElementById('reqSpecial').style.color = /[!@#$%^&*]/.test(password) ? 'green' : 'red';

    // Check if passwords match
    if (password && confirmPassword) {
        if (password !== confirmPassword) {
            confirmPasswordInput.setCustomValidity("Passwords don't match");
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    }
}

// Format phone number
function formatPhoneNumber(e) {
    // Remove all non-digit characters
    let phoneNumber = e.target.value.replace(/\D/g, '');

    // Limit to 10 digits (Philippine mobile numbers are 10 digits without country code)
    if (phoneNumber.length > 10) {
        phoneNumber = phoneNumber.substring(0, 10);
    }

    // Update the input value with just the digits
    e.target.value = phoneNumber;
}

// Handle employee creation errors
function handleEmployeeCreationError(error) {
    if (error.code === 'auth/email-already-in-use') {
        alert('This email is already registered');
    } else if (error.code === 'auth/invalid-email') {
        alert('Please enter a valid email address');
    } else if (error.code === 'auth/weak-password') {
        alert('Password is too weak. Please use a stronger password.');
    } else {
        alert('Error: ' + error.message);
    }
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

// Toggle password visibility
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = field.nextElementSibling;

    if (field.type === "password") {
        field.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        field.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);