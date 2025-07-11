import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, onValue, query, orderByChild, set } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getDatabase(app);

// ito ay kapag may nagtype ng url papuntang dashboard kahit di naka login
// document.body.style.display = 'none';

// Initialize the page when auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in:", user);
    } else {
        // window.location.href = "/user_login.html";
    }
});


// macmac internal js code
window.addEventListener('load', function() {
            setTimeout(function() {
                document.querySelector('.page-loader').style.opacity = '0';
                setTimeout(function() {
                    document.querySelector('.page-loader').style.display = 'none';
                }, 500);
            }, 100000); // Adjust timing as needed
        });

        // sidebar toggle for mobile view
        document.addEventListener('DOMContentLoaded', function() {
            const mobileToggle = document.querySelector('.mobile-menu-toggle');
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            
            mobileToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            });
            
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        });

        // Sample JavaScript to handle modal interactions
        document.addEventListener('DOMContentLoaded', function() {
            // Get modal elements
            const orderModal = document.getElementById('orderModal');
            const rejectModal = document.getElementById('rejectModal');
            const viewButtons = document.querySelectorAll('.btn-view');
            const closeButtons = document.querySelectorAll('.close-modal');
            const rejectOrderBtn = document.getElementById('rejectOrderBtn');
            const cancelRejectBtn = document.getElementById('cancelRejectBtn');
            
            // Open order modal when view buttons are clicked
            viewButtons.forEach(button => {
                button.addEventListener('click', () => {
                    orderModal.style.display = 'block';
                });
            });
            
            // Close modals when close buttons are clicked
            closeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    orderModal.style.display = 'none';
                    rejectModal.style.display = 'none';
                });
            });
            
            // Open reject modal when reject button is clicked
            rejectOrderBtn.addEventListener('click', () => {
                orderModal.style.display = 'none';
                rejectModal.style.display = 'block';
            });
            
            // Cancel reject and return to order modal
            cancelRejectBtn.addEventListener('click', () => {
                rejectModal.style.display = 'none';
                orderModal.style.display = 'block';
            });
            
            // Close modals when clicking outside
            window.addEventListener('click', (event) => {
                if (event.target === orderModal) {
                    orderModal.style.display = 'none';
                }
                if (event.target === rejectModal) {
                    rejectModal.style.display = 'none';
                }
            });
        });