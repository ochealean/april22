import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref as dbRef, set, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";
import { getAuth, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
const storage = getStorage(app);
const auth = getAuth(app);
const db = getDatabase(app);

// Button control functions
const reapplyButton = document.getElementById('reapplyButton');

function setButtonDisable() {
    reapplyButton.style.background = "linear-gradient(135deg, #43579d, #694c8d)";
    reapplyButton.style.color = "#838383";
    reapplyButton.disabled = true;
}

function setButtonAble() {
    reapplyButton.style.background = "linear-gradient(135deg, var(--primary), var(--secondary))";
    reapplyButton.style.color = "var(--light)";
    reapplyButton.disabled = false;
}

// Helper function to show field errors
function showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    formGroup?.classList.add('error');

    const errorElement = document.createElement('span');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    formGroup?.appendChild(errorElement);
}

// File upload function for reapplication
async function uploadFilesIfChanged(userId, files) {
    const uploadPromises = [];
    const fileData = {};
    
    for (const [fieldName, file] of Object.entries(files)) {
        if (file) {
            const fileRef = storageRef(storage, `reapplications/${userId}/${fieldName}_${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(fileRef, file);
            
            uploadPromises.push(
                uploadTask.then(() => getDownloadURL(uploadTask.snapshot.ref))
                .then(url => {
                    fileData[fieldName] = {
                        name: file.name,
                        url: url,
                        uploadedAt: new Date().toISOString()
                    };
                })
            );
        }
    }
    
    await Promise.all(uploadPromises);
    return fileData;
}

// Main reapplication handler
reapplyButton.addEventListener('click', async (event) => {
    event.preventDefault();
    setButtonDisable();
    showLoader();

    try {
        // Clear previous errors
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        document.querySelectorAll('.form-group').forEach(el => el.classList.remove('error'));

        // Validate all fields
        const errors = [];
        const requiredFields = [
            { id: 'shopName', name: 'Shop Name' },
            { id: 'shopCategory', name: 'Shop Category' },
            { id: 'shopDescription', name: 'Shop Description' },
            { id: 'ownerName', name: 'Owner Name' },
            { id: 'ownerEmail', name: 'Email' },
            { id: 'ownerPhone', name: 'Phone Number' },
            { id: 'ownerIdFront', name: 'ID Front' },
            { id: 'ownerIdBack', name: 'ID Back' },
            { id: 'shopAddress', name: 'Shop Address' },
            { id: 'shopCity', name: 'City' },
            { id: 'shopState', name: 'State/Province' },
            { id: 'shopZip', name: 'ZIP/Postal Code' },
            { id: 'shopCountry', name: 'Country' },
            { id: 'businessLicense', name: 'Mayor\'s Permit / Business License' },
            { id: 'taxId', name: 'Tax ID' },
            { id: 'permitDocument', name: 'Business Permit' },
        ];

        // Check required fields
        requiredFields.forEach(({ id, name }) => {
            const field = document.getElementById(id);
            if (!field.value.trim()) {
                errors.push(`${name} is required`);
                showFieldError(field, `${name} is required`);
            }
        });

        // Validate phone number
        const phoneField = document.getElementById('ownerPhone');
        if (phoneField.value.length !== 10 || !/^\d+$/.test(phoneField.value)) {
            errors.push('Invalid phone number');
            showFieldError(phoneField, 'Please enter a valid 10-digit Philippine mobile number');
        }

        // Validate terms agreement
        if (!document.getElementById('agreeTerms').checked) {
            errors.push('You must agree to the Terms of Service and Privacy Policy');
            showFieldError(document.getElementById('agreeTerms'), 'You must agree to the Terms of Service and Privacy Policy');
        }

        // If any errors, stop here
        if (errors.length > 0) {
            hideLoader();
            setButtonAble();
            showErrorOverlay(errors);
            document.querySelector('.form-group.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Get current user
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('User not authenticated. Please sign in again.');
        }

        // Get files that were actually uploaded (optional for reapplication)
        const filesToUpload = {};
        const permitFile = document.getElementById("permitDocument").files[0];
        const licenseFile = document.getElementById("businessLicense").files[0];
        const frontSideFile = document.getElementById("ownerIdFront").files[0];
        const backSideFile = document.getElementById("ownerIdBack").files[0];

        if (permitFile) filesToUpload.permitDocument = permitFile;
        if (licenseFile) filesToUpload.businessLicense = licenseFile;
        if (frontSideFile) filesToUpload.ownerIdFront = frontSideFile;
        if (backSideFile) filesToUpload.ownerIdBack = backSideFile;

        // Upload files if any were selected
        let uploadedFiles = {};
        if (Object.keys(filesToUpload).length > 0) {
            uploadedFiles = await uploadFilesIfChanged(currentUser.uid, filesToUpload);
        }

        // Prepare reapplication data
        const reapplicationData = {
            shopInfo: {
                shopName: document.getElementById('shopName').value,
                shopCategory: document.getElementById('shopCategory').value,
                shopDescription: document.getElementById('shopDescription').value,
                yearsInBusiness: document.getElementById('yearsInBusiness').value,
                shopAddress: document.getElementById('shopAddress').value,
                shopCity: document.getElementById('shopCity').value,
                shopState: document.getElementById('shopState').value,
                shopZip: document.getElementById('shopZip').value,
                shopCountry: document.getElementById('shopCountry').value,
                taxId: document.getElementById('taxId').value
            },
            ownerInfo: {
                ownerName: document.getElementById('ownerName').value,
                ownerEmail: document.getElementById('ownerEmail').value,
                ownerPhone: document.getElementById('ownerPhone').value
            },
            ...(Object.keys(uploadedFiles).length > 0 && { updatedDocuments: uploadedFiles })
        };

        // Save reapplication data
        await set(dbRef(db, `AR_shoe_users/shop/${currentUser.uid}/reapplications/${Date.now()}`), reapplicationData);
        
        // Update main shop status
        await update(dbRef(db, `AR_shoe_users/shop/${currentUser.uid}`), {
            status: 'reapplied',
            lastReapplication: new Date().toISOString()
        });

        // Send notification email
        await sendEmailVerification(currentUser);

        hideLoader();
        setButtonAble();
        showSuccessOverlay();

    } catch (error) {
        hideLoader();
        setButtonAble();
        showErrorOverlay([error.message]);
        console.error("Reapplication error:", error);
    }
});