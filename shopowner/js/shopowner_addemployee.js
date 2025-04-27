import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
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


// global variable to store the shop owner information
let email;      // emailsend_1
let messageForEmployee =
    `Hello, you have been added as an employee. <br>
Here are your login details:<br>
Email: ${document.getElementById('employeeEmail').value}<br>
Password: ${document.getElementById('employeePassword').value}<br>
<br>
you can log in to your account using the following link:<br>
https://april22.vercel.app/user_login.html <br>
Please check your email for further instructions.`;




// Single assignment variable for shop owner
function createSingleAssignmentVariable() {
    let valueSet = false;
    let value;

    return {
        setValue(newValue) {
            if (!newValue) throw new Error("Value cannot be null or undefined");
            if (valueSet) throw new Error("The value can only be set once!");
            value = newValue;
            valueSet = true;
        },
        getValue() {
            if (!valueSet) throw new Error("Value has not been set yet!");
            return value;
        },
    };
}

const shopOwnerVar = createSingleAssignmentVariable();
let shopOwnerPassword = null;

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        try {
            shopOwnerVar.setValue({
                uid: user.uid,
                email: user.email
            });
            console.log("Shop owner authenticated:", user.uid);
        } catch (error) {
            console.error("Error setting shop owner:", error);
        }
    } else {
        console.log("No user signed in");
        window.location.href = '/shopowner/html/shopowner_login.html';
    }
});

async function createEmployeeAccount(employeeData) {
    if (!shopOwnerVar.getValue()) {
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
        const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            employeeData.email,
            employeeData.password
        );

        await sendEmailVerification(userCredential.user);

        await set(ref(db, `AR_shoe_users/employees/${userCredential.user.uid}`), {
            name: employeeData.name,
            email: employeeData.email,
            role: employeeData.role,
            phone: employeeData.phone,
            password: employeeData.password,
            shopId: shopOwnerVar.getValue().uid,
            dateAdded: new Date().toISOString(),
            status: 'active'
        });

        return { success: true };
    } catch (error) {
        console.error("Error during employee creation:", error);
        throw error;
    }
}


// Handle form submit
document.getElementById('addEmployeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!shopOwnerVar.getValue()) {
        alert("Please sign in as a shop owner first.");
        return;
    }

    // Validate password match
    const password = document.getElementById('employeePassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        alert("Passwords don't match!");
        return;
    }

    const employeeData = {
        name: document.getElementById('employeeName').value.trim(),
        email: document.getElementById('employeeEmail').value.trim(),
        role: document.getElementById('employeeRole').value,
        phone: document.getElementById('employeePhone').value.trim(),
        password: document.getElementById('employeePassword').value.trim(),
    };

    // Validate required fields
    if (!employeeData.name || !employeeData.email || !employeeData.role || !employeeData.password) {
        alert("Please fill all required fields.");
        return;
    }

    try {
        // Get shop owner's password confirmation
        shopOwnerPassword = prompt("Please confirm your password to continue:");
        if (!shopOwnerPassword) {
            alert("Password confirmation is required");
            return;
        }

        // Create employee account
        const result = await createEmployeeAccount(employeeData);
        
        // Initialize EmailJS - make sure to use your actual public key
        emailjs.init('gBZ5mCvVmgjo7wn0W'); // Your public key here


        const templateParams = {
            email: employeeData.email,
            from_name: 'Your App Name',
            reply_to: 'your-default-reply@example.com',
            name: employeeData.name,
            password_text: employeeData.password,
        };
        console.log(templateParams);

        // Send email
        const emailResponse = await emailjs.send(
            'service_e65qjil', // Your service ID
            'template_29nwqmg', // Your template ID
            templateParams
        );

        console.log('Email sent!', emailResponse.status, emailResponse.text);
        alert(`Employee created successfully! Email sent to ${employeeData.email}`);
        
        // Reset form
        e.target.reset();

        // Clear password validation indicators
        document.querySelectorAll('#passwordRequirements li').forEach(li => {
            li.style.color = 'initial';
        });
    } catch (err) {
        console.error("Error:", err);
        
        // More specific error messages
        if (err.code === 'auth/email-already-in-use') {
            alert('This email is already registered');
        } else if (err.code === 'auth/invalid-email') {
            alert('Please enter a valid email address');
        } else if (err.text) { // EmailJS error
            alert('Failed to send email: ' + err.text);
        } else {
            alert('Error: ' + err.message);
        }
    }
});

// Password validation
document.getElementById('employeePassword').addEventListener('input', function () {
    const password = this.value;

    // Check password requirements
    document.getElementById('reqLength').style.color = password.length >= 8 ? 'green' : 'red';
    document.getElementById('reqUppercase').style.color = /[A-Z]/.test(password) ? 'green' : 'red';
    document.getElementById('reqLowercase').style.color = /[a-z]/.test(password) ? 'green' : 'red';
    document.getElementById('reqNumber').style.color = /[0-9]/.test(password) ? 'green' : 'red';
    document.getElementById('reqSpecial').style.color = /[!@#$%^&*]/.test(password) ? 'green' : 'red';
});

// Phone number formatting
document.getElementById('employeePhone').addEventListener('input', function (e) {
    const x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
    e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
});

// Logout functionality
document.getElementById('logout_btn')?.addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = '/user_login.html';
    });
});