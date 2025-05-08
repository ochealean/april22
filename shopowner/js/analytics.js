// analytics.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Global variables
let shopLoggedin; // shop ID of the logged-in user
let roleLoggedin; // role of the logged-in user
let sname; //shop name
let employeeEmail; // email of the employee to be added

// DOM Elements
const elements = {
    userNameDisplay: document.getElementById('userName_display2'),
    userProfileImage: document.getElementById('imageProfile'),
    recentSalesTable: document.getElementById('recentSales'),
    inventoryChangesTable: document.getElementById('inventoryChanges'),
    logoutBtn: document.getElementById('logout_btn')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Fetch shop name from database
            const shopRef = ref(db, `AR_shoe_users/employees/${user.uid}`);
            onValue(shopRef, (snapshot) => {
                const shopData = snapshot.val();
                console.log("shopData: ", shopData);

                // this will run if the user a Employee NOT a shop owner
                if (shopData) {
                    roleLoggedin = shopData.role;
                    shopLoggedin = shopData.shopId;
                    console.log("shopLoggedin: ", shopLoggedin);
                    sname = shopData.shopName || ''; // Initialize with empty string if not available
                    employeeEmail = shopData?.email || ''; // Get employee email if available

                    // Set role-based UI elements
                    if (shopData.role.toLowerCase() === "manager") {
                        document.getElementById("addemployeebtn").style.display = "none";
                    } else if (shopData.role.toLowerCase() === "salesperson") {
                        document.getElementById("addemployeebtn").style.display = "none";
                        document.getElementById("analyticsbtn").style.display = "none";
                    }
                    loadShopProfile(shopLoggedin);
                    setupEventListeners();
                } else {
                    // this will run if the user is a shop owner
                    roleLoggedin = "Shop Owner"; // Default role
                    sname = 'Shop Owner'; // Default shop name
                    shopLoggedin = user.uid;
                    employeeEmail = 'Shop Owner'; // Get employee email if available
                    loadShopProfile(shopLoggedin);
                    setupEventListeners();
                }
            }, (error) => {
                console.error("Error fetching shop data:", error);
                shopLoggedin = user.uid; // Fallback to user UID
                sname = 'Unknown Shop';
            });
        } else {
            window.location.href = "/user_login.html";
        }
    });
});


function loadShopProfile(shopId) {
    // Load shop profile to get shop name for display
    const shopRef = ref(db, `AR_shoe_users/shop/${shopId}`);
    onValue(shopRef, (snapshot) => {
        if (snapshot.exists()) {
            const shopData = snapshot.val();
            elements.userNameDisplay.textContent = shopData.shopName || "Shop Manager";

            // Now load transactions for this shop
            loadShopTransactions(shopId);
            loadInventoryChanges(shopId);
        }
    });
}

function loadShopTransactions(shopId) {
    const transactionsRef = ref(db, 'AR_shoe_users/transactions');
    onValue(transactionsRef, (snapshot) => {
        if (snapshot.exists()) {
            const allTransactions = snapshot.val();
            const shopTransactions = [];
            let filteredOutCount = 0;

            Object.keys(allTransactions).forEach(userId => {
                const userTransactions = allTransactions[userId];

                Object.keys(userTransactions).forEach(orderId => {
                    const transaction = userTransactions[orderId];

                    // Debug logging for each transaction
                    console.log(`Processing order ${orderId}:`, transaction);

                    if (transaction.item && transaction.item.shopId === shopId) {
                        try {
                            const transactionDate = new Date(transaction.date);
                            if (isNaN(transactionDate.getTime())) {
                                console.error(`Invalid date for order ${orderId}: ${transaction.date}`);
                                return;
                            }
                            shopTransactions.push({
                                ...transaction,
                                orderId,
                                userId
                            });
                        } catch (e) {
                            console.error(`Error processing order ${orderId}:`, e);
                        }
                    } else {
                        filteredOutCount++;
                        console.log(`Filtered out order ${orderId} - shopId mismatch or missing item`);
                    }
                });
            });

            console.log(`Total transactions: ${Object.keys(allTransactions).length}`);
            console.log(`Filtered transactions for shop ${shopId}: ${shopTransactions.length}`);
            console.log(`Transactions filtered out: ${filteredOutCount}`);

            // Sort by date (newest first)
            shopTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            displayTransactions(shopTransactions);
            prepareChartData(shopTransactions);
        }
    });
}

function displayTransactions(transactions) {
    elements.recentSalesTable.innerHTML = '';

    // Filter out future dates if needed
    const now = new Date();
    const validTransactions = transactions.filter(t => new Date(t.date) <= now);

    validTransactions.forEach(transaction => {
        // Add new rows
        transactions.forEach(transaction => {
            const row = document.createElement('tr');

            // Format date
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

            // Determine status class
            let statusClass = 'badge-primary';
            if (transaction.status === 'Delivered') statusClass = 'badge-success';
            if (transaction.status === 'rejected') statusClass = 'badge-danger';
            if (transaction.status === 'cancelled') statusClass = 'badge-warning';

            row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${transaction.orderId}</td>
            <td>${transaction.shippingInfo?.firstName || 'N/A'} ${transaction.shippingInfo?.lastName || ''}</td>
            <td>${transaction.item.name} (${transaction.item.variantName})</td>
            <td>${transaction.item.size}</td>
            <td>${transaction.item.quantity}</td>
            <td>₱${transaction.totalAmount?.toLocaleString() || '0'}</td>
            <td><span class="badge ${statusClass}">${transaction.status}</span></td>
        `;
            elements.recentSalesTable.appendChild(row);
        });
    });
}

function loadInventoryChanges(shopId) {
    const shoesRef = ref(db, `AR_shoe_users/shoe/${shopId}`);

    onValue(shoesRef, (snapshot) => {
        if (snapshot.exists()) {
            const shoes = snapshot.val();
            const inventoryChanges = [];

            // For each shoe, track inventory changes
            Object.keys(shoes).forEach(shoeId => {
                const shoe = shoes[shoeId];

                // Check variants
                if (shoe.variants) {
                    Object.keys(shoe.variants).forEach(variantKey => {
                        const variant = shoe.variants[variantKey];

                        // Check sizes
                        if (variant.sizes) {
                            Object.keys(variant.sizes).forEach(sizeKey => {
                                const size = variant.sizes[sizeKey];
                                const sizeValue = Object.keys(size)[0]; // Get the size value (e.g., "8")
                                const stock = size[sizeValue].stock;

                                console.log("variant: ", shoes);

                                // Add to inventory changes
                                inventoryChanges.push({
                                    date: shoe.dateAdded,
                                    shoe: `${shoe.shoeName} (${variant.variantName}) <span style="background-color:#bfbfbf; border-radius:5px;">size: ${sizeValue}</span>`,
                                    action: size[sizeValue].actionValue || 'Initial Stock',
                                    user: employeeEmail || 'System',
                                    quantity: stock,
                                    status: stock > 10 ? 'normal' : stock > 0 ? 'warning' : 'out of stock'
                                });
                            });
                        }
                    });
                }
            });

            // Display in table
            displayInventoryChanges(inventoryChanges);
        }
    });
}

function displayInventoryChanges(changes) {
    // Clear existing rows
    elements.inventoryChangesTable.innerHTML = '';

    // Sort by date (newest first)
    changes.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Add new rows (limit to 10 most recent)
    changes.slice(0, 10).forEach(item => {
        const row = document.createElement('tr');

        let statusClass = 'badge-success';
        if (item.status === 'warning') statusClass = 'badge-warning';
        if (item.status === 'danger' || item.status === 'out of stock') statusClass = 'badge-danger';

        // Format date
        const date = new Date(item.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.shoe}</td>
            <td>${item.action}</td>
            <td>${item.user}</td>
            <td>${item.quantity}</td>
            <td><span class="badge ${statusClass}">${item.status}</span></td>
        `;
        elements.inventoryChangesTable.appendChild(row);
    });
}

function prepareChartData(transactions) {
    // Group transactions by date for sales chart
    const dailySales = {};
    const weeklySales = {};
    const monthlySales = {};

    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const day = date.toLocaleDateString();
        const week = getWeekNumber(date);
        const month = date.getMonth() + 1 + '/' + date.getFullYear();

        // Daily sales
        if (!dailySales[day]) dailySales[day] = 0;
        dailySales[day] += transaction.totalAmount || 0;

        // Weekly sales
        if (!weeklySales[week]) weeklySales[week] = 0;
        weeklySales[week] += transaction.totalAmount || 0;

        // Monthly sales
        if (!monthlySales[month]) monthlySales[month] = 0;
        monthlySales[month] += transaction.totalAmount || 0;
    });

    // Here you would update your charts with this data
    // For example:
    // updateSalesChart(Object.keys(dailySales), Object.values(dailySales));
    // You'll need to implement the chart updating logic based on your chart library
}

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function setupEventListeners() {
    // Logout button
    elements.logoutBtn.addEventListener('click', function () {
        auth.signOut().then(() => {
            window.location.href = '/shopowner/html/shopowner_login.html';
        }).catch(error => {
            console.error('Logout error:', error);
        });
    });

    // Filter buttons for recent sales
    document.querySelectorAll('[data-recent-filter]').forEach(btn => {
        btn.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Here you would implement filtering logic based on the selected period
            // For now, we'll just log it
            console.log(`Filter recent sales by: ${this.dataset.recentFilter}`);
        });
    });

    // Filter buttons for inventory
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Here you would implement filtering logic based on the selected filter
            // For now, we'll just log it
            console.log(`Filter inventory by: ${this.dataset.filter}`);
        });
    });
}