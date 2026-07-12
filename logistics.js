let currentUser = null;
let pendingOrders = [];

const ordersBody = document.getElementById("ordersBody");
const dialog = document.getElementById("dispatchDialog");
const accessMessage = document.getElementById("accessMessage");

function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = String(value ?? "");
    return node.innerHTML;
}

function timeValue(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    return new Date(value).getTime() || 0;
}

function formatDate(value) {
    const timestamp = timeValue(value);
    return timestamp ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp)) : "Recently";
}

function getConversationId(buyerId, farmerId) {
    return [String(buyerId || ""), String(farmerId || "")].sort().join("_");
}

function generateTrackingReference(orderId) {
    const orderPart = String(orderId || "").replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase();
    const timePart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `AGP-${orderPart}-${timePart}-${randomPart}`;
}

function setAccessMessage(message, isError = false) {
    accessMessage.textContent = message;
    accessMessage.className = `mb-5 rounded-xl border px-4 py-3 text-sm ${isError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`;
}

async function isAdmin(user) {
    const [marker, profile] = await Promise.all([
        db.collection("admins").doc(user.uid).get(),
        db.collection("users").doc(user.uid).get()
    ]);
    return marker.exists && marker.data().enabled === true || profile.exists && profile.data().role === "admin";
}

function renderQueue(orders) {
    document.getElementById("queueCount").textContent = `${orders.length} awaiting dispatch`;
    if (!orders.length) {
        ordersBody.innerHTML = '<tr><td colspan="6" class="p-5 text-sm text-slate-500">No paid orders are awaiting dispatch.</td></tr>';
        return;
    }
    ordersBody.innerHTML = orders.map(order => {
        const destination = order.fulfillmentMethod === "doorstep" ? order.deliveryAddress : `Pickup: ${order.pickupLocation || "Not specified"}`;
        return `<tr class="hover:bg-slate-50/70"><td class="p-4"><p class="font-bold text-slate-900">${escapeHtml(order.productName || "Produce")}</p><p class="mt-1 text-xs text-slate-500">#${escapeHtml(String(order.id).slice(0, 8).toUpperCase())} · ${escapeHtml(Number(order.quantity || 0).toLocaleString())} ${escapeHtml(order.unit || "unit")}</p></td><td class="p-4 text-sm"><p class="font-semibold">${escapeHtml(order.buyerName || "Buyer")}</p><p class="text-xs text-slate-500">${escapeHtml(order.buyerEmail || "")}</p></td><td class="p-4 text-sm capitalize">${escapeHtml(order.fulfillmentMethod || "pickup")}</td><td class="max-w-xs p-4 text-sm text-slate-600">${escapeHtml(destination)}</td><td class="p-4 text-sm text-slate-500">${formatDate(order.createdAt)}</td><td class="p-4"><button data-order-id="${escapeHtml(order.id)}" class="dispatch-order rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><i class="fa-solid fa-truck-fast mr-1"></i>Dispatch</button></td></tr>`;
    }).join("");
    document.querySelectorAll(".dispatch-order").forEach(button => button.addEventListener("click", () => openDispatch(button.dataset.orderId)));
}

function openDispatch(orderId) {
    const order = pendingOrders.find(item => item.id === orderId);
    if (!order) return;
    document.getElementById("dispatchOrderId").value = orderId;
    document.getElementById("dispatchOrderLabel").textContent = `${order.productName || "Produce"} for ${order.buyerName || "Buyer"}`;
    document.getElementById("dispatchForm").reset();
    document.getElementById("dispatchOrderId").value = orderId;
    document.getElementById("trackingReference").value = generateTrackingReference(orderId);
    document.getElementById("dispatchStatus").textContent = "";
    dialog.showModal();
}

document.getElementById("closeDialog").addEventListener("click", () => dialog.close());

document.getElementById("dispatchForm").addEventListener("submit", async event => {
    event.preventDefault();
    const orderId = document.getElementById("dispatchOrderId").value;
    const order = pendingOrders.find(item => item.id === orderId);
    const carrierName = document.getElementById("carrierName").value.trim();
    const carrierPhone = document.getElementById("carrierPhone").value.trim();
    const trackingReference = document.getElementById("trackingReference").value.trim();
    const estimatedArrivalRaw = document.getElementById("estimatedArrival").value;
    const status = document.getElementById("dispatchStatus");
    const button = document.getElementById("confirmDispatchBtn");
    if (!orderId || !order || !carrierName || !carrierPhone || !trackingReference || !estimatedArrivalRaw) return;
    const estimatedArrival = new Date(estimatedArrivalRaw);
    if (Number.isNaN(estimatedArrival.getTime()) || estimatedArrival.getTime() <= Date.now()) {
        status.textContent = "Choose an estimated arrival time in the future.";
        status.className = "mt-4 text-sm text-red-600";
        return;
    }
    button.disabled = true;
    status.textContent = "Recording secure dispatch…";
    status.className = "mt-4 text-sm text-emerald-700";
    try {
        const arrivalTimestamp = firebase.firestore.Timestamp.fromDate(estimatedArrival);
        const dispatch = { carrierName, carrierPhone, trackingReference, estimatedArrival: arrivalTimestamp, dispatchedBy: currentUser.uid };
        const deliveryMessage = `Dispatch update for order #${String(orderId).slice(0, 8).toUpperCase()}: your order is now in transit. Rider: ${carrierName}. Phone: ${carrierPhone}. Tracking reference: ${trackingReference}. Estimated arrival: ${formatDate(arrivalTimestamp)}.`;
        const conversationId = getConversationId(order.buyerId, order.farmerId);
        const conversationRef = db.collection("conversations").doc(conversationId);
        const batch = db.batch();
        batch.update(db.collection("orders").doc(orderId), {
            orderStatus: "in_transit",
            dispatch,
            dispatchedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        batch.set(conversationRef, {
            buyerId: order.buyerId,
            farmerId: order.farmerId,
            buyerName: order.buyerName || "Buyer",
            farmerName: order.farmerName || "Farmer",
            participants: [order.buyerId, order.farmerId],
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessagePreview: deliveryMessage,
            lastSenderId: currentUser.uid,
            unreadCountBuyer: firebase.firestore.FieldValue.increment(1),
            unreadCountFarmer: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
        batch.set(conversationRef.collection("messages").doc(), {
            senderId: currentUser.uid,
            senderRole: "system",
            buyerId: order.buyerId,
            farmerId: order.farmerId,
            orderId,
            type: "dispatch_update",
            text: deliveryMessage,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await batch.commit();
        dialog.close();
    } catch (error) {
        console.error("Dispatch update failed:", error);
        status.textContent = error.message || "Unable to dispatch this order.";
        status.className = "mt-4 text-sm text-red-600";
    } finally {
        button.disabled = false;
    }
});

auth.onAuthStateChanged(async user => {
    if (!user) {
        window.location.href = "farmers/login.html";
        return;
    }
    try {
        if (!await isAdmin(user)) {
            setAccessMessage("This logistics board is restricted to authorised AgroPlug administrators.", true);
            ordersBody.innerHTML = '<tr><td colspan="6" class="p-5 text-sm text-red-600">Access denied.</td></tr>';
            return;
        }
        currentUser = user;
        db.collection("orders").where("paymentStatus", "==", "paid").onSnapshot(snapshot => {
            pendingOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(order => String(order.orderStatus || "pending").toLowerCase() === "pending")
                .sort((a, b) => timeValue(a.createdAt) - timeValue(b.createdAt));
            renderQueue(pendingOrders);
        }, error => setAccessMessage(error.message || "Unable to load the dispatch queue.", true));
    } catch (error) {
        console.error("Logistics access check failed:", error);
        setAccessMessage("Unable to verify logistics access.", true);
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut());
