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
let RecentSalesFilter = 'day';

// DOM Elements
const elements = {
    userNameDisplay: document.getElementById('userName_display2'),
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
                    updateProfileHeader(shopData);
                } else {
                    // this will run if the user is a shop owner
                    roleLoggedin = "Shop Owner"; // Default role
                    sname = 'Shop Owner'; // Default shop name
                    shopLoggedin = user.uid;
                    employeeEmail = 'Shop Owner'; // Get employee email if available
                    loadShopProfile(shopLoggedin);
                    setupEventListeners();

                    // This is a shop owner, fetch shop data
                    const shopRef = ref(db, `AR_shoe_users/shop/${user.uid}`);
                    onValue(shopRef, (shopSnapshot) => {
                        if (shopSnapshot.exists()) {
                            const shopData = shopSnapshot.val();
                            // Update profile header for shop owners
                            updateProfileHeader(shopData);
                        }
                    }, { onlyOnce: true });
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

// Function to update profile header
function updateProfileHeader(userData) {
    const profilePicture = document.getElementById('profilePicture');
    const userFullname = document.getElementById('userFullname');
    
    if (!profilePicture || !userFullname) return;
    
    // Set profile name
    if (userData.name) {
        userFullname.textContent = userData.name;
    } else if (userData.shopName) {
        userFullname.textContent = userData.shopName;
    } else if (userData.ownerName) {
        userFullname.textContent = userData.ownerName;
    }
    
    // Set profile picture
    if (userData.profilePhoto && userData.profilePhoto.url) {
        profilePicture.src = userData.profilePhoto.url;
    } else if (userData.uploads && userData.uploads.shopLogo && userData.uploads.shopLogo.url) {
        profilePicture.src = userData.uploads.shopLogo.url;
    } else {
        // Set default avatar if no image available
        profilePicture.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23ddd'%3E%3Crect width='100' height='100'/%3E%3Ctext x='50%' y='50%' font-size='20' text-anchor='middle' dominant-baseline='middle' fill='%23666'%3EProfile%3C/text%3E%3C/svg%3E";
    }
}

// Logout functionality
document.getElementById('logout_btn').addEventListener('click', function () {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut().then(() => {
            window.location.href = '/user_login.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
        });
    }
});


function loadShopProfile(shopId) {
    // Load shop profile to get shop name for display
    const shopRef = ref(db, `AR_shoe_users/shop/${shopId}`);
    onValue(shopRef, (snapshot) => {
        if (snapshot.exists()) {
            const shopData = snapshot.val();
            elements.userNameDisplay.textContent = shopData.shopName || "Shop Manager";

            // Now load transactions for this shop
            console.log(shopData);
            loadInventoryChanges(shopId);
            loadShopTransactions(shopId, RecentSalesFilter);
        }
    });
}



// ito nagdidisplay ng Inventory Changes
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

                                // console.log("variant: ", shoes);

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
            renderInventoryStatusChart(inventoryChanges);
        }
    });
}

// ito nagdidisplay ng Recent Sales
function loadShopTransactions(shopId, filterDate) {
    const transactionsRef = ref(db, 'AR_shoe_users/transactions');
    onValue(transactionsRef, (snapshot) => {
        if (snapshot.exists()) {
            const allTransactions = snapshot.val();
            const shopTransactions = [];

            Object.keys(allTransactions).forEach(userId => {
                const userTransactions = allTransactions[userId];
                Object.keys(userTransactions).forEach(orderId => {
                    const transaction = userTransactions[orderId];
                    if (transaction.item && transaction.item.shopId === shopId) {
                        try {
                            const transactionDate = new Date(transaction.date);
                            if (!isNaN(transactionDate.getTime())) {
                                shopTransactions.push({
                                    ...transaction,
                                    orderId,
                                    userId
                                });
                            }
                        } catch (e) {
                            console.error(`Error processing order ${orderId}:`, e);
                        }
                    }
                });
            });

            // Sort by date (newest first)
            shopTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            displayTransactions(shopTransactions, filterDate);
            prepareChartData(shopTransactions, filterDate); // Pass the filterDate here
        }
    });
}

function displayTransactions(transactions, filterDate) {
    elements.recentSalesTable.innerHTML = '';

    const now = new Date();
    let validTransactions = [];

    if (filterDate.toLowerCase() === 'day') {
        validTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const today = new Date();

            today.setDate(now.getDate() - 1);
            return (
                transactionDate >= today
            );
        });
    } else if (filterDate.toLowerCase() === 'week') {
        validTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const today = new Date();
            const monthAgo = new Date();

            today.setDate(now.getDate() - 1);
            monthAgo.setMonth(now.getMonth() - 1);

            return transactionDate > monthAgo && today > transactionDate;
        });
    } else if (filterDate.toLowerCase() === 'month') {
        validTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const monthAgo = new Date();
            monthAgo.setMonth(now.getMonth() - 1);
            return transactionDate <= monthAgo;
        });
    } else {
        // Fallback if filter is not recognized
        validTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate <= now;
        });
    }

    console.log(validTransactions);
    console.log(now);
    console.log(filterDate);

    // Limit to 9 most recent transactions
    validTransactions.slice(0, 9).forEach(transaction => {
        const row = document.createElement('tr');

        // yung normal na new Date(transaction.date) is naka based lang sa local browser
        const date = new Date(new Date(transaction.date).toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

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

function prepareChartData(transactions, filterDate) {
    const now = new Date();
    let validTransactions = [];

    // Apply the same filtering logic as in displayTransactions()
    if (filterDate.toLowerCase() === 'day') {
        validTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const today = new Date();
            today.setDate(now.getDate() - 1);
            return transactionDate >= today;
        });
    } else if (filterDate.toLowerCase() === 'week') {
        validTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const today = new Date();
            const monthAgo = new Date();
            today.setDate(now.getDate() - 1);
            monthAgo.setMonth(now.getMonth() - 1);
            return transactionDate > monthAgo && today > transactionDate;
        });
    } else if (filterDate.toLowerCase() === 'month') {
        validTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const monthAgo = new Date();
            monthAgo.setMonth(now.getMonth() - 1);
            return transactionDate <= monthAgo;
        });
    } else {
        validTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate <= now;
        });
    }

    // Limit to 9 most recent transactions (same as the table)
    validTransactions = validTransactions.slice(0, 9);

    // Now prepare the chart data based on these filtered transactions
    const chartData = {};

    validTransactions.forEach(transaction => {
        const date = new Date(new Date(transaction.date).toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        let key;

        if (filterDate.toLowerCase() === 'day') {
            // For day view, show exact time
            key = date.toLocaleTimeString();
        } else if (filterDate.toLowerCase() === 'week') {
            // For week view, show day names
            key = date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            // For month view, show month/day
            key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        chartData[key] = (chartData[key] || 0) + (transaction.totalAmount || 0);
    });

    renderChart(chartData, filterDate);
}


function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function setupEventListeners() {

    // Filter buttons for recent sales
    document.querySelectorAll('[data-recent-filter]').forEach(btn => {
        btn.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            RecentSalesFilter = this.dataset.recentFilter;
            loadShopTransactions(shopLoggedin, RecentSalesFilter); // <-- Reload with new filter
        });
    });


    // Filter buttons for inventory
    // document.querySelectorAll('[data-filter]').forEach(btn => {
    //     btn.addEventListener('click', function () {
    //         const parent = this.parentElement;
    //         parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    //         this.classList.add('active');

    //         // Here you would implement filtering logic based on the selected filter
    //         // For now, we'll just log it
    //         console.log(`Filter inventory by: ${this.dataset.filter}`);
    //     });
    // });
}


//  ---------------------------------------------- FOR CHART ------------------------------------------------
let salesChartInstance; // store the Chart instance

function renderChart(chartData, filterDate) {
    const ctx = document.getElementById('salesChart').getContext('2d');

    // Destroy previous chart if it exists
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    // Prepare labels and data
    const labels = Object.keys(chartData);
    const data = Object.values(chartData);

    if (labels.length > 0 && data.length > 0) {
        salesChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales (₱)',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return '₱' + context.raw.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        },
                        ticks: {
                            callback: function (value) {
                                return '₱' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        right: 15,
                        bottom: 10,
                        left: 15
                    }
                }
            }
        });
    } else {
        // Display a message when no data is available
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No sales data available for this period', ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
}


// ----------------------------------- FOR INVENTORY STATUS --------------------------------

function renderInventoryStatusChart(inventoryChanges) {
    const statusCounts = {
        normal: 0,
        warning: 0,
        outOfStock: 0
    };

    inventoryChanges.forEach(item => {
        if (item.status === 'normal') statusCounts.normal++;
        else if (item.status === 'warning') statusCounts.warning++;
        else if (item.status === 'out of stock' || item.status === 'danger') statusCounts.outOfStock++;
    });

    const ctx = document.getElementById('inventoryStatusChart').getContext('2d');
    if (window.inventoryChart) {
        window.inventoryChart.destroy();
    }

    window.inventoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Normal', 'Warning', 'Out of Stock'],
            datasets: [{
                label: 'Inventory Status',
                data: [statusCounts.normal, statusCounts.warning, statusCounts.outOfStock],
                backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                borderWidth: 1,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 20,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%',
            spacing: 5
        }
    });
}

// ----------------- FOR PRINT FUNCTION ----------------------------
document.getElementById('printInventoryBtn').addEventListener('click', async () => {
    // Show loading indicator
    const btn = document.getElementById('printInventoryBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        // Create a container for all the content
        const printContainer = document.createElement('div');
        printContainer.style.padding = '20px';
        printContainer.style.fontFamily = 'Arial, sans-serif';

        // Add header with shop name and logo
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '20px';
        header.style.borderBottom = '1px solid #ddd';
        header.style.paddingBottom = '20px';

        const shopTitle = document.createElement('h1');
        shopTitle.textContent = `${sname || 'Shop'} Analytics Report`;
        shopTitle.style.margin = '0';
        shopTitle.style.fontSize = '24px';
        shopTitle.style.color = '#333';

        const reportDate = document.createElement('div');
        reportDate.textContent = `Report Date: ${new Date().toLocaleDateString()}`;
        reportDate.style.fontSize = '14px';
        reportDate.style.color = '#666';

        header.appendChild(shopTitle);
        header.appendChild(reportDate);
        printContainer.appendChild(header);

        // Convert charts to images first
        const charts = [
            document.getElementById('salesChart'),
            document.getElementById('inventoryStatusChart')
        ];

        // Replace each chart with its image representation
        for (const chart of charts) {
            if (chart) {
                const img = document.createElement('img');
                img.src = chart.toDataURL('image/png');
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '0 auto';

                // Create a container for the chart
                const chartContainer = document.createElement('div');
                chartContainer.style.marginBottom = '30px';
                chartContainer.style.pageBreakInside = 'avoid';
                chartContainer.appendChild(img);

                // Add the chart title
                const chartTitle = chart.closest('.analytics-card')?.querySelector('.card-title');
                if (chartTitle) {
                    const titleClone = chartTitle.cloneNode(true);
                    titleClone.style.marginBottom = '15px';
                    titleClone.style.textAlign = 'center';
                    titleClone.style.fontSize = '18px';
                    chartContainer.insertBefore(titleClone, img);
                }

                printContainer.appendChild(chartContainer);
            }
        }

        // Clone all analytics cards
        const analyticsCards = document.querySelectorAll('.analytics-card');

        for (const card of analyticsCards) {
            if (card.querySelector('canvas')) continue;

            const clone = card.cloneNode(true);
            clone.style.boxShadow = 'none';
            clone.style.border = '1px solid #ddd';
            clone.style.borderRadius = '5px';
            clone.style.padding = '15px';
            clone.style.marginBottom = '20px';
            clone.style.pageBreakInside = 'avoid';

            const cardTitle = clone.querySelector('.card-title');
            if (cardTitle) {
                cardTitle.style.fontSize = '18px';
                cardTitle.style.marginBottom = '15px';
            }

            const tables = clone.querySelectorAll('table');
            tables.forEach(table => {
                table.style.width = '100%';
                table.style.fontSize = '10pt';
                table.style.borderCollapse = 'collapse';

                const ths = table.querySelectorAll('th');
                ths.forEach(th => {
                    th.style.backgroundColor = '#f5f5f5';
                    th.style.padding = '8px';
                    th.style.textAlign = 'left';
                });

                const tds = table.querySelectorAll('td');
                tds.forEach(td => {
                    td.style.padding = '8px';
                    td.style.borderBottom = '1px solid #ddd';
                });
            });

            printContainer.appendChild(clone);
        }

        // PDF options - now with landscape orientation and visible footer
        const opt = {
            margin: [20, 40, 30, 40], // Increased bottom margin for footer
            filename: `${sname || 'Shop'}_Analytics_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: {
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: true,
                letterRendering: true,
                // Ensure footer is rendered
                onclone: function (clonedDoc) {
                    const footer = clonedDoc.createElement('div');
                    footer.style.position = 'fixed';
                    footer.style.bottom = '0';
                    footer.style.width = '100%';
                    footer.style.textAlign = 'center';
                    footer.style.fontSize = '10px';
                    footer.style.color = '#666';
                    footer.style.padding = '5px';
                    footer.style.borderTop = '1px solid #eee';
                    footer.innerHTML = `Page <span class="pageNumber"></span> of <span class="totalPages"></span>`;
                    clonedDoc.body.appendChild(footer);
                }
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'landscape' // Changed to landscape
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
            // Header configuration
            header: {
                height: '15mm',
                contents: `<div style="text-align: center; font-size: 12px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    ${sname || 'Shop'} Analytics Report - ${new Date().toLocaleDateString()}
                </div>`
            },
            // Footer configuration - now properly visible
            footer: {
                height: '15mm',
                contents: {
                    first: '',
                    default: function (pageNum, numPages) {
                        return `<div style="text-align: center; font-size: 10px; color: #666; border-top: 1px solid #eee; padding-top: 5px; margin-top: 10px;">
                            Page ${pageNum} of ${numPages}
                        </div>`;
                    },
                    last: ''
                }
            }
        };

        await new Promise(resolve => setTimeout(resolve, 300));
        await html2pdf().set(opt).from(printContainer).save();

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        btn.classList.remove('loading');
    }
});