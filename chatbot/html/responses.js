// Import Firebase modules
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
const chatbotRef = ref(db, 'AR_shoe_users/chatbot/responses');

// DOM Elements
const notification = document.getElementById('notification');
const confirmationDialog = document.getElementById('confirmationDialog');
const overlay = document.getElementById('overlay');
const responseModal = document.getElementById('responseModal');
const modalTitle = document.getElementById('modalTitle');
let currentEditId = null;
let deleteCallback = null;

// Initialize the chatbot manager
function initChatbotManager() {
    setupEventListeners();
    loadResponsesFromFirebase();
    window.openEditLastQuestion = openEditLastQuestion; // Make it globally available
}

// Set up event listeners
function setupEventListeners() {
    document.querySelector('.menu-btn')?.addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('active');
    });

    document.getElementById('openResponseModal')?.addEventListener('click', () => {
        currentEditId = null;
        modalTitle.textContent = 'Add New Response';
        resetModal();
        openModal();
    });

    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
    document.getElementById('cancelModal')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    document.getElementById('clearResponses')?.addEventListener('click', resetTextarea);
    document.getElementById('saveModalResponse')?.addEventListener('click', saveResponseToFirebase);
    document.getElementById('confirmAction')?.addEventListener('click', handleConfirmDelete);
    document.getElementById('cancelAction')?.addEventListener('click', closeConfirmationDialog);
}

// Load responses from Firebase
function loadResponsesFromFirebase() {
    onValue(chatbotRef, (snapshot) => {
        const responses = snapshot.val() || {};
        renderChatbotTable(responses);
    });
}

// Generate a 7-character alphanumeric ID (letters and digits)
function generateCustomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 25; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// Modified save function with custom ID
function saveResponseToFirebase() {
    const keyword = document.getElementById('modalKeyword').value.trim();
    const responsesText = document.getElementById('responseTextarea').value.trim();
    const responsesArray = responsesText.split('\n').filter(Boolean);

    if (!keyword || responsesArray.length === 0) {
        showNotification('Please fill in the keyword and at least one response', 'error');
        return;
    }

    const responseData = {
        keyword,
        responses: responsesArray,
        popularity: 0, // Initialize popularity counter
        lastQuestionSentence: "", // Initialize last question
        timestamp: serverTimestamp()
    };

    if (currentEditId) {
        // Update existing response
        update(ref(db, `AR_shoe_users/chatbot/responses/${currentEditId}`), responseData)
            .then(() => {
                showNotification('Response updated successfully', 'success');
                closeModal();
            })
            .catch((error) => {
                showNotification('Error updating response: ' + error.message, 'error');
            });
    } else {
        // Generate a custom 7-character ID and ensure it's unique
        const newId = generateCustomId();
        const newRef = ref(db, `AR_shoe_users/chatbot/responses/${newId}`);
        get(newRef).then(snapshot => {
            if (snapshot.exists()) {
                showNotification('ID conflict. Please try again.', 'error');
            } else {
                // Save using set() with custom ID
                update(newRef, responseData)
                    .then(() => {
                        showNotification('Response added successfully', 'success');
                        closeModal();
                    })
                    .catch((error) => {
                        showNotification('Error adding response: ' + error.message, 'error');
                    });
            }
        });
    }
}


function openEditLastQuestion(id) {
    get(ref(db, `AR_shoe_users/chatbot/responses/${id}`))
        .then((snapshot) => {
            const response = snapshot.val();
            if (!response) return;

            currentEditId = id;
            modalTitle.textContent = 'Edit Last Question';
            
            // Create modal content specifically for editing last question
            const modalBody = document.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="response-form-group">
                    <label for="editLastQuestion">Last Question:</label>
                    <input type="text" id="editLastQuestion" class="response-input" 
                           value="${response.lastQuestionSentence || ''}">
                </div>
                <div class="modal-actions">
                    <button class="cancel-btn" id="cancelModal">Cancel</button>
                    <button class="approve-btn" id="saveLastQuestion">Save</button>
                </div>
            `;

            // Set up event listeners for the new buttons
            document.getElementById('cancelModal').addEventListener('click', closeModal);
            document.getElementById('saveLastQuestion').addEventListener('click', () => {
                saveLastQuestion(id);
            });

            openModal();
        })
        .catch((error) => {
            showNotification('Error loading response: ' + error.message, 'error');
        });
}

function saveLastQuestion(id) {
    const lastQuestion = document.getElementById('editLastQuestion').value.trim();
    
    if (!lastQuestion) {
        showNotification('Please enter a question', 'error');
        return;
    }

    update(ref(db, `AR_shoe_users/chatbot/responses/${id}`), {
        lastQuestionSentence: lastQuestion
    })
    .then(() => {
        showNotification('Last question updated successfully', 'success');
        closeModal();
    })
    .catch((error) => {
        showNotification('Error updating last question: ' + error.message, 'error');
    });
}

function renderChatbotTable(responses) {
    const tbody = document.getElementById('chatbotTableBody');

    if (!responses || Object.keys(responses).length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--gray-dark)">No responses added yet</td></tr>`;
        return;
    }

    tbody.innerHTML = Object.entries(responses).map(([id, response]) => `
        <tr>
            <td>${id}</td>
            <td>${response.keyword}</td>
            <td class="responseTD">${response.responses.join('<br>')}</td>
            <td>${response.popularity || 0}</td>
            <td class="last-question">
                <div class="last-question-content">
                    ${response.lastQuestionSentence || "Never used"}
                </div>
                <button class="edit-question-btn" onclick="openEditLastQuestion('${id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
            <td>
                <div class="response-actions">
                    <button class="edit-btn" onclick="openEditResponse('${id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-btn" onclick="confirmDelete('${id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Open modal for editing a response
function openEditResponse(id) {
    get(ref(db, `AR_shoe_users/chatbot/responses/${id}`))
        .then((snapshot) => {
            const response = snapshot.val();
            if (!response) return;

            currentEditId = id;
            modalTitle.textContent = 'Edit Response';
            document.getElementById('modalKeyword').value = response.keyword;
            document.getElementById('responseTextarea').value = response.responses.join('\n');
            openModal();
        })
        .catch((error) => {
            showNotification('Error loading response: ' + error.message, 'error');
        });
}

// Confirm deletion of a response
function confirmDelete(id) {
    showConfirmationDialog('Delete this response?', () => {
        remove(ref(db, `AR_shoe_users/chatbot/responses/${id}`))
            .then(() => {
                showNotification('Response deleted', 'success');
            })
            .catch((error) => {
                showNotification('Error deleting response: ' + error.message, 'error');
            });
    });
}

// Modal functions
function openModal() {
    responseModal.classList.add('active');
    overlay.classList.add('show');
}

function closeModal() {
    responseModal.classList.remove('active');
    overlay.classList.remove('show');
}

function resetTextarea() {
    document.getElementById('responseTextarea').value = '';
}

function resetModal() {
    document.getElementById('modalKeyword').value = '';
    document.getElementById('responseTextarea').value = '';
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
window.openEditResponse = openEditResponse;
window.confirmDelete = confirmDelete;

// Initialize chatbot manager when DOM is ready
document.addEventListener('DOMContentLoaded', initChatbotManager);
