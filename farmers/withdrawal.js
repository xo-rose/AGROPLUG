let currentUser = null;
let availableBalance = 0;
let payoutAccount = null;
let kycStatus = "";

const naira = (amount) => `₦${Number(amount || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
const statusEl = document.getElementById("formStatus");
const setStatus = (message, isError = false) => {
    statusEl.textContent = message;
    statusEl.className = `mt-3 text-center text-sm ${isError ? "text-red-600" : "text-emerald-700"}`;
};

function setKycStatus(message, isError = false) {
    const element = document.getElementById("kycStatus");
    element.textContent = message;
    element.className = `mt-3 text-sm ${isError ? "text-red-600" : "text-emerald-700"}`;
}

function updateKycUi(kyc) {
    kycStatus = String(kyc?.status || "").toLowerCase();
    const form = document.getElementById("kycForm");
    const button = document.getElementById("kycSubmitBtn");
    const withdrawalButton = document.getElementById("withdrawalBtn");
    const description = document.getElementById("kycDescription");
    if (kycStatus === "verified") {
        description.textContent = "Your identity has been verified. You can now request withdrawals to your saved bank account.";
        setKycStatus("Identity verified.");
        form.classList.add("hidden");
        return;
    }
    withdrawalButton.disabled = true;
    if (kycStatus === "pending") {
        description.textContent = "Your KYC submission is under review. Withdrawals will unlock once it is verified.";
        setKycStatus("KYC submitted — awaiting AgroPlug review.");
        form.classList.add("hidden");
        return;
    }
    if (kycStatus === "rejected") {
        description.textContent = "Your previous KYC submission needs updating. Correct your details and submit again before withdrawing.";
        setKycStatus(kyc.reviewNote || "KYC needs to be resubmitted.", true);
    }
    if (kyc) {
        document.getElementById("kycFullName").value = kyc.fullName || "";
        document.getElementById("kycPhone").value = kyc.phone || "";
        document.getElementById("kycIdType").value = kyc.idType || "";
        document.getElementById("kycAddress").value = kyc.address || "";
    }
    form.classList.remove("hidden");
    button.disabled = false;
}

function timestampValue(value) {
    if (!value) return 0;
    return typeof value.toMillis === "function" ? value.toMillis() : new Date(value).getTime() || 0;
}

async function loadWithdrawalData(user) {
    const [profileSnap, ordersSnap, requestsSnap, kycSnap] = await Promise.all([
        db.collection("users").doc(user.uid).get(),
        db.collection("orders").where("farmerId", "==", user.uid).get(),
        db.collection("withdrawalRequests").where("farmerId", "==", user.uid).get(),
        db.collection("kycSubmissions").doc(user.uid).get()
    ]);
    updateKycUi(kycSnap.exists ? kycSnap.data() : null);
    payoutAccount = profileSnap.data()?.payoutAccount || null;
    const accountEl = document.getElementById("accountDetails");
    if (!payoutAccount?.accountName || !payoutAccount?.bankName || !payoutAccount?.bankCode || !payoutAccount?.accountNumber) {
        accountEl.innerHTML = '<span class="font-semibold text-red-600">No payout account saved.</span> Add your bank details in your profile before requesting a withdrawal.';
        document.getElementById("withdrawalBtn").disabled = true;
        return;
    }
    const maskedNumber = `******${String(payoutAccount.accountNumber).slice(-4)}`;
    accountEl.innerHTML = `<span class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Payout account</span><span class="mt-1 block font-bold text-slate-800">${escapeHtml(payoutAccount.accountName)}</span><span>${escapeHtml(payoutAccount.bankName)} • ${maskedNumber}</span>`;

    const unpaidOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(order => String(order.paymentStatus || "").toLowerCase() === "paid" && !order.settlementId);
    const gross = unpaidOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
    const commission = unpaidOrders.reduce((sum, order) => {
        const amount = Number(order.totalPrice || 0);
        return sum + (amount >= 20000 ? amount * 0.05 : 0);
    }, 0);
    const pendingRequests = requestsSnap.docs.reduce((sum, doc) => {
        const request = doc.data();
        return String(request.status || "").toLowerCase() === "pending" ? sum + Number(request.amount || 0) : sum;
    }, 0);
    availableBalance = Math.max(0, gross - commission - pendingRequests);
    document.getElementById("grossAmount").textContent = naira(gross);
    document.getElementById("commissionAmount").textContent = naira(commission);
    document.getElementById("availableBalance").textContent = naira(availableBalance);
    document.getElementById("withdrawalAmount").max = String(availableBalance);
    document.getElementById("withdrawalBtn").disabled = kycStatus !== "verified";
}

function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = String(value || "");
    return node.innerHTML;
}

function renderRequests(docs) {
    const list = document.getElementById("requestList");
    if (!docs.length) {
        list.innerHTML = "No withdrawal requests yet.";
        return;
    }
    list.innerHTML = docs.map(({ id, ...request }) => {
        const when = timestampValue(request.createdAt) ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestampValue(request.createdAt))) : "Just now";
        const state = String(request.status || "pending");
        return `<div class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p class="font-bold text-slate-800">${naira(request.amount)}</p><p class="text-xs text-slate-500">${when}</p></div><span class="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold capitalize text-amber-700">${escapeHtml(state)}</span></div>`;
    }).join("");
}

document.getElementById("withdrawalForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = Number(document.getElementById("withdrawalAmount").value);
    if (kycStatus !== "verified") {
        setStatus("Complete KYC verification before requesting a withdrawal.", true);
        return;
    }
    if (!currentUser || !Number.isFinite(amount) || amount <= 0 || amount > availableBalance) {
        setStatus(`Enter an amount between ₦1 and ${naira(availableBalance)}.`, true);
        return;
    }
    const button = document.getElementById("withdrawalBtn");
    button.disabled = true;
    setStatus("Submitting your withdrawal request…");
    try {
        await db.collection("withdrawalRequests").add({
            farmerId: currentUser.uid,
            farmerName: currentUser.displayName || currentUser.email || "Farmer",
            amount,
            currency: "NGN",
            status: "pending",
            payoutAccount: {
                accountName: payoutAccount.accountName,
                bankName: payoutAccount.bankName,
                bankCode: payoutAccount.bankCode,
                accountNumber: payoutAccount.accountNumber
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        availableBalance -= amount;
        document.getElementById("availableBalance").textContent = naira(availableBalance);
        document.getElementById("withdrawalAmount").max = String(availableBalance);
        document.getElementById("withdrawalAmount").value = "";
        setStatus("Withdrawal request sent. You will be notified after it is reviewed.");
    } catch (error) {
        console.error("Withdrawal request failed:", error);
        setStatus(error.message || "Unable to submit your request.", true);
    } finally {
        button.disabled = false;
    }
});

document.getElementById("kycForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    const button = document.getElementById("kycSubmitBtn");
    const fullName = document.getElementById("kycFullName").value.trim();
    const phone = document.getElementById("kycPhone").value.trim();
    const idType = document.getElementById("kycIdType").value;
    const address = document.getElementById("kycAddress").value.trim();
    if (!fullName || !phone || !idType || !address) return;
    button.disabled = true;
    setKycStatus("Submitting KYC for review…");
    try {
        await db.collection("kycSubmissions").doc(currentUser.uid).set({
            farmerId: currentUser.uid, fullName, phone, idType, address,
            status: "pending", reviewNote: "", submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        updateKycUi({ fullName, phone, idType, address, status: "pending" });
    } catch (error) {
        console.error("KYC submission failed:", error);
        setKycStatus(error.message || "Unable to submit KYC.", true);
        button.disabled = false;
    }
});

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    currentUser = user;
    try {
        await loadWithdrawalData(user);
        db.collection("withdrawalRequests").where("farmerId", "==", user.uid).onSnapshot(snapshot => {
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt));
            renderRequests(requests);
        }, error => setStatus(error.message || "Unable to load withdrawal requests.", true));
    } catch (error) {
        console.error("Withdrawal data failed:", error);
        setStatus(error.message || "Unable to load withdrawal information.", true);
    }
});
