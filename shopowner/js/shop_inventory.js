import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, remove, set, onValue, get } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
const auth = getAuth(app);
const db = getDatabase(app);

// Global session object
const userSession = {
    shopId: null,
    role: null,
    shopName: ''
};

// Expose functions globally
window.showShoeDetails = showShoeDetails;
window.editShoe = editShoe;
window.promptDelete = promptDelete;
window.closeModal = closeModal;
window.addNewShoe = addNewShoe;
window.showReviews = showReviews;
window.testFeedback = testFeedback;
// window.filterReviewsModal = filterReviewsModal;

// Auth state handling
onAuthStateChanged(auth, (user) => {
    if (user) {
        const shopRef = ref(db, `AR_shoe_users/employees/${user.uid}`);
        onValue(shopRef, (snapshot) => {
            const shopData = snapshot.val();
            if (shopData) {
                userSession.role = shopData.role;
                userSession.shopId = shopData.shopId;
                userSession.shopName = shopData.shopName || '';

                if (shopData.role.toLowerCase() === "manager") {
                    document.getElementById("addemployeebtn").style.display = "none";
                } else if (shopData.role.toLowerCase() === "salesperson") {
                    document.getElementById("addemployeebtn").style.display = "none";
                    document.getElementById("analyticsbtn").style.display = "none";
                }
            } else {
                userSession.shopId = user.uid;
                userSession.role = "Shop Owner";
                userSession.shopName = 'Shop Owner';
            }
            loadInventory('inventoryTableBody');
        }, (error) => {
            console.error("Error fetching shop data:", error);
            userSession.shopId = user.uid;
            userSession.shopName = 'Unknown Shop';
            loadInventory('inventoryTableBody');
        });
    } else {
        window.location.href = "/user_login.html";
    }
});

function addNewShoe() {
    window.location.href = "/shopowner/html/shopowner_addshoe.html";
}

function loadInventory(tableBodyId) {
    const inventoryRef = ref(db, `AR_shoe_users/shoe/${userSession.shopId}`);
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;

    onValue(inventoryRef, (snapshot) => {
        tbody.innerHTML = '';
        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="7">No shoes found in inventory</td></tr>`;
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const shoe = childSnapshot.val();
            const row = createInventoryRow(childSnapshot.key, shoe);
            tbody.appendChild(row);
        });
    });
}

function createInventoryRow(shoeId, shoe) {
    const row = document.createElement('tr');
    row.className = 'animate-fade';
    row.setAttribute('data-id', shoeId);

    let totalStock = 0;
    let firstPrice = 'N/A';

    if (shoe.variants) {
        const variantKeys = Object.keys(shoe.variants);
        if (variantKeys.length > 0) {
            const firstVariant = shoe.variants[variantKeys[0]];
            firstPrice = firstVariant.price ? `₱${firstVariant.price}` : 'N/A';
            Object.values(shoe.variants).forEach(variant => {
                if (variant.sizes) {
                    Object.values(variant.sizes).forEach(sizeObj => {
                        const sizeKey = Object.keys(sizeObj)[0];
                        totalStock += sizeObj[sizeKey].stock || 0;
                    });
                }
            });
        }
    }

    const addedDate = shoe.dateAdded ? new Date(shoe.dateAdded).toLocaleDateString() : 'N/A';

    row.innerHTML = `
        <td>${shoe.defaultImage ? `<img src="${shoe.defaultImage}" alt="${shoe.shoeName}" class="shoe-thumbnail">` : '<div class="no-image">No Image</div>'}</td>
        <td>${shoe.shoeName || 'N/A'}</td>
        <td>${shoe.shoeCode || 'N/A'}</td>
        <td>${firstPrice}</td>
        <td>${totalStock}</td>
        <td>${addedDate}</td>
        <td class="action-buttons">
            <button class="btn btn-view" onclick="showShoeDetails('${shoeId}')"><i class="fas fa-eye"></i> View</button>
            <button class="btn btn-edit" onclick="editShoe('${shoeId}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-reviews" onclick="showReviews('${shoeId}')"><i class="fas fa-star"></i> Reviews</button>
            <button class="btn btn-danger" onclick="promptDelete('${shoeId}')"><i class="fas fa-trash"></i> Delete</button>
        </td>
    `;
    return row;
}

function showShoeDetails(shoeId) {
    const shoeRef = ref(db, `AR_shoe_users/shoe/${userSession.shopId}/${shoeId}`);
    const modalContent = document.getElementById('shoeDetailsContent');
    const modalElement = document.getElementById('shoeDetailsModal');

    onValue(shoeRef, (snapshot) => {
        const shoe = snapshot.val();
        if (!shoe) {
            alert('Shoe not found');
            return;
        }

        // Format date
        const addedDate = shoe.dateAdded ? new Date(shoe.dateAdded).toLocaleString() : 'N/A';

        // Generate variants HTML
        let variantsHtml = '';
        if (shoe.variants) {
            Object.values(shoe.variants).forEach((variant, index) => {
                let sizesHtml = '';
                if (variant.sizes) {
                    sizesHtml = Object.values(variant.sizes).map(sizeObj => {
                        const sizeKey = Object.keys(sizeObj)[0];
                        return `<div class="size-item">Size ${sizeKey}: ${sizeObj[sizeKey].stock} in stock</div>`;
                    }).join('');
                }

                variantsHtml += `
                    <div class="variant-detail">
                        <h4>${variant.variantName || 'Variant'} (${variant.color || 'No color'})</h4>
                        <p><strong>Price:</strong> ₱${variant.price || '0.00'}</p>
                        ${variant.imageUrl ?
                        `<img src="${variant.imageUrl}" alt="${variant.variantName}" class="variant-image">` :
                        '<p>No variant image</p>'}
                        <div class="size-container">${sizesHtml}</div>
                    </div>
                    ${index < Object.keys(shoe.variants).length - 1 ? '<hr>' : ''}
                `;
            });
        }

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>${shoe.shoeName || 'Shoe Details'}</h2>
                <button onclick="closeModal()" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="shoe-main-info">
                    <div class="shoe-image-container">
                        ${shoe.defaultImage ?
                `<img src="${shoe.defaultImage}" alt="${shoe.shoeName}" class="main-shoe-image">` :
                '<p>No main image</p>'}
                    </div>
                    <div class="shoe-text-info">
                        <p><strong>Code:</strong> ${shoe.shoeCode || 'N/A'}</p>
                        <p><strong>Shop Name:</strong> ${shoe.shopName || 'Unknown Shop'}</p>
                        <p><strong>Added:</strong> ${addedDate}</p>
                        <p><strong>Description:</strong></p>
                        <p>${shoe.generalDescription || 'No description available'}</p>
                    </div>
                </div>
                
                <h3 class="variants-header">Variants</h3>
                <div class="variants-container">
                    ${variantsHtml || '<p>No variants available</p>'}
                </div>
            </div>
        `;

        modalElement.classList.add('show');
        document.body.classList.add('modal-open');
    }, (error) => {
        console.error("Error fetching shoe details:", error);
        alert('Error loading shoe details');
    });
}

function closeModal() {
    document.getElementById('shoeDetailsModal').classList.remove('show');
    document.body.classList.remove('modal-open');
}

function promptDelete(shoeId) {
    if (confirm('Are you sure you want to delete this shoe?')) {
        deleteShoe(shoeId);
    }
}

function deleteShoe(shoeId) {
    const shoeRef = ref(db, `AR_shoe_users/shoe/${userSession.shopId}/${shoeId}`);
    remove(shoeRef)
        .then(() => {
            alert("Shoe deleted successfully!");
        })
        .catch((error) => {
            console.error("Error deleting shoe:", error);
            alert("Error deleting shoe: " + error.message);
        });
}

function editShoe(shoeId) {
    window.location.href = `/shopowner/html/shopowner_editshoe.html?edit=${shoeId}`;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Role-based access control
    const userRole = localStorage.getItem('userRole');
    if (userRole === "employee") {
        document.querySelectorAll(".manager, .shopowner").forEach(el => el.style.display = "none");
    } else if (userRole === "manager") {
        document.querySelectorAll(".shopowner").forEach(el => el.style.display = "none");
    }

    // Search functionality
    document.getElementById('searchInventory')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#inventoryTable tbody tr').forEach(row => {
            const name = row.children[1]?.textContent.toLowerCase() || '';
            const code = row.children[2]?.textContent.toLowerCase() || '';
            row.style.display = (name.includes(term) || code.includes(term)) ? '' : 'none';
        });
    });

    const logoutBtn = document.getElementById('logout_btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
            auth.signOut().then(() => {
                window.location.href = "/user_login.html";
            }).catch((error) => {
                console.error("Logout error:", error);
                alert("Failed to logout. Please try again.");
                logoutBtn.disabled = false;
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            });
        });
    }
});

async function showReviews(shoeId) {
    const feedbacksRef = ref(db, `AR_shoe_users/feedbacks`);
    const modalContent = document.getElementById('shoeDetailsContent');
    const modalElement = document.getElementById('shoeDetailsModal');

    // Show loading state
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Loading Reviews...</h2>
            <button onclick="closeModal()" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <div class="loading">Please wait while we load the reviews...</div>
        </div>
    `;
    modalElement.classList.add('show');
    document.body.classList.add('modal-open');

    try {
        const snapshot = await get(feedbacksRef);
        if (!snapshot.exists()) {
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2>No Reviews Yet</h2>
                    <button onclick="closeModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <p>This shoe hasn't received any reviews yet.</p>
                </div>
            `;
            return;
        }

        const feedbacks = snapshot.val();
        const reviewsToDisplay = [];

        // Filter reviews for this specific shoe
        for (const userId in feedbacks) {
            for (const orderID in feedbacks[userId]) {
                const feedback = feedbacks[userId][orderID];
                if (feedback.shoeID === shoeId) {
                    reviewsToDisplay.push({
                        userId,
                        feedback
                    });
                }
            }
        }

        if (reviewsToDisplay.length === 0) {
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2>No Reviews Yet</h2>
                    <button onclick="closeModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <p>This shoe hasn't received any reviews yet.</p>
                </div>
            `;
            return;
        }

        // Calculate average rating
        const averageRating = calculateAverageRating(feedbacks, shoeId);
        const ratingCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        
        // Count ratings
        reviewsToDisplay.forEach(review => {
            const rating = review.feedback.rating;
            if (rating >= 1 && rating <= 5) {
                ratingCounts[rating]++;
            }
        });

        // Create filter buttons
        const filtersHtml = `
            <div class="review-filters">
                ${[5, 4, 3, 2, 1].map(rating => `
                    <div class="stars-filter" data-rating="${rating}" onclick="filterReviewsModal(${rating})">
                        <div class="stars">
                            ${'<i class="fas fa-star"></i>'.repeat(rating)}
                            ${'<i class="far fa-star"></i>'.repeat(5 - rating)}
                        </div>
                        <div class="text">${rating} Star${rating !== 1 ? 's' : ''} (${ratingCounts[rating]})</div>
                    </div>
                `).join('')}
                <div class="stars-filter active" data-rating="0" onclick="filterReviewsModal(0)">
                    <div class="text">All Reviews (${reviewsToDisplay.length})</div>
                </div>
            </div>
        `;

        // Process each review asynchronously
        let reviewsHtml = '';
        for (const review of reviewsToDisplay) {
            try {
                const username = await getCustomernameUsingID(review.userId);
                
                reviewsHtml += `
                    <div class="review-item" data-rating="${review.feedback.rating}">
                        <div class="review-header">
                            <span class="review-author">${username}</span>
                            <span class="review-date">${formatTimestamp(review.feedback.timestamp)}</span>
                        </div>
                        <div class="review-stars">
                            ${generateStarRating(review.feedback.rating)}
                        </div>
                        <p class="review-comment">${review.feedback.comment || "No comment provided."}</p>
                    </div>
                `;
            } catch (error) {
                console.error("Error processing review:", error);
            }
        }

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>Customer Reviews</h2>
                <button onclick="closeModal()" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="average-rating-container">
                    Average Rating: 
                    <span class="average-rating-value">
                        ${averageRating > 0 ? `${averageRating} <i class="fas fa-star"></i>` : 'No ratings yet'}
                    </span>
                </div>
                ${filtersHtml}
                <div class="reviews-container">
                    ${reviewsHtml}
                </div>
            </div>
        `;

    } catch (error) {
        console.error("Error fetching reviews:", error);
        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>Error Loading Reviews</h2>
                <button onclick="closeModal()" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <p>Failed to load reviews. Please try again later.</p>
            </div>
        `;
    }
}

function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHtml = '';
    
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
        starsHtml += '<i class="fas fa-star-half-alt"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="far fa-star"></i>';
    }
    
    return starsHtml;
}

function calculateAverageRating(feedbacks, shoeId) {
    let totalRating = 0;
    let reviewCount = 0;

    for (const userId in feedbacks) {
        for (const orderID in feedbacks[userId]) {
            const feedback = feedbacks[userId][orderID];
            if (feedback.shoeID === shoeId) {
                totalRating += feedback.rating;
                reviewCount++;
            }
        }
    }

    return reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : 0;
}

async function getCustomernameUsingID(userID) {
    const userRef = ref(db, `AR_shoe_users/customer/${userID}`);
    try {
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const userData = snapshot.val();
            return `${userData.firstName} ${userData.lastName}` || "Anonymous User";
        }
        return "Anonymous User";
    } catch (error) {
        console.error("Error fetching user data:", error);
        return "Anonymous User";
    }
}

function formatTimestamp(timestamp) {
    let date = new Date(timestamp);
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let day = String(date.getDate()).padStart(2, '0');
    let year = date.getFullYear();
    let hours = String(date.getHours()).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
}

window.filterReviewsModal = function(rating) {
    const reviewItems = document.querySelectorAll('#shoeDetailsContent .review-item');
    const filters = document.querySelectorAll('#shoeDetailsContent .stars-filter');
    
    filters.forEach(filter => {
        filter.classList.remove('active');
        if (parseInt(filter.dataset.rating) === rating) {
            filter.classList.add('active');
        }
    });
    
    reviewItems.forEach(item => {
        item.style.display = (rating === 0 || parseInt(item.dataset.rating) === rating) 
            ? 'block' 
            : 'none';
    });
}

function testFeedback(shoeId) {
    const modalContent = document.getElementById('shoeDetailsContent');
    const modalElement = document.getElementById('shoeDetailsModal');
    
    const sampleFeedbacks = [
        {
            rating: 5,
            comment: "Absolutely love these shoes! They're comfortable and stylish. Perfect fit!",
            timestamp: Date.now() - 86400000 * 2
        },
        {
            rating: 4,
            comment: "Great shoes overall. The color is a bit different than expected but still nice.",
            timestamp: Date.now() - 86400000 * 5
        },
        {
            rating: 3,
            comment: "Average quality. They look good but the sole isn't as durable as I hoped.",
            timestamp: Date.now() - 86400000 * 10
        },
        {
            rating: 2,
            comment: "Disappointed with the quality. The stitching is coming apart after just a week.",
            timestamp: Date.now() - 86400000 * 15
        },
        {
            rating: 1,
            comment: "Poor quality. The shoes fell apart after 3 days of normal use. Would not recommend.",
            timestamp: Date.now() - 86400000 * 20
        }
    ];

    const averageRating = sampleFeedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) / sampleFeedbacks.length;
    const ratingCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    sampleFeedbacks.forEach(feedback => {
        ratingCounts[feedback.rating]++;
    });

    const filtersHtml = `
        <div class="review-filters">
            ${[5, 4, 3, 2, 1].map(rating => `
                <div class="stars-filter" data-rating="${rating}" onclick="filterReviewsModal(${rating})">
                    <div class="stars">
                        ${'<i class="fas fa-star"></i>'.repeat(rating)}
                        ${'<i class="far fa-star"></i>'.repeat(5 - rating)}
                    </div>
                    <div class="text">${rating} Star${rating !== 1 ? 's' : ''} (${ratingCounts[rating]})</div>
                </div>
            `).join('')}
            <div class="stars-filter active" data-rating="0" onclick="filterReviewsModal(0)">
                <div class="text">All Reviews (${sampleFeedbacks.length})</div>
            </div>
        </div>
    `;

    const reviewsHtml = sampleFeedbacks.map(feedback => `
        <div class="review-item" data-rating="${feedback.rating}">
            <div class="review-header">
                <span class="review-author">Sample Customer</span>
                <span class="review-date">${formatTimestamp(feedback.timestamp)}</span>
            </div>
            <div class="review-stars">
                ${generateStarRating(feedback.rating)}
            </div>
            <p class="review-comment">${feedback.comment}</p>
        </div>
    `).join('');

    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Feedback Test Preview</h2>
            <button onclick="closeModal()" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <div class="test-feedback-notice">
                <i class="fas fa-info-circle"></i> This is a preview of how customer feedback will appear on your shoe.
            </div>
            <div class="average-rating-container">
                Average Rating: 
                <span class="average-rating-value">
                    ${averageRating.toFixed(1)} <i class="fas fa-star"></i>
                </span>
            </div>
            ${filtersHtml}
            <div class="reviews-container">
                ${reviewsHtml}
            </div>
        </div>
    `;

    modalElement.classList.add('show');
    document.body.classList.add('modal-open');
}