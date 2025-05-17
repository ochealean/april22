import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const orderID = urlParams.get('orderID');
const userID = urlParams.get('userID');

// Initialize the page when auth state changes
onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed:', user);
    console.log('USER UID:', user.uid);
    console.log('Order ID:', orderID);
    console.log('User ID:', userID);
    if (user && user.uid === userID) {
        loadUserProfile(user);
        initializePage();
    } else {
        // window.location.href = "/user_login.html";
    }
});

function loadUserProfile(user) {
    try {
        document.getElementById('userName_display2').textContent = user.displayName || 'User';
        const placeholderSVG = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23e0e0e0'/%3E%3Ctext x='50%' y='50%' font-family='Arial' font-size='16' fill='%23000' text-anchor='middle' dominant-baseline='middle'%3EUser%3C/text%3E%3C/svg%3E";
        document.getElementById('imageProfile').src = user.photoURL || placeholderSVG;
        document.getElementById('orderIdDisplay').textContent = orderID ? orderID.substring(0, 8).toUpperCase() : 'N/A';
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

async function uploadFile(file, path) {
    try {
        const fileRef = storageRef(storage, path);
        
        // Create upload task with uploadBytesResumable
        const uploadTask = uploadBytesResumable(fileRef, file);
        
        // Track upload progress
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload is ${progress.toFixed(0)}% complete`);
                // You can update UI with progress here if needed
                // document.getElementById('uploadProgress').textContent = `Uploading: ${progress.toFixed(0)}%`;
            },
            (error) => {
                console.error('Upload error:', error);
                throw error;
            }
        );
        
        // Wait for upload to complete
        await uploadTask;
        
        // Get download URL
        return await getDownloadURL(uploadTask.snapshot.ref);
        
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

function initializePage() {
    // Handle photo upload preview
    const issuePhotosInput = document.getElementById('issuePhotos');
    if (issuePhotosInput) {
        issuePhotosInput.addEventListener('change', function(e) {
            const preview = document.getElementById('photoPreview');
            if (!preview) return;
            
            preview.innerHTML = '';
            
            if (this.files) {
                Array.from(this.files).forEach(file => {
                    if (!file.type.startsWith('image/')) return;
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.classList.add('preview-thumbnail');
                        preview.appendChild(img);
                    }
                    reader.onerror = () => console.error('Error reading file');
                    reader.readAsDataURL(file);
                });
            }
        });
    }

    // Handle form submission
    const form = document.getElementById('issueReportForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!orderID || !userID) {
                alert('Missing order or user information');
                return;
            }
            
            const issueType = document.getElementById('issueType')?.value;
            const description = document.getElementById('issueDescription')?.value;
            const files = document.getElementById('issuePhotos')?.files || [];
            
            try {
                // Show loading state
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Uploading...';
                
                // Upload photos if any
                let photoURLs = [];
                if (files.length > 0) {
                    photoURLs = await Promise.all(
                        Array.from(files).map(async (file) => {
                            const path = `issue_reports/${userID}/${orderID}/${Date.now()}_${file.name}`;
                            return await uploadFile(file, path);
                        })
                    );
                }
                
                // Create report in database
                const reportRef = push(ref(db, 'AR_shoe_users/issueReports'));
                await set(reportRef, {
                    orderID,
                    userID,
                    issueType,
                    description,
                    photoURLs,
                    status: 'pending',
                    timestamp: Date.now(),
                    resolved: false
                });
                
                alert('Issue report submitted successfully! Our team will review it shortly.');
                window.location.href = `/customer/html/orders.html`;
            } catch (error) {
                console.error('Error submitting report:', error);
                alert('Failed to submit report. Please try again. Error: ' + error.message);
            } finally {
                // Reset button state
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        });
    }

    // Logout functionality
    document.getElementById('logout_btn')?.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("User signed out");
        }).catch((error) => {
            console.error("Error signing out: ", error);
        });
    });
}