// ==========================================
// PAYSTACK CONFIGURATIONS
// ==========================================
const PAYSTACK_PUBLIC_KEY = "pk_live_d653074627b5d193c4aac87d74b9f361fefb83b3";
const MY_SUBACCOUNT_ID = "ACCT_gdl5amv3xl03utv";
const ENABLE_PAYSTACK_SUBACCOUNTS = false;
let currentActiveProduct = null; 

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

// ==========================================
// AUTH CHECK + STATE INITIALIZATION
// ==========================================
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
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

    db.collection("listings").get()
        .then((snapshot) => {
            container.innerHTML = "";

            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="col-span-full bg-white p-8 rounded-2xl shadow text-center">
                        <i class="fa-solid fa-box-open text-5xl text-gray-300 mb-4"></i>
                        <h3 class="text-xl font-bold">No Products Available</h3>
                        <p class="text-gray-500 mt-2">Farmers have not uploaded any products yet.</p>
                    </div>
                `;
                return;
            }

            snapshot.forEach((doc) => {
                const item = doc.data();

                container.innerHTML += `
                    <div class="bg-white rounded-2xl overflow-hidden shadow hover:shadow-lg hover:-translate-y-2 transition duration-300">
                        <img src="${item.imageUrl || 'https://via.placeholder.com/400x250'}" class="w-full h-52 object-cover" alt="${item.productName || 'Product'}">
                        <div class="p-5">
                            <div class="flex justify-between items-start">
                                <h3 class="font-bold text-lg">${item.productName || 'Unnamed Product'}</h3>
                                <span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">Available</span>
                            </div>
                            <p class="text-emerald-600 font-bold text-xl mt-2">
                                ₦${Number(item.price || 0).toLocaleString()}
                            </p>
                            <div class="mt-3 text-sm text-slate-600 space-y-1">
                                <p><i class="fa-solid fa-user mr-2"></i> ${item.farmerName || 'Unknown Farmer'}</p>
                                <p><i class="fa-solid fa-layer-group mr-2"></i> ${item.category || 'N/A'}</p>
                                <p><i class="fa-solid fa-location-dot mr-2"></i> ${item.location || 'N/A'}</p>
                                <p><i class="fa-solid fa-cubes mr-2"></i> Quantity: ${item.quantity || 0}</p>
                            </div>
                            <p class="mt-3 text-sm text-gray-500">${item.description || ''}</p>
                            <div class="mt-5">
                                <button onclick="buyProduct('${doc.id}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition">
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        })
        .catch((error) => {
            console.error("Error loading products:", error);
            container.innerHTML = `
                <div class="col-span-full bg-red-100 text-red-600 p-6 rounded-xl text-center">
                    ${error.message}
                </div>
            `;
        });
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
        };

        document.getElementById("modalPayBtn").onclick = () => {
            const finalQty = parseInt(qtyInput.value);  
            if (!finalQty || finalQty < 1) {
                alert("Please select a valid quantity.");
                return;
            }
            console.log("Proceed to Pay clicked", {
                quantity: finalQty,
                product: currentActiveProduct
            });
            executePaystackTransaction(finalQty, expectedDelivery);
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
async function savePaidOrder(product, user, quantity, unitPrice, totalPrice, assignedDeliveryDate, response) {
    try {
        await db.collection("orders").add({
            productId: product.id,
            productName: product.productName || "",
            farmerId: product.farmerId || "",
            farmerName: product.farmerName || "",
            buyerId: user.uid,
            buyerEmail: user.email,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice,
            deliveryDate: assignedDeliveryDate,
            paymentReference: response.reference,
            paymentStatus: "paid",
            orderStatus: "pending",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        currentActiveProduct = null;
        alert("Payment Successful!\nReference: " + response.reference);
        loadListings();
    } catch (error) {
        console.error("Firestore Order Save Failure:", error);
        alert("Payment settled successfully, but the order record failed to register inside the database.");
    }
}

function executePaystackTransaction(quantity, assignedDeliveryDate) {
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
            key: PAYSTACK_PUBLIC_KEY, 
            email: user.email,
            amount: amountInKobo, 
            currency: "NGN",
            ref: transactionRef,
            metadata: {
                buyerId: user.uid,
                productId: product.id,
                productName: product.productName,
                quantity: finalQuantity,
                deliveryDate: assignedDeliveryDate
            },
            callback: function (response) {
                savePaidOrder(product, user, finalQuantity, unitPrice, totalPrice, assignedDeliveryDate, response);
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
