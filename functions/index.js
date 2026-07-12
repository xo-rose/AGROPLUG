const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();
const paystackSecret = defineSecret("PAYSTACK_SECRET_KEY");

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

// An admin must change a request's status from `pending` to `approved`.
// This function then creates the Paystack recipient and initiates the transfer.
exports.sendApprovedWithdrawal = onDocumentUpdated(
  { document: "withdrawalRequests/{requestId}", secrets: [paystackSecret] },
  async (event) => {
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
      if (!account.accountName || !account.accountNumber || !account.bankCode) {
        throw new Error("The farmer's payout account is incomplete.");
      }
      const secret = paystackSecret.value();
      const recipient = await paystackRequest("/transferrecipient", secret, {
        method: "POST",
        body: JSON.stringify({
          type: "nuban",
          name: account.accountName,
          account_number: account.accountNumber,
          bank_code: account.bankCode,
          currency: "NGN"
        })
      });
      const reference = `agro-wd-${event.params.requestId}`.toLowerCase();
      const transfer = await paystackRequest("/transfer", secret, {
        method: "POST",
        body: JSON.stringify({
          source: "balance",
          amount: Math.round(Number(request.amount) * 100),
          recipient: recipient.recipient_code,
          reference,
          reason: "AgroPlug farmer withdrawal",
          currency: "NGN"
        })
      });
      await ref.update({
        status: transfer.status === "success" ? "paid" : "submitted",
        paystackReference: reference,
        paystackTransferCode: transfer.transfer_code || "",
        paystackRecipientCode: recipient.recipient_code,
        paystackStatus: transfer.status || "pending",
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error("Paystack withdrawal failed", error);
      await ref.update({
        status: "failed",
        payoutError: String(error.message || "Paystack payout failed"),
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
);

// Add this URL to Paystack Dashboard → Settings → API Keys & Webhooks.
// Paystack signs each event with HMAC SHA-512 using your secret key.
exports.paystackTransferWebhook = onRequest(
  { secrets: [paystackSecret] },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");
    const signature = req.get("x-paystack-signature") || "";
    const expected = crypto
      .createHmac("sha512", paystackSecret.value())
      .update(req.rawBody)
      .digest("hex");
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (!signature || signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body || {};
    if (!["transfer.success", "transfer.failed"].includes(event.event)) return res.status(200).send("Ignored");
    const reference = event.data?.reference;
    if (!reference) return res.status(200).send("Missing reference");
    const requestSnap = await db.collection("withdrawalRequests")
      .where("paystackReference", "==", reference)
      .limit(1)
      .get();
    if (!requestSnap.empty) {
      await requestSnap.docs[0].ref.update({
        status: event.event === "transfer.success" ? "paid" : "failed",
        paystackStatus: event.data?.status || "",
        paystackTransferCode: event.data?.transfer_code || "",
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    return res.status(200).send("OK");
  }
);
