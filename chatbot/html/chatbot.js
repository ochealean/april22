import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, get, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
const chatbotResponsesRef = ref(db, 'AR_shoe_users/chatbot/responses');

// Backend server URL for ChatGPT API
const BackendServer = 'https://github-chat-backend.onrender.com/api/chat';

// DOM Elements
const inputField = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');
const quickQuestionsContainer = document.querySelector('.quick-questions .question-categories');

let faqResponses = {};
let responseKeys = {};

// Chat messages array
let messages = [
    { 
        role: "system", 
        content: "You are a helpful assistant for SmartFit Shoes. Help customers with:" +
                "\n- AR shoe try-on features" +
                "\n- Product customization options" +
                "\n- Order status and shipping" +
                "\n- Returns and exchanges" +
                "\n- Product information and sizing" +
                "\n\nAlways be polite, helpful, and provide detailed answers."
    }
];

// Quick questions data
const quickQuestions = {
    "Features": [
        "How does the AR try-on work?",
        "Can I customize my shoes?",
        "What products do you offer?"
    ],
    "Orders": [
        "What are my shipping options?",
        "How do returns work?",
        "What payment methods do you accept?"
    ],
    "Help": [
        "I have an issue with my order",
        "My product has a problem",
        "I need sizing help"
    ]
};

function createDefaultResponse() {
    return `<div class="troubleshooting-section">
        I'm sorry, I couldn't find an answer to that question. Here are some topics I can help with:
        Features: AR try-on, Customization, Products
        Orders: Shipping, Returns, Payments
        Help: Issues, Problems, Troubleshooting
        Try asking about one of these topics or click any quick question above!
        </div>`;
}

// Initialize the chatbot
async function initChatbot() {
    await loadResponsesFromFirebase(); // Wait for Firebase data to load
    setupEventListeners();
    updateQuickQuestions();

    // Show welcome message after a short delay
    setTimeout(() => {
        addMessageToChat('assistant', `Welcome to SmartFit's Help Center! 👟
            How can I assist you today? Try asking about:<br>
            - AR shoe try-on
            - Order status
            - Returns policy
            - Product customization`);
    }, 1000);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        get(ref(db, `AR_shoe_users/customer/${user.uid}`))
            .then((snapshot) => {
                if (!snapshot.exists()) {
                    alert("Account does not exist");
                    auth.signOut();
                }
            });
    } else {
        window.location.href = "/user_login.html";
    }
});


function loadResponsesFromFirebase() {
    return new Promise((resolve) => {
        onValue(chatbotResponsesRef, (snapshot) => {
            const responses = snapshot.val() || {};
            
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
                        lastQuestionSentence: response.lastQuestionSentence || response.keyword,
                        category: response.category || 'general'
                    };
                }
                return acc;
            }, {});
            
            faqResponses.default = {
                response: createDefaultResponse(),
                firebaseKey: null,
                popularity: 0,
                lastQuestionSentence: "Help topics",
                category: 'general'
            };
            
            updateQuickQuestions();
            resolve(); // Resolve the promise when data is loaded
            
        }, (error) => {
            console.error("Error loading responses:", error);
            resolve(); // Still resolve even if there's an error
        });
    });
}

// Get the best response from Firebase or AI
async function askQuestion(question) {
    // First check Firebase for a response
    const firebaseResponse = getBestResponse(question);
    
    if (firebaseResponse && firebaseResponse !== faqResponses.default.response) {
        // If found in Firebase, use that
        addMessageToChat('user', question);
        addMessageToChat('assistant', firebaseResponse);
    } else {
        // If not found, use AI
        addMessageToChat("user", question);
        messages.push({ role: "user", content: question });
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.id = "typing-indicator";
        typingIndicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <span>Assistant is typing</span>
                <div class="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                </div>
            </div>
        `;
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const response = await fetch(BackendServer, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages })
            });
            
            const data = await response.json();
            
            // Remove typing indicator
            chatMessages.removeChild(typingIndicator);
            
            // Add assistant response
            addMessageToChat("assistant", data.response);
            messages.push({ role: "assistant", content: data.response });
            
        } catch (error) {
            console.error("Error:", error);
            chatMessages.removeChild(typingIndicator);
            addMessageToChat("assistant", firebaseResponse); // Fallback to default Firebase response
        }
    }
}

function updateQuickQuestions() {
    quickQuestionsContainer.innerHTML = '';

    for (const [category, questions] of Object.entries(quickQuestions)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';

        const header = document.createElement('h4');
        header.textContent = category;
        categoryDiv.appendChild(header);

        questions.forEach(question => {
            const button = document.createElement('button');
            button.textContent = question;
            button.addEventListener('click', () => askQuestion(question));
            categoryDiv.appendChild(button);
        });

        quickQuestionsContainer.appendChild(categoryDiv);
    }
}

function createQuestionCategory(title, questions) {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category';
    
    const header = document.createElement('h4');
    header.textContent = title;
    categoryDiv.appendChild(header);
    
    questions.forEach(response => {
        const button = createQuestionButton(response.lastQuestionSentence);
        categoryDiv.appendChild(button);
    });
    
    return categoryDiv;
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
    if (!faqResponses || Object.keys(faqResponses).length === 0) {
        return createDefaultResponse();
    }

    const lowerInput = input.toLowerCase().trim();
    
    if (faqResponses[lowerInput]) {
        updateResponseUsage(faqResponses[lowerInput].firebaseKey, input);
        return faqResponses[lowerInput].response;
    }
    
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
    if (!responseKey) return;
    
    const responseRef = ref(db, `AR_shoe_users/chatbot/responses/${responseKey}`);
    get(responseRef).then((snapshot) => {
        const response = snapshot.val();
        if (response) {
            const currentPopularity = response.popularity || 0;
            update(responseRef, {
                popularity: currentPopularity + 1,
                lastQuestionSentence: question
            }).then(() => {
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

// Send message to ChatGPT API
async function sendMessage() {
    const userMessage = inputField.value.trim();
    if (!userMessage) return;

    // First check if we have a Firebase response
    const firebaseResponse = getBestResponse(userMessage);
    
    if (firebaseResponse && firebaseResponse !== faqResponses.default.response) {
        // If found in Firebase, use that
        addMessageToChat('user', userMessage);
        addMessageToChat('assistant', firebaseResponse);
        inputField.value = '';
    } else {
        // If not found, use AI
        addMessageToChat("user", userMessage);
        messages.push({ role: "user", content: userMessage });
        inputField.value = '';

        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.id = "typing-indicator";
        typingIndicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <span>Assistant is typing</span>
                <div class="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                </div>
            </div>
        `;
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const response = await fetch(BackendServer, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages })
            });
            
            const data = await response.json();
            
            // Remove typing indicator
            chatMessages.removeChild(typingIndicator);
            
            // Add assistant response
            addMessageToChat("assistant", data.response);
            messages.push({ role: "assistant", content: data.response });
            
        } catch (error) {
            console.error("Error:", error);
            chatMessages.removeChild(typingIndicator);
            addMessageToChat("assistant", firebaseResponse); // Fallback to default Firebase response
        }
    }
}


// Set up event listeners
function setupEventListeners() {
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    sendButton.addEventListener('click', sendMessage);

    document.getElementById('logout_btn').addEventListener('click', () => {
        auth.signOut().then(() => {
            console.log("User signed out");
        }).catch((error) => {
            console.error("Error signing out: ", error);
        });
    });
}


document.getElementById('logout_btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log("User signed out");
    }).catch((error) => {
        console.error("Error signing out: ", error);
    });
});

// Format message text with bold support and prevent XSS
function formatMessageText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function addMessageToChat(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');
    contentWrapper.innerHTML = formatMessageText(content);
    
    messageDiv.appendChild(contentWrapper);
    chatMessages.appendChild(messageDiv);
    
    // Animation effects
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
    messageDiv.style.transition = 'all 0.3s ease-out';
    
    setTimeout(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }, 10);
}

window.askQuestion = askQuestion;
document.addEventListener('DOMContentLoaded', initChatbot);