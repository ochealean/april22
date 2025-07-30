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

// Chart instances
let salesChartInstance = null;
let inventoryChartInstance = null;

// DOM Elements
const elements = {
    userNameDisplay: document.querySelector('.user-profile span'),
    recentSalesTable: document.getElementById('recentSales'),
    inventoryChangesTable: document.getElementById('inventoryChanges'),
    logoutBtn: document.getElementById('logout_btn')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    // Mobile sidebar toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });
    
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Check auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Fetch shop name from database
            const shopRef = ref(db, `AR_shoe_users/employees/${user.uid}`);
            onValue(shopRef, (snapshot) => {
                const shopData = snapshot.val();
                console.log("shopData: ", shopData);

                if (shopData) {
                    // Employee (not shop owner)
                    roleLoggedin = shopData.role;
                    shopLoggedin = shopData.shopId;
                    console.log("shopLoggedin: ", shopLoggedin);
                    sname = shopData.shopName || '';
                    employeeEmail = shopData?.email || '';

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
                    // Shop owner
                    roleLoggedin = "Shop Owner";
                    sname = 'Shop Owner';
                    shopLoggedin = user.uid;
                    employeeEmail = 'Shop Owner';
                    loadShopProfile(shopLoggedin);
                    setupEventListeners();
                }
            }, (error) => {
                console.error("Error fetching shop data:", error);
                shopLoggedin = user.uid;
                sname = 'Unknown Shop';
            });
        } else {
            window.location.href = "/user_login.html";
        }
    });

    // Logout button
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', () => {
            elements.logoutBtn.disabled = true;
            elements.logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';

            auth.signOut().then(() => {
                window.location.href = "/user_login.html";
            }).catch((error) => {
                console.error("Logout error:", error);
                alert("Failed to logout. Please try again.");
                elements.logoutBtn.disabled = false;
                elements.logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            });
        });
    }
});

function loadShopProfile(shopId) {
    const shopRef = ref(db, `AR_shoe_users/shop/${shopId}`);
    onValue(shopRef, (snapshot) => {
        if (snapshot.exists()) {
            const shopData = snapshot.val();
            if (elements.userNameDisplay) {
                elements.userNameDisplay.textContent = shopData.shopName || "Shop Manager";
            }
            loadInventoryChanges(shopId);
            loadShopTransactions(shopId, RecentSalesFilter);
        }
    });
}

function loadInventoryChanges(shopId) {
    const shoesRef = ref(db, `AR_shoe_users/shoe/${shopId}`);

    onValue(shoesRef, (snapshot) => {
        if (snapshot.exists()) {
            const shoes = snapshot.val();
            const inventoryChanges = [];

            Object.keys(shoes).forEach(shoeId => {
                const shoe = shoes[shoeId];

                if (shoe.variants) {
                    Object.keys(shoe.variants).forEach(variantKey => {
                        const variant = shoe.variants[variantKey];

                        if (variant.sizes) {
                            Object.keys(variant.sizes).forEach(sizeKey => {
                                const size = variant.sizes[sizeKey];
                                const sizeValue = Object.keys(size)[0];
                                const stock = size[sizeValue].stock;

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

            displayInventoryChanges(inventoryChanges);
            renderInventoryStatusChart(inventoryChanges);
        }
    });
}

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

            shopTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            displayTransactions(shopTransactions, filterDate);
            prepareChartData(shopTransactions, filterDate);
        }
    });
}

function displayTransactions(transactions, filterDate) {
    if (!elements.recentSalesTable) return;
    
    elements.recentSalesTable.innerHTML = '';

    const now = new Date();
    let validTransactions = [];

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

    validTransactions.slice(0, 9).forEach(transaction => {
        const row = document.createElement('tr');
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
    if (!elements.inventoryChangesTable) return;
    
    elements.inventoryChangesTable.innerHTML = '';
    changes.sort((a, b) => new Date(b.date) - new Date(a.date));

    changes.slice(0, 10).forEach(item => {
        const row = document.createElement('tr');
        let statusClass = 'badge-success';
        if (item.status === 'warning') statusClass = 'badge-warning';
        if (item.status === 'danger' || item.status === 'out of stock') statusClass = 'badge-danger';

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

    validTransactions = validTransactions.slice(0, 9);
    const chartData = {};

    validTransactions.forEach(transaction => {
        const date = new Date(new Date(transaction.date).toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        let key;

        if (filterDate.toLowerCase() === 'day') {
            key = date.toLocaleTimeString();
        } else if (filterDate.toLowerCase() === 'week') {
            key = date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        chartData[key] = (chartData[key] || 0) + (transaction.totalAmount || 0);
    });

    renderChart(chartData, filterDate);
}

function renderChart(chartData, filterDate) {
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart if it exists
    if (salesChartInstance) {
        salesChartInstance.destroy();
        salesChartInstance = null;
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
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderColor: '#4361ee',
                    borderWidth: 2,
                    pointBackgroundColor: '#4361ee',
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
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No sales data available for this period', ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
}

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

    const ctx = document.getElementById('inventoryChart')?.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart if it exists
    if (inventoryChartInstance) {
        inventoryChartInstance.destroy();
        inventoryChartInstance = null;
    }

    inventoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Normal', 'Warning', 'Out of Stock'],
            datasets: [{
                label: 'Inventory Status',
                data: [statusCounts.normal, statusCounts.warning, statusCounts.outOfStock],
                backgroundColor: [
                    '#28a745',
                    '#ffc107',
                    '#dc3545'
                ],
                borderWidth: 1,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
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

function setupEventListeners() {
    // Filter buttons for recent sales
    document.querySelectorAll('[data-recent-filter]').forEach(btn => {
        btn.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            RecentSalesFilter = this.dataset.recentFilter;
            loadShopTransactions(shopLoggedin, RecentSalesFilter);
        });
    });

    // Filter buttons for inventory
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            console.log(`Filter inventory by: ${this.dataset.filter}`);
        });
    });

    // Filter buttons for sales chart
    document.querySelectorAll('[data-period]').forEach(btn => {
        btn.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            console.log(`Filter sales by: ${this.dataset.period}`);
        });
    });

    // Print button
    document.getElementById('printInventoryBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('printInventoryBtn');
        const originalHTML = btn.innerHTML;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
        btn.disabled = true;
        btn.classList.add('loading');

        try {
            const printContainer = document.createElement('div');
            printContainer.style.padding = '20px';
            printContainer.style.fontFamily = 'Arial, sans-serif';

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

            const charts = [
                document.getElementById('salesChart'),
                document.getElementById('inventoryChart')
            ];

            for (const chart of charts) {
                if (chart) {
                    const img = document.createElement('img');
                    img.src = chart.toDataURL('image/png');
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    img.style.display = 'block';
                    img.style.margin = '0 auto';

                    const chartContainer = document.createElement('div');
                    chartContainer.style.marginBottom = '30px';
                    chartContainer.appendChild(img);

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

                const tables = clone.querySelectorAll('table');
                tables.forEach(table => {
                    table.style.width = '100%';
                    table.style.fontSize = '10pt';
                    table.style.borderCollapse = 'collapse';
                });

                printContainer.appendChild(clone);
            }

            const opt = {
                margin: [15, 15, 15, 15],
                filename: `${sname || 'Shop'}_Analytics_${new Date().toISOString().slice(0, 10)}.pdf`,
                image: {
                    type: 'jpeg',
                    quality: 1.0
                },
                html2canvas: {
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    scrollX: 0,
                    scrollY: 0,
                    allowTaint: true,
                    letterRendering: true,
                    onclone: (clonedDoc) => {
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
                    hotfixes: ['px_scaling']
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
}

// Clean up charts when page unloads
window.addEventListener('beforeunload', () => {
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }
    if (inventoryChartInstance) {
        inventoryChartInstance.destroy();
    }
});