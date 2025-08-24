import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable,getDownloadURL} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase configuration (I got this from my Firebase project settings)
const firebaseConfig = {
  apiKey: "AIzaSyAuPALylh11cTArigeGJZmLwrFwoAsNPSI",
  authDomain: "opportunity-9d3bf.firebaseapp.com",
  databaseURL: "https://opportunity-9d3bf-default-rtdb.firebaseio.com",
  projectId: "opportunity-9d3bf",
  storageBucket: "opportunity-9d3bf.firebasestorage.app",
  messagingSenderId: "57906230058",
  appId: "1:57906230058:web:2d7cd9cc68354722536453"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// Helper function to get DOM elements
function getElement(id) {
  return document.getElementById(id);
}

// Main registration function
async function registerUser() {
  // Get form values
  const email = getElement("email").value;
  const password = getElement("password").value;
  const confirmPassword = getElement("confirmPassword").value;
  const username = getElement("username").value;
  const profilePhoto = getElement("profilePhoto").files[0];
  
  // Simple password validation
  if (password !== confirmPassword) {
    alert("Oops! Your passwords don't match. Please try again.");
    return;
  }
  
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Set username
    await updateProfile(user, {
      displayName: username
    });
    
    // Send verification email
    await sendEmailVerification(user);
    alert("We've sent a verification email. Please check your inbox!");
    
    // Prepare user data for database
    const userData = {
      username: username,
      email: email,
      status: "active",
      dateAccountCreated: new Date().toLocaleDateString(),
      firstName: getElement("firstName").value,
      lastName: getElement("lastName").value,
      phone: getElement("phone").value,
      gender: getSelectedGender(),
      birthday: getElement("birthDate").value,
      address: getElement("address").value,
      city: getElement("city").value,
      state: getElement("state").value,
      zip: getElement("zip").value,
      country: getElement("country").value
    };
    
    // Save user data to database
    const userRef = ref(database, `AR_shoe_users/customer/${user.uid}`);
    await set(userRef, userData);
    
    // Upload profile photo if provided
    if (profilePhoto) {
      await uploadProfilePhoto(user.uid, profilePhoto);
    }
    
    // Redirect to login page after successful registration
    // window.location.href = "/user_login.html";
    alert("Registration successful! Verify your email first to log in.");
    
  } catch (error) {
    console.error("Registration error:", error);
    alert(`Registration failed: ${error.message}`);
  }
}

// Helper function to get selected gender from radio buttons
function getSelectedGender() {
  const selectedGender = document.querySelector('input[name="gender"]:checked');
  return selectedGender ? selectedGender.value : "not specified";
}

// Function to upload profile photo to Firebase Storage
async function uploadProfilePhoto(userId, photoFile) {
  try {
    // Create reference to storage location
    const photoStorageRef = storageRef(storage, `customerProfile/${userId}/profile_${Date.now()}_${photoFile.name}`);
    
    // Start upload
    const uploadTask = uploadBytesResumable(photoStorageRef, photoFile);
    
    // Track upload progress
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Upload is ${progress.toFixed(0)}% complete`);
      },
      (error) => {
        console.error("Photo upload error:", error);
      }
    );
    
    // Wait for upload to complete
    await uploadTask;
    
    // Get download URL
    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
    
    // Save photo info to database
    const photoData = {
      profilePhoto: {
        name: photoFile.name,
        url: downloadURL,
        uploadedAt: new Date().toLocaleString()
      }
    };
    
    const photoRef = ref(database, `AR_shoe_users/customer/${userId}/profilePhoto`);
    await set(photoRef, photoData);
    
  } catch (error) {
    console.error("Error handling profile photo:", error);
  }
}

// Event listener for registration button
const registerButton = getElement("registerButton");
registerButton.addEventListener("click", (e) => {
  e.preventDefault();
  registerUser();
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