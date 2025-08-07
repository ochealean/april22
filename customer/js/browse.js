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


// Add this to your browse.js file

// Search functionality
function setupSearch() {
  const searchInput = document.querySelector('.search-input');
  const searchBtn = document.querySelector('.search-btn');
  const productsGrid = document.getElementById('productsGrid');
  
  // Function to perform search
  async function performSearch(searchTerm) {
    const dbRef = ref(db, "AR_shoe_users/shoe");
    
    try {
        // Get all shop names first
        const shopNames = await getShopNames();

        // Then search through shoes
        const snapshot = await get(dbRef);
        productsGrid.innerHTML = ''; // Clear current results
        
        if (snapshot.exists()) {
            let foundResults = false;
            
            snapshot.forEach(shopSnap => {
                const shopID = shopSnap.key;
                const shopName = shopNames[shopID] || shopID;
                
                shopSnap.forEach(shoeSnap => {
                    const shoeID = shoeSnap.key;
                    const shoeData = shoeSnap.val();
                    
                    const shoeName = shoeData.shoeName.toLowerCase();
                    const shopNameLower = shopName.toLowerCase();
                    
                    if (shoeName.includes(searchTerm.toLowerCase()) || 
                        shopNameLower.includes(searchTerm.toLowerCase())) {
                        
                        foundResults = true;
                        const firstVariant = Object.values(shoeData.variants)[0];
                        const price = firstVariant.price;
                        const defaultImage = shoeData.defaultImage;
                        
                        const isWishlisted = wishlistData?.[shopID]?.[shoeID] === true;
                        
                        const productCardHTML = createProductCard({
                            shoeID: shoeID,
                            name: shoeData.shoeName,
                            price: price,
                            imageUrl: defaultImage,
                            shopName: shopName,  // This now uses the actual shop name
                            shopID: shopID,
                            isWishlisted: isWishlisted
                        });
                        
                        productsGrid.innerHTML += productCardHTML;
                    }
                });
            });
            
            if (!foundResults) {
                productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No matching shoes found</p>';
            }
        } else {
            productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No shoes available</p>';
        }
    } catch (error) {
        console.error("Error searching shoes: ", error);
    }
}
  
  // Search button click handler
  searchBtn.addEventListener('click', () => {
      const searchTerm = searchInput.value.trim();
      if (searchTerm) {
          performSearch(searchTerm);
      } else {
          // If search is empty, reload all shoes
          loadShoes();
      }
  });
  
  // Enter key handler
  searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
          const searchTerm = searchInput.value.trim();
          if (searchTerm) {
              performSearch(searchTerm);
          } else {
              loadShoes();
          }
      }
  });
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
              loadShoes();
              setupSearch(); // Add this line
          }
      }, { onlyOnce: true });
  } else {
      window.location.href = "/user_login.html";
  }
});



function createProductCard(shoeData) {
    const heartClass = shoeData.isWishlisted ? "fas" : "far";
    const heartColor = shoeData.isWishlisted ? "red" : "";

    // console.log(shoeData);
    
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


window.viewDetails = function (shoeID, shopID) {
    console.log(`Shoe ID: ${shoeID}, Shop ID: ${shopID}`);  // Log to console
    // alert(`Shoe ID: ${shoeID}, Shop ID: ${shopID}`);         // Then trigger alert
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

// Then modify the loadShoes function to use this
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
        
        if (snapshot.exists()) {
            productsGrid.innerHTML = ''; // Clear existing content
            
            snapshot.forEach(shopSnap => {
                const shopID = shopSnap.key;
                
                shopSnap.forEach(shoeSnap => {
                    const shoeID = shoeSnap.key;
                    const shoeData = shoeSnap.val();
                    const shopName = shoeData.shopName;

                    const shoeName = shoeData.shoeName;
                    const defaultImage = shoeData.defaultImage;
                    const firstVariant = Object.values(shoeData.variants)[0];
                    const price = firstVariant.price;

                    const isWishlisted = wishlistData?.[shopID]?.[shoeID] === true;

                    const productCardHTML = createProductCard({
                        shoeID: shoeID,
                        name: shoeName,
                        price: price,
                        imageUrl: defaultImage,
                        shopName: shopName,  // This now uses the actual shop name
                        shopID: shopID,
                        isWishlisted: isWishlisted
                    });

                    productsGrid.innerHTML += productCardHTML;
                });
            });
        } else {
            console.log("No shoe data available");
            productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No shoes available</p>';
        }
    } catch (error) {
        console.error("Error loading shoes: ", error);
    }
}


function toggleWishlist(shoeID, shopID, btnElement) {
    const user = auth.currentUser;
    if (!user) {
        showToast("Please login to manage wishlist", true);
        return;
    }

    const userID = user.uid;
    const wishlistRef = ref(db, `AR_shoe_users/wishlist/${userID}/${shopID}/${shoeID}`);

    get(wishlistRef).then((snapshot) => {
        const icon = btnElement.querySelector("i");

        if (snapshot.exists()) {
            // Shoe is already in wishlist -> remove it
            set(wishlistRef, null).then(() => {
                showToast("Removed shoe from wishlist");
                icon.classList.remove("fas");
                icon.classList.add("far");
                icon.style.color = "";
            }).catch((error) => {
                console.error("Error removing from wishlist:", error);
                showToast("Failed to remove from wishlist", true);
            });
        } else {
            // Shoe is not in wishlist -> add it
            set(wishlistRef, true).then(() => {
                showToast("Added shoe to wishlist");
                icon.classList.remove("far");
                icon.classList.add("fas");
                icon.style.color = "red";
            }).catch((error) => {
                console.error("Error adding to wishlist:", error);
                showToast("Failed to add to wishlist", true);
            });
        }
    });
}

    // Add toast styles
    const style = document.createElement('style');
    style.textContent = `
    .toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #4CAF50;
        color: white;
        padding: 15px 25px;
        border-radius: 4px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .toast.error {
        background-color: #f44336;
    }

    .toast.show {
        opacity: 1;
    }

    .toast i {
        font-size: 20px;
    }
    `;
    document.head.appendChild(style);

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
  

function addToWishlist(shoeID, shopID, btnElement) {
    const user = auth.currentUser;
  
    if (user) {
      const userID = user.uid;
      const wishlistRef = ref(db, `AR_shoe_users/wishlist/${userID}/${shopID}`);
  
      // Get current wishlist and append or merge
      get(wishlistRef).then(snapshot => {
        const currentData = snapshot.val() || {};
        currentData[shoeID] = true;
  
        return set(wishlistRef, currentData);
      }).then(() => {
        console.log("Shoe added to wishlist!");
  
        // Change icon to solid heart and color it red
        const icon = btnElement.querySelector("i");
        icon.classList.remove("far");
        icon.classList.add("fas");
        icon.style.color = "red";
      }).catch((error) => {
        console.error("Error adding shoe to wishlist:", error);
      });
    } else {
      console.log("User not authenticated");
    }
  }
  
window.toggleWishlist = toggleWishlist;

window.addToWishlist = addToWishlist; 


// window.viewDetails = function (shoeID) {
//     // Pass the shoe ID via the URL as a query parameter
//     window.location.href = `/customer/html/shoedetails.html?shoeID=${shoeID}`;
// };

// Call the function to load products

document.getElementById('logout_btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log("User signed out");
    }).catch((error) => {
        console.error("Error signing out: ", error);
    });
});



loadShoes();
