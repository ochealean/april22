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
    const originalText = btn.textContent;
    const originalHTML = btn.innerHTML; // Store original HTML including icon
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        // Create a container for all the content
        const printContainer = document.createElement('div');
        printContainer.style.padding = '20px';
        printContainer.style.fontFamily = 'Arial, sans-serif';

        // Add title and date
        const title = document.createElement('h1');
        title.textContent = `${sname || 'Shop'} Analytics Report`;
        title.style.textAlign = 'center';
        title.style.marginBottom = '10px';
        printContainer.appendChild(title);

        const date = document.createElement('p');
        date.textContent = `Generated: ${new Date().toLocaleString()}`;
        date.style.textAlign = 'center';
        date.style.marginBottom = '30px';
        date.style.color = '#666';
        printContainer.appendChild(date);

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
                chartContainer.appendChild(img);

                // Add the chart title
                const chartTitle = chart.closest('.analytics-card')?.querySelector('.card-title');
                if (chartTitle) {
                    const titleClone = chartTitle.cloneNode(true);
                    titleClone.style.marginBottom = '15px';
                    titleClone.style.textAlign = 'center';
                    chartContainer.insertBefore(titleClone, img);
                }

                printContainer.appendChild(chartContainer);
            }
        }

        // Clone all analytics cards
        const analyticsCards = document.querySelectorAll('.analytics-card');

        for (const card of analyticsCards) {
            // Skip if this is one of the chart cards (we already processed them)
            if (card.querySelector('canvas')) continue;

            const clone = card.cloneNode(true);

            // Style adjustments for PDF
            clone.style.boxShadow = 'none';
            clone.style.border = '1px solid #ddd';
            clone.style.borderRadius = '5px';
            clone.style.padding = '15px';
            clone.style.marginBottom = '20px';
            clone.style.pageBreakInside = 'avoid'; // Prevent splitting across pages

            // Ensure tables are properly scaled
            const tables = clone.querySelectorAll('table');
            tables.forEach(table => {
                table.style.width = '100%';
                table.style.fontSize = '10pt';
                table.style.borderCollapse = 'collapse';
            });

            printContainer.appendChild(clone);
        }

        // PDF options
        const opt = {
            margin: [15, 15, 15, 15], // Slightly larger margins
            filename: `${sname || 'Shop'}_Analytics_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { 
                type: 'jpeg', 
                quality: 1.0 // Higher quality
            },
            html2canvas: {
                scale: 2,
                logging: false, // Disable logging for production
                useCORS: true,
                scrollX: 0,
                scrollY: 0,
                allowTaint: true,
                letterRendering: true,
                onclone: (clonedDoc) => {
                    // Ensure all content is visible
                    clonedDoc.querySelectorAll('table, img, div').forEach(el => {
                        el.style.visibility = 'visible';
                        el.style.opacity = '1';
                    });
                }
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                hotfixes: ['px_scaling'] // Fix for pixel scaling issues
            }
        };

        // Add a small delay to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 300));

        // Generate PDF
        await html2pdf().set(opt).from(printContainer).save();

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        // Restore button state
        btn.innerHTML = originalHTML; // Restore original HTML including icon
        btn.disabled = false;
        btn.classList.remove('loading');
    }
});