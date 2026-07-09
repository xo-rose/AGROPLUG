// ==========================================
// PAYSTACK CONFIGURATIONS
// ==========================================
const PAYSTACK_PUBLIC_KEY = "pk_test_411590b82445d671e70b557796ab587b9b40f62d";
const MY_SUBACCOUNT_ID = "ACCT_gdl5amv3xl03utv";
const ENABLE_PAYSTACK_SUBACCOUNTS = false;
let currentActiveProduct = null; 
let latestWalletBalance = 0;
let buyerPremiumActive = false;
let latestListingDocs = [];
let activeProductFilter = "all";

const productFilterGroups = [
    {
        id: "livestock",
        title: "Live Stock",
        aliases: ["livestock", "live stock", "animal", "animals", "poultry", "fishery", "fish"]
    },
    {
        id: "fruits-vegetables",
        title: "Fruits & Vegetables",
        aliases: ["fruit", "fruits", "friut", "friuts", "vegetable", "vegetables", "fruits & vegetables", "fruit and vegetables", "veggies"]
    },
    {
        id: "grains-cereals",
        title: "Grains & Cereals",
        aliases: ["grain", "grains", "cereal", "cereals", "grains & cereals", "grain and cereals", "rice", "maize", "corn", "beans"]
    },
    {
        id: "dairy-products",
        title: "Dairy Products",
        aliases: ["dairy", "dairy products", "milk", "cheese", "yoghurt", "yogurt"]
    },
    {
        id: "tubers-frozen-meats",
        title: "Tubers & Frozen Meats",
        aliases: ["tuber", "tubers", "yam", "cassava", "potato", "potatoes", "frozen meat", "frozen meats", "frozen", "meats"]
    }
];

const menuToggle = document.getElementById("menuToggle");
const menuList = document.getElementById("menuList");
const toggleIcon = document.getElementById("toggleIcon");

if (menuToggle && menuList && toggleIcon) {
    menuToggle.addEventListener("click", () => {
        menuList.classList.toggle("hidden");
        menuList.classList.toggle("flex");
        toggleIcon.classList.toggle("fa-bars");
        toggleIcon.classList.toggle("fa-xmark");
    });
}

const filterButtons = document.querySelectorAll(".filter-btn");
filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        activeProductFilter = button.dataset.filter || "all";
        updateFilterButtonStyles();
        renderListings();
    });
});

updateFilterButtonStyles();

// ==========================================
// AUTH CHECK + STATE INITIALIZATION
// ==========================================
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    listenForWalletBalance(user.uid);
    listenForBuyerPremiumStatus(user.uid);
    loadListings();
});

// ==========================================
// LOAD MARKETPLACE PRODUCTS FROM FIRESTORE
// ==========================================
function loadListings() {
    const container = document.getElementById("productsContainer");
    if (!container) return; // Prevents errors if container isn't on the page

    container.innerHTML = `
        <div class="col-span-full text-center py-10">
            Loading products...
        </div>
    `;

    db.collection("listings")
        .onSnapshot((snapshot) => {
            container.innerHTML = "";

            if (snapshot.empty) {
                latestListingDocs = [];
                container.innerHTML = `
                    <div class="col-span-full bg-white p-8 rounded-2xl shadow text-center">
                        <i class="fa-solid fa-box-open text-5xl text-gray-300 mb-4"></i>
                        <h3 class="text-xl font-bold">No Products Available</h3>
                        <p class="text-gray-500 mt-2">Farmers have not uploaded any products yet.</p>
                    </div>
                `;
                return;
            }

            latestListingDocs = snapshot.docs
                .slice()
                .sort((a, b) => getTimestampValue(b.data().createdAt) - getTimestampValue(a.data().createdAt));

            renderListings();
        }, (error) => {
            console.error("Error loading products:", error);
            container.innerHTML = `
                <div class="col-span-full bg-red-100 text-red-600 p-6 rounded-xl text-center">
                    ${error.message}
                </div>
            `;
        });
}

function updateFilterButtonStyles() {
    filterButtons.forEach((button) => {
        const isActive = (button.dataset.filter || "all") === activeProductFilter;
        button.classList.toggle("bg-emerald-600", isActive);
        button.classList.toggle("text-white", isActive);
        button.classList.toggle("bg-white", !isActive);
        button.classList.toggle("text-emerald-700", !isActive);
        button.classList.toggle("border", !isActive);
        button.classList.toggle("border-emerald-200", !isActive);
    });
}

function renderListings() {
    const container = document.getElementById("productsContainer");
    if (!container) return;

    const selectedDocs = activeProductFilter === "all"
        ? latestListingDocs
        : latestListingDocs.filter((doc) => getProductGroupId(doc.data()) === activeProductFilter);

    if (!selectedDocs.length) {
        const selectedGroup = productFilterGroups.find((group) => group.id === activeProductFilter);
        container.innerHTML = `
            <div class="col-span-full bg-white p-8 rounded-2xl shadow text-center">
                <i class="fa-solid fa-filter-circle-xmark text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-bold">No ${escapeHtml(selectedGroup?.title || "Products")} Available</h3>
                <p class="text-gray-500 mt-2">Try another produce section.</p>
            </div>
        `;
        return;
    }

    const groupsToRender = activeProductFilter === "all"
        ? productFilterGroups
        : productFilterGroups.filter((group) => group.id === activeProductFilter);

    const groupedMarkup = groupsToRender
        .map((group) => {
            const groupDocs = selectedDocs.filter((doc) => getProductGroupId(doc.data()) === group.id);
            if (!groupDocs.length) return "";

            return `
                <section class="col-span-full">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-slate-900">${group.title}</h2>
                        <span class="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">${groupDocs.length} item${groupDocs.length === 1 ? "" : "s"}</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        ${groupDocs.map(renderProductCard).join("")}
                    </div>
                </section>
            `;
        })
        .join("");

    const otherDocs = activeProductFilter === "all"
        ? selectedDocs.filter((doc) => getProductGroupId(doc.data()) === "other")
        : [];

    const otherMarkup = otherDocs.length
        ? `
            <section class="col-span-full">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-2xl font-bold text-slate-900">Other Produce</h2>
                    <span class="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">${otherDocs.length} item${otherDocs.length === 1 ? "" : "s"}</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    ${otherDocs.map(renderProductCard).join("")}
                </div>
            </section>
        `
        : "";

    container.innerHTML = groupedMarkup + otherMarkup;
}

function renderProductCard(doc) {
    const item = doc.data();
    const quantity = Number(item.quantity || 0);
    const isAvailable = String(item.status || "active").toLowerCase() === "active" && quantity > 0;
    const farmerName = item.farmerName || "Unknown Farmer";
    const farmerId = item.farmerId || "";
    const chatControl = farmerId
        ? `<a href="messages.html?farmerId=${encodeURIComponent(farmerId)}&farmerName=${encodeURIComponent(farmerName)}" class="w-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50 py-2 rounded-lg transition text-center font-medium">Chat</a>`
        : `<button type="button" disabled class="w-full border border-slate-200 text-slate-400 py-2 rounded-lg cursor-not-allowed">No Chat</button>`;

    return `
        <div class="bg-white rounded-xl overflow-hidden shadow hover:shadow-lg hover:-translate-y-1 transition duration-300">
            <img src="${escapeHtml(item.imageUrl || 'https://via.placeholder.com/400x250')}" class="w-full h-36 object-cover" alt="${escapeHtml(item.productName || 'Product')}">
            <div class="p-4">
                <div class="flex justify-between items-start gap-3">
                    <h3 class="font-bold text-base leading-snug">${escapeHtml(item.productName || 'Unnamed Product')}</h3>
                    <span class="${isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-2 py-1 rounded-full text-xs whitespace-nowrap">${isAvailable ? 'Available' : 'Unavailable'}</span>
                </div>
                <p class="text-emerald-600 font-bold text-lg mt-1.5">
                    ₦${Number(item.price || 0).toLocaleString()}
                </p>
                <div class="mt-2 text-xs text-slate-600 space-y-1">
                    <p><i class="fa-solid fa-user mr-2"></i> ${escapeHtml(farmerName)}</p>
                    <p><i class="fa-solid fa-layer-group mr-2"></i> ${escapeHtml(getDisplayCategory(item.category || 'N/A'))}</p>
                    <p><i class="fa-solid fa-location-dot mr-2"></i> ${escapeHtml(item.location || 'N/A')}</p>
                    <p><i class="fa-solid fa-cubes mr-2"></i> Quantity: ${quantity.toLocaleString()} ${escapeHtml(item.unit || '')}</p>
                </div>
                <p class="mt-2 text-xs text-gray-500 line-clamp-2">${escapeHtml(item.description || '')}</p>
                <div class="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <button onclick="buyProduct('${doc.id}')" ${isAvailable ? '' : 'disabled'} class="w-full ${isAvailable ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'} text-white py-2 rounded-lg transition font-medium">
                        Buy Now
                    </button>
                    ${chatControl}
                </div>
            </div>
        </div>
    `;
}

function getProductGroupId(item) {
    const category = String(item.category || item.productCategory || "").toLowerCase().trim();
    const name = String(item.productName || item.name || "").toLowerCase().trim();
    const combined = `${category} ${name}`;

    const matchedGroup = productFilterGroups.find((group) => (
        group.aliases.some((alias) => combined.includes(alias))
    ));

    return matchedGroup ? matchedGroup.id : "other";
}

function getDisplayCategory(category) {
    const value = String(category || "").trim();
    const normalized = value.toLowerCase();

    if (normalized.includes("friut") || normalized.includes("fruit")) {
        return "Fruits & Vegetables";
    }

    return value || "N/A";
}

// ==========================================
// LOGOUT CONFIGURATION HANDLER
// ==========================================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await auth.signOut();
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout failed:", error);
        }
    });
}

// ==========================================
// HELPER: GENERATE RANDOM DELIVERY WINDOW
// ==========================================
function generateRandomDeliveryDate() {
    const today = new Date();
    const randomDaysAhead = Math.floor(Math.random() * (7 - 3 + 1)) + 3; // 3 to 7 days
    today.setDate(today.getDate() + randomDaysAhead);
    return today.toISOString().split('T')[0];
}

function parseMoney(value) {
    if (typeof value === "number") {
        return value;
    }

    return Number(String(value || "").replace(/[^\d.]/g, ""));
}

function formatNaira(amount) {
    return `₦${Number(amount || 0).toLocaleString()}`;
}

function getTimestampValue(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    return new Date(value).getTime() || 0;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getBuyerDisplayName(user) {
    return user.displayName || (user.email ? user.email.split("@")[0] : "Buyer");
}

function getConversationId(buyerId, farmerId) {
    return [String(buyerId || ""), String(farmerId || "")].sort().join("_");
}

function listenForWalletBalance(userId) {
    db.collection("wallets").doc(userId).onSnapshot((doc) => {
        latestWalletBalance = doc.exists ? Number(doc.data().balance || 0) : 0;
        updatePaymentStatus();
    }, () => {
        db.collection("users").doc(userId).onSnapshot((doc) => {
            latestWalletBalance = doc.exists ? Number(doc.data().walletBalance || 0) : 0;
            updatePaymentStatus();
        });
    });
}

function listenForBuyerPremiumStatus(userId) {
    db.collection("users").doc(userId).onSnapshot((doc) => {
        const data = doc.exists ? doc.data() : {};
        buyerPremiumActive = Boolean(data.premiumActive || data.isPremium || data.subscription === "premium");
        updateFulfillmentStatus();
    }, (error) => {
        console.warn("Buyer premium status load failed:", error);
        buyerPremiumActive = false;
        updateFulfillmentStatus();
    });
}

function updatePaymentStatus() {
    const paymentStatus = document.getElementById("modalPaymentStatus");
    const paymentMethod = document.getElementById("modalPaymentMethod");
    const totalText = document.getElementById("modalTotalAmount")?.innerText || "0";
    const total = parseMoney(totalText);

    if (!paymentStatus || !paymentMethod) return;

    if (paymentMethod.value === "wallet") {
        paymentStatus.textContent = `Wallet balance: ${formatNaira(latestWalletBalance)}${total > latestWalletBalance ? " - not enough for this order." : ""}`;
        paymentStatus.className = total > latestWalletBalance ? "text-xs text-red-600 mt-2" : "text-xs text-emerald-600 mt-2";
    } else {
        paymentStatus.textContent = "Bank checkout opens Paystack for card, transfer, or other bank payment options.";
        paymentStatus.className = "text-xs text-slate-500 mt-2";
    }
}

function updateFulfillmentStatus() {
    const fulfillmentMethod = document.getElementById("modalFulfillmentMethod");
    const fulfillmentStatus = document.getElementById("modalFulfillmentStatus");
    const pickupWrap = document.getElementById("pickupLocationWrap");
    const doorstepWrap = document.getElementById("doorstepAddressWrap");

    if (!fulfillmentMethod) return;

    const isDoorstep = fulfillmentMethod.value === "doorstep";

    if (pickupWrap) pickupWrap.classList.toggle("hidden", isDoorstep);
    if (doorstepWrap) doorstepWrap.classList.toggle("hidden", !isDoorstep);

    if (!fulfillmentStatus) return;

    if (isDoorstep && !buyerPremiumActive) {
        fulfillmentStatus.textContent = "Doorstep delivery requires an AgroPlug Premium subscription.";
        fulfillmentStatus.className = "text-xs text-amber-600 mt-2";
    } else if (isDoorstep) {
        fulfillmentStatus.textContent = "Premium doorstep delivery will use your delivery address.";
        fulfillmentStatus.className = "text-xs text-emerald-600 mt-2";
    } else {
        fulfillmentStatus.textContent = "Choose where you will pick up this order.";
        fulfillmentStatus.className = "text-xs text-slate-500 mt-2";
    }
}

function getFulfillmentDetails() {
    const fulfillmentMethod = document.getElementById("modalFulfillmentMethod")?.value || "pickup";
    const pickupLocation = String(document.getElementById("modalPickupLocation")?.value || "").trim();
    const doorstepAddress = String(document.getElementById("modalDoorstepAddress")?.value || "").trim();

    if (fulfillmentMethod === "doorstep") {
        if (!buyerPremiumActive) {
            throw new Error("Doorstep delivery is a Premium feature. Subscribe to Premium before choosing doorstep delivery.");
        }

        if (doorstepAddress.length < 10) {
            throw new Error("Please enter a complete doorstep delivery address.");
        }

        return {
            fulfillmentMethod,
            pickupLocation: "",
            deliveryAddress: doorstepAddress,
            premiumRequired: true
        };
    }

    if (pickupLocation.length < 3) {
        throw new Error("Please enter the pickup location for this order.");
    }

    return {
        fulfillmentMethod: "pickup",
        pickupLocation,
        deliveryAddress: "",
        premiumRequired: false
    };
}

// ==========================================
// OPEN MODAL & ATTACH INTERFACE DATA
// ==========================================
async function buyProduct(productId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert("Please login first.");
            return;
        }

        const productDoc = await db.collection("listings").doc(productId).get();
        if (!productDoc.exists) {
            alert("Product information could not be verified.");
            return;
        }

        const product = productDoc.data();
        currentActiveProduct = { id: productId, ...product };

        const expectedDelivery = generateRandomDeliveryDate();

        document.getElementById("modalProductName").innerText = product.productName || "Checkout Item";
        document.getElementById("modalDeliveryDate").innerText = expectedDelivery;
        
        const qtyInput = document.getElementById("modalQuantity");
        qtyInput.value = 1;
        qtyInput.max = product.quantity || 999;
        
        const unitPrice = parseMoney(product.price);
        document.getElementById("modalUnitPrice").innerText = `₦${unitPrice.toLocaleString()}`;
        document.getElementById("modalTotalAmount").innerText = `₦${unitPrice.toLocaleString()}`;
        const paymentMethod = document.getElementById("modalPaymentMethod");
        if (paymentMethod) {
            paymentMethod.value = latestWalletBalance >= unitPrice ? "wallet" : "bank";
            paymentMethod.onchange = updatePaymentStatus;
        }
        const fulfillmentMethod = document.getElementById("modalFulfillmentMethod");
        const pickupLocationInput = document.getElementById("modalPickupLocation");
        const doorstepAddressInput = document.getElementById("modalDoorstepAddress");
        if (fulfillmentMethod) {
            fulfillmentMethod.value = "pickup";
            fulfillmentMethod.onchange = updateFulfillmentStatus;
        }
        if (pickupLocationInput) pickupLocationInput.value = "";
        if (doorstepAddressInput) doorstepAddressInput.value = "";
        updateFulfillmentStatus();
        updatePaymentStatus();

        qtyInput.oninput = () => {
            let qty = parseInt(qtyInput.value) || 0;
            const warningElement = document.getElementById("modalStockWarning");
            
            if (product.quantity && qty > product.quantity) {
                warningElement.innerText = `Only ${product.quantity} units available in stock.`;
                warningElement.classList.remove("hidden");
                qty = product.quantity;
                qtyInput.value = qty;
            } else {
                warningElement.classList.add("hidden");
            }
            
            document.getElementById("modalTotalAmount").innerText = `₦${(unitPrice * qty).toLocaleString()}`;
            updatePaymentStatus();
        };

        document.getElementById("modalPayBtn").onclick = () => {
            const finalQty = parseInt(qtyInput.value);  
            if (!finalQty || finalQty < 1) {
                alert("Please select a valid quantity.");
                return;
            }
            let fulfillmentDetails;
            try {
                fulfillmentDetails = getFulfillmentDetails();
            } catch (error) {
                alert(error.message);
                return;
            }
            console.log("Proceed to Pay clicked", {
                quantity: finalQty,
                product: currentActiveProduct,
                fulfillmentDetails
            });
            const selectedPaymentMethod = document.getElementById("modalPaymentMethod")?.value || "wallet";
            if (selectedPaymentMethod === "wallet") {
                executeWalletTransaction(finalQty, expectedDelivery, fulfillmentDetails);
            } else {
                executePaystackTransaction(finalQty, expectedDelivery, fulfillmentDetails);
            }
        };

        const modal = document.getElementById("checkoutModal");
        modal.classList.remove("hidden");
        modal.classList.add("flex");

    } catch (error) {
        console.error("Initialization Error:", error);
    }
}

function closeCheckoutModal(clearProduct = true) {
    const modal = document.getElementById("checkoutModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");

    if (clearProduct) {
        currentActiveProduct = null;
    }
}

// ==========================================
// LAUNCH PAYSTACK INTEGRATION VIA IFRAME
// ==========================================
async function ensureOrderConversation(product, user) {
    if (!product.farmerId) return;

    const conversationId = getConversationId(user.uid, product.farmerId);
    await db.collection("conversations").doc(conversationId).set({
        buyerId: user.uid,
        farmerId: product.farmerId,
        buyerName: getBuyerDisplayName(user),
        farmerName: product.farmerName || "Farmer",
        participants: [user.uid, product.farmerId],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

async function createPaidOrder(product, user, quantity, unitPrice, totalPrice, assignedDeliveryDate, paymentData, fulfillmentDetails) {
    const productRef = db.collection("listings").doc(product.id);
    const orderRef = db.collection("orders").doc();
    const walletRef = db.collection("wallets").doc(user.uid);
    const userRef = db.collection("users").doc(user.uid);
    const paymentReference = paymentData.reference || `AGRO_WALLET_${Date.now()}`;
    const paymentMethod = paymentData.paymentMethod || "bank";

    await db.runTransaction(async (transaction) => {
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists) {
            throw new Error("This product is no longer available.");
        }

        const liveProduct = productSnap.data();
        const currentQuantity = Number(liveProduct.quantity || 0);

        if (currentQuantity < quantity) {
            throw new Error(`Only ${currentQuantity} units are available now.`);
        }

        if (paymentMethod === "wallet") {
            const walletSnap = await transaction.get(walletRef);
            const walletBalance = walletSnap.exists ? Number(walletSnap.data().balance || 0) : 0;
            let userSnap = null;
            let availableBalance = walletBalance;

            if (!walletSnap.exists) {
                userSnap = await transaction.get(userRef);
                availableBalance = userSnap.exists ? Number(userSnap.data().walletBalance || 0) : 0;
            }

            if (availableBalance < totalPrice) {
                throw new Error(`Insufficient wallet balance. You need ${formatNaira(totalPrice)}.`);
            }

            if (walletSnap.exists) {
                transaction.set(walletRef, {
                    buyerId: user.uid,
                    buyerEmail: user.email || "",
                    balance: firebase.firestore.FieldValue.increment(-totalPrice),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } else {
                transaction.set(userRef, {
                    walletBalance: userSnap.exists
                        ? firebase.firestore.FieldValue.increment(-totalPrice)
                        : availableBalance - totalPrice,
                    walletUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }

        transaction.set(orderRef, {
            productId: product.id,
            productName: product.productName || "",
            productImageUrl: product.imageUrl || "",
            farmerId: product.farmerId || "",
            farmerName: product.farmerName || "",
            buyerId: user.uid,
            buyerName: getBuyerDisplayName(user),
            buyerEmail: user.email || "",
            quantity,
            unit: product.unit || product.category || "unit",
            unitPrice,
            totalPrice,
            deliveryDate: assignedDeliveryDate,
            fulfillmentMethod: fulfillmentDetails.fulfillmentMethod,
            pickupLocation: fulfillmentDetails.pickupLocation,
            deliveryAddress: fulfillmentDetails.deliveryAddress,
            premiumDeliveryRequired: fulfillmentDetails.premiumRequired,
            paymentReference,
            paymentMethod,
            paymentStatus: "paid",
            orderStatus: "pending",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    });

    await recordOptionalOrderSideEffects({
        productRef,
        walletRef,
        product,
        user,
        quantity,
        totalPrice,
        paymentReference,
        paymentMethod,
        orderId: orderRef.id
    });

    try {
        await ensureOrderConversation(product, user);
    } catch (error) {
        console.warn("Order chat conversation skipped by Firestore rules:", error);
    }

    return orderRef.id;
}

async function recordOptionalOrderSideEffects(details) {
    const {
        productRef,
        walletRef,
        product,
        user,
        quantity,
        totalPrice,
        paymentReference,
        paymentMethod,
        orderId
    } = details;

    try {
        await productRef.update({
            quantity: firebase.firestore.FieldValue.increment(-quantity),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.warn("Stock update skipped by Firestore rules:", error);
    }

    if (paymentMethod === "wallet") {
        try {
            await walletRef.collection("transactions").doc(paymentReference).set({
                type: "purchase",
                amount: totalPrice,
                currency: "NGN",
                status: "success",
                orderId,
                productId: product.id,
                productName: product.productName || "",
                reference: paymentReference,
                buyerId: user.uid,
                farmerId: product.farmerId || "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.warn("Wallet purchase transaction history skipped by Firestore rules:", error);
        }
    }

    if (product.farmerId) {
        try {
            await db.collection("notifications").add({
                type: "order_placed",
                title: "New order placed",
                recipientId: product.farmerId,
                senderId: user.uid,
                farmerId: product.farmerId,
                buyerId: user.uid,
                buyerName: getBuyerDisplayName(user),
                orderId,
                productName: product.productName || "",
                message: `${getBuyerDisplayName(user)} placed an order for ${quantity} ${product.unit || product.category || "unit"} of ${product.productName || "your produce"}.`,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.warn("Farmer notification skipped by Firestore rules:", error);
        }
    }
}

async function savePaidOrder(product, user, quantity, unitPrice, totalPrice, assignedDeliveryDate, response, fulfillmentDetails) {
    try {
        await createPaidOrder(product, user, quantity, unitPrice, totalPrice, assignedDeliveryDate, {
            reference: response.reference,
            paymentMethod: "bank"
        }, fulfillmentDetails);
        currentActiveProduct = null;
        alert("Payment Successful!\nReference: " + response.reference);
    } catch (error) {
        console.error("Firestore Order Save Failure:", error);
        alert("Payment settled successfully, but the order record failed to register inside the database.");
    }
}

async function executeWalletTransaction(quantity, assignedDeliveryDate, fulfillmentDetails) {
    const user = auth.currentUser;
    const finalQuantity = Number.parseInt(quantity, 10);

    if (!user) {
        alert("Please login first.");
        return;
    }

    if (!currentActiveProduct) {
        alert("No product is selected for checkout.");
        return;
    }

    const product = currentActiveProduct;
    const unitPrice = parseMoney(product.price);
    const totalPrice = unitPrice * finalQuantity;

    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(finalQuantity) || finalQuantity < 1) {
        alert("Please select a valid product quantity.");
        return;
    }

    if (latestWalletBalance < totalPrice) {
        alert(`Insufficient wallet balance. Wallet: ${formatNaira(latestWalletBalance)}, order: ${formatNaira(totalPrice)}.`);
        return;
    }

    const payBtn = document.getElementById("modalPayBtn");
    if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = "Processing...";
        payBtn.classList.add("opacity-70", "cursor-not-allowed");
    }

    try {
        const reference = `AGRO_WALLET_ORDER_${Date.now()}`;
        await createPaidOrder(product, user, finalQuantity, unitPrice, totalPrice, assignedDeliveryDate, {
            reference,
            paymentMethod: "wallet"
        }, fulfillmentDetails);

        closeCheckoutModal();
        currentActiveProduct = null;
        alert(`Wallet payment successful.\nReference: ${reference}`);
    } catch (error) {
        console.error("Wallet checkout failed:", error);
        if (error.code === "permission-denied") {
            alert("Firestore rules blocked this wallet checkout. Deploy the updated firestore.rules file, then try again.");
        } else {
            alert(error.message || "Wallet checkout failed. Please try again.");
        }
    } finally {
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = "Proceed to Pay";
            payBtn.classList.remove("opacity-70", "cursor-not-allowed");
        }
    }
}

function executePaystackTransaction(quantity, assignedDeliveryDate, fulfillmentDetails) {
    const user = auth.currentUser;
    const finalQuantity = Number.parseInt(quantity, 10);

    if (!user) {
        alert("Please login first.");
        return;
    }

    if (!user.email) {
        alert("Your account does not have an email address. Paystack requires an email to start payment.");
        return;
    }

    if (!window.PaystackPop) {
        alert("Paystack engine script was blocked or failed to download properly.");
        return;
    }

    if (!currentActiveProduct) {
        alert("No product is selected for checkout.");
        return;
    }

    const product = currentActiveProduct;
    const unitPrice = parseMoney(product.price);
    const totalPrice = unitPrice * finalQuantity;
    const amountInKobo = Math.round(totalPrice * 100);
    const transactionRef = "AGRO_" + Date.now();
    
    const targetSubaccount = product.subaccount || MY_SUBACCOUNT_ID;

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        alert("This product does not have a valid price, so payment cannot start.");
        return;
    }

    if (!Number.isFinite(finalQuantity) || finalQuantity < 1) {
        alert("Please select a valid quantity.");
        return;
    }

    if (!Number.isFinite(amountInKobo) || amountInKobo < 100) {
        alert("The payment amount is invalid.");
        return;
    }

    closeCheckoutModal(false);

    try {
        console.log("Opening Paystack checkout", {
            email: user.email,
            amountInKobo,
            transactionRef,
            targetSubaccount
        });

        const paystackConfig = {
            key: "pk_test_411590b82445d671e70b557796ab587b9b40f62d", 
            email: user.email,
            amount: amountInKobo, 
            currency: "NGN",
            ref: transactionRef,
            metadata: {
                buyerId: user.uid,
                productId: product.id,
                productName: product.productName,
                quantity: finalQuantity,
                deliveryDate: assignedDeliveryDate,
                fulfillmentMethod: fulfillmentDetails.fulfillmentMethod,
                pickupLocation: fulfillmentDetails.pickupLocation,
                premiumDeliveryRequired: fulfillmentDetails.premiumRequired
            },
            callback: function (response) {
                savePaidOrder(product, user, finalQuantity, unitPrice, totalPrice, assignedDeliveryDate, response, fulfillmentDetails);
            },
            onClose: function () {
                currentActiveProduct = null;
                console.log("Paystack interaction frame closed.");
            }
        };

        if (ENABLE_PAYSTACK_SUBACCOUNTS && targetSubaccount) {
            paystackConfig.subaccount = targetSubaccount;
        }

        const handler = PaystackPop.setup(paystackConfig);

        handler.openIframe();
    } catch (error) {
        console.error("Paystack setup failed:", error);
        alert(`Paystack could not start: ${error.message || "Unknown error"}`);
    }
}
