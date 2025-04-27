import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, set, get, ref as dbRef, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getStorage, listAll, deleteObject, getDownloadURL, ref as storageRef, uploadBytesResumable } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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

const params = new URLSearchParams(window.location.search);
const shop_ID = params.get("shopID");
const fillTextboxRef = dbRef(db, `AR_shoe_users/shop/${shop_ID}`);

get(fillTextboxRef).then((snapshot) => {
    if (snapshot.exists()) {
        const dataValues = snapshot.val();
        console.log(dataValues);
        document.getElementById('shopName').value = dataValues.shopName || '';
        document.getElementById('shopName').disabled = true; // Disable the shop name field
        document.getElementById('ownerName').value = dataValues.ownerName || '';
        document.getElementById('shopCategory').value = dataValues.shopCategory || '';
        document.getElementById('shopDescription').value = dataValues.shopDescription || '';
        document.getElementById('yearsInBusiness').value = dataValues.yearsInBusiness || '';
        document.getElementById('shopAddress').value = dataValues.shopAddress || '';
        document.getElementById('shopCity').value = dataValues.shopCity || '';
        document.getElementById('shopState').value = dataValues.shopState || '';
        document.getElementById('shopZip').value = dataValues.shopZip || '';
        document.getElementById('shopCountry').value = dataValues.shopCountry || '';
        document.getElementById('taxId').value = dataValues.taxId || '';
        document.getElementById('ownerEmail').value = dataValues.email || '';
        document.getElementById('ownerEmail').disabled = true;
        document.getElementById('ownerPhone').value = dataValues.ownerPhone || '';
    }
    else {
        console.error("No data available for shop status.");
    }
}).catch((error) => {
    console.error("Error fetching shop status:", error);
});

// Button control functions
const reapplyButton = document.getElementById('reapplyButton');

function setButtonDisable() {
    reapplyButton.disabled = true;
    reapplyButton.style.opacity = "0.7";
}

function setButtonAble() {
    reapplyButton.disabled = false;
    reapplyButton.style.opacity = "1";
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

// Main update handler
reapplyButton.addEventListener('click', async (event) => {
    event.preventDefault();
    setButtonDisable();
    showLoader();
    
    // Disable all form inputs during submission
    const form = document.getElementById('shopReapplicationForm');
    const inputs = form.querySelectorAll('input, button, textarea, select');
    inputs.forEach(input => input.disabled = true);

    setButtonDisable();

    try {
        // Validate all required fields
        const requiredFields = [
            'shopName', 'shopCategory', 'shopDescription', 'ownerName',
            'ownerPhone', 'shopAddress', 'shopCity', 'shopState',
            'shopZip', 'shopCountry', 'taxId'
        ];

        const errors = [];
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                errors.push(`${fieldId} is required`);
                showFieldError(field, `${fieldId} is required`);
            }
        });

        // Validate phone number format
        const phoneField = document.getElementById('ownerPhone');
        if (phoneField.value.length !== 10 || !/^\d+$/.test(phoneField.value)) {
            errors.push('Invalid phone number');
            showFieldError(phoneField, 'Please enter a valid 10-digit mobile number');
        }

        if (errors.length > 0) {
            showErrorOverlay(errors);
            return;
        }

        // Get current authenticated user
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('User not authenticated. Please sign in again.');
        }

        const shopRef = dbRef(db, `AR_shoe_users/shop/${shop_ID}`);

        // 2. Prepare updated data
        const updatedData = {
            status: 'pending', // Changed from 'reapplied' to 'active'
            lastUpdated: new Date().toISOString(),
            shopName: document.getElementById('shopName').value,
            shopCategory: document.getElementById('shopCategory').value,
            shopDescription: document.getElementById('shopDescription').value,
            yearsInBusiness: document.getElementById('yearsInBusiness').value,
            ownerName: document.getElementById('ownerName').value,
            ownerPhone: document.getElementById('ownerPhone').value,
            shopAddress: document.getElementById('shopAddress').value,
            shopCity: document.getElementById('shopCity').value,
            shopState: document.getElementById('shopState').value,
            shopZip: document.getElementById('shopZip').value,
            shopCountry: document.getElementById('shopCountry').value,
            taxId: document.getElementById('taxId').value
        };


        // Get files (can be null if not changed)
        const permitFile = document.getElementById("permitDocument").files[0] || null;
        const licenseFile = document.getElementById("businessLicense").files[0] || null;
        const frontSideFile = document.getElementById("ownerIdFront").files[0] || null;
        const backSideFile = document.getElementById("ownerIdBack").files[0] || null;

        // Update shop data (without sending verification)
        await update(shopRef, updatedData);
        await deleteUserFiles(shop_ID); // Delete old files if any
        await updateUploadedBothFiles(currentUser.uid, permitFile, licenseFile, frontSideFile, backSideFile);

        showSuccessOverlay("Shop information updated successfully!");
        hideLoader(); // Hide loader before showing success
        showSuccessOverlay("Shop information updated successfully!");

    } catch (error) {
        hideLoader(); // Hide loader if there's an error
        showErrorOverlay([error.message]);
        console.error("Update error:", error);
    } finally {
        setButtonAble();
        inputs.forEach(input => input.disabled = false);
        hideLoader();
    }
});



function updateUploadedBothFiles(shop_ID, permitFile, licenseFile, frontSideFile, backSideFile) {
    // Create unique filenames to avoid overwriting
    const permitRef = storageRef(storage, `uploads/${shop_ID}/permit_${Date.now()}_${permitFile.name}`);
    const licenseRef = storageRef(storage, `uploads/${shop_ID}/license_${Date.now()}_${licenseFile.name}`);
    const frontPicIDRef = storageRef(storage, `uploads/${shop_ID}/frontSide_${Date.now()}_${frontSideFile.name}`);
    const backPicIDRef = storageRef(storage, `uploads/${shop_ID}/backSide_${Date.now()}_${backSideFile.name}`);

    // Upload both files in parallel
    const uploadPermitTask = uploadBytesResumable(permitRef, permitFile);
    const uploadLicenseTask = uploadBytesResumable(licenseRef, licenseFile);
    const uploadFrontTask = uploadBytesResumable(frontPicIDRef, frontSideFile);
    const uploadBackTask = uploadBytesResumable(backPicIDRef, backSideFile);

    // Track progress for both uploads
    uploadPermitTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Permit upload: ${progress.toFixed(2)}%`);
            // Update loader with progress if you want
            document.querySelector('#loadingOverlay p').textContent = 
                `Uploading files... ${progress.toFixed(0)}%`;
        },
        (error) => {
            console.error("Permit upload failed:", error);
        }
    );

    uploadLicenseTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`License upload: ${progress.toFixed(2)}%`);
        },
        (error) => {
            console.error("License upload failed:", error);
        }
    );
    uploadFrontTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Front Picture Side upload: ${progress.toFixed(2)}%`);
        },
        (error) => {
            console.error("Front Picture Side upload failed:", error);
        }
    );

    uploadBackTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Back Picture Side upload: ${progress.toFixed(2)}%`);
        },
        (error) => {
            console.error("Back Picture Side upload failed:", error);
        }
    );

    // Wait for both uploads to complete
    return Promise.all([
        uploadPermitTask.then(() => getDownloadURL(uploadPermitTask.snapshot.ref)),
        uploadLicenseTask.then(() => getDownloadURL(uploadLicenseTask.snapshot.ref)),
        uploadFrontTask.then(() => getDownloadURL(uploadFrontTask.snapshot.ref)),
        uploadBackTask.then(() => getDownloadURL(uploadBackTask.snapshot.ref)),
    ]).then(([permitUrl, licenseUrl, frontPicUrl, backPicUrl]) => {
        // Save both URLs to database
        const data = {
            permitDocument: {
                name: permitFile.name,
                url: permitUrl,
                uploadedAt: new Date().toISOString()
            },
            licensePreview: {
                name: licenseFile.name,
                url: licenseUrl,
                uploadedAt: new Date().toISOString()
            },
            frontSideID:
            {
                name: frontSideFile.name,
                url: frontPicUrl,
                uploadedAt: new Date().toISOString()
            },
            backSideID:
            {
                name: backSideFile.name,
                url: backPicUrl,
                uploadedAt: new Date().toISOString()
            }
        };

        // return set(dbRef(db, 'AR_shoe_users/shop/' + shop_ID + '/uploads'), data);
        return set(dbRef(db, `AR_shoe_users/shop/${shop_ID}/uploads`), data);
    });
}

// Function to delete user files from Storage
async function deleteUserFiles(uid) {
    try {
        const userStorageRef = storageRef(storage, `uploads/${uid}`);
        const files = await listAll(userStorageRef);
        
        // Delete each file
        const deletePromises = files.items.map(fileRef => deleteObject(fileRef));
        await Promise.all(deletePromises);
        
        console.log(`Deleted ${files.items.length} files for user ${uid}`);
    } catch (error) {
        console.error("Error deleting user files:", error);
        throw error;
    }
}

// Utility functions for overlays
function showLoader() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoader() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function showSuccessOverlay(message) {
    document.getElementById('successOverlay').classList.add('active');
    // You can update the message text if you want
}

function showErrorOverlay(errors) {
    const errorContainer = document.getElementById('errorMessages');
    errorContainer.innerHTML = '';
    
    errors.forEach(error => {
        const errorElement = document.createElement('p');
        errorElement.textContent = error;
        errorContainer.appendChild(errorElement);
    });
    
    document.getElementById('errorOverlay').classList.add('active');
}