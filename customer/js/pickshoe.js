import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, remove, push } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', function () {
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
    const database = getDatabase(app);
    const auth = getAuth(app);

    // Model selection functionality
    let selectedModel = null;
    const modelCards = document.querySelectorAll('.model-card');
    const customizeBtn = document.getElementById('customizeBtn');

    function setupModelSelection() {
        modelCards.forEach(card => {
            card.addEventListener('click', function () {
                modelCards.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');

                selectedModel = {
                    id: this.dataset.model,
                    basePrice: parseFloat(this.dataset.basePrice),
                    baseDays: parseInt(this.dataset.baseDays),
                    baseImage: this.dataset.baseImage,
                    name: this.querySelector('.model-name').textContent
                };

                customizeBtn.disabled = false;
            });
        });

        customizeBtn.addEventListener('click', function () {
            if (selectedModel) {
                sessionStorage.setItem('selectedShoeModel', JSON.stringify(selectedModel));
                window.location.href = `customizeshoe.html?model=${encodeURIComponent(selectedModel.id)}`;
            }
        });
    }

    // Handle user authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            document.getElementById('userName_display2').textContent = user.displayName || 'Customer';

            // Load user profile image if available
            if (user.photoURL) {
                document.getElementById('imageProfile').src = user.photoURL;
            }

            // Load saved designs for this user
            loadSavedDesigns(user.uid);

            // Setup model selection after auth is confirmed
            setupModelSelection();
        } else {
            // User is signed out, redirect to login
            window.location.href = '/login.html';
        }
    });

    // Load saved designs from Firebase
    function loadSavedDesigns(userId) {
        const savedDesignsRef = ref(database, `AR_shoe_users/saved_customShoes/${userId}`);
        const savedDesignsContainer = document.querySelector('.saved-designs-container');

        get(savedDesignsRef)
            .then((snapshot) => {
                const savedDesigns = snapshot.val();
                const container = document.getElementById('savedDesignsList');
                const emptyState = document.getElementById('emptySavedDesigns');

                // Clear existing content except the empty state
                container.innerHTML = '';

                if (!savedDesigns || Object.keys(savedDesigns).length === 0) {
                    // Show empty state if no designs
                    container.appendChild(emptyState);
                    emptyState.style.display = 'block';
                    savedDesignsContainer.classList.add('hidden'); // Hide container if no designs
                } else {
                    // Show the container since we have designs
                    savedDesignsContainer.classList.remove('hidden');

                    // Hide empty state
                    emptyState.style.display = 'none';

                    // Generate HTML for each saved design
                    Object.entries(savedDesigns).forEach(([id, design]) => {
                        const designElement = createSavedDesignElement(id, design);
                        container.appendChild(designElement);
                    });
                }
            })
            .catch((error) => {
                console.error('Error loading saved designs:', error);
                alert('Error loading saved designs. Please try again.');
            });
    }

    function createSavedDesignElement(id, design) {
        const element = document.createElement('div');
        element.className = 'saved-design';

        // Format the date with fallback
        const createdAt = design.createdAt ? new Date(design.createdAt) : new Date();
        const formattedDate = createdAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Calculate total price with fallback
        const basePrice = design.basePrice || 0;
        const customizationPrice = design.customizationPrice || 0;
        const totalPrice = basePrice + customizationPrice;

        // Safely access nested properties with fallbacks
        const selections = design.selections || {};

        // Access common properties with fallbacks
        const upper = selections.upper || {};
        const upperId = upper.id || null;
        const upperColor = upper.color || null;
        const upperImage = upper.image || null;

        const sole = selections.sole || {};
        const soleId = sole.id || null;
        const soleImage = sole.image || null;

        const laces = selections.laces || {};
        const lacesId = laces.id || null;
        const lacesColor = laces.color || null;
        const lacesImage = laces.image || null;

        // NEW: Access insole properties
        const insole = selections.insole || {};
        const insoleId = insole.id || null;
        const insolePrice = insole.price || 0;
        const insoleImage = insole.image || null;

        // Model-specific properties with fallbacks
        const bodyColor = selections.bodyColor || null;
        const heelColor = selections.heelColor || null;
        const collarColor = selections.collarColor || null; // Runner specific
        const mudguardColor = selections.mudguardColor || null; // Basketball specific
        const outsoleColor = selections.outsoleColor || null; // Slipon specific
        const midsoleColor = selections.midsoleColor || null; // Slipon specific
        const midsole = selections.midsole || {}; // Slipon specific
        const midsoleId = midsole.id || null;

        // Helper function to create a detail row only if value exists
        const createDetailRow = (label, value, isColor = false) => {
            if (!value) return '';

            if (isColor) {
                return `
        <div class="design-detail-row">
            <span class="design-detail-label">${label}:</span>
            <span class="design-detail-value" style="background-color: ${value}; width: 20px; height: 20px; display: inline-block; border: 1px solid #ddd;"></span>
            <span class="design-detail-value">${value}</span>
        </div>
    `;
            }

            return `
    <div class="design-detail-row">
        <span class="design-detail-label">${label}:</span>
        <span class="design-detail-value">${value}</span>
    </div>
`;
        };

        // Build the common details HTML
        let detailsHTML = `
        ${createDetailRow('Model', design.model)}
        ${createDetailRow('Size', design.size)}
    `;

        // Add insole details if available
        if (insoleId) {
            detailsHTML += createDetailRow('Insole', `${insoleId}${insolePrice ? ` (+₱${insolePrice})` : ''}`);
        }

        // Add model-specific details
        if (design.model === 'classic') {
            detailsHTML += `
            ${createDetailRow('Body Color', bodyColor, true)}
        `;
            if (lacesId) {
                detailsHTML += createDetailRow('Laces', `${lacesId}${lacesColor ? ` (${lacesColor})` : ''}`);
            }
        }
        else if (design.model === 'runner') {
            detailsHTML += `
            ${createDetailRow('Body Color', bodyColor, true)}
        `;

            if (lacesId) {
                detailsHTML += createDetailRow('Laces', `${lacesId}${lacesColor ? ` (${lacesColor})` : ''}`);
            }
        }
        else if (design.model === 'basketball') {
            detailsHTML += `
            ${createDetailRow('Body Color', bodyColor, true)}
        `;

            if (lacesId) {
                detailsHTML += createDetailRow('Laces', `${lacesId}${lacesColor ? ` (${lacesColor})` : ''}`);
            }
        }

        // Add production time and price (always shown)
        detailsHTML += `
        ${createDetailRow('Production Time', design.productionTime)}
        <div class="design-detail-row">
            <span class="design-detail-label">Total Price:</span>
            <span class="design-detail-value" style="font-weight: 600; color: var(--primary);">₱${totalPrice.toFixed(2)}</span>
        </div>
    `;

        // Use the first available image or a placeholder
        let previewImage = 'https://cdn-icons-png.flaticon.com/512/11542/11542598.png';
        if (design.model === 'slipon') {
            previewImage = midsole.image || previewImage;
        } else {
            previewImage = upperImage || soleImage || lacesImage || insoleImage || previewImage;
        }

        element.innerHTML = `
        <div class="saved-design-header">
            <h3 class="saved-design-title">${design.model || 'Custom Design'}</h3>
            <span class="saved-design-date">Saved: ${formattedDate}</span>
        </div>
        <div class="saved-design-preview">
            <img src="${previewImage || 'https://cdn-icons-png.flaticon.com/512/11542/11542598.png'}" alt="Custom Design" class="saved-design-image" onerror="this.onerror=null; this.src='https://cdn-icons-png.flaticon.com/512/11542/11542598.png';">
            <div class="saved-design-details">
                ${detailsHTML}
            </div>
        </div>
        <div class="saved-design-actions">
            <button class="btn btn-outline btn-sm edit-design" data-id="${id}">
                <i class="fas fa-edit"></i> Edit Design
            </button>
            <button class="btn btn-danger btn-sm delete-design" data-id="${id}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
        return element;
    }

    // Event delegation for saved design actions
    document.getElementById('savedDesignsList').addEventListener('click', function (e) {
        const target = e.target.closest('button');
        if (!target) return;

        const designId = target.dataset.id;

        if (target.classList.contains('edit-design')) {
            editSavedDesign(designId);
        } else if (target.classList.contains('add-to-cart')) {
            addDesignToCart(designId);
        } else if (target.classList.contains('buy-now')) {
            buyNow(designId);
        } else if (target.classList.contains('delete-design')) {
            deleteSavedDesign(designId);
        }
    });

    function editSavedDesign(designId) {
        const userId = auth.currentUser.uid;
        const designRef = ref(database, `AR_shoe_users/saved_customShoes/${userId}/${designId}`);

        get(designRef)
            .then((snapshot) => {
                const design = snapshot.val();
                sessionStorage.setItem('editingDesign', JSON.stringify({
                    id: designId,
                    ...design
                }));
                window.location.href = 'customizeshoeedit.html?designId=' + designId;
            })
            .catch((error) => {
                console.error('Error loading design:', error);
                alert('Error loading design. Please try again.');
            });
    }

    function addDesignToCart(designId) {
        const userId = auth.currentUser.uid;
        const designRef = ref(database, `AR_shoe_users/saved_customShoes/${userId}/${designId}`);

        get(designRef)
            .then((snapshot) => {
                const design = snapshot.val();
                const cartRef = ref(database, `AR_shoe_users/customized_cart/${userId}`);

                // Create a new cart item with the design data
                const cartItem = {
                    ...design,
                    addedAt: Date.now(),
                    isCustom: true
                };

                // Push the design to the cart
                return push(cartRef, cartItem);
            })
            .then(() => {
                alert('Design added to cart successfully!');
            })
            .catch((error) => {
                console.error('Error adding to cart:', error);
                alert('Error adding to cart. Please try again.');
            });
    }

    function buyNow(designId) {
        addDesignToCart(designId).then(() => {
            window.location.href = '/checkout.html';
        });
    }

    function deleteSavedDesign(designId) {
        if (confirm('Are you sure you want to delete this saved design?')) {
            const userId = auth.currentUser.uid;
            const designRef = ref(database, `AR_shoe_users/saved_customShoes/${userId}/${designId}`);

            remove(designRef)
                .then(() => {
                    // Remove the design element from the DOM
                    const designElement = document.querySelector(`.saved-design-actions button[data-id="${designId}"]`).closest('.saved-design');
                    if (designElement) {
                        designElement.remove();
                    }

                    // Check if we need to show the empty state
                    const container = document.getElementById('savedDesignsList');
                    if (container.children.length === 0 ||
                        (container.children.length === 1 && container.children[0].id === 'emptySavedDesigns')) {
                        const emptyState = document.getElementById('emptySavedDesigns');
                        container.innerHTML = '';
                        container.appendChild(emptyState);
                        emptyState.style.display = 'block';
                    }
                })
                .catch((error) => {
                    console.error('Error deleting design:', error);
                    alert('Error deleting design. Please try again.');
                });
        }
    }

    // Logout functionality
    document.getElementById('logout_btn').addEventListener('click', function () {
        signOut(auth)
            .then(() => {
                window.location.href = '/login.html';
            })
            .catch((error) => {
                console.error('Error signing out:', error);
                alert('Error signing out. Please try again.');
            });
    });
});