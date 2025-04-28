import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref as dbRef, set } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";


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
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

let shopID;
let sname;

document.addEventListener('DOMContentLoaded', () => {
    const random6DigitCode = generate6DigitCode();
    document.getElementById('shoeCode').value = "" + random6DigitCode;
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        shopID = user.uid;
        console.log("shopID: ", shopID);

        // Fetch shop name from database
        const shopRef = dbRef(db, `AR_shoe_users/shop/${shopID}`);
        onValue(shopRef, (snapshot) => {
            const shopData = snapshot.val();
            if (shopData) {
                sname = shopData.shopName; // Set it globally
                console.log("shopName: ", sname);
            } else {
                console.warn("Shop name not found for user.");
            }
        });
    } else {
        window.location.href = "/user_login.html";
    }
});


function generate6DigitCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generate18CharID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 18; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

document.getElementById('shoeCode').disabled = true;

document.getElementById('addShoeForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!shopID) {
        alert("Please wait for authentication to complete");
        return;
    }

    // Get main shoe data
    const shoeCode = document.getElementById('shoeCode').value;
    const shoeName = document.getElementById('shoeName').value;
    const shoeDescription = document.getElementById('shoeDescription').value;
    const shoeImageFile = document.getElementById('shoeImage').files[0];
    const random18CharID = generate18CharID();

    // Get all variant data
    const variantGroups = document.querySelectorAll('.variant-group');
    const variants = {}; // Create ONE object to hold all variants

    // Process each variant
    variantGroups.forEach((group, index) => {
        const variantId = group.dataset.variantId;
        const variantName = document.getElementById(`variantName_${variantId}`).value;
        const color = document.getElementById(`color_${variantId}`).value;
        const price = document.getElementById(`variantPrice_${variantId}`).value;
        const variantImageFile = document.getElementById(`variantImage_${variantId}`).files[0];

        // Get sizes and stock for this variant
        const sizeContainer = document.getElementById(`sizeStockContainer_${variantId}`);
        const sizeItems = sizeContainer.querySelectorAll('.size-stock-item');
        const sizes = {};

        sizeItems.forEach((item, sizeIndex) => {
            const sizeValue = item.querySelector('.size-input').value;
            const stock = item.querySelector('.stock-input').value;
            
            // Create the nested structure
            sizes[`size_${sizeIndex}`] = {
                [sizeValue]: {
                    stock: parseInt(stock)
                }
            };
        });

        // Add to variants object with variant_X key
        variants[`variant_${index}`] = {
            variantName,
            color,
            price: parseFloat(price),
            sizes,
            variantImageFile
        };
    });

    try {
        // Upload main shoe image if exists
        let shoeImageUrl = '';
        if (shoeImageFile) {
            shoeImageUrl = await uploadFile(shoeImageFile, `shoes/${shopID}/${random18CharID}_${shoeCode}/main_image`);
        }

        // Process each variant and upload its image
        const variantEntries = Object.entries(variants);
        const variantPromises = variantEntries.map(async ([key, variant]) => {
            let variantImageUrl = '';
            if (variant.variantImageFile) {
                variantImageUrl = await uploadFile(
                    variant.variantImageFile,
                    `shoes/${shopID}/${random18CharID}_${shoeCode}/${key}`
                );
            }
            
            return {
                [key]: {
                    variantName: variant.variantName,
                    color: variant.color,
                    price: variant.price,
                    imageUrl: variantImageUrl,
                    sizes: variant.sizes
                }
            };
        });

        const processedVariants = Object.assign({}, ...await Promise.all(variantPromises));

        // Save all data to database
        await set(dbRef(db, `AR_shoe_users/shoe/${shopID}/${random18CharID}_${shoeCode}`), {
            shoeName: shoeName,
            shoeCode: shoeCode,
            generalDescription: shoeDescription,
            defaultImage: shoeImageUrl,
            variants: processedVariants,
            shopID: shopID,
            shopName: sname,
            dateAdded: new Date().toISOString()
        });

        alert("Shoe added successfully!");
        document.getElementById('addShoeForm').reset();
        document.getElementById('colorVariants').innerHTML = '';
        addColorVariant();
    } catch (error) {
        console.error("Error adding shoe: ", error);
        alert("Error adding shoe: " + error.message);
    }
});

async function uploadFile(file, path) {
    try {
        const fileRef = storageRef(storage, path);
        const uploadTask = uploadBytesResumable(fileRef, file);

        // Wait for the upload to complete
        await uploadTask;

        // Get the download URL
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Upload failed:", error);
        throw error; // Re-throw the error to handle it in the calling function
    }
}

// Variant and size management functions (same as in your HTML)
let variantCount = 0;

function addColorVariant() {
    variantCount++;
    const container = document.getElementById('colorVariants');

    const variant = document.createElement('div');
    variant.className = 'variant-group';
    variant.dataset.variantId = variantCount;
    variant.innerHTML = `
        <div class="form-group">
            <label for="variantName_${variantCount}">Variant Name</label>
            <input type="text" id="variantName_${variantCount}" required placeholder="e.g., Red Blazing, Stealth Black">
        </div>
        
        <div class="form-group">
            <label for="color_${variantCount}">Color</label>
            <input type="text" id="color_${variantCount}" required placeholder="e.g., Red, Black">
        </div>
        
        <div class="form-group">
            <label for="variantPrice_${variantCount}">Price ($)</label>
            <input type="number" id="variantPrice_${variantCount}" step="0.01" required>
        </div>
        
        <div class="form-group">
            <label for="variantImage_${variantCount}">Variant Image</label>
            <input type="file" id="variantImage_${variantCount}" accept="image/*">
        </div>
        
        <div class="form-group">
            <label>Sizes & Stock</label>
            <div class="size-stock-container" id="sizeStockContainer_${variantCount}">
                <!-- Size inputs will be added here -->
            </div>
            <button type="button" class="btn-secondary btn-add-size" onclick="addSizeInput(${variantCount})">
                <i class="fas fa-plus"></i> Add Size
            </button>
        </div>
        
        <button type="button" class="btn-remove" onclick="removeVariant(this)">
            <i class="fas fa-trash"></i> Remove Variant
        </button>
    `;

    container.appendChild(variant);
    addSizeInput(variantCount);
}

function addSizeInput(variantId) {
    const container = document.getElementById(`sizeStockContainer_${variantId}`);

    const sizeItem = document.createElement('div');
    sizeItem.className = 'size-stock-item';
    sizeItem.innerHTML = `
        <span>Size:</span>
        <input type="number" class="size-input" step="0.5" min="1" placeholder="Size" required>
        <span>Stock:</span>
        <input type="number" class="stock-input" min="0" placeholder="Qty" required>
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