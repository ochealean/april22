import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, child, remove, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// Get the container where products will be displayed
const productsGrid = document.querySelector('.products-grid');

// Helper to display a single product
function createProductCard(data, shoeID) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Get the first variant price or default to 0
    const firstVariant = data.variants ? Object.values(data.variants)[0] : null;
    const price = firstVariant?.price || 0;
    
    // Safely handle missing image
    const imageUrl = data.defaultImage || 'path/to/placeholder-image.jpg';
    
    card.innerHTML = `
      <img src="${imageUrl}" alt="${data.shoeName || 'Shoe image'}" class="product-image">
      <div class="product-info">
        <div class="product-shop">${data.shopName || 'Unknown shop'}</div>
        <h3 class="product-name">${data.shoeName || 'Unnamed product'}</h3>
        <div class="product-price">₱${price.toFixed(2)}</div>
        <div class="product-actions">
          <button class="add-to-cart">Add to Cart</button>
          <button class="wishlist-btn"><i class="fas fa-heart"></i></button>
        </div>
      </div>
    `;

    card.querySelector('.add-to-cart').addEventListener('click', () => {
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
        shopId: data.shopID,
        shoeId: shoeID,
        variantKey: variantKey,
        sizeKey: sizeKey,
        shoeName: data.shoeName || "",
        variantName: variantData.variantName || "",
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
    

    card.querySelector('.wishlist-btn').addEventListener('click', () => {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to modify your wishlist.");
        return;
      }
    
      const shopID = data.shopID;
      const wishlistRef = ref(db, `AR_shoe_users/wishlist/${user.uid}/${shopID}/${shoeID}`);
    
      // Check if already in wishlist
      get(wishlistRef).then(snapshot => {
        if (snapshot.exists()) {
          // Already in wishlist — remove it
          if (confirm(`Remove ${data.shoeName} from your wishlist?`)) {
            remove(wishlistRef).then(() => {
              card.remove();
              if (!productsGrid.querySelector('.product-card')) {
                showEmptyState();
              }
            });
          }
        } else {
          // Not in wishlist — add it
          const wishlistItem = {
            shoeID,
            shopID,
            shoeName: data.shoeName || '',
            image: data.defaultImage || '',
            price: (data.variants && Object.values(data.variants)[0]?.price) || 0
          };
    
          set(wishlistRef, wishlistItem)
            .then(() => {
              alert(`${data.shoeName} added to your wishlist.`);
            })
            .catch(err => {
              console.error("Error adding to wishlist:", err);
              alert("Failed to add to wishlist");
            });
        }
      });
    });
    

  return card;
}

// Show empty state
function showEmptyState() {
  productsGrid.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <i class="fas fa-heart empty-icon"></i>
      <h3 class="empty-title">Your wishlist is empty</h3>
      <p class="empty-description">
        You haven't added any items to your wishlist yet. Browse our collection and click the heart icon to save your favorites.
      </p>
      <a href="/customer/html/browse.html" class="browse-btn">Browse Shoes</a>
    </div>
  `;
}

// Auth listener
onAuthStateChanged(auth, user => {
    if (user) {
      const wishlistRef = ref(db, 'AR_shoe_users/wishlist/' + user.uid);
      get(wishlistRef).then(snapshot => {
        if (snapshot.exists()) {
          productsGrid.innerHTML = '';
          
          snapshot.forEach(shopSnap => {
            const shopId = shopSnap.key;
            shopSnap.forEach(shoeSnap => {
              const shoeId = shoeSnap.key;
              
              // Verify the path exists before trying to fetch
              const shoeRef = ref(db, `AR_shoe_users/shoe/${shopId}/${shoeId}`);
              
              get(shoeRef).then(shoeSnap => {
                if (shoeSnap.exists()) {
                  const data = shoeSnap.val();
                  console.log('Shoe data:', data); // Debugging line
                  if (!data) {
                    console.error('Empty data for shoe:', shoeId);
                    return;
                  }
                  
                  // Ensure required fields exist
                  const cardData = {
                    ...data,
                    shoeName: data.shoeName || 'Unknown Shoe',
                    price: data.price || 0,
                    shopName: data.shopName || 'Unknown Shop',
                    defaultImage: data.defaultImage || 'path/to/placeholder.jpg'
                  };
                  
                  const card = createProductCard(cardData, shoeId);
                  productsGrid.appendChild(card);
                } else {
                  console.log('Shoe not found, removing from wishlist');
                  // Remove invalid reference
                  const invalidRef = ref(db, `AR_shoe_users/wishlist/${user.uid}/${shopId}/${shoeId}`);
                  remove(invalidRef);
                }
              }).catch(err => {
                console.error('Error fetching shoe:', err);
              });
            });
          });
        } else {
          showEmptyState();
        }
      }).catch(error => {
        console.error('Error loading wishlist:', error);
      });
    } else {
      window.location.href = "/login.html";
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