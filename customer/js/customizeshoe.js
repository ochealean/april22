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
        sole: {
            id: 'sole1',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x60?text=Classic+Sole+1'
        },
        upper: {
            id: 'upper1',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x60?text=Classic+Upper+1',
            color: '#2c3e50'
        },
        laces: {
            id: 'laces1',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x20?text=Classic+Laces+1',
            color: '#ffffff'
        },
        bodyColor: '#ffffff',
        heelColor: '#2c3e50'
    },
    runner: {
        sole: {
            id: 'runnerSole1',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x60?text=Runner+Sole+1'
        },
        upper: {
            id: 'runnerUpper1',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x60?text=Runner+Upper+1'
        },
        bodyColor: '#ffffff',
        collarColor: '#ffffff'
    },
    basketball: {
        sole: {
            id: 'basketballSole1',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x60?text=Basketball+Sole+1'
        },
        upper: {
            id: 'basketballUpper1',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x60?text=Basketball+Upper+1'
        },
        mudguardColor: '#000000',
        heelColor: '#2c3e50'
    },
    slipon: {
        midsole: {
            id: 'sliponMidsole1',
            price: 0,
            days: 0,
            image: 'https://via.placeholder.com/100x60?text=SlipOn+Midsole+1'
        },
        outsoleColor: '#2c3e50',
        midsoleColor: '#ffffff'
    }
};

// Check URL parameters for model selection
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const modelParam = urlParams.get('model');

    if (modelParam) {
        // Map URL parameter to our model names
        const modelMap = {
            'performance_runner': 'runner',
            'high_top_basketball': 'basketball',
            'slip_on_comfort': 'slipon',
            'classic_sneaker': 'classic'
        };

        if (modelMap[modelParam]) {
            currentModel = modelMap[modelParam];
            // Find and click the corresponding model option
            const modelOption = document.querySelector(`.model-option[data-model="${currentModel}"]`);
            if (modelOption) {
                modelOption.click();
            }
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

// Save design to Realtime Database
async function saveDesignToDatabase() {
    try {
        const userId = await getCurrentUserId();

        // Calculate totals
        let customizationPrice = 0;
        let maxDays = 0;

        if (currentModel === 'classic') {
            customizationPrice = selections.classic.sole.price + selections.classic.upper.price + selections.classic.laces.price;
            maxDays = Math.max(selections.classic.sole.days, selections.classic.upper.days, selections.classic.laces.days);
        }
        else if (currentModel === 'runner') {
            customizationPrice = selections.runner.sole.price + selections.runner.upper.price;
            maxDays = Math.max(selections.runner.sole.days, selections.runner.upper.days);
        }
        else if (currentModel === 'basketball') {
            customizationPrice = selections.basketball.sole.price + selections.basketball.upper.price;
            maxDays = Math.max(selections.basketball.sole.days, selections.basketball.upper.days);
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

        // Save to Realtime Database
        const newDesignRef = ref(db, 'AR_shoe_users/saved_customShoes/' + userId);
        await set(newDesignRef, designData);
        console.log('Design saved with ID: ', newDesignRef.key);

        return newDesignRef.key;
    } catch (error) {
        console.error('Error saving design: ', error);
        alert('There was an error saving your design. Please try again.');
        throw error;
    }
}


async function addToCart() {
    try {
        const userId = await getCurrentUserId();

        // Calculate totals directly without saving to saved_customShoes first
        let customizationPrice = 0;
        let maxDays = 0;

        if (currentModel === 'classic') {
            customizationPrice = selections.classic.sole.price + selections.classic.upper.price + selections.classic.laces.price;
            maxDays = Math.max(selections.classic.sole.days, selections.classic.upper.days, selections.classic.laces.days);
        }
        else if (currentModel === 'runner') {
            customizationPrice = selections.runner.sole.price + selections.runner.upper.price;
            maxDays = Math.max(selections.runner.sole.days, selections.runner.upper.days);
        }
        else if (currentModel === 'basketball') {
            customizationPrice = selections.basketball.sole.price + selections.basketball.upper.price;
            maxDays = Math.max(selections.basketball.sole.days, selections.basketball.upper.days);
        }
        else if (currentModel === 'slipon') {
            customizationPrice = selections.slipon.midsole.price;
            maxDays = selections.slipon.midsole.days;
        }

        const totalPrice = basePrice + customizationPrice;
        const totalDays = baseDays + maxDays;

        // Create cart item directly
        const cartItem = {
            model: currentModel,
            size: selectedSize,
            price: totalPrice,
            quantity: 1,
            addedAt: Date.now(),
            image: getPreviewImageUrl(),
            isCustom: true,
            // Include all the customization details
            selections: selections[currentModel],
            basePrice: basePrice,
            customizationPrice: customizationPrice,
            productionTime: `${totalDays}-${totalDays + 3} days`
        };

        // Save to customized_cart in Realtime Database
        const newCartItemRef = ref(db, `AR_shoe_users/customized_cart/${userId}/${generateUniqueId()}`);
        await set(newCartItemRef, cartItem);

        alert(`Your custom ${currentModel} shoe has been added to your cart!`);
    } catch (error) {
        console.error('Error adding to cart: ', error);
        alert('There was an error adding your design to the cart. Please try again.');
    }
}

// Helper function to get preview image URL
function getPreviewImageUrl() {
    if (currentModel === 'classic') {
        return selections.classic.upper.image;
    } else if (currentModel === 'runner') {
        return selections.runner.upper.image;
    } else if (currentModel === 'basketball') {
        return selections.basketball.upper.image;
    } else {
        return selections.slipon.midsole.image;
    }
}

// Update the shoe preview and summary
function updatePreview() {
    // Calculate totals
    let customizationPrice = 0;
    let maxDays = 0;

    if (currentModel === 'classic') {
        customizationPrice = selections.classic.sole.price + selections.classic.upper.price + selections.classic.laces.price;
        maxDays = Math.max(selections.classic.sole.days, selections.classic.upper.days, selections.classic.laces.days);
    }
    else if (currentModel === 'runner') {
        customizationPrice = selections.runner.sole.price + selections.runner.upper.price;
        maxDays = Math.max(selections.runner.sole.days, selections.runner.upper.days);
    }
    else if (currentModel === 'basketball') {
        customizationPrice = selections.basketball.sole.price + selections.basketball.upper.price;
        maxDays = Math.max(selections.basketball.sole.days, selections.basketball.upper.days);
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
    setupComponentOptions('sole', document.getElementById('soleOptions'), 'classic');
    setupComponentOptions('upper', document.getElementById('upperOptions'), 'classic');
    setupComponentOptions('laces', document.getElementById('lacesOptions'), 'classic');
    setupComponentOptions('sole', document.getElementById('runnerSoleOptions'), 'runner');
    setupComponentOptions('upper', document.getElementById('runnerUpperOptions'), 'runner');
    setupComponentOptions('sole', document.getElementById('basketballSoleOptions'), 'basketball');
    setupComponentOptions('upper', document.getElementById('basketballUpperOptions'), 'basketball');
    setupComponentOptions('midsole', document.getElementById('sliponMidsoleOptions'), 'slipon');

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
    setupColorOptions('upper.color', document.getElementById('upperColorOptions'), 'classic');
    setupColorOptions('laces.color', document.getElementById('lacesColorOptions'), 'classic');
    setupColorOptions('bodyColor', document.getElementById('bodyColorOptions'), 'classic');
    setupColorOptions('heelColor', document.getElementById('heelColorOptions'), 'classic');
    setupColorOptions('bodyColor', document.getElementById('runnerBodyColorOptions'), 'runner');
    setupColorOptions('collarColor', document.getElementById('runnerCollarColorOptions'), 'runner');
    setupColorOptions('mudguardColor', document.getElementById('basketballMudguardColorOptions'), 'basketball');
    setupColorOptions('heelColor', document.getElementById('basketballHeelColorOptions'), 'basketball');
    setupColorOptions('outsoleColor', document.getElementById('sliponOutsoleColorOptions'), 'slipon');
    setupColorOptions('midsoleColor', document.getElementById('sliponMidsoleColorOptions'), 'slipon');

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

    // Add to cart button
    document.querySelector('.btn-primary').addEventListener('click', addToCart);

    // Buy now button
    // document.querySelector('.btn-buy').addEventListener('click', async function () {
    //     try {
    //         await addToCart();
    //         window.location.href = '/customer/html/checkout.html';
    //     } catch (error) {
    //         console.error('Error during buy now: ', error);
    //     }
    // });

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
document.addEventListener('DOMContentLoaded', function() {
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

// Helper function to update user profile display
function updateUserProfile(userData, userProfile, userName) {
    if (userData.profilePhoto && userData.profilePhoto.url) {
        userProfile.src = userData.profilePhoto.url;
    }
    if (userData.firstName || userData.lastName) {
        userName.textContent = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    }
}