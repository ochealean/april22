import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";
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


let variantCount = 0;

// Fetch and populate the form once authenticated
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = '/user_login.html';
        return;
    }

    const shopLoggedin = user.uid;
    const shoeRef = ref(db, `AR_shoe_users/shoe/${shopLoggedin}/${shoeId}`);

    get(shoeRef).then((snapshot) => {
        if (!snapshot.exists()) {
            alert("Shoe not found.");
            return;
        }

        // Directly access values without storing into new object/array
        const shoeData = snapshot.val();

        // Populate fields directly
        document.getElementById('shoeName').value = shoeData.shoeName ?? '';
        document.getElementById('shoeCode').value = shoeData.shoeCode ?? '';
        document.getElementById('shoeDescription').value = shoeData.generalDescription ?? '';

        if (shoeData.defaultImage) {
            document.getElementById('currentShoeImage').innerHTML = `<img src="${shoeData.defaultImage}" style="max-width:200px">`;
        }

        if (shoeData.variants) {
            for (const variant of Object.values(shoeData.variants)) {
                window.addColorVariantWithData(variant);
            }
        }

    }).catch((error) => {
        console.error("Error getting shoe data:", error);
        alert("Failed to load shoe data.");
    });
});


// for update
document.getElementById('updateShoeBtn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return alert("Not logged in.");

    const shopLoggedin = user.uid;
    const shoeRefPath = `AR_shoe_users/shoe/${shopLoggedin}/${shoeId}`;
    const shoeRef = ref(db, shoeRefPath);

    const shoeName = shoeNameInput.value.trim();
    const shoeCode = shoeCodeInput.value.trim();
    const shoeDesc = shoeDescriptionInput.value.trim();

    const defaultImageFile = document.getElementById('defaultShoeImage')?.files?.[0];
    let defaultImageUrl = currentImageDiv.querySelector('img')?.src;

    if (defaultImageFile) {
        const filePath = `shoes/${shopLoggedin}/${Date.now()}_${defaultImageFile.name}`;
        const imageRef = storageRef(storage, filePath);
        const snapshot = await uploadBytes(imageRef, defaultImageFile);
        defaultImageUrl = await getDownloadURL(snapshot.ref);
    }

    const variants = {};
    document.querySelectorAll('.variant-group').forEach((group, index) => {
        const variantId = `variant_${index}`;
        const variantName = group.querySelector(`#variantName_${index + 1}`)?.value || '';
        const color = group.querySelector(`#color_${index + 1}`)?.value || '';
        const price = parseFloat(group.querySelector(`#variantPrice_${index + 1}`)?.value) || 0;
        const imageFile = group.querySelector(`#variantImage_${index + 1}`)?.files?.[0];
        const prevImage = group.querySelector('img')?.src;

        const sizes = {};
        group.querySelectorAll('.size-stock-item').forEach(item => {
            const size = item.querySelector('.size-input')?.value;
            const stock = parseInt(item.querySelector('.stock-input')?.value || '0');
            if (size) {
                sizes[`size_${size}`] = { [size]: { stock } };
            }
        });

        variants[variantId] = {
            variantName,
            color,
            price,
            sizes,
            imageUrl: prevImage // Default to existing
        };

        if (imageFile) {
            variants[variantId]._imageFile = imageFile; // Temporarily store for upload later
        }
    });

    // Upload new variant images if needed
    for (const [id, variant] of Object.entries(variants)) {
        if (variant._imageFile) {
            const filePath = `shoes/${shopLoggedin}/variants/${Date.now()}_${variant._imageFile.name}`;
            const imageRef = storageRef(storage, filePath);
            const snapshot = await uploadBytes(imageRef, variant._imageFile);
            variant.imageUrl = await getDownloadURL(snapshot.ref);
            delete variant._imageFile;
        }
    }

    // Prepare final data
    const updatedShoeData = {
        shoeName,
        shoeCode,
        generalDescription: shoeDesc,
        defaultImage: defaultImageUrl,
        variants
    };

    // Save to Firebase
    try {
        await set(shoeRef, updatedShoeData);
        console.log("Set successful");
        alert("Shoe updated successfully!");
        window.location.href = '/shopowner/html/shop_inventory.html'; // Redirect after success
    } catch (err) {
        console.error("Error updating shoe:", err);
        alert("Failed to update shoe.");
    }
});

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
            <label for="variantPrice_${variantCount}">Price ($)</label>
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
        <span>Stock:</span>
        <input type="number" class="stock-input" min="0" placeholder="Qty" value="${stock}" required>
        <button type="button" class="btn-remove-small" onclick="removeSizeInput(this)">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(sizeItem);
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
