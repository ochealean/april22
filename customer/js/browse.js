import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, set, get, child } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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
const productsGrid = document.getElementById("productsGrid");

let USER;
let wishlistData = {}; 
let allShoes = []; // Store all shoes for filtering
let activeTag = null; // Track the currently active tag

// Debounce function to prevent rapid clicks
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show loader immediately when the page starts loading
document.addEventListener('DOMContentLoaded', function() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainContent = document.querySelector('.main-content');
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
});

// Search functionality
function setupSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    const clearBtn = document.createElement('button');
    
    // Create clear button
    clearBtn.innerHTML = '<i class="fas fa-times"></i>';
    clearBtn.className = 'clear-btn';
    clearBtn.style.display = 'none';
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        clearActiveTag();
        loadShoes(); // Reload all shoes
    });
    
    // Add clear button after search input
    searchInput.parentNode.appendChild(clearBtn);
    
    // Show/hide clear button based on input
    searchInput.addEventListener('input', () => {
        clearBtn.style.display = searchInput.value ? 'block' : 'none';
    });
    
    // Function to perform search
    function performSearch(searchTerm) {
        if (!searchTerm) {
            loadShoes();
            return;
        }
        
        // Filter shoes based on search term
        const filteredShoes = allShoes.filter(shoe => {
            const searchLower = searchTerm.toLowerCase();
            return (
                shoe.name.toLowerCase().includes(searchLower) ||
                shoe.shopName.toLowerCase().includes(searchLower) ||
                shoe.type.toLowerCase().includes(searchLower) ||
                shoe.brand.toLowerCase().includes(searchLower)
            );
        });
        
        displayShoes(filteredShoes);
    }
    
    // Search button click handler
    searchBtn.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim();
        performSearch(searchTerm);
    });
    
    // Enter key handler
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = searchInput.value.trim();
            performSearch(searchTerm);
        }
    });
}

function setupTagFunctionality() {
    const tags = document.querySelectorAll('.tag');
    const searchInput = document.querySelector('.search-input');
    const clearBtn = document.querySelector('.clear-btn');
    
    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            const tagText = tag.textContent.trim();
            
            // Clear previous active tag
            clearActiveTag();
            
            // Set this tag as active
            tag.classList.add('active');
            activeTag = tagText;
            
            // Update search input with tag text
            searchInput.value = tagText;
            
            // Show clear button
            if (clearBtn) clearBtn.style.display = 'block';
            
            // Perform search with the tag
            performTagSearch(tagText);
        });
    });
}

function clearActiveTag() {
    if (activeTag) {
        const tags = document.querySelectorAll('.tag');
        tags.forEach(tag => {
            if (tag.textContent.trim() === activeTag) {
                tag.classList.remove('active');
            }
        });
        activeTag = null;
    }
}

function performTagSearch(tagText) {
    const filteredShoes = allShoes.filter(shoe => {
        const tagLower = tagText.toLowerCase();
        return (
            shoe.type.toLowerCase() === tagLower ||
            shoe.brand.toLowerCase() === tagLower ||
            shoe.name.toLowerCase().includes(tagLower) ||
            shoe.shopName.toLowerCase().includes(tagLower)
        );
    });
    
    displayShoes(filteredShoes);
}

// Call this function after onAuthStateChanged
onAuthStateChanged(auth, async (user) => {
    if (user) {
        USER = user.uid;
        const userRef = ref(db, `AR_shoe_users/customer/${user.uid}`);
        onValue(userRef, async (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                console.log(userData);
                // Now it's safe to load shoes and setup search
                await loadShoes();
                setupSearch();
                setupTagFunctionality();
                
                // Hide loader and show content
                const loadingOverlay = document.getElementById('loadingOverlay');
                const mainContent = document.querySelector('.main-content');
                
                loadingOverlay.style.opacity = '0';
                loadingOverlay.style.visibility = 'hidden';
                mainContent.classList.add('loaded');
            }
        }, { onlyOnce: true });
    } else {
        window.location.href = "/user_login.html";
    }
});

function createProductCard(shoeData) {
    const heartClass = shoeData.isWishlisted ? "fas" : "far";
    const heartColor = shoeData.isWishlisted ? "red" : "";

    return `
    <div class="product-card">
      <img src="${shoeData.imageUrl}" alt="${shoeData.name}" class="product-image">
      <div class="product-info">
        <div class="product-shop"><h4>Shop Name: ${shoeData.shopName}</h4></div>
        <h3 class="product-name">${shoeData.name}</h3>
        <div class="product-price">₱${shoeData.price.toFixed(2)}</div>
        <div class="product-actions">
            <button class="add-to-cart" onclick="viewDetails('${shoeData.shoeID}', '${shoeData.shopID}')">View Details</button>
            <button class="wishlist-btn" onclick="toggleWishlist('${shoeData.shoeID}', '${shoeData.shopID}', this)">
                <i class="${heartClass} fa-heart" style="color: ${heartColor};"></i>
            </button>
        </div>
      </div>
    </div>
  `;
}

function displayShoes(shoes) {
    if (shoes.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-shoe-prints"></i>
                <h3>No Shoes Found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = '';
    shoes.forEach(shoe => {
        const productCardHTML = createProductCard(shoe);
        productsGrid.innerHTML += productCardHTML;
    });
}

window.viewDetails = function (shoeID, shopID) {
    console.log(`Shoe ID: ${shoeID}, Shop ID: ${shopID}`);
    window.location.href = `/customer/html/shoedetails.html?shoeID=${shoeID}&shopID=${shopID}`;
};

async function getShopNames() {
    const shopsRef = ref(db, "AR_shoe_users/shop");
    try {
        const snapshot = await get(shopsRef);
        const shopNames = {};
        if (snapshot.exists()) {
            snapshot.forEach((shopSnap) => {
                shopNames[shopSnap.key] = shopSnap.val().shopName || shopSnap.key;
            });
        }
        return shopNames;
    } catch (error) {
        console.error("Error loading shop names: ", error);
        return {};
    }
}

// Modified loadShoes function to store all shoes
async function loadShoes() {
    const user = auth.currentUser;
    if (!user) return;

    const userID = user.uid;
    const wishlistRef = ref(db, `AR_shoe_users/wishlist/${userID}`);

    try {
        // Get wishlist data
        const wishlistSnap = await get(wishlistRef);
        if (wishlistSnap.exists()) {
            wishlistData = wishlistSnap.val();
        }

        // Get all shop names first
        const shopNames = await getShopNames();

        // Now get all shoes
        const dbRef = ref(db, "AR_shoe_users/shoe");
        const snapshot = await get(dbRef);
        
        // Reset allShoes array
        allShoes = [];
        
        if (snapshot.exists()) {
            snapshot.forEach(shopSnap => {
                const shopID = shopSnap.key;
                
                shopSnap.forEach(shoeSnap => {
                    const shoeID = shoeSnap.key;
                    const shoeData = shoeSnap.val();
                    const shopName = shopNames[shopID] || shopID;

                    const shoeName = shoeData.shoeName;
                    const defaultImage = shoeData.defaultImage;
                    const firstVariant = Object.values(shoeData.variants)[0];
                    const price = firstVariant.price;
                    const type = shoeData.type || 'Unknown';
                    const brand = shoeData.brand || 'Unknown';

                    const isWishlisted = wishlistData?.[shopID]?.[shoeID] === true;

                    allShoes.push({
                        shoeID: shoeID,
                        name: shoeName,
                        price: price,
                        imageUrl: defaultImage,
                        shopName: shopName,
                        shopID: shopID,
                        isWishlisted: isWishlisted,
                        type: type,
                        brand: brand
                    });
                });
            });
            
            // Display all shoes
            displayShoes(allShoes);
        } else {
            console.log("No shoe data available");
            productsGrid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i class="fas fa-shoe-prints"></i><h3>No shoes available</h3><p>Check back later for new arrivals</p></div>';
        }
    } catch (error) {
        console.error("Error loading shoes: ", error);
    }
}

// Modified toggleWishlist function with debounce and button disabling
const debouncedToggleWishlist = debounce(async (shoeID, shopID, btnElement) => {
    const user = auth.currentUser;
    if (!user) {
        showToast("Please login to manage wishlist", true);
        return;
    }

    // Disable button during operation
    btnElement.disabled = true;
    
    const userID = user.uid;
    const wishlistRef = ref(db, `AR_shoe_users/wishlist/${userID}/${shopID}/${shoeID}`);

    try {
        const snapshot = await get(wishlistRef);
        const icon = btnElement.querySelector("i");

        if (snapshot.exists()) {
            // Shoe is already in wishlist -> remove it
            await set(wishlistRef, null);
            showToast("Removed shoe from wishlist");
            icon.classList.remove("fas");
            icon.classList.add("far");
            icon.style.color = "";
        } else {
            // Shoe is not in wishlist -> add it
            await set(wishlistRef, true);
            showToast("Added shoe to wishlist");
            icon.classList.remove("far");
            icon.classList.add("fas");
            icon.style.color = "red";
        }
    } catch (error) {
        console.error("Error toggling wishlist:", error);
        showToast("Failed to update wishlist", true);
    } finally {
        // Re-enable button after operation
        btnElement.disabled = false;
    }
}, 500); // 500ms debounce time

// Update the window.toggleWishlist assignment
window.toggleWishlist = debouncedToggleWishlist;

// Add CSS for clear button and active tags
const additionalStyles = `
.clear-btn {
    background: transparent;
    border: none;
    color: var(--gray-dark);
    cursor: pointer;
    padding: 0 10px;
    font-size: 1rem;
    transition: color 0.3s;
}

.clear-btn:hover {
    color: var(--primary);
}

.tag.active {
    background-color: var(--primary);
    color: white;
}
`;

const styleElement = document.createElement('style');
styleElement.textContent = additionalStyles;
document.head.appendChild(styleElement);

// Function to show toast messages
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.innerHTML = `<i class="fas ${isError ? 'fa-times-circle' : 'fa-check-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

document.getElementById('logout_btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log("User signed out");
    }).catch((error) => {
        console.error("Error signing out: ", error);
    });
});