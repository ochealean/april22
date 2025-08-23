import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Initialize Firebase
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
const db = getDatabase(app);
const auth = getAuth(app);

// Global variables
let currentModel = 'classic';
let basePrice = 2499;
let baseDays = 7;
let selectedSize = 5;
let currentUserId = null;

// Initialize selections
let selections = {
    classic: {
        bodyColor: 'white',
        laces: {
            id: 'Standard',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x20?text=Classic+Laces+1',
            color: 'white'
        },
        insole: {
            id: 'Foam',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x20?text=Classic+Insole+1'
        }
    },
    runner: {
        bodyColor: 'white',
        laces: {
            id: 'Standard',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x20?text=Runner+Laces+1',
            color: 'white'
        },
        insole: {
            id: 'Foam',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x20?text=Runner+Insole+1'
        }
    },
    basketball: {
        bodyColor: 'white',
        laces: {
            id: 'Standard',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x20?text=Basketball+Laces+1',
            color: 'white'
        },
        insole: {
            id: 'Foam',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x20?text=Basketball+Insole+1'
        }
    }
};

// Check URL parameters for model selection
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const modelParam = urlParams.get('model')?.toLowerCase();

    const modelMap = {
        'classic': 'classic',
        'runner': 'runner',
        'basketball': 'basketball'
    };

    let modelToSelect = 'classic';
    
    if (modelParam && modelMap[modelParam]) {
        modelToSelect = modelMap[modelParam];
    }

    const modelOption = document.querySelector(`.model-option[data-model="${modelToSelect}"]`);
    if (modelOption) {
        modelOption.click();
    } else {
        document.querySelector('.model-option[data-model="classic"]').click();
    }
}

// Get current user ID
function getCurrentUserId() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUserId = user.uid;
                resolve(user.uid);
            } else {
                reject('No user logged in');
            }
        });
    });
}

// Update the shoe preview and summary
function updatePreview() {
    // Calculate totals
    let customizationPrice = 0;
    let maxDays = 0;

    if (currentModel === 'classic') {
        customizationPrice = selections.classic.laces.price + selections.classic.insole.price;
        maxDays = Math.max(selections.classic.laces.days, selections.classic.insole.days);
    }
    else if (currentModel === 'runner') {
        customizationPrice = selections.runner.laces.price + selections.runner.insole.price;
        maxDays = Math.max(selections.runner.laces.days, selections.runner.insole.days);
    }
    else if (currentModel === 'basketball') {
        customizationPrice = selections.basketball.laces.price + selections.basketball.insole.price;
        maxDays = Math.max(selections.basketball.laces.days, selections.basketball.insole.days);
    }

    const totalDays = baseDays + maxDays;
    const totalPrice = basePrice + customizationPrice;

    // Update summary
    document.getElementById('basePrice').textContent = `₱${basePrice.toFixed(2)}`;
    document.getElementById('customizationPrice').textContent = `+₱${customizationPrice.toFixed(2)}`;
    document.getElementById('productionTime').textContent = `${totalDays}-${totalDays + 3} days`;
    document.getElementById('totalPrice').textContent = `₱${totalPrice.toFixed(2)}`;
}

// Setup insole options
function setupInsoleOptions(model) {
    const optionsContainer = document.getElementById(`${model}InsoleOptions`);
    if (!optionsContainer) return;
    
    const options = optionsContainer.querySelectorAll('.component-option');
    options.forEach(option => {
        option.addEventListener('click', function () {
            options.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selections[model].insole = {
                id: this.dataset.id,
                price: parseFloat(this.dataset.price),
                days: parseInt(this.dataset.days),
                image: this.dataset.image
            };
            updatePreview();
        });
    });
}

// Setup laces options
function setupLacesOptions(model) {
    const optionsContainer = document.getElementById(`${model}LacesOptions`);
    if (!optionsContainer) return;
    
    const options = optionsContainer.querySelectorAll('.component-option');
    options.forEach(option => {
        option.addEventListener('click', function () {
            options.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selections[model].laces = {
                id: this.dataset.id,
                price: parseFloat(this.dataset.price),
                days: parseInt(this.dataset.days),
                image: this.dataset.image,
                color: selections[model].laces.color
            };
            updatePreview();
        });
    });
}

// Setup color options
function setupColorOptions(colorType, optionsContainer, model) {
    const options = optionsContainer.querySelectorAll('.color-option');
    options.forEach(option => {
        option.addEventListener('click', function () {
            options.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            
            if (colorType === 'bodyColor') {
                selections[model].bodyColor = this.dataset.color;
            } else if (colorType === 'lacesColor') {
                selections[model].laces.color = this.dataset.color;
            }
            updatePreview();
        });
    });
}

// Generate unique ID
function generateUniqueId() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).substr(2, 9)
    );
}

// Get preview image URL
function getPreviewImageUrl() {
    if (currentModel === 'classic') {
        return 'https://via.placeholder.com/200x120?text=Classic+Sneaker';
    } else if (currentModel === 'runner') {
        return 'https://via.placeholder.com/200x120?text=Performance+Runner';
    } else {
        return 'https://via.placeholder.com/200x120?text=High-Top+Basketball';
    }
}

// Save design to Realtime Database
async function saveDesignToDatabase() {
    try {
        const userId = await getCurrentUserId();

        // Calculate totals
        let customizationPrice = 0;
        let maxDays = 0;

        if (currentModel === 'classic') {
            customizationPrice = selections.classic.laces.price + selections.classic.insole.price;
            maxDays = Math.max(selections.classic.laces.days, selections.classic.insole.days);
        }
        else if (currentModel === 'runner') {
            customizationPrice = selections.runner.laces.price + selections.runner.insole.price;
            maxDays = Math.max(selections.runner.laces.days, selections.runner.insole.days);
        }
        else if (currentModel === 'basketball') {
            customizationPrice = selections.basketball.laces.price + selections.basketball.insole.price;
            maxDays = Math.max(selections.basketball.laces.days, selections.basketball.insole.days);
        }

        const totalPrice = basePrice + customizationPrice;
        const totalDays = baseDays + maxDays;

        // Clean up data
        const cleanSelections = {};
        Object.keys(selections[currentModel]).forEach(key => {
            if (selections[currentModel][key] !== undefined) {
                if (typeof selections[currentModel][key] === 'object') {
                    cleanSelections[key] = {};
                    Object.keys(selections[currentModel][key]).forEach(subKey => {
                        if (selections[currentModel][key][subKey] !== undefined) {
                            cleanSelections[key][subKey] = selections[currentModel][key][subKey];
                        }
                    });
                } else {
                    cleanSelections[key] = selections[currentModel][key];
                }
            }
        });

        // Create design object
        const designData = {
            userId: userId,
            model: currentModel,
            size: selectedSize,
            basePrice: basePrice,
            customizationPrice: customizationPrice,
            totalPrice: totalPrice,
            productionTime: `${totalDays}-${totalDays + 3} days`,
            selections: cleanSelections,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Save to database
        const newDesignRef = ref(db, 'AR_shoe_users/saved_customShoes/' + userId + '/' + generateUniqueId());
        await set(newDesignRef, designData);
        console.log('Design saved with ID: ', newDesignRef.key);

        return newDesignRef.key;
    } catch (error) {
        console.error('Error saving design: ', error);
        alert('There was an error saving your design. Please try again.');
        throw error;
    }
}

// Add to cart
async function addToCart() {
    try {
        const userId = await getCurrentUserId();

        // Calculate totals
        let customizationPrice = 0;
        let maxDays = 0;

        if (currentModel === 'classic') {
            customizationPrice = selections.classic.laces.price + selections.classic.insole.price;
            maxDays = Math.max(selections.classic.laces.days, selections.classic.insole.days);
        }
        else if (currentModel === 'runner') {
            customizationPrice = selections.runner.laces.price + selections.runner.insole.price;
            maxDays = Math.max(selections.runner.laces.days, selections.runner.insole.days);
        }
        else if (currentModel === 'basketball') {
            customizationPrice = selections.basketball.laces.price + selections.basketball.insole.price;
            maxDays = Math.max(selections.basketball.laces.days, selections.basketball.insole.days);
        }

        const totalPrice = basePrice + customizationPrice;
        const totalDays = baseDays + maxDays;

        // Create cart item
        const cartItem = {
            model: currentModel,
            size: selectedSize,
            price: totalPrice,
            quantity: 1,
            addedAt: Date.now(),
            image: getPreviewImageUrl(),
            isCustom: true,
            selections: selections[currentModel],
            basePrice: basePrice,
            customizationPrice: customizationPrice,
            productionTime: `${totalDays}-${totalDays + 3} days`
        };

        // Save to cart
        const newCartItemRef = ref(db, `AR_shoe_users/customized_cart/${userId}/${generateUniqueId()}`);
        await set(newCartItemRef, cartItem);
        alert(`Your custom ${currentModel} shoe has been added to your cart!`);
    } catch (error) {
        console.error('Error adding to cart: ', error);
        alert('There was an error adding your design to the cart. Please try again.');
    }
}

// Buy now
async function buyNow() {
    try {
        const userId = await getCurrentUserId();

        // Calculate totals
        let customizationPrice = 0;
        let maxDays = 0;

        if (currentModel === 'classic') {
            customizationPrice = selections.classic.laces.price + selections.classic.insole.price;
            maxDays = Math.max(selections.classic.laces.days, selections.classic.insole.days);
        }
        else if (currentModel === 'runner') {
            customizationPrice = selections.runner.laces.price + selections.runner.insole.price;
            maxDays = Math.max(selections.runner.laces.days, selections.runner.insole.days);
        }
        else if (currentModel === 'basketball') {
            customizationPrice = selections.basketball.laces.price + selections.basketball.insole.price;
            maxDays = Math.max(selections.basketball.laces.days, selections.basketball.insole.days);
        }

        const totalPrice = basePrice + customizationPrice;
        const totalDays = baseDays + maxDays;

        // Clean up selections
        const cleanSelections = {};
        Object.keys(selections[currentModel]).forEach(key => {
            if (selections[currentModel][key] !== undefined) {
                if (typeof selections[currentModel][key] === 'object') {
                    cleanSelections[key] = {};
                    Object.keys(selections[currentModel][key]).forEach(subKey => {
                        if (selections[currentModel][key][subKey] !== undefined) {
                            cleanSelections[key][subKey] = selections[currentModel][key][subKey];
                        }
                    });
                } else {
                    cleanSelections[key] = selections[currentModel][key];
                }
            }
        });

        // Create order data
        const orderData = {
            userId: userId,
            model: currentModel,
            size: selectedSize,
            price: totalPrice,
            quantity: 1,
            addedAt: Date.now(),
            image: getPreviewImageUrl(),
            isCustom: true,
            selections: cleanSelections,
            basePrice: basePrice,
            customizationPrice: customizationPrice,
            productionTime: `${totalDays}-${totalDays + 3} days`,
            status: "pending",
            statusUpdates: {
                initial: {
                    status: "pending",
                    timestamp: Date.now(),
                    message: "Order received and being processed"
                }
            },
            orderDate: new Date().toISOString()
        };

        // Generate order ID
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // Save to boughtshoe
        const boughtShoeRef = ref(db, `AR_shoe_users/boughtshoe/${userId}/${orderId}`);
        await set(boughtShoeRef, orderData);

        // Save to transactions
        const transactionRef = ref(db, `AR_shoe_users/customizedtransactions/${userId}/${orderId}`);
        await set(transactionRef, {
            date: new Date().toISOString(),
            item: {
                name: `Custom ${currentModel} shoe`,
                price: totalPrice,
                quantity: 1,
                size: selectedSize,
                isCustom: true,
                image: getPreviewImageUrl()
            },
            status: "pending",
            totalAmount: totalPrice,
            userId: userId
        });

        alert(`Your custom ${currentModel} shoe order has been placed successfully! Order ID: ${orderId}`);
        window.location.href = `/customer/html/checkoutcustomize.html?orderId=${orderId}`;
    } catch (error) {
        console.error('Error during buy now: ', error);
        alert('There was an error placing your order. Please try again.');
    }
}

// Update user profile
function updateUserProfile(userData, userProfile, userName) {
    if (userData.profilePhoto && userData.profilePhoto.url) {
        userProfile.src = userData.profilePhoto.url;
    }
    if (userData.firstName || userData.lastName) {
        userName.textContent = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    }
}

// Initialize all event listeners
function initializeEventListeners() {
    // Initialize all options
    setupInsoleOptions('classic');
    setupInsoleOptions('runner');
    setupInsoleOptions('basketball');
    setupLacesOptions('classic');
    setupLacesOptions('runner');
    setupLacesOptions('basketball');

    // Mobile sidebar toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (mobileToggle && sidebar && overlay) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // Model selection
    const modelOptions = document.querySelectorAll('.model-option');
    modelOptions.forEach(option => {
        option.addEventListener('click', function () {
            modelOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            currentModel = this.dataset.model;
            basePrice = parseFloat(this.dataset.price);

            // Hide all model-specific sections
            document.querySelectorAll('.model-specific').forEach(section => {
                section.style.display = 'none';
            });

            // Show sections for selected model
            document.querySelectorAll(`.model-specific.${currentModel}`).forEach(section => {
                section.style.display = 'block';
            });

            updatePreview();
        });
    });

    // Size selection
    const sizeOptions = document.querySelectorAll('#sizeOptions .component-option');
    sizeOptions.forEach(btn => {
        btn.addEventListener('click', function () {
            sizeOptions.forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedSize = this.dataset.size;
        });
    });

    // Color selection
    setupColorOptions('bodyColor', document.getElementById('classicBodyColorOptions'), 'classic');
    setupColorOptions('lacesColor', document.getElementById('classiscLacesColorOptions'), 'classic');
    setupColorOptions('bodyColor', document.getElementById('runnerBodyColorOptions'), 'runner');
    setupColorOptions('lacesColor', document.getElementById('runnerLacesColorOptions'), 'runner');
    setupColorOptions('bodyColor', document.getElementById('basketballBodyColorOptions'), 'basketball');
    setupColorOptions('lacesColor', document.getElementById('basketballLacesColorOptions'), 'basketball');

    // Save design button
    document.querySelector('.btn-outline').addEventListener('click', async function () {
        try {
            await saveDesignToDatabase();
            alert(`Your ${currentModel} design has been saved to your account!`);
        } catch (error) {
            console.error('Error saving design: ', error);
            alert('There was an error saving your design. Please try again.');
        }
    });

    // Buy now button
    document.querySelector('.btn-buy').addEventListener('click', buyNow);

    // Info button functionality
    const partsInfoBtn = document.getElementById('partsInfoBtn');
    const sizeInfoBtn = document.getElementById('sizeInfoBtn');
    const partsModal = document.getElementById('partsInfoModal');
    const sizeModal = document.getElementById('sizeInfoModal');
    const closePartsModal = document.getElementById('closePartsModal');
    const closeSizeModal = document.getElementById('closeSizeModal');

    if (partsInfoBtn && sizeInfoBtn && partsModal && sizeModal) {
        partsInfoBtn.addEventListener('click', () => {
            partsModal.style.display = 'flex';
        });

        sizeInfoBtn.addEventListener('click', () => {
            sizeModal.style.display = 'flex';
        });

        closePartsModal.addEventListener('click', () => {
            partsModal.style.display = 'none';
        });

        closeSizeModal.addEventListener('click', () => {
            sizeModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === partsModal) {
                partsModal.style.display = 'none';
            }
            if (event.target === sizeModal) {
                sizeModal.style.display = 'none';
            }
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    checkUrlParameters();

    // Load user profile if available
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            const userProfile = document.getElementById('imageProfile');
            const userName = document.getElementById('userName_display2');

            // Set default values
            userProfile.src = 'https://via.placeholder.com/150?text=User';
            userName.textContent = 'Guest';

            // Try to get user data from Realtime Database
            get(child(ref(db), `users/${user.uid}`))
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        updateUserProfile(userData, userProfile, userName);
                    }
                })
                .catch((error) => {
                    console.error('Error getting user data:', error);
                });
        }
    });
});