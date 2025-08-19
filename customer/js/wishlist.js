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

// Get the container where products will be displayed - FIXED THIS LINE
const productsGrid = document.querySelector('.wishlist-container');

// Helper to display a single product
function createProductCard(data, shoeID) {
  const card = document.createElement('div');
  card.className = 'shoe-card';

  // Get the first variant price or default to 0
  const firstVariant = data.variants ? Object.values(data.variants)[0] : null;
  const price = firstVariant?.price || 0;

  // Safely handle missing image
  const imageUrl = data.defaultImage || 'path/to/placeholder-image.jpg';

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
      <div class="shoe-code">SKU: ${shoeID}</div>
      <div class="product-meta">
        <span class="product-brand">${data.brand || 'Unknown brand'}</span>
        <span class="product-type">${data.category || 'Shoes'}</span>
      </div>
      <div class="shoe-description">${data.description || 'No description available.'}</div>
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
      const wishlistRef = ref(db, `AR_shoe_users/wishlist/${user.uid}/${data.shopID}/${shoeID}`);
      remove(wishlistRef).then(() => {
        card.remove();
        if (!productsGrid.querySelector('.shoe-card')) {
          showEmptyState();
        }
      });
    }
  });

  // Add event listener for view button
  card.querySelector('.btn-view').addEventListener('click', () => {
    // You can implement navigation to product details page here
    console.log("View details for:", shoeID);
  });

  // Add event listener for add to cart button
  card.querySelector('.btn-cart').addEventListener('click', () => {
    const user = auth.currentUser;
    console.log(user);
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

    console.log(data.shopID);
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

    console.log(cartItem);

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

// Auth listener
onAuthStateChanged(auth, user => {
  if (user) {
    console.log(user);
    const wishlistRef = ref(db, 'AR_shoe_users/wishlist/' + user.uid);
    get(wishlistRef).then(snapshot => {
      if (snapshot.exists()) {
        productsGrid.innerHTML = '';

        snapshot.forEach(shopSnap => {
          const shopId = shopSnap.key;
          shopSnap.forEach(shoeSnap => {
            const shoeId = shoeSnap.key;
            console.log(shoeId);

            // Verify the path exists before trying to fetch
            const shoeRef = ref(db, `AR_shoe_users/shoe/${shopId}/${shoeId}`);
            console.log(shoeId);

            get(shoeRef).then(shoeSnap => {
              if (shoeSnap.exists()) {
                const data = shoeSnap.val();
                console.log('Shoe data:', data); // Debugging line
                if (!data) {
                  console.error('Empty data for shoe:', shoeId);
                  console.log(shoeId);
                  return;
                }
                console.log(shoeId);

                // Ensure required fields exist
                const cardData = {
                  ...data,
                  shopID: shopId,
                  shoeName: data.shoeName || 'Unknown Shoe',
                  price: data.price || 0,
                  shopName: data.shopName || 'Unknown Shop',
                  defaultImage: data.defaultImage || 'path/to/placeholder.jpg'
                };
                console.log(shoeId);

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
        // ito lalabas kapag walang laman sa wishlist
        showEmptyState();
      }
    }).catch(error => {
      console.error('Error loading wishlist:', error);
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

document.getElementById('logout_btn').addEventListener('click', () => {
  auth.signOut().then(() => {
    console.log("User signed out");
  }).catch((error) => {
    console.error("Error signing out: ", error);
  });
});