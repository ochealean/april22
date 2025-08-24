import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";
// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAuPALylh11cTArigeGJZmLwrFwoAsNPSI",
    authDomain: "opportunity-9d3bf.firebaseapp.com",
    databaseURL: "https://opportunity-9d3bf-default-rtdb.firebaseio.com",
    projectId: "opportunity-9d3bf",
    storageBucket: "opportunity-9d3bf.firebasestorage.app",
    messagingSenderId: "57906230058",
    appId: "1:57906230058:web:2d7cd9cc68354722536453"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Get shoeId from URL
const urlParams = new URLSearchParams(window.location.search);
const shoeId = urlParams.get('edit');

// DOM elements
const shoeNameInput = document.getElementById('shoeName');
const shoeCodeInput = document.getElementById('shoeCode');
const shoeDescriptionInput = document.getElementById('shoeDescription');
const currentImageDiv = document.getElementById('currentShoeImage');
const variantsContainer = document.getElementById('colorVariants');

// Global variables
let shopLoggedin; // shop ID of the logged-in user
let roleLoggedin; // role of the logged-in user
let sname; //shop name
let USERID;
let variantCount = 0;

// Fetch and populate the form once authenticated
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Fetch shop name from database
        USERID = user.uid;
        const shopRef = ref(db, `AR_shoe_users/employees/${user.uid}`);
        onValue(shopRef, (snapshot) => {
            const shopData = snapshot.val();
            console.log("shopData: ", shopData);

            // this will run if the user a Employee NOT a shop owner
            if (shopData) {
                roleLoggedin = shopData.role;
                shopLoggedin = shopData.shopId;
                console.log("shopLoggedin: ", shopLoggedin);
                sname = shopData.shopName || ''; // Initialize with empty string if not available

                // Set role-based UI elements
                if (shopData.role.toLowerCase() === "manager") {
                    document.getElementById("addemployeebtn").style.display = "none";
                } else if (shopData.role.toLowerCase() === "salesperson") {
                    document.getElementById("addemployeebtn").style.display = "none";
                    document.getElementById("analyticsbtn").style.display = "none";
                }
            } else {
                // this will run if the user is a shop owner
                shopLoggedin = user.uid;
                roleLoggedin = "Shop Owner"; // Default role
                sname = 'Shop Owner'; // Default shop name
            }

            // Load shoe data to edit (moved inside the onValue callback)
            const shoeRef = ref(db, `AR_shoe_users/shoe/${shopLoggedin}/${shoeId}`);
            get(shoeRef).then((snapshot) => {
                if (!snapshot.exists()) {
                    alert("Shoe not found.");
                    return;
                }

                const shoeData = snapshot.val();

                // Populate fields directly
                shoeNameInput.value = shoeData.shoeName ?? '';
                shoeCodeInput.value = shoeData.shoeCode ?? '';
                shoeDescriptionInput.value = shoeData.generalDescription ?? '';

                if (shoeData.defaultImage) {
                    currentImageDiv.innerHTML = `<img src="${shoeData.defaultImage}" style="max-width:200px">`;
                }

                if (shoeData.variants) {
                    for (const variant of Object.values(shoeData.variants)) {
                        addColorVariantWithData(variant);
                    }
                }

            }).catch((error) => {
                console.error("Error getting shoe data:", error);
                alert("Failed to load shoe data.");
            });

        }, (error) => {
            console.error("Error fetching shop data:", error);
            shopLoggedin = user.uid; // Fallback to user UID
            sname = 'Unknown Shop';
        });
    } else {
        window.location.href = "/user_login.html";
    }
});


// for update
document.getElementById('updateShoeBtn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return alert("Not logged in.");

    const shoeRefPath = `AR_shoe_users/shoe/${shopLoggedin}/${shoeId}`;
    const shoeRef = ref(db, shoeRefPath);

    // Get current data first
    const currentShoeData = (await get(shoeRef)).val();
    if (!currentShoeData) {
        alert("Shoe data not found!");
        return;
    }

    // Main image handling - UPDATED SOLUTION
    const defaultImageFile = document.getElementById('shoeImage').files[0];
    let defaultImageUrl = currentShoeData.defaultImage;

    if (defaultImageFile) {
        try {
            console.log("Starting main image update process...");

            // 1. Delete old image if exists - USING CORRECT PATH EXTRACTION
            if (defaultImageUrl) {
                try {
                    console.log("Attempting to delete old main image...");
                    const oldImagePath = getPathFromUrl(defaultImageUrl);
                    if (oldImagePath) {
                        const oldImageRef = storageRef(storage, oldImagePath);
                        await deleteObject(oldImageRef);
                        console.log("Old main image deleted successfully");
                    } else {
                        console.log("Could not extract path from old image URL");
                    }
                } catch (deleteError) {
                    console.log("Old main image not found or already deleted:", deleteError.message);
                }
            }

            // 2. Upload new image with consistent naming
            console.log("Uploading new main image...");
            const filePath = `shoes/${shopLoggedin}/${shoeId}/main_image`; // Fixed filename
            const imageRef = storageRef(storage, filePath);
            const snapshot = await uploadBytes(imageRef, defaultImageFile);

            // 3. Get new URL
            defaultImageUrl = await getDownloadURL(snapshot.ref);
            console.log("New image URL:", defaultImageUrl);

            // 4. Update UI immediately
            if (currentImageDiv) {
                currentImageDiv.innerHTML = `<img src="${defaultImageUrl}" style="max-width:200px">`;
            }
        } catch (error) {
            console.error("Main image update failed:", error);
            alert("Failed to update main image. Please try again.");
            return;
        }
    }

    // Process variants
    const variants = {};
    const variantGroups = document.querySelectorAll('.variant-group');

    for (let i = 0; i < variantGroups.length; i++) {
        const group = variantGroups[i];
        const variantId = `variant_${i}`;
        const variantName = group.querySelector(`#variantName_${i + 1}`)?.value || '';
        const color = group.querySelector(`#color_${i + 1}`)?.value || '';
        const price = parseFloat(group.querySelector(`#variantPrice_${i + 1}`)?.value) || 0;
        const imageFile = group.querySelector(`#variantImage_${i + 1}`)?.files?.[0];
        const prevImage = currentShoeData.variants?.[variantId]?.imageUrl;

        // Process sizes
        const sizes = {};
        group.querySelectorAll('.size-stock-item').forEach(item => {
            const size = item.querySelector('.size-input')?.value;
            const stockInput = item.querySelector('.stock-input');
            const resetTriggered = stockInput.dataset.reset === 'true';

            const addedStock = parseInt(stockInput?.value || '0');
            const currentStock = parseInt(item.querySelector('.current-stock')?.textContent || '0');

            if (size) {
                let newTotalStock = currentStock;
                if (resetTriggered) {
                    newTotalStock = addedStock || 0; // if user entered new value, use it; else, 0
                } else if (addedStock) {
                    newTotalStock = currentStock + addedStock;
                }

                sizes[`size_${size}`] = { [size]: { 
                    LastUpdatedBy: roleLoggedin,
                    userId: USERID,
                    actionValue: "Stock Updated",
                    LastUpdatedAt: new Date().toISOString(),
                    stock: newTotalStock } };
            }
            stockInput.dataset.reset = 'false';
        });

        // Initialize variant data
        variants[variantId] = {
            variantName,
            color,
            price,
            sizes,
            imageUrl: prevImage // Default to existing
        };

        // Handle variant image update
        if (imageFile) {
            try {
                // Clean up old variant images
                if (prevImage) {
                    try {
                        const oldImageRef = storageRef(storage, getPathFromUrl(prevImage));
                        await deleteObject(oldImageRef);
                    } catch (error) {
                        console.log(`Old variant image not found: ${error.message}`);
                    }
                }
                // Add these checks before the update operation
                console.log("Attempting to update main image for shoe:", shoeId);
                console.log("Shop ID:", shopLoggedin);
                console.log("Current image URL:", defaultImageUrl);
                console.log("New image file:", defaultImageFile ? defaultImageFile.name : "none");

                // Upload new variant image
                const variantImageName = `${variantId}`; // fixed name per variant slot
                const filePath = `shoes/${shopLoggedin}/${shoeId}/${variantImageName}`;
                const imageRef = storageRef(storage, filePath);
                const snapshot = await uploadBytes(imageRef, imageFile);
                variants[variantId].imageUrl = await getDownloadURL(snapshot.ref);
            } catch (error) {
                console.error(`Error updating variant image:`, error);
                alert(`Failed to update image for variant ${variantName}`);
                return;
            }
        }
    }

    // Update database
    try {
        await set(shoeRef, {
            ...currentShoeData,
            shoeName: shoeNameInput.value.trim(),
            shoeCode: shoeCodeInput.value.trim(),
            generalDescription: shoeDescriptionInput.value.trim(),
            defaultImage: defaultImageUrl,
            variants
        });
        alert("Shoe updated successfully!");
        window.location.href = '/shopowner/html/shop_inventory.html';
    } catch (err) {
        console.error("Error updating shoe:", err);
        alert("Failed to update shoe.");
    }
});

// Helper function to extract path from URL
function getPathFromUrl(url) {
    if (!url) return null;
    try {
        const base = "https://firebasestorage.googleapis.com/v0/b/opportunity-9d3bf.firebasestorage.app/o/";
        if (url.startsWith(base)) {
            return decodeURIComponent(url.split(base)[1].split("?")[0]);
        }
        return null;
    } catch (error) {
        console.error("Error parsing URL:", error);
        return null;
    }
}


function addColorVariantWithData(variantData = {}, index = variantCount) {
    variantCount++;
    const container = document.getElementById('colorVariants');

    const variant = document.createElement('div');
    variant.className = 'variant-group';
    variant.dataset.variantId = variantCount;

    const variantImageHtml = variantData.imageUrl
        ? `<img src="${variantData.imageUrl}" alt="Variant Image" style="max-height: 100px; margin-bottom: 10px;">`
        : '';

    variant.innerHTML = `
        <div class="form-group">
            <label for="variantName_${variantCount}">Variant Name</label>
            <input type="text" id="variantName_${variantCount}" required placeholder="e.g., Red Blazing, Stealth Black" value="${variantData.variantName || ''}">
        </div>
        
        <div class="form-group">
            <label for="color_${variantCount}">Color</label>
            <input type="text" id="color_${variantCount}" required placeholder="e.g., Red, Black" value="${variantData.color || ''}">
        </div>
        
        <div class="form-group">
            <label for="variantPrice_${variantCount}">Price (₱)</label>
            <input type="number" id="variantPrice_${variantCount}" step="0.01" required value="${variantData.price || ''}">
        </div>
        
        <div class="form-group">
            <label for="variantImage_${variantCount}">Variant Image</label>
            ${variantImageHtml}
            <input type="file" id="variantImage_${variantCount}" accept="image/*">
        </div>
        
        <div class="form-group">
            <label>Sizes & Stock</label>
            <div class="size-stock-container" id="sizeStockContainer_${variantCount}"></div>
            <button type="button" class="btn-secondary btn-add-size" onclick="addSizeInput(${variantCount})">
                <i class="fas fa-plus"></i> Add Size
            </button>
        </div>
        
        <button type="button" class="btn-remove" onclick="removeVariant(this)">
            <i class="fas fa-trash"></i> Remove Variant
        </button>
    `;

    container.appendChild(variant);

    // Add sizes if provided
    if (variantData.sizes) {
        Object.values(variantData.sizes).forEach(sizeObj => {
            const size = Object.keys(sizeObj)[0];
            const stock = sizeObj[size].stock;
            addSizeInput(variantCount, size, stock);
        });
    } else {
        addSizeInput(variantCount); // Add one empty input by default
    }
}

function addSizeInput(variantId, size = '', stock = '') {
    const container = document.getElementById(`sizeStockContainer_${variantId}`);

    const sizeItem = document.createElement('div');
    sizeItem.className = 'size-stock-item';
    sizeItem.innerHTML = `
        <span>Size:</span>
        <input type="number" class="size-input" step="0.5" min="1" placeholder="Size" value="${size}" required>
        <p>Stocks: <span class="current-stock">${stock}</span></p>
        <input type="number" class="stock-input" min="0" placeholder="Add Stock (Qty)">
        <button type="button" class="btn-reset-small" onclick="resetStock(this)">
            <i class="fas fa-undo"></i> Reset
        </button>
        <button type="button" class="btn-remove-small" onclick="removeSizeInput(this)">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(sizeItem);
}

function resetStock(button) {
    const stockSpan = button.parentElement.querySelector('.current-stock');
    const stockInput = button.parentElement.querySelector('.stock-input');

    stockSpan.textContent = '0'; // visually show reset
    stockInput.value = ''; // explicitly set to 0 for processing
    stockInput.dataset.reset = 'true'; // mark it as reset
}



function removeSizeInput(button) {
    button.parentElement.remove();
}

function removeVariant(button) {
    if (document.querySelectorAll('.variant-group').length > 1) {
        button.closest('.variant-group').remove();
    } else {
        alert('You must have at least one color variant');
    }
}

// Discard modal logic
function discardChanges() {
    const modal = document.getElementById('discardModal');
    modal.style.display = 'flex';

    document.getElementById('confirmDiscard').onclick = () => {
        location.reload(); // Reloads the page to discard changes
    };

    document.getElementById('cancelDiscard').onclick = () => {
        modal.style.display = 'none';
    };
}
window.discardChanges = discardChanges;


// Expose to global scope
window.addSizeInput = addSizeInput;
window.removeSizeInput = removeSizeInput;
window.removeVariant = removeVariant;
window.addColorVariantWithData = addColorVariantWithData;
window.resetStock = resetStock;

// Logout functionality
document.getElementById('logout_btn').addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut().then(() => {
            window.location.href = '/user_login.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
        });
    }
});