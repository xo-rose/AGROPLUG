const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();
const paystackSecret = defineSecret("PAYSTACK_SECRET_KEY");
const callableOptions = { region: "us-central1", secrets: [paystackSecret] };

async function paystackRequest(path, secret, options = {}) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.status) throw new Error(body.message || "Paystack request failed.");
  return body.data;
}

function requireUser(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to continue.");
  return request.auth;
}

function cleanReference(value) {
  const reference = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{6,120}$/.test(reference)) {
    throw new HttpsError("invalid-argument", "The payment reference is invalid.");
  }
  return reference;
}

function readQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
    throw new HttpsError("invalid-argument", "Choose a valid whole-number quantity.");
  }
  return quantity;
}

function readAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
    throw new HttpsError("invalid-argument", "Enter a valid amount.");
  }
  return Math.round(amount * 100) / 100;
}

function asObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  try { return JSON.parse(value); } catch { return {}; }
}

function getFulfillment(data, profile) {
  const method = data?.fulfillmentMethod === "doorstep" ? "doorstep" : "pickup";
  const pickupLocation = String(data?.pickupLocation || "").trim();
  const deliveryAddress = String(data?.deliveryAddress || "").trim();
  const premium = Boolean(profile?.premiumActive || profile?.isPremium || profile?.subscription === "premium");
  if (method === "doorstep") {
    if (!premium) throw new HttpsError("permission-denied", "Doorstep delivery requires an active Premium subscription.");
    if (deliveryAddress.length < 10) throw new HttpsError("invalid-argument", "Enter a complete delivery address.");
    return { fulfillmentMethod: method, pickupLocation: "", deliveryAddress, premiumDeliveryRequired: true };
  }
  if (pickupLocation.length < 3) throw new HttpsError("invalid-argument", "Enter the pickup location.");
  return { fulfillmentMethod: "pickup", pickupLocation, deliveryAddress: "", premiumDeliveryRequired: false };
}

async function verifyPaystackPayment(reference, uid, email) {
  const transaction = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, paystackSecret.value());
  const metadata = asObject(transaction.metadata);
  const paymentEmail = String(transaction.customer?.email || "").toLowerCase();
  if (transaction.status !== "success" || String(transaction.currency || "").toUpperCase() !== "NGN") {
    throw new HttpsError("failed-precondition", "Paystack has not confirmed this payment.");
  }
  if (metadata.buyerId !== uid || (email && paymentEmail && paymentEmail !== String(email).toLowerCase())) {
    throw new HttpsError("permission-denied", "This payment does not belong to the signed-in buyer.");
  }
  return transaction;
}

async function createConversationAndNotification({ buyerId, buyerName, farmerId, farmerName, orderId, productName, quantity, unit }) {
  if (!farmerId) return;
  const conversationId = [buyerId, farmerId].sort().join("_");
  await Promise.all([
    db.collection("conversations").doc(conversationId).set({ buyerId, farmerId, buyerName, farmerName: farmerName || "Farmer", participants: [buyerId, farmerId], createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }),
    db.collection("notifications").add({ type: "order_placed", title: "New order placed", recipientId: farmerId, senderId: buyerId, farmerId, buyerId, buyerName, orderId, productName: productName || "Produce", message: `${buyerName} placed an order for ${quantity} ${unit || "unit"} of ${productName || "your produce"}.`, read: false, createdAt: admin.firestore.FieldValue.serverTimestamp() })
  ]);
}

async function createServerOrder({ uid, email, productId, quantity, fulfillmentInput, payment }) {
  const productRef = db.collection("listings").doc(String(productId || ""));
  if (!productRef.id) throw new HttpsError("invalid-argument", "The product is invalid.");
  const orderRef = db.collection("orders").doc();
  const walletRef = db.collection("wallets").doc(uid);
  const userRef = db.collection("users").doc(uid);
  const receiptRef = payment.reference ? db.collection("paymentReceipts").doc(payment.reference) : null;
  const result = await db.runTransaction(async (transaction) => {
    const [productSnap, userSnap, walletSnap, receiptSnap] = await Promise.all([
      transaction.get(productRef), transaction.get(userRef),
      payment.method === "wallet" ? transaction.get(walletRef) : Promise.resolve(null),
      receiptRef ? transaction.get(receiptRef) : Promise.resolve(null)
    ]);
    if (!productSnap.exists) throw new HttpsError("not-found", "This product is no longer available.");
    if (receiptSnap?.exists) throw new HttpsError("already-exists", "This payment has already been used.");
    const product = productSnap.data();
    const profile = userSnap.exists ? userSnap.data() : {};
    const stock = Number(product.quantity || 0);
    const unitPrice = Number(product.price || 0);
    if (String(product.status || "active").toLowerCase() !== "active" || !Number.isFinite(unitPrice) || unitPrice <= 0) throw new HttpsError("failed-precondition", "This product is unavailable.");
    if (stock < quantity) throw new HttpsError("failed-precondition", `Only ${stock} units are available now.`);
    const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
    const fulfillment = getFulfillment(fulfillmentInput, profile);
    const buyerName = profile.fullname || email?.split("@")[0] || "Buyer";
    if (payment.method === "wallet") {
      const balance = walletSnap?.exists ? Number(walletSnap.data().balance || 0) : 0;
      if (!Number.isFinite(balance) || balance < totalPrice) throw new HttpsError("failed-precondition", "Your wallet balance is not enough for this order.");
      transaction.set(receiptRef, { buyerId: uid, type: "wallet_order", amount: totalPrice, currency: "NGN", createdAt: admin.firestore.FieldValue.serverTimestamp() });
      transaction.set(walletRef, { buyerId: uid, buyerEmail: email || "", balance: balance - totalPrice, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(walletRef.collection("transactions").doc(payment.reference), { type: "purchase", amount: totalPrice, currency: "NGN", status: "success", reference: payment.reference, buyerId: uid, farmerId: product.farmerId || "", productId: productRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    } else {
      if (payment.amountInKobo !== Math.round(totalPrice * 100)) throw new HttpsError("failed-precondition", "The verified payment amount does not match the current order total.");
      transaction.set(receiptRef, { buyerId: uid, type: "order", amount: totalPrice, currency: "NGN", createdAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    transaction.update(productRef, { quantity: stock - quantity, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    transaction.set(orderRef, { productId: productRef.id, productName: product.productName || "", productImageUrl: product.imageUrl || "", farmerId: product.farmerId || "", farmerName: product.farmerName || "", buyerId: uid, buyerName, buyerEmail: email || "", quantity, unit: product.unit || product.category || "unit", unitPrice, totalPrice, deliveryDate: "Pending dispatch confirmation", ...fulfillment, paymentReference: payment.reference, paymentMethod: payment.method, paymentStatus: "paid", orderStatus: "pending", createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { product, buyerName, totalPrice };
  });
  await createConversationAndNotification({ buyerId: uid, buyerName: result.buyerName, farmerId: result.product.farmerId || "", farmerName: result.product.farmerName || "", orderId: orderRef.id, productName: result.product.productName || "", quantity, unit: result.product.unit || result.product.category || "unit" });
  return { orderId: orderRef.id, totalPrice: result.totalPrice };
}

exports.confirmWalletFunding = onCall(callableOptions, async (request) => {
  const auth = requireUser(request);
  const reference = cleanReference(request.data?.reference);
  const payment = await verifyPaystackPayment(reference, auth.uid, auth.token.email || "");
  const amount = Number(payment.amount || 0) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpsError("failed-precondition", "Paystack returned an invalid amount.");
  const walletRef = db.collection("wallets").doc(auth.uid);
  const receiptRef = db.collection("paymentReceipts").doc(reference);
  return db.runTransaction(async (transaction) => {
    const [receiptSnap, walletSnap] = await Promise.all([transaction.get(receiptRef), transaction.get(walletRef)]);
    const balance = walletSnap.exists ? Number(walletSnap.data().balance || 0) : 0;
    if (receiptSnap.exists) return { credited: false, balance };
    const nextBalance = balance + amount;
    transaction.set(receiptRef, { buyerId: auth.uid, type: "wallet_funding", amount, currency: "NGN", createdAt: admin.firestore.FieldValue.serverTimestamp() });
    transaction.set(walletRef, { buyerId: auth.uid, buyerEmail: auth.token.email || "", balance: nextBalance, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(walletRef.collection("transactions").doc(reference), { type: "funding", amount, currency: "NGN", status: "success", paymentStatus: "paid", reference, buyerId: auth.uid, buyerEmail: auth.token.email || "", createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { credited: true, balance: nextBalance };
  });
});

exports.createWalletOrder = onCall(callableOptions, async (request) => {
  const auth = requireUser(request);
  return createServerOrder({ uid: auth.uid, email: auth.token.email || "", productId: request.data?.productId, quantity: readQuantity(request.data?.quantity), fulfillmentInput: request.data?.fulfillment, payment: { method: "wallet", reference: cleanReference(request.data?.reference) } });
});

exports.finalizeBankOrder = onCall(callableOptions, async (request) => {
  const auth = requireUser(request);
  const reference = cleanReference(request.data?.reference);
  const payment = await verifyPaystackPayment(reference, auth.uid, auth.token.email || "");
  return createServerOrder({ uid: auth.uid, email: auth.token.email || "", productId: request.data?.productId, quantity: readQuantity(request.data?.quantity), fulfillmentInput: request.data?.fulfillment, payment: { method: "bank", reference, amountInKobo: Number(payment.amount || 0) } });
});

exports.requestWithdrawal = onCall({ region: "us-central1" }, async (request) => {
  const auth = requireUser(request);
  const amount = readAmount(request.data?.amount);
  const userRef = db.collection("users").doc(auth.uid);
  const kycRef = db.collection("kycSubmissions").doc(auth.uid);
  const requestRef = db.collection("withdrawalRequests").doc();
  const ordersQuery = db.collection("orders").where("farmerId", "==", auth.uid).where("paymentStatus", "==", "paid");
  const requestsQuery = db.collection("withdrawalRequests").where("farmerId", "==", auth.uid);
  return db.runTransaction(async (transaction) => {
    const [profileSnap, kycSnap, ordersSnap, requestsSnap] = await Promise.all([transaction.get(userRef), transaction.get(kycRef), transaction.get(ordersQuery), transaction.get(requestsQuery)]);
    if (!profileSnap.exists) throw new HttpsError("failed-precondition", "Complete your profile before requesting a withdrawal.");
    if (!kycSnap.exists || String(kycSnap.data().status || "").toLowerCase() !== "verified") throw new HttpsError("failed-precondition", "Your KYC verification must be approved first.");
    const profile = profileSnap.data();
    const account = profile.payoutAccount || {};
    if (!account.accountName || !account.bankName || !account.bankCode || !/^\d{10}$/.test(String(account.accountNumber || ""))) throw new HttpsError("failed-precondition", "Add a complete payout account in your profile first.");
    const unpaidOrders = ordersSnap.docs.map((doc) => doc.data()).filter((order) => !order.settlementId);
    const gross = unpaidOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
    const commission = unpaidOrders.reduce((sum, order) => { const value = Number(order.totalPrice || 0); return sum + (value >= 20000 ? value * 0.05 : 0); }, 0);
    const reserved = requestsSnap.docs.reduce((sum, doc) => ["pending", "approved", "processing", "submitted"].includes(String(doc.data().status || "").toLowerCase()) ? sum + Number(doc.data().amount || 0) : sum, 0);
    const available = Math.max(0, Math.round((gross - commission - reserved) * 100) / 100);
    if (amount > available) throw new HttpsError("failed-precondition", "The requested amount exceeds your available balance.");
    transaction.set(requestRef, { farmerId: auth.uid, farmerName: profile.fullname || auth.token.email || "Farmer", amount, currency: "NGN", status: "pending", payoutAccount: { accountName: account.accountName, bankName: account.bankName, bankCode: account.bankCode, accountNumber: String(account.accountNumber) }, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { requestId: requestRef.id, available: Math.round((available - amount) * 100) / 100 };
  });
});

exports.sendApprovedWithdrawal = onDocumentUpdated({ document: "withdrawalRequests/{requestId}", secrets: [paystackSecret] }, async (event) => {
  const before = event.data.before.data();
  const request = event.data.after.data();
  if (before.status === "approved" || request.status !== "approved") return;
  const ref = event.data.after.ref;
  const claimed = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ref);
    if (!fresh.exists || fresh.data().status !== "approved") return false;
    transaction.update(ref, { status: "processing", payoutStartedAt: admin.firestore.FieldValue.serverTimestamp() });
    return true;
  });
  if (!claimed) return;
  try {
    const account = request.payoutAccount || {};
    if (!account.accountName || !account.accountNumber || !account.bankCode) throw new Error("The farmer's payout account is incomplete.");
    const secret = paystackSecret.value();
    const recipient = await paystackRequest("/transferrecipient", secret, { method: "POST", body: JSON.stringify({ type: "nuban", name: account.accountName, account_number: account.accountNumber, bank_code: account.bankCode, currency: "NGN" }) });
    const reference = `agro-wd-${event.params.requestId}`.toLowerCase();
    const transfer = await paystackRequest("/transfer", secret, { method: "POST", body: JSON.stringify({ source: "balance", amount: Math.round(Number(request.amount) * 100), recipient: recipient.recipient_code, reference, reason: "AgroPlug farmer withdrawal", currency: "NGN" }) });
    await ref.update({ status: transfer.status === "success" ? "paid" : "submitted", paystackReference: reference, paystackTransferCode: transfer.transfer_code || "", paystackRecipientCode: recipient.recipient_code, paystackStatus: transfer.status || "pending", processedAt: admin.firestore.FieldValue.serverTimestamp() });
  } catch (error) {
    console.error("Paystack withdrawal failed", error);
    await ref.update({ status: "failed", payoutError: String(error.message || "Paystack payout failed"), processedAt: admin.firestore.FieldValue.serverTimestamp() });
  }
});

exports.paystackTransferWebhook = onRequest({ secrets: [paystackSecret] }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const signature = req.get("x-paystack-signature") || "";
  const expected = crypto.createHmac("sha512", paystackSecret.value()).update(req.rawBody).digest("hex");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (!signature || signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return res.status(401).send("Invalid signature");
  const event = req.body || {};
  if (!["transfer.success", "transfer.failed"].includes(event.event)) return res.status(200).send("Ignored");
  const reference = event.data?.reference;
  if (!reference) return res.status(200).send("Missing reference");
  const requestSnap = await db.collection("withdrawalRequests").where("paystackReference", "==", reference).limit(1).get();
  if (!requestSnap.empty) await requestSnap.docs[0].ref.update({ status: event.event === "transfer.success" ? "paid" : "failed", paystackStatus: event.data?.status || "", paystackTransferCode: event.data?.transfer_code || "", processedAt: admin.firestore.FieldValue.serverTimestamp() });
  return res.status(200).send("OK");
});
