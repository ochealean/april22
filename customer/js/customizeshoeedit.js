import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set, get, child, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Global variables
let currentModel = 'classic';
let basePrice = 2499;
let baseDays = 7;
let selectedSize = 5;
let currentUserId = null;
let designId = null;
let originalDesignData = null;

// Initialize selections with default values
let selections = {
    classic: {
        laces: {
            id: 'Standard',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x20?text=Classic+Laces+1',
            color: 'white'
        },
        bodyColor: 'white'
    },
    runner: {
        laces: {
            id: 'Standard',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x20?text=Runner+Laces+1',
            color: 'white'
        },
        bodyColor: 'white'
    },
    basketball: {
        laces: {
            id: 'Standard',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x20?text=Basketball+Laces+1',
            color: 'white'
        },
        bodyColor: 'white'
    },
    slipon: {
        midsole: {
            id: 'sliponMidsole1',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x60?text=SlipOn+Midsole+1'
        },
        outsoleColor: 'gray',
        midsoleColor: 'white'
    }
};

// Get design ID from URL
function getDesignIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('designId');
}

// Load design data from Firebase
async function loadDesignData(designId) {
    try {
        const userId = await getCurrentUserId();
        const designRef = ref(db, `AR_shoe_users/saved_customShoes/${userId}/${designId}`);
        
        const snapshot = await get(designRef);
        if (snapshot.exists()) {
            originalDesignData = snapshot.val();
            return originalDesignData;
        } else {
            throw new Error('Design not found');
        }
    } catch (error) {
        console.error('Error loading design:', error);
        alert('Error loading design. Please try again.');
        throw error;
    }
}

// Apply loaded design data to the UI
function applyDesignData(designData) {
    // Set basic design info
    currentModel = designData.model;
    selectedSize = designData.size;
    basePrice = designData.basePrice || basePrice;
    
    // Update the model selection UI
    const modelOption = document.querySelector(`.model-option[data-model="${currentModel}"]`);
    if (modelOption) {
        modelOption.click();
    }
    
    // Update size selection
    const sizeOption = document.querySelector(`#sizeOptions .component-option[data-size="${selectedSize}"]`);
    if (sizeOption) {
        sizeOption.click();
    }
    
    // Apply the selections to our global selections object
    if (designData.selections) {
        selections[currentModel] = {...selections[currentModel], ...designData.selections};
    }
    
    // Update all UI components based on the selections
    updateAllComponentSelections();
    
    // Update the preview
    updatePreview();
}

// Update all component selections in the UI
function updateAllComponentSelections() {
    const modelSelections = selections[currentModel];
    
    // Helper function to select an option in the UI
    const selectOption = (containerId, optionId) => {
        const container = document.getElementById(containerId);
        if (container) {
            const option = container.querySelector(`.component-option[data-id="${optionId}"]`);
            if (option) {
                option.click();
            }
        }
    };
    
    // Helper function to select a color in the UI
    const selectColor = (containerId, colorValue) => {
        const container = document.getElementById(containerId);
        if (container) {
            const colorOption = container.querySelector(`.color-option[data-color="${colorValue}"]`);
            if (colorOption) {
                colorOption.click();
            }
        }
    };
    
    // Update components based on model
    if (currentModel === 'classic') {
        selectOption('classicLacesOptions', modelSelections.laces?.id);
        
        if (modelSelections.laces?.color) {
            selectColor('classiscLacesColorOptions', modelSelections.laces.color);
        }
        if (modelSelections.bodyColor) {
            selectColor('classicBodyColorOptions', modelSelections.bodyColor);
        }
    } 
    else if (currentModel === 'runner') {
        selectOption('runnerLacesOptions', modelSelections.laces?.id);
        
        if (modelSelections.laces?.color) {
            selectColor('runnerLacesColorOptions', modelSelections.laces.color);
        }
        if (modelSelections.bodyColor) {
            selectColor('runnerBodyColorOptions', modelSelections.bodyColor);
        }
    } 
    else if (currentModel === 'basketball') {
        selectOption('basketballLacesOptions', modelSelections.laces?.id);
        
        if (modelSelections.laces?.color) {
            selectColor('basketballLacesColorOptions', modelSelections.laces.color);
        }
        if (modelSelections.bodyColor) {
            selectColor('basketballBodyColorOptions', modelSelections.bodyColor);
        }
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

// Save design to Realtime Database (updates existing design)
async function saveDesignToDatabase() {
    try {
        const userId = await getCurrentUserId();
        
        if (!designId) {
            throw new Error('No design ID specified');
        }

        // Calculate totals
        let customizationPrice = 0;
        let maxDays = 0;

        if (currentModel === 'classic') {
            customizationPrice = selections.classic.laces.price;
            maxDays = selections.classic.laces.days;
        }
        else if (currentModel === 'runner') {
            customizationPrice = selections.runner.laces.price;
            maxDays = selections.runner.laces.days;
        }
        else if (currentModel === 'basketball') {
            customizationPrice = selections.basketball.laces.price;
            maxDays = selections.basketball.laces.days;
        }
        else if (currentModel === 'slipon') {
            customizationPrice = selections.slipon.midsole.price;
            maxDays = selections.slipon.midsole.days;
        }

        const totalPrice = basePrice + customizationPrice;
        const totalDays = baseDays + maxDays;

        // Clean up data to remove undefined values
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

        // Create updated design object
        const updatedDesign = {
            ...originalDesignData, // Keep original data
            model: currentModel,
            size: selectedSize,
            basePrice: basePrice,
            customizationPrice: customizationPrice,
            totalPrice: totalPrice,
            productionTime: `${totalDays}-${totalDays + 3} days`,
            selections: cleanSelections,
            updatedAt: Date.now()
        };

        // Update in Realtime Database
        const designRef = ref(db, `AR_shoe_users/saved_customShoes/${userId}/${designId}`);
        await set(designRef, updatedDesign);
        console.log('Design updated with ID: ', designId);

        return designId;
    } catch (error) {
        console.error('Error updating design: ', error);
        alert('There was an error updating your design. Please try again.');
        throw error;
    }
}

// Add to cart function
async function addToCart() {
    try {
        const userId = await getCurrentUserId();

        // Calculate totals
        let customizationPrice = 0;
        let maxDays = 0;

        if (currentModel === 'classic') {
            customizationPrice = selections.classic.laces.price;
            maxDays = selections.classic.laces.days;
        }
        else if (currentModel === 'runner') {
            customizationPrice = selections.runner.laces.price;
            maxDays = selections.runner.laces.days;
        }
        else if (currentModel === 'basketball') {
            customizationPrice = selections.basketball.laces.price;
            maxDays = selections.basketball.laces.days;
        }
        else if (currentModel === 'slipon') {
            customizationPrice = selections.slipon.midsole.price;
            maxDays = selections.slipon.midsole.days;
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
            designId: designId, // Include the design ID for reference
            selections: selections[currentModel],
            basePrice: basePrice,
            customizationPrice: customizationPrice,
            productionTime: `${totalDays}-${totalDays + 3} days`
        };

        // Save to customized_cart in Realtime Database
        const newCartItemRef = ref(db, `AR_shoe_users/customized_cart/${userId}/${generateUniqueId()}`);
        await set(newCartItemRef, cartItem);
        
        alert(`Your updated ${currentModel} shoe design has been added to your cart!`);
    } catch (error) {
        console.error('Error adding to cart: ', error);
        alert('There was an error adding your design to the cart. Please try again.');
    }
}

// Function to handle Buy Now action
async function buyNow() {
    try {
        const userId = await getCurrentUserId();

        // Calculate totals
        let customizationPrice = 0;
        let maxDays = 0;

        if (currentModel === 'classic') {
            customizationPrice = selections.classic.laces.price;
            maxDays = selections.classic.laces.days;
        }
        else if (currentModel === 'runner') {
            customizationPrice = selections.runner.laces.price;
            maxDays = selections.runner.laces.days;
        }
        else if (currentModel === 'basketball') {
            customizationPrice = selections.basketball.laces.price;
            maxDays = selections.basketball.laces.days;
        }
        else if (currentModel === 'slipon') {
            customizationPrice = selections.slipon.midsole.price;
            maxDays = selections.slipon.midsole.days;
        }

        const totalPrice = basePrice + customizationPrice;
        const totalDays = baseDays + maxDays;

        // Clean up the selections object to remove undefined values
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
            designId: designId, // Include the design ID for reference
            selections: cleanSelections, // Use the cleaned selections
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

        // Generate a unique order ID
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // Save to boughtshoe in Realtime Database
        const boughtShoeRef = ref(db, `AR_shoe_users/boughtshoe/${userId}/${orderId}`);
        await set(boughtShoeRef, orderData);

        // Also save to transactions for order history
        const transactionRef = ref(db, `AR_shoe_users/customizedtransactions/${userId}/${orderId}`);
        await set(transactionRef, {
            date: new Date().toISOString(),
            item: {
                name: `Custom ${currentModel} shoe`,
                price: totalPrice,
                quantity: 1,
                size: selectedSize,
                isCustom: true,
                image: getPreviewImageUrl(),
                designId: designId
            },
            status: "pending",
            totalAmount: totalPrice,
            userId: userId
        });

        alert(`Your custom ${currentModel} shoe order has been placed successfully! Order ID: ${orderId}`);
        // Redirect to order confirmation or tracking page
        window.location.href = `/customer/html/checkoutcustomize.html?orderId=${orderId}`;
    } catch (error) {
        console.error('Error during buy now: ', error);
        alert('There was an error placing your order. Please try again.');
    }
}

// Helper function to get preview image URL
function getPreviewImageUrl() {
    if (currentModel === 'classic') {
        return 'https://via.placeholder.com/200x120?text=Classic+Sneaker';
    } else if (currentModel === 'runner') {
        return 'https://via.placeholder.com/200x120?text=Performance+Runner';
    } else if (currentModel === 'basketball') {
        return 'https://via.placeholder.com/200x120?text=High-Top+Basketball';
    } else {
        return 'https://via.placeholder.com/200x120?text=Slip-On+Comfort';
    }
}

// Generate unique ID
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Update the shoe preview and summary
function updatePreview() {
    // Calculate totals
    let customizationPrice = 0;
    let maxDays = 0;

    if (currentModel === 'classic') {
        customizationPrice = selections.classic.laces.price;
        maxDays = selections.classic.laces.days;
    }
    else if (currentModel === 'runner') {
        customizationPrice = selections.runner.laces.price;
        maxDays = selections.runner.laces.days;
    }
    else if (currentModel === 'basketball') {
        customizationPrice = selections.basketball.laces.price;
        maxDays = selections.basketball.laces.days;
    }
    else if (currentModel === 'slipon') {
        customizationPrice = selections.slipon.midsole.price;
        maxDays = selections.slipon.midsole.days;
    }

    const totalDays = baseDays + maxDays;
    const totalPrice = basePrice + customizationPrice;

    // Update summary
    document.getElementById('basePrice').textContent = `₱${basePrice.toFixed(2)}`;
    document.getElementById('customizationPrice').textContent = `+₱${customizationPrice.toFixed(2)}`;
    document.getElementById('productionTime').textContent = `${totalDays}-${totalDays + 3} days`;
    document.getElementById('totalPrice').textContent = `₱${totalPrice.toFixed(2)}`;
}

// Initialize all event listeners
function initializeEventListeners() {
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

    // Component selection
    function setupComponentOptions(componentType, optionsContainer, model) {
        const options = optionsContainer.querySelectorAll('.component-option');
        options.forEach(option => {
            option.addEventListener('click', function () {
                options.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                selections[model][componentType] = {
                    id: this.dataset.id,
                    price: parseFloat(this.dataset.price),
                    days: parseInt(this.dataset.days),
                    image: this.dataset.image,
                    color: selections[model][componentType]?.color
                };
                updatePreview();
            });
        });
    }

    // Initialize all component options
    setupComponentOptions('laces', document.getElementById('classicLacesOptions'), 'classic');
    setupComponentOptions('laces', document.getElementById('runnerLacesOptions'), 'runner');
    setupComponentOptions('laces', document.getElementById('basketballLacesOptions'), 'basketball');

    // Color selection
    function setupColorOptions(colorType, optionsContainer, model) {
        const options = optionsContainer.querySelectorAll('.color-option');
        options.forEach(option => {
            option.addEventListener('click', function () {
                options.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');

                // Update color in selections
                const path = colorType.split('.');
                if (path.length > 1) {
                    selections[model][path[0]][path[1]] = this.dataset.color;
                } else {
                    selections[model][colorType] = this.dataset.color;
                }
                updatePreview();
            });
        });
    }

    // Initialize all color options
    setupColorOptions('laces.color', document.getElementById('classiscLacesColorOptions'), 'classic');
    setupColorOptions('bodyColor', document.getElementById('classicBodyColorOptions'), 'classic');
    setupColorOptions('laces.color', document.getElementById('runnerLacesColorOptions'), 'runner');
    setupColorOptions('bodyColor', document.getElementById('runnerBodyColorOptions'), 'runner');
    setupColorOptions('laces.color', document.getElementById('basketballLacesColorOptions'), 'basketball');
    setupColorOptions('bodyColor', document.getElementById('basketballBodyColorOptions'), 'basketball');

    // Save design button (now updates existing design)
    document.querySelector('.btn-outline').addEventListener('click', async function () {
        try {
            await saveDesignToDatabase();
            alert(`Your ${currentModel} design has been updated!`);
        } catch (error) {
            console.error('Error saving design: ', error);
            alert('There was an error saving your design. Please try again.');
        }
    });

    // Add to cart button
    document.querySelector('.btn-primary').addEventListener('click', addToCart);

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

    // Logout functionality
    document.getElementById('logout_btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            signOut(auth).then(() => {
                window.location.href = '/user_login.html';
            }).catch((error) => {
                console.error('Error signing out:', error);
            });
        }
    });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    // Get design ID from URL
    designId = getDesignIdFromUrl();
    
    if (!designId) {
        alert('No design ID specified. Redirecting to customization page.');
        window.location.href = 'customizeshoe.html';
        return;
    }

    // Initialize event listeners
    initializeEventListeners();

    // Load user and design data
    try {
        const userId = await getCurrentUserId();
        const userProfile = document.getElementById('imageProfile');
        const userName = document.getElementById('userName_display2');

        // Set default values
        userProfile.src = 'https://via.placeholder.com/150?text=User';
        userName.textContent = 'Guest';

        // Try to get user data from Realtime Database
        get(child(ref(db), `AR_shoe_users/customer/${userId}`))
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    updateUserProfile(userData, userProfile, userName);
                }
            })
            .catch((error) => {
                console.error('Error getting user data:', error);
            });

        // Load the design data
        const designData = await loadDesignData(designId);
        applyDesignData(designData);
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Error loading design. Redirecting to customization page.');
        window.location.href = 'customizeshoe.html';
    }
});

// Helper function to update user profile display
function updateUserProfile(userData, userProfile, userName) {
    if (userData.profilePhoto && userData.profilePhoto.url) {
        userProfile.src = userData.profilePhoto.url;
    } else if (userData.profilePhoto && userData.profilePhoto.profilePhoto && userData.profilePhoto.profilePhoto.url) {
        userProfile.src = userData.profilePhoto.profilePhoto.url;
    }
    if (userData.firstName || userData.lastName) {
        userName.textContent = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    }
}