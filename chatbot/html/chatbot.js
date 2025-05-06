import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";

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
const db = getDatabase(app);
const chatbotResponsesRef = ref(db, 'AR_shoe_users/chatbot/responses');

// DOM Elements
const inputField = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');

let faqResponses = {
    default: createDefaultResponse()
};

function createDefaultResponse() {
    return `<div class="troubleshooting-section">
        I'm sorry, I couldn't find an answer to that question. Here are some topics I can help with:<br><br>
        <strong>Features:</strong> AR try-on, Customization, Products<br>
        <strong>Orders:</strong> Shipping, Returns, Payments<br>
        <strong>Help:</strong> Issues, Problems, Troubleshooting<br><br>
        Try asking about one of these topics or click any quick question above!
        </div>`;
}

function loadResponsesFromFirebase() {
    onValue(chatbotResponsesRef, (snapshot) => {
        const responses = snapshot.val() || {};
        
        // Transform the Firebase data into our FAQ format
        faqResponses = Object.values(responses).reduce((acc, response) => {
            if (response.keyword && response.responses) {
                const keyword = response.keyword.toLowerCase();
                acc[keyword] = Array.isArray(response.responses) 
                    ? response.responses.join('<br>')
                    : response.responses;
            }
            return acc;
        }, {});
        
        // Ensure we always have a default response
        faqResponses.default = faqResponses.default || createDefaultResponse();
        
        console.log("Loaded responses:", faqResponses); // Debug logging
    }, (error) => {
        console.error("Error loading responses:", error);
    });
}

function getBestResponse(input) {
    const lowerInput = input.toLowerCase().trim();
    
    // 1. Check for exact keyword match
    if (faqResponses[lowerInput]) {
        return faqResponses[lowerInput];
    }
    
    // 2. Check for partial matches
    const matchingKey = Object.keys(faqResponses).find(key => 
        key !== 'default' && lowerInput.includes(key)
    );
    
    return matchingKey ? faqResponses[matchingKey] : faqResponses.default;
}

function displayMessage(sender, message) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `${sender}-message`;
    msgDiv.innerHTML = message;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const userInput = inputField.value.trim();
    if (!userInput) return;
    
    displayMessage('user', userInput);
    inputField.value = '';
    
    setTimeout(() => {
        const response = getBestResponse(userInput);
        displayMessage('bot', response);
    }, 500);
}

function askQuestion(question) {
    displayMessage('user', question);
    
    setTimeout(() => {
        const response = getBestResponse(question);
        displayMessage('bot', response);
    }, 500);
}

function setupEventListeners() {
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    sendButton.addEventListener('click', sendMessage);
    
    // Setup quick question buttons
    document.querySelectorAll('.quick-questions button').forEach(button => {
        button.addEventListener('click', () => {
            askQuestion(button.textContent);
        });
    });
}

function initChatbot() {
    loadResponsesFromFirebase();
    setupEventListeners();
    
    // Initial greeting after short delay
    setTimeout(() => {
        displayMessage('bot', `Welcome to SmartFit's Help Center! 👟<br><br>
            How can I assist you today? Try asking about:<br>
            - AR shoe try-on<br>
            - Order status<br>
            - Returns policy<br>
            - Product customization`);
    }, 1000);
}

// Make functions available globally if needed
window.askQuestion = askQuestion;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initChatbot);