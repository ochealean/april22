import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, child, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
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
    alert(`Added ${data.shoeName} to cart`);
  });

  card.querySelector('.wishlist-btn').addEventListener('click', () => {
    if (confirm(`Remove ${data.shoeName} from your wishlist?`)) {
      const itemRef = ref(db, `AR_shoe_users/wishlist/${auth.currentUser.uid}/${shoeID}`);
      remove(itemRef).then(() => {
        card.remove();
        if (!productsGrid.querySelector('.product-card')) {
          showEmptyState();
        }
      });
    }
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
