import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, set, get, child } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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


onAuthStateChanged(auth, async (user) => {
    if (user) {
        USER = user.uid;
        const userRef = ref(db, `AR_shoe_users/customer/${user.uid}`);
        onValue(userRef, async (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                console.log(userData);
                // Now it's safe to load shoes
                loadShoes();  // ✅ Call here
            }
        }, { onlyOnce: true });
    } else {
        window.location.href = "/user_login.html";
    }
});



function createProductCard(shoeData) {
    const heartClass = shoeData.isWishlisted ? "fas" : "far";
    const heartColor = shoeData.isWishlisted ? "red" : "";

    console.log(shoeData.shopID); // Ensure you are logging shopID
    return `
    <div class="product-card">
      <img src="${shoeData.imageUrl}" alt="${shoeData.name}" class="product-image">
      <div class="product-info">
        <div class="product-shop">${shoeData.shopName}</div>
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





function loadShoes() {
    const user = auth.currentUser;
    if (!user) return;

    const userID = user.uid;
    const wishlistRef = ref(db, `AR_shoe_users/wishlist/${userID}`);

    get(wishlistRef).then((wishlistSnap) => {
        if (wishlistSnap.exists()) {
            wishlistData = wishlistSnap.val(); // All shopIDs and their shoeIDs
        }

        // Then load shoes
        const dbRef = ref(db, "AR_shoe_users/shoe");

        get(dbRef).then((snapshot) => {
            if (snapshot.exists()) {
                snapshot.forEach(shopSnap => {
                    const shopID = shopSnap.key;
                    shopSnap.forEach(shoeSnap => {
                        const shoeID = shoeSnap.key;
                        const shoeData = shoeSnap.val();

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
                            shopName: shopID,  // Passing shopID
                            shopID: shopID,    // Pass the shopID as well
                            isWishlisted: isWishlisted
                        });
                        

                        productsGrid.innerHTML += productCardHTML;
                    });
                });
            } else {
                console.log("No shoe data available");
            }
        }).catch((error) => {
            console.error("Error loading shoes: ", error);
        });
    });
}


function toggleWishlist(shoeID, shopID, btnElement) {
    const user = auth.currentUser;
    if (!user) {
      console.log("User not authenticated");
      return;
    }
  
    const userID = user.uid;
    const wishlistRef = ref(db, `AR_shoe_users/wishlist/${userID}/${shopID}/${shoeID}`);
  
    get(wishlistRef).then((snapshot) => {
      const icon = btnElement.querySelector("i");
  
      if (snapshot.exists()) {
        // Shoe is already in wishlist -> remove it
        set(wishlistRef, null).then(() => {
          console.log("Shoe removed from wishlist");
          icon.classList.remove("fas");
          icon.classList.add("far");
          icon.style.color = "";
        }).catch((error) => {
          console.error("Error removing from wishlist:", error);
        });
      } else {
        // Shoe is not in wishlist -> add it
        set(wishlistRef, true).then(() => {
          console.log("Shoe added to wishlist");
          icon.classList.remove("far");
          icon.classList.add("fas");
          icon.style.color = "red";
        }).catch((error) => {
          console.error("Error adding to wishlist:", error);
        });
      }
    });
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
loadShoes();
