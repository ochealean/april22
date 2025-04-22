import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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

let shopLoggedin;

// Expose functions to global scope
window.viewShoeDetails = viewShoeDetails;

onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, `AR_shoe_users/employees/${user.uid}`);
        onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const role = userData.role;
                const shopId = userData.shopId;
                shopLoggedin = shopId;

                console.log("Authenticated as employee:", user.uid);
                console.log("Role:", role);
                if (role === "employee") {
                    document.getElementById("addemployeebtn").style.display = "none";
                }
                else if (role === "manager") {
                    document.getElementById("addemployeebtn").style.display = "none";
                }
                loadShopDashboard();
            } else {
                // Not found in employee records, assume shop owner
                shopLoggedin = user.uid;
                console.log("Authenticated as shop owner:", shopLoggedin);
                loadShopDashboard();
            }
        }, {
            onlyOnce: true
        });
    } else {
        window.location.href = "/user_login.html";
    }
});


function loadShopDashboard() {

    loadShopStats();
    loadRecentProducts();
}

function loadShopStats() {
    const shoesRef = ref(db, `AR_shoe_users/shoe/${shopLoggedin}`);

    onValue(shoesRef, (snapshot) => {
        if (snapshot.exists()) {
            const shoes = [];
            snapshot.forEach((childSnapshot) => {
                shoes.push(childSnapshot.val());
            });

            // Update stats cards
            updateStatsCards(shoes);
        }
    });
}

function updateStatsCards(shoes) {
    // Calculate total products
    const totalProducts = shoes.length;
    const productsElement = document.querySelector('.stats-grid .stat-card:nth-child(3) .value');
    if (productsElement) productsElement.textContent = totalProducts;

    // Calculate total stock
    let totalStock = 0;
    shoes.forEach(shoe => {
        if (shoe.variants) {
            shoe.variants.forEach(variant => {
                if (variant.sizes) {
                    variant.sizes.forEach(size => {
                        totalStock += parseInt(size.stock) || 0;
                    });
                }
            });
        }
    });

    // Update the stock card if you have one
    const stockElement = document.querySelector('.stats-grid .stat-card:nth-child(4) .value');
    if (stockElement) stockElement.textContent = totalStock;
}

function loadRecentProducts() {
    const shoesRef = ref(db, `AR_shoe_users/shoe/${shopLoggedin}`);
    const recentAddedContainer = document.getElementById('recentAdded');

    onValue(shoesRef, (snapshot) => {
        if (snapshot.exists()) {
            const shoes = [];
            snapshot.forEach((childSnapshot) => {
                const shoe = childSnapshot.val();
                shoe.id = childSnapshot.key; // Add the ID to the shoe object
                shoes.push(shoe);
            });

            // Sort by dateAdded (newest first) and get top 4
            const recentShoes = shoes.sort((a, b) => {
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            }).slice(0, 4);

            displayRecentProducts(recentShoes, recentAddedContainer);
        } else {
            if (recentAddedContainer) {
                recentAddedContainer.innerHTML = '<p>No shoes added yet</p>';
            }
        }
    });
}

function displayRecentProducts(shoes, container) {
    if (!container) return;

    if (shoes.length === 0) {
        container.innerHTML = '<p>No shoes added yet</p>';
        return;
    }

    let html = '<div class="product-list">';

    shoes.forEach(shoe => {
        // Get first variant for display
        const firstVariant = shoe.variants && shoe.variants[0] ? shoe.variants[0] : null;
        const price = firstVariant ? `$${firstVariant.price}` : '$0.00';
        const color = firstVariant ? firstVariant.color : 'No color';
        const imageUrl = shoe.defaultImage || (firstVariant ? firstVariant.imageUrl : null);

        html += `
        <div class="product-card">
            <div class="product-image">
                ${imageUrl ?
                `<img src="${imageUrl}" alt="${shoe.shoeName}" class="shoe-thumbnail">` :
                '<div class="no-image">No Image</div>'}
            </div>
            <div class="product-info">
                <div class="product-title">${shoe.shoeName || 'No Name'}</div>
                <div class="product-code">Code: ${shoe.shoeCode || 'N/A'}</div>
                <div class="product-price">${price}</div>
                <div class="product-color">${color}</div>
                <button class="btn btn-view" onclick="viewShoeDetails('${shoe.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function viewShoeDetails(shoeId) {
    // Store the shoe ID to view details on inventory page
    localStorage.setItem('viewingShoeId', shoeId);
    window.location.href = '/shopowner/html/shop_inventory.html';
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

    // Search functionality for inventory if on that page
    const searchInput = document.getElementById('searchInventory');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#inventoryTable tbody tr').forEach(row => {
                const name = row.children[1]?.textContent.toLowerCase() || '';
                const code = row.children[2]?.textContent.toLowerCase() || '';
                row.style.display = (name.includes(term) || code.includes(term)) ? '' : 'none';
            });
        });
    }

});
// Logout functionality
const logoutBtn = document.getElementById('logout_btn');
logoutBtn.addEventListener('click', () => {
    const auth = getAuth();
    auth.signOut().then(() => {
        localStorage.clear();
        window.location.href = '/user_login.html';
    }).catch((error) => {
        console.error('Logout failed:', error);
    });
});