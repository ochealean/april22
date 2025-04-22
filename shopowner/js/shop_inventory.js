import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, remove, set, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
const auth = getAuth(app);
const db = getDatabase(app);

let shopLoggedin;

// Expose functions to global scope
window.showShoeDetails = showShoeDetails;
window.editShoe = editShoe;
window.promptDelete = promptDelete;
window.closeModal = closeModal;
window.addNewShoe = addNewShoe;

onAuthStateChanged(auth, (user) => {
    if (user) {
        shopLoggedin = user.uid;
        loadInventory('inventoryTableBody');
    } else {
        window.location.href = "/user_login.html";
    }
});

function addNewShoe() {
    window.location.href = "/shopowner/html/shopowner_addshoe.html";
}

function loadInventory(tableBodyId) {
    const inventoryRef = ref(db, `AR_shoe_users/shoe/${shopLoggedin}`);
    const tbody = document.getElementById(tableBodyId);

    if (!tbody) return;

    onValue(inventoryRef, (snapshot) => {
        tbody.innerHTML = '';

        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="7">No shoes found in inventory</td></tr>`;
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const shoe = childSnapshot.val();
            const row = createInventoryRow(childSnapshot.key, shoe);
            tbody.appendChild(row);
        });
    });
}

function createInventoryRow(shoeId, shoe) {
    const row = document.createElement('tr');
    row.className = 'animate-fade';
    row.setAttribute('data-id', shoeId);

    // Calculate total stock from all variants
    let totalStock = 0;
    if (shoe.variants && Array.isArray(shoe.variants)) {
        shoe.variants.forEach(variant => {
            if (variant.sizes && Array.isArray(variant.sizes)) {
                variant.sizes.forEach(size => {
                    totalStock += parseInt(size.stock) || 0;
                });
            }
        });
    }

    // Format date
    const addedDate = shoe.dateAdded ? new Date(shoe.dateAdded).toLocaleDateString() : 'N/A';

    // Get first variant for display
    const firstVariant = shoe.variants && shoe.variants[0] ? shoe.variants[0] : null;
    const price = firstVariant ? `$${firstVariant.price}` : 'N/A';

    row.innerHTML = `
        <td>
            ${shoe.defaultImage ? 
                `<img src="${shoe.defaultImage}" alt="${shoe.shoeName}" class="shoe-thumbnail">` : 
                '<div class="no-image">No Image</div>'}
        </td>
        <td>${shoe.shoeName || 'N/A'}</td>
        <td>${shoe.shoeCode || 'N/A'}</td>
        <td>${price}</td>
        <td>${totalStock}</td>
        <td>${addedDate}</td>
        <td class="action-buttons">
            <button class="btn btn-view" onclick="showShoeDetails('${shoeId}')">
                <i class="fas fa-eye"></i> View
            </button>
            <button class="btn btn-edit" onclick="editShoe('${shoeId}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-danger" onclick="promptDelete('${shoeId}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </td>
    `;
    return row;
}

function showShoeDetails(shoeId) {
    const shoeRef = ref(db, `AR_shoe_users/shoe/${shopLoggedin}/${shoeId}`);
    const modalContent = document.getElementById('shoeDetailsContent');
    const modalElement = document.getElementById('shoeDetailsModal');

    onValue(shoeRef, (snapshot) => {
        const shoe = snapshot.val();
        if (!shoe) {
            alert('Shoe not found');
            return;
        }

        // Format date
        const addedDate = shoe.dateAdded ? new Date(shoe.dateAdded).toLocaleString() : 'N/A';

        // Generate variants HTML
        let variantsHtml = '';
        if (shoe.variants && Array.isArray(shoe.variants)) {
            shoe.variants.forEach((variant, index) => {
                let sizesHtml = '';
                if (variant.sizes && Array.isArray(variant.sizes)) {
                    sizesHtml = variant.sizes.map(size => 
                        `<div class="size-item">Size ${size.size}: ${size.stock} in stock</div>`
                    ).join('');
                }

                variantsHtml += `
                    <div class="variant-detail">
                        <h4>${variant.variantName || 'Variant'} (${variant.color || 'No color'})</h4>
                        <p><strong>Price:</strong> $${variant.price || '0.00'}</p>
                        ${variant.imageUrl ? 
                            `<img src="${variant.imageUrl}" alt="${variant.variantName}" class="variant-image">` : 
                            '<p>No variant image</p>'}
                        <div class="size-container">${sizesHtml}</div>
                    </div>
                    ${index < shoe.variants.length - 1 ? '<hr>' : ''}
                `;
            });
        }

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>${shoe.shoeName || 'Shoe Details'}</h2>
                <button onclick="closeModal()" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="shoe-main-info">
                    <div class="shoe-image-container">
                        ${shoe.defaultImage ? 
                            `<img src="${shoe.defaultImage}" alt="${shoe.shoeName}" class="main-shoe-image">` : 
                            '<p>No main image</p>'}
                    </div>
                    <div class="shoe-text-info">
                        <p><strong>Code:</strong> ${shoe.shoeCode || 'N/A'}</p>
                        <p><strong>Added:</strong> ${addedDate}</p>
                        <p><strong>Description:</strong></p>
                        <p>${shoe.generalDescription || 'No description available'}</p>
                    </div>
                </div>
                
                <h3 class="variants-header">Variants</h3>
                <div class="variants-container">
                    ${variantsHtml || '<p>No variants available</p>'}
                </div>
            </div>
        `;

        modalElement.classList.add('show');
        document.body.classList.add('modal-open');
    }, (error) => {
        console.error("Error fetching shoe details:", error);
        alert('Error loading shoe details');
    });
}

function closeModal() {
    document.getElementById('shoeDetailsModal').classList.remove('show');
    document.body.classList.remove('modal-open');
}

function promptDelete(shoeId) {
    if (confirm('Are you sure you want to delete this shoe?')) {
        deleteShoe(shoeId);
    }
}

function deleteShoe(shoeId) {
    const shoeRef = ref(db, `AR_shoe_users/shoe/${shopLoggedin}/${shoeId}`);
    remove(shoeRef)
        .then(() => {
            alert("Shoe deleted successfully!");
        })
        .catch((error) => {
            console.error("Error deleting shoe:", error);
            alert("Error deleting shoe: " + error.message);
        });
}

function editShoe(shoeId) {
    window.location.href = `/shopowner/html/shopowner_addshoe.html?edit=${shoeId}`;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Role-based access control
    const userRole = localStorage.getItem('userRole');
    if (userRole === "employee") {
        document.querySelectorAll(".manager, .shopowner").forEach(el => el.style.display = "none");
    } else if (userRole === "manager") {
        document.querySelectorAll(".shopowner").forEach(el => el.style.display = "none");
    }

    // Search functionality
    document.getElementById('searchInventory')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#inventoryTable tbody tr').forEach(row => {
            const name = row.children[1]?.textContent.toLowerCase() || '';
            const code = row.children[2]?.textContent.toLowerCase() || '';
            row.style.display = (name.includes(term) || code.includes(term)) ? '' : 'none';
        });
    });
});