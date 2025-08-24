// wishlist.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, child, remove, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase config
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const productsGrid = document.querySelector('.wishlist-container');
const searchBar = document.querySelector('.search-bar');
const sortOptions = document.querySelector('.sort-options');
const mobileToggle = document.querySelector('.mobile-menu-toggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.querySelector('.sidebar-overlay');
const logoutBtn = document.getElementById('logout_btn');
const userNameDisplay = document.getElementById('userName_display2');
const userImageProfile = document.getElementById('imageProfile');

// Store all wishlist items for search functionality
let allWishlistItems = [];

// Mobile sidebar toggle
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

// Search functionality
searchBar.addEventListener('input', handleSearch);

function handleSearch() {
  const searchTerm = searchBar.value.toLowerCase().trim();
  
  if (!searchTerm) {
    // If search is empty, show all items
    renderWishlistItems(allWishlistItems);
    return;
  }
  
  // Filter items based on search term
  const filteredItems = allWishlistItems.filter(item => {
    return (
      item.data.shoeName.toLowerCase().includes(searchTerm) ||
      (item.data.brand && item.data.brand.toLowerCase().includes(searchTerm)) ||
      (item.data.category && item.data.category.toLowerCase().includes(searchTerm)) ||
      (item.data.description && item.data.description.toLowerCase().includes(searchTerm)) ||
      (item.data.shoeCode && item.data.shoeCode.toLowerCase().includes(searchTerm))
    );
  });
  
  renderWishlistItems(filteredItems);
}

// Sort functionality
sortOptions.addEventListener('change', handleSort);

function handleSort() {
  const sortBy = sortOptions.value;
  let sortedItems = [...allWishlistItems];
  
  switch(sortBy) {
    case 'Sort by: Price Low to High':
      sortedItems.sort((a, b) => {
        const priceA = getPrice(a.data);
        const priceB = getPrice(b.data);
        return priceA - priceB;
      });
      break;
      
    case 'Sort by: Price High to Low':
      sortedItems.sort((a, b) => {
        const priceA = getPrice(a.data);
        const priceB = getPrice(b.data);
        return priceB - priceA;
      });
      break;
      
    case 'Sort by: Recently Added':
    default:
      // Default order (as loaded from Firebase)
      break;
  }
  
  renderWishlistItems(sortedItems);
}

function getPrice(data) {
  const firstVariant = data.variants ? Object.values(data.variants)[0] : null;
  return firstVariant?.price || 0;
}

// Render wishlist items to the grid
function renderWishlistItems(items) {
  productsGrid.innerHTML = '';
  
  if (items.length === 0) {
    showEmptyState();
    return;
  }
  
  items.forEach(item => {
    const card = createProductCard(item.data, item.shoeId, item.shopId);
    productsGrid.appendChild(card);
  });
}

// Helper to display a single product
function createProductCard(data, shoeID, shopID) {
  const card = document.createElement('div');
  card.className = 'shoe-card';

  // Get the first variant price or default to 0
  const firstVariant = data.variants ? Object.values(data.variants)[0] : null;
  const price = firstVariant?.price || 0;

  // Safely handle missing image
  const imageUrl = data.defaultImage || 'https://via.placeholder.com/300x200?text=No+Image';

  // Get brand and category from data
  const brand = data.brand || 'Unknown Brand';
  const category = data.category || data.shoeType || 'Shoes';
  const shoeCode = data.shoeCode || shoeID;

  // Create the card HTML that matches your wishlist structure
  card.innerHTML = `
    <div class="remove-wishlist">
      <i class="fas fa-times"></i>
    </div>
    <div class="shoe-image">
      <img src="${imageUrl}" alt="${data.shoeName || 'Shoe image'}">
    </div>
    <div class="shoe-details">
      <h3>${data.shoeName || 'Unnamed product'}</h3>
      <div class="shoe-code">Code: ${shoeCode}</div>
      <div class="product-meta">
        <span class="product-brand">${data.shoeBrand}</span>
        <span class="product-type">${data.shoeType}</span>
      </div>
      <div class="shoe-description">${data.generalDescription || data.description || 'No description available.'}</div>
      <div class="shoe-price">₱${price.toFixed(2)}</div>
      <div class="shoe-actions">
        <button class="btn-view">
          <i class="fas fa-eye"></i> View Details
        </button>
        <button class="btn-cart">
          <i class="fas fa-shopping-cart"></i>
        </button>
      </div>
    </div>
  `;

  // Add event listener for remove button
  card.querySelector('.remove-wishlist').addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to modify your wishlist.");
      return;
    }

    if (confirm(`Remove ${data.shoeName} from your wishlist?`)) {
      const wishlistRef = ref(db, `AR_shoe_users/wishlist/${user.uid}/${shopID}/${shoeID}`);
      remove(wishlistRef).then(() => {
        // Remove from allWishlistItems array
        allWishlistItems = allWishlistItems.filter(item => 
          !(item.shoeId === shoeID && item.shopId === shopID)
        );
        
        card.remove();
        if (allWishlistItems.length === 0) {
          showEmptyState();
        }
      }).catch(error => {
        console.error("Error removing from wishlist:", error);
        alert("Failed to remove item from wishlist");
      });
    }
  });

  // Add event listener for view button
  card.querySelector('.btn-view').addEventListener('click', () => {
    // Navigate to product details page
    window.location.href = `/customer/html/shoedetails.html?shopID=${shopID}&shoeID=${shoeID}`;
  });

  // Add event listener for add to cart button
  card.querySelector('.btn-cart').addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add items to your cart.");
      return;
    }

    // Get first variant (or handle selection)
    const variants = data.variants ? Object.entries(data.variants) : [];
    if (variants.length === 0) {
      alert("No variants available for this shoe.");
      return;
    }

    // Use first variant as default
    const [variantKey, variantData] = variants[0];

    // Get first available size
    const sizes = variantData.sizes ? Object.entries(variantData.sizes) : [];
    if (sizes.length === 0) {
      alert("No sizes available for this variant.");
      return;
    }

    const [sizeKey, sizeObj] = sizes[0];
    const sizeValue = Object.keys(sizeObj)[0];

    // Create complete cart item
    const cartItem = {
      shopId: shopID,
      shoeId: shoeID,
      variantKey: variantKey,
      sizeKey: sizeKey,
      shoeName: data.shoeName || "",
      variantName: variantData.variantName || variantData.color || "",
      color: variantData.color || "",
      size: sizeValue,
      price: variantData.price || 0,
      image: variantData.imageUrl || data.defaultImage || "",
      quantity: 1,
      addedAt: new Date().toISOString()
    };

    // Generate unique cart ID (MUST match dashboard behavior)
    const cartId = generate18CharID();
    const cartRef = ref(db, `AR_shoe_users/carts/${user.uid}/${cartId}`);

    set(cartRef, cartItem)
      .then(() => {
        alert(`${data.shoeName} added to cart`);
      })
      .catch(err => {
        console.error("Error adding to cart:", err);
        alert("Failed to add to cart");
      });
  });

  return card;
}

// Show empty state
function showEmptyState() {
  productsGrid.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-heart empty-icon"></i>
      <h3 class="empty-title">Your wishlist is empty</h3>
      <p class="empty-description">
          You haven't added any items to your wishlist yet. Browse our collection and click the heart icon to save your favorites.
      </p>
      <a href="/customer/html/browse.html" class="browse-btn">
          <i class="fas fa-shopping-bag"></i> Browse Shoes
      </a>
    </div>
  `;
}

// Load user profile data
function loadUserProfile(userId) {
  const userRef = ref(db, `AR_shoe_users/customer/${userId}`);
  get(userRef).then(snapshot => {
    if (snapshot.exists()) {
      const userData = snapshot.val();
      if (userNameDisplay) {
        userNameDisplay.textContent = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Customer Name';
      }
      if (userImageProfile && userData.profilePhoto && userData.profilePhoto.profilePhoto && userData.profilePhoto.profilePhoto.url) {
        userImageProfile.src = userData.profilePhoto.profilePhoto.url;
      }
    }
  }).catch(error => {
    console.error('Error loading user profile:', error);
  });
}

// Auth listener
onAuthStateChanged(auth, user => {
  if (user) {
    // Load user profile
    loadUserProfile(user.uid);
    
    const wishlistRef = ref(db, 'AR_shoe_users/wishlist/' + user.uid);
    get(wishlistRef).then(snapshot => {
      if (snapshot.exists()) {
        allWishlistItems = [];
        productsGrid.innerHTML = '';

        const promises = [];
        
        snapshot.forEach(shopSnap => {
          const shopId = shopSnap.key;
          shopSnap.forEach(shoeSnap => {
            const shoeId = shoeSnap.key;
            
            // Verify the path exists before trying to fetch
            const shoeRef = ref(db, `AR_shoe_users/shoe/${shopId}/${shoeId}`);
            
            const promise = get(shoeRef).then(shoeSnap => {
              if (shoeSnap.exists()) {
                const data = shoeSnap.val();
                if (!data) {
                  console.error('Empty data for shoe:', shoeId);
                  return;
                }

                // Ensure required fields exist
                const cardData = {
                  ...data,
                  shopID: shopId,
                  shoeName: data.shoeName || 'Unknown Shoe',
                  price: data.price || 0,
                  shopName: data.shopName || 'Unknown Shop',
                  defaultImage: data.defaultImage || 'https://via.placeholder.com/300x200?text=No+Image'
                };
                
                // Add to allWishlistItems array for search functionality
                allWishlistItems.push({
                  data: cardData,
                  shoeId: shoeId,
                  shopId: shopId
                });
              } else {
                console.log('Shoe not found, removing from wishlist');
                // Remove invalid reference
                const invalidRef = ref(db, `AR_shoe_users/wishlist/${user.uid}/${shopId}/${shoeId}`);
                return remove(invalidRef);
              }
            }).catch(err => {
              console.error('Error fetching shoe:', err);
            });
            
            promises.push(promise);
          });
        });
        
        // Wait for all promises to resolve before rendering
        Promise.all(promises).then(() => {
          if (allWishlistItems.length > 0) {
            renderWishlistItems(allWishlistItems);
          } else {
            showEmptyState();
          }
        });
      } else {
        // Show empty state if wishlist is empty
        showEmptyState();
      }
    }).catch(error => {
      console.error('Error loading wishlist:', error);
      showEmptyState();
    });
  } else {
    window.location.href = "/user_login.html";
  }
});

function generate18CharID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 18; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Logout functionality
if (logoutBtn) {
  logoutBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
      auth.signOut().then(() => {
        window.location.href = '/user_login.html';
      }).catch((error) => {
        console.error('Error signing out:', error);
      });
    }
  });
}