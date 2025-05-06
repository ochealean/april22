// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const chatbotResponsesRef = ref(db, 'AR_shoe_users/chatbot/responses');

// DOM Elements
const inputField = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
let faqResponses = {
    "default": `<div class="troubleshooting-section">
        I'm sorry, I couldn't find an answer to that question. Here are some topics I can help with:<br><br>
        <strong>Features:</strong><br>
        - AR virtual try-on experience<br>
        - Shoe customization options<br>
        - Product information<br><br>
        <strong>Orders:</strong><br>
        - Sizing guide<br>
        - Shipping information<br>
        - Returns & exchanges<br>
        - Payment methods<br><br>
        <strong>Help:</strong><br>
        - Order issues<br>
        - Product problems<br>
        - Website troubleshooting<br><br>
        Try asking about one of these topics or click the quick questions above!
        </div>`
};

// Load responses from Firebase
function loadResponsesFromFirebase() {
    onValue(chatbotResponsesRef, (snapshot) => {
        const responses = snapshot.val();
        if (responses) {
            // Convert Firebase responses to our format
            faqResponses = Object.entries(responses).reduce((acc, [id, response]) => {
                acc[response.keyword.toLowerCase()] = response.responses.join('<br>');
                return acc;
            }, {});
            
            // Keep the default response
            faqResponses["default"] = faqResponses["default"] || `<div class="troubleshooting-section">
                I'm sorry, I couldn't find an answer to that question. Please try another question.
                </div>`;
        }
    });
}

// Initialize the chatbot
function initChatbot() {
    loadResponsesFromFirebase();
    setupEventListeners();
    
    // Initial greeting
    setTimeout(() => {
        displayMessage('bot', `Welcome to SmartFit's Help Center! 👟<br><br>I can help you with:<br><strong>Features:</strong> AR try-on, Customization, Products<br><strong>Orders:</strong> Shipping, Returns, Payments<br><strong>Help:</strong> Issues, Problems, Troubleshooting<br><br>Try asking about our services or click any quick question above!`);
    }, 1000);
}

// Set up event listeners
function setupEventListeners() {
    // Send message when Enter is pressed or button clicked
    inputField.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    sendButton.addEventListener('click', sendMessage);
    
    // Quick question buttons
    document.querySelectorAll('.quick-questions button').forEach(button => {
        button.addEventListener('click', function() {
            const question = this.textContent;
            askQuestion(question);
        });
    });
}

// Ask a question
function askQuestion(question) {
    const keyword = question.toLowerCase();
    displayMessage('user', question);
    
    // Simulate typing delay
    setTimeout(() => {
        const response = faqResponses[keyword] || faqResponses.default;
        displayMessage('bot', response);
    }, 500);
}

// Send a message
function sendMessage() {
    const userInput = inputField.value.trim();
    if (!userInput) return;
    
    displayMessage('user', userInput);
    inputField.value = '';
    
    // Find best matching response
    let response = faqResponses.default;
    const lowerInput = userInput.toLowerCase();
    
    // Check for exact matches first
    for (const [key, answer] of Object.entries(faqResponses)) {
        if (lowerInput.includes(key)) {
            response = answer;
            break;
        }
    }
    
    // Simulate typing delay
    setTimeout(() => {
        displayMessage('bot', response);
    }, 500);
}

// Display a message in the chat
function displayMessage(sender, message) {
    const chatDiv = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender + '-message';
    msgDiv.innerHTML = message;
    chatDiv.appendChild(msgDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Make functions available globally
window.askQuestion = askQuestion;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initChatbot);
