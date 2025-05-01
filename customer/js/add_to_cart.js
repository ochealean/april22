import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue, set, get, off } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Your Firebase config
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
const auth = getAuth();
const db = getDatabase(app);

let cartItems = [];

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadCart(user.uid);
        loadUserProfile(user.uid);
    } else {
        window.location.href = "/user_login.html";
    }
});


async function loadCart(userId) {
    const cartRef = ref(db, `AR_shoe_users/carts/${userId}`);
    onValue(cartRef, async (snapshot) => {
        if (!snapshot.exists()) {
            createCartSummary();
            showEmptyCart();
            return;
        }

        const cartData = snapshot.val();
        cartItems = await Promise.all(Object.entries(cartData).map(async ([cartId, item]) => {
            try {
                const shoeRef = ref(db, `AR_shoe_users/shoe/${item.shopId}/${item.shoeId}`);
                const shoeSnap = await get(shoeRef);

                if (!shoeSnap.exists()) return null;

                const shoeData = shoeSnap.val();
                const variant = shoeData.variants[item.variantKey];
                const sizeObj = variant.sizes[item.sizeKey];
                const sizeValue = Object.keys(sizeObj)[0];
                const stock = sizeObj[sizeValue].stock;

                return {
                    cartId,
                    shopId: item.shopId,
                    shoeId: item.shoeId,
                    variantKey: item.variantKey,
                    sizeKey: item.sizeKey,
                    quantity: item.quantity || 1,
                    shoeName: shoeData.shoeName,
                    price: parseFloat(variant.price),
                    imageUrl: variant.imageUrl || shoeData.defaultImage,
                    variantName: variant.variantName,
                    color: variant.color,
                    size: sizeValue,
                    availableStock: stock
                };
            } catch (err) {
                console.error(err);
                return null;
            }
        }));

        cartItems = cartItems.filter(item => item !== null);
        renderCart();
    });
}

function renderCart() {
    const cartContainer = document.getElementById("cartContainer");
    const cartSummaryContainer = document.getElementById("cartsummarycontainer");
    cartContainer.innerHTML = "";
    cartSummaryContainer.innerHTML = "";

    if (cartItems.length === 0) {
        createCartSummary();
        showEmptyCart();
        return;
    }

    const cartItemsSection = document.createElement('div');
    cartItemsSection.className = 'cart-items';

    cartItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
        <div class="cart-item-select">
                    <input type="checkbox" class="cart-item-checkbox" data-cartid="${item.cartId}" checked>
            </div>

            <div class="cart-item-picture">
                <img src="${item.imageUrl}" alt="${item.shoeName}" class="cart-item-image">
            </div>

                <div class="cart-item-details">
                    <h3 class="cart-item-name">${item.shoeName}</h3>
                    <p class="cart-item-variant">${item.variantName} (${item.color}) - Size: ${item.size}</p>
                    <p class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</p>

                    <div class="quantity-controls">
                        <button class="quantity-btn" data-cartid="${item.cartId}" data-change="-1">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${item.availableStock}" data-cartid="${item.cartId}">
                        <button class="quantity-btn" data-cartid="${item.cartId}" data-change="1">+</button>
                    </div>

                    <div class="cta-btn">
                        <button class="delete-btn" data-cartid="${item.cartId}"><i class="fas fa-trash"></i> Delete</button> <!--  Added this line -->
                        <button class="feedback-btn" data-cartid="${item.cartId}"><i class="fas fa-info-circle"></i> View Details </button>
                    </div>
                </div>
`;


        cartItemsSection.appendChild(itemElement);
    });

    cartContainer.appendChild(cartItemsSection);

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const cartId = e.target.dataset.cartid;
            const confirmDelete = confirm("Are you sure you want to delete this item?");
            if (!confirmDelete) return;
    
            try {
                await set(ref(db, `AR_shoe_users/carts/${auth.currentUser.uid}/${cartId}`), null);
                cartItems = cartItems.filter(item => item.cartId !== cartId);
                renderCart();
            } catch (error) {
                console.error("Error deleting item:", error);
            }
        });
    });

    createCartSummary();
    attachCartListeners();

    
document.getElementById("checkoutBtn").addEventListener("click", () => {
    const checkedCartIds = Array.from(document.querySelectorAll('.cart-item-checkbox:checked'))
        .map((cb, index) => [`cartOrder_${index + 1}`, cb.dataset.cartid]);

    if (checkedCartIds.length === 0) {
        alert("Please select at least one item to proceed to checkout.");
        return;
    }

    const params = new URLSearchParams([["method", "cartOrder"], ...checkedCartIds]);
    window.location.href = `checkout.html?${params.toString()}`;
});

}

function createCartSummary() {
    // const cartContainer = document.getElementById("cartContainer");
    const cartSummaryContainer = document.getElementById("cartsummarycontainer");
    const summary = document.createElement('div');
    summary.className = 'cart-summary';
    summary.id = 'cart-summary';

    summary.innerHTML = `
        <div class="summary-row">
            <span>Subtotal</span>
            <span id="subtotal">$0.00</span>
        </div>
        <div class="summary-row">
            <span>Tax (10%)</span>
            <span id="tax">$0.00</span>
        </div>
        <div class="summary-row">
            <span>Shipping</span>
            <span id="shipping">$5.00</span>
        </div>
        <div class="summary-row summary-total">
            <span>Total</span>
            <span id="total">$0.00</span>
        </div>
        <button class="checkout-btn" id="checkoutBtn">Proceed to Checkout</button>
        <a href="/customer/html/customer_dashboard.html" class="continue-shopping">
                <i class="fas fa-arrow-left"></i> Continue Shopping
            </a>
    `;

    cartSummaryContainer.appendChild(summary);

    updateTotals();
}

function attachCartListeners() {
    document.querySelectorAll('.cart-item-checkbox').forEach(cb => {
        cb.addEventListener('change', updateTotals);
    });

    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const cartId = e.target.dataset.cartid;
            const change = parseInt(e.target.dataset.change);
            const item = cartItems.find(i => i.cartId === cartId);
            if (!item) return;

            const newQty = item.quantity + change;
            if (newQty >= 1 && newQty <= item.availableStock) {
                item.quantity = newQty;
                await set(ref(db, `AR_shoe_users/carts/${auth.currentUser.uid}/${cartId}/quantity`), newQty);
                renderCart();
            }
        });
    });

    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            const cartId = e.target.dataset.cartid;
            const value = parseInt(e.target.value);
            const item = cartItems.find(i => i.cartId === cartId);
            if (!item) return;

            if (!isNaN(value) && value >= 1 && value <= item.availableStock) {
                item.quantity = value;
                await set(ref(db, `AR_shoe_users/carts/${auth.currentUser.uid}/${cartId}/quantity`), value);
                renderCart();
            }
        });
    });
}



function updateTotals() {
    const checkedCartIds = Array.from(document.querySelectorAll('.cart-item-checkbox:checked')).map(cb => cb.dataset.cartid);
    const selectedItems = cartItems.filter(item => checkedCartIds.includes(item.cartId));

    const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const shipping = selectedItems.length > 0 ? 5.0 : 0.0;
    const total = subtotal + tax + shipping;

    document.getElementById('subtotal').innerText = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').innerText = `$${tax.toFixed(2)}`;
    document.getElementById('shipping').innerText = `$${shipping.toFixed(2)}`;
    document.getElementById('total').innerText = `$${total.toFixed(2)}`;
}

function showEmptyCart() {
    const cartContainer = document.getElementById("cartContainer");
    cartContainer.innerHTML = `
        <div id="emptyCartMessage">
            Your cart is empty.
        </div>
    `;
}


// Profile function
function loadUserProfile(userId) {
    const userRef = ref(db, `AR_shoe_users/customer/${userId}`);
    get(userRef).then(snapshot => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            displayUserProfile(userData);
        } else {
            console.log("No user profile data found.");
        }
    }).catch(error => {
        console.error("Error loading user profile:", error);
    });
}

function displayUserProfile(userData) {
    const profileSection = document.getElementById("profileSection");
    document.getElementById("userName_display1").innerHTML = `${userData.firstName || ''} ${userData.lastName || ''}`;
    document.getElementById("imageProfile").src = userData.profilePhoto.profilePhoto.url || '';

    if (!profileSection) return;
}
