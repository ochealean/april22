import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, get, update, push, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase configuration
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

// Initialize Firebase app and services
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const curseWordsRef = ref(db, 'AR_shoe_users/curseWords');

// DOM Elements
const notification = document.getElementById('notification');
const confirmationDialog = document.getElementById('confirmationDialog');
const overlay = document.getElementById('overlay');
const wordModal = document.getElementById('wordModal');
const modalTitle = document.getElementById('modalTitle');
let currentEditId = null;
let deleteCallback = null;

// Initialize the censored words manager
function initCensoredWordsManager() {
    setupEventListeners();
    loadWordsFromFirebase();
}

// Set up event listeners
function setupEventListeners() {
    document.querySelector('.menu-btn')?.addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('active');
    });

    document.getElementById('openWordModal')?.addEventListener('click', () => {
        currentEditId = null;
        modalTitle.textContent = 'Add New Censored Word';
        resetModal();
        openModal();
    });

    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
    document.getElementById('cancelModal')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    document.getElementById('saveWord')?.addEventListener('click', saveWordToFirebase);
    document.getElementById('confirmAction')?.addEventListener('click', handleConfirmDelete);
    document.getElementById('cancelAction')?.addEventListener('click', closeConfirmationDialog);
}

// Load words from Firebase
function loadWordsFromFirebase() {
    onValue(curseWordsRef, (snapshot) => {
        const words = snapshot.val() || {};
        renderWordsTable(words);
    });
}

// Generate a custom ID
function generateCustomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 25; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// Save word to Firebase
function saveWordToFirebase() {
    const saveBtn = document.getElementById('saveWord');
    saveBtn.disabled = true;
    
    const word = document.getElementById('wordInput').value.trim();
    const severity = document.getElementById('severitySelect').value;

    if (!word) {
        showNotification('Please enter a word to censor', 'error');
        saveBtn.disabled = false;
        return;
    }

    const wordData = {
        word,
        severity,
        dateAdded: serverTimestamp()
    };

    if (currentEditId) {
        // Update existing word
        update(ref(db, `AR_shoe_users/curseWords/${currentEditId}`), wordData)
            .then(() => {
                showNotification('Word updated successfully', 'success');
                closeModal();
            })
            .catch((error) => {
                showNotification('Error updating word: ' + error.message, 'error');
            })
            .finally(() => {
                saveBtn.disabled = false;
            });
    } else {
        // Add new word
        const newId = generateCustomId();
        const newRef = ref(db, `AR_shoe_users/curseWords/${newId}`);
        
        get(newRef).then(snapshot => {
            if (snapshot.exists()) {
                showNotification('ID conflict. Please try again.', 'error');
                saveBtn.disabled = false;
            } else {
                return update(newRef, wordData)
                    .then(() => {
                        showNotification('Word added successfully', 'success');
                        closeModal();
                    })
                    .catch((error) => {
                        showNotification('Error adding word: ' + error.message, 'error');
                    })
                    .finally(() => {
                        saveBtn.disabled = false;
                    });
            }
        });
    }
}

// Render words table
function renderWordsTable(words) {
    const tbody = document.getElementById('wordsTableBody');
    tbody.innerHTML = '';

    if (!words || Object.keys(words).length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--gray-dark)">No censored words added yet</td></tr>`;
        return;
    }

    tbody.innerHTML = Object.entries(words).map(([id, wordData]) => {
        // Format date
        let dateAdded = 'Unknown';
        if (wordData.dateAdded) {
            const date = new Date(wordData.dateAdded);
            if (!isNaN(date.getTime())) {
                dateAdded = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            }
        }

        return `
            <tr>
                <td>${id}</td>
                <td>${wordData.word}</td>
                <td>
                    <span class="severity-badge ${wordData.severity}">
                        ${wordData.severity.charAt(0).toUpperCase() + wordData.severity.slice(1)}
                    </span>
                </td>
                <td>${dateAdded}</td>
                <td>
                    <div class="word-actions">
                        <button class="edit-btn" onclick="openEditWord('${id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-btn" onclick="confirmDelete('${id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Open modal for editing a word
function openEditWord(id) {
    get(ref(db, `AR_shoe_users/curseWords/${id}`))
        .then((snapshot) => {
            const wordData = snapshot.val();
            if (!wordData) return;

            currentEditId = id;
            modalTitle.textContent = 'Edit Censored Word';
            
            document.getElementById('wordInput').value = wordData.word;
            document.getElementById('severitySelect').value = wordData.severity || 'low';
            
            openModal();
        })
        .catch((error) => {
            showNotification('Error loading word: ' + error.message, 'error');
        });
}

// Confirm deletion of a word
function confirmDelete(id) {
    showConfirmationDialog('Delete this censored word?', () => {
        remove(ref(db, `AR_shoe_users/curseWords/${id}`))
            .then(() => {
                showNotification('Word deleted', 'success');
            })
            .catch((error) => {
                showNotification('Error deleting word: ' + error.message, 'error');
            });
    });
}

// Modal functions
function openModal() {
    wordModal.classList.add('active');
    overlay.classList.add('show');
}

function closeModal() {
    wordModal.classList.remove('active');
    overlay.classList.remove('show');
}

function resetModal() {
    document.getElementById('wordInput').value = '';
    document.getElementById('severitySelect').value = 'low';
}

// Confirmation dialog functions
function handleConfirmDelete() {
    deleteCallback?.();
    closeConfirmationDialog();
}

function showConfirmationDialog(message, callback) {
    document.getElementById('dialogMessage').textContent = message;
    confirmationDialog.classList.add('show');
    overlay.classList.add('show');
    deleteCallback = callback;
}

function closeConfirmationDialog() {
    confirmationDialog.classList.remove('show');
    overlay.classList.remove('show');
}

// Notification function
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => notification.classList.remove('show'), 3000);
}

// Make functions globally accessible
window.openEditWord = openEditWord;
window.confirmDelete = confirmDelete;

// Initialize censored words manager when DOM is ready
document.addEventListener('DOMContentLoaded', initCensoredWordsManager);