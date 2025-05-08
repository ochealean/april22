import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, get, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";

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
const quickQuestionsContainer = document.querySelector('.quick-questions .question-categories');

let faqResponses = {};
let responseKeys = {}; // Store both the response data and their Firebase keys

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
        
        // Store both the data and keys
        responseKeys = responses;
        faqResponses = Object.entries(responses).reduce((acc, [key, response]) => {
            if (response.keyword && response.responses) {
                const keyword = response.keyword.toLowerCase();
                acc[keyword] = {
                    response: Array.isArray(response.responses) 
                        ? response.responses.join('<br>')
                        : response.responses,
                    firebaseKey: key,
                    popularity: response.popularity || 0,
                    lastQuestionSentence: response.lastQuestionSentence || response.keyword
                };
            }
            return acc;
        }, {});
        
        // Ensure we always have a default response
        faqResponses.default = {
            response: createDefaultResponse(),
            firebaseKey: null,
            popularity: 0,
            lastQuestionSentence: "Help topics"
        };
        
        // Update popular questions display
        updatePopularQuestions();
        
    }, (error) => {
        console.error("Error loading responses:", error);
    });
}

function updatePopularQuestions() {
    // Clear existing questions
    quickQuestionsContainer.innerHTML = '';
    
    // Create a container for popular questions
    const popularQuestionsDiv = document.createElement('div');
    popularQuestionsDiv.className = 'popular-questions';
    
    // Create header
    const header = document.createElement('h4');
    header.textContent = 'Popular Questions';
    popularQuestionsDiv.appendChild(header);
    
    // Get all responses as array and sort by popularity (descending)
    const responsesArray = Object.values(faqResponses)
        .filter(response => response.lastQuestionSentence && response.popularity > 0)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 10); // Limit to top 10
    
    if (responsesArray.length === 0) {
        // If no popular questions yet, show some default suggestions
        const defaultQuestions = [
            "How does the AR try-on work?",
            "What are my shipping options?",
            "How do returns work?",
            "Can I customize my shoes?"
        ];
        
        defaultQuestions.forEach(question => {
            const button = createQuestionButton(question);
            popularQuestionsDiv.appendChild(button);
        });
    } else {
        // Add the popular questions
        responsesArray.forEach(response => {
            const button = createQuestionButton(response.lastQuestionSentence);
            popularQuestionsDiv.appendChild(button);
        });
    }
    
    quickQuestionsContainer.appendChild(popularQuestionsDiv);
}

function createQuestionButton(question) {
    const button = document.createElement('button');
    button.textContent = question;
    button.addEventListener('click', () => {
        askQuestion(question);
    });
    return button;
}

function getBestResponse(input) {
    const lowerInput = input.toLowerCase().trim();
    
    // 1. Check for exact keyword match
    if (faqResponses[lowerInput]) {
        updateResponseUsage(faqResponses[lowerInput].firebaseKey, input);
        return faqResponses[lowerInput].response;
    }
    
    // 2. Check for partial matches
    const matchingKey = Object.keys(faqResponses).find(key => 
        key !== 'default' && lowerInput.includes(key)
    );
    
    if (matchingKey) {
        updateResponseUsage(faqResponses[matchingKey].firebaseKey, input);
        return faqResponses[matchingKey].response;
    }
    
    return faqResponses.default.response;
}

function updateResponseUsage(responseKey, question) {
    if (!responseKey) return; // Skip if no valid key (like for default response)
    
    const responseRef = ref(db, `AR_shoe_users/chatbot/responses/${responseKey}`);
    get(responseRef).then((snapshot) => {
        const response = snapshot.val();
        if (response) {
            const currentPopularity = response.popularity || 0;
            update(responseRef, {
                popularity: currentPopularity + 1,
                lastQuestionSentence: question // Store the last question asked
            }).then(() => {
                // Refresh popular questions after update
                loadResponsesFromFirebase();
            }).catch(error => {
                console.error("Error updating response usage:", error);
            });
        }
    });
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