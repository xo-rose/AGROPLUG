const PAYSTACK_PUBLIC_KEY = "pk_test_411590b82445d671e70b557796ab587b9b40f62d";

const menuToggle = document.getElementById("menuToggle");
const menuList = document.getElementById("menuList");
const toggleIcon = document.getElementById("toggleIcon");
const sidebar = document.getElementById("sidebar");
const logoutBtn = document.getElementById("logoutBtn");
const buyerName = document.getElementById("buyerName");
const walletBalance = document.getElementById("walletBalance");
const walletStatus = document.getElementById("walletStatus");
const fundWalletBtn = document.getElementById("fundWalletBtn");
const fundWalletModal = document.getElementById("fundWalletModal");
const fundWalletForm = document.getElementById("fundWalletForm");
const fundAmount = document.getElementById("fundAmount");
const fundModalMessage = document.getElementById("fundModalMessage");
const closeFundWalletModal = document.getElementById("closeFundWalletModal");
const cancelFundWallet = document.getElementById("cancelFundWallet");
const submitFundWallet = document.getElementById("submitFundWallet");

let currentUser = null;
let unsubscribeWallet = null;

function formatNaira(amount) {
    return `₦${Number(amount || 0).toLocaleString()}`;
}

function setWalletStatus(message, type = "info") {
    if (!walletStatus) return;

    walletStatus.textContent = message;
    walletStatus.className = "text-xs mt-4";

    if (type === "error") {
        walletStatus.classList.add("text-red-600", "font-medium");
    } else if (type === "success") {
        walletStatus.classList.add("text-emerald-600", "font-medium");
    } else {
        walletStatus.classList.add("text-slate-500");
    }
}

function setModalMessage(message, type = "info") {
    if (!fundModalMessage) return;

    fundModalMessage.textContent = message;
    fundModalMessage.className = "rounded-xl border px-4 py-3 text-sm";

    if (!message) {
        fundModalMessage.classList.add("hidden");
        return;
    }

    if (type === "error") {
        fundModalMessage.classList.add("border-red-100", "bg-red-50", "text-red-700");
    } else if (type === "success") {
        fundModalMessage.classList.add("border-emerald-100", "bg-emerald-50", "text-emerald-700");
    } else {
        fundModalMessage.classList.add("border-slate-200", "bg-slate-50", "text-slate-600");
    }
}

function setFundingButtonLoading(isLoading) {
    if (!submitFundWallet) return;

    submitFundWallet.disabled = isLoading;
    submitFundWallet.classList.toggle("opacity-70", isLoading);
    submitFundWallet.classList.toggle("cursor-not-allowed", isLoading);
    submitFundWallet.textContent = isLoading ? "Processing..." : "Continue";
}

function getBuyerDisplayName(user) {
    return user.displayName || (user.email ? user.email.split("@")[0] : "Buyer");
}

function openFundWalletModal() {
    if (!fundWalletModal) return;

    setModalMessage("");
    setFundingButtonLoading(false);
    fundWalletForm?.reset();
    fundWalletModal.classList.remove("hidden");
    fundWalletModal.classList.add("flex");

    setTimeout(() => {
        fundAmount?.focus();
    }, 50);
}

function closeFundingModal() {
    if (!fundWalletModal) return;

    fundWalletModal.classList.add("hidden");
    fundWalletModal.classList.remove("flex");
}

function setupMobileMenu() {
    if (!menuToggle || !menuList || !toggleIcon || !sidebar) return;

    menuToggle.addEventListener("click", () => {
        menuList.classList.toggle("hidden");

        if (menuList.classList.contains("hidden")) {
            toggleIcon.className = "fa-solid fa-bars";
            sidebar.classList.remove("h-screen");
        } else {
            toggleIcon.className = "fa-solid fa-xmark";
            sidebar.classList.add("h-screen");
        }
    });
}

function setupLogout() {
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async (event) => {
        event.preventDefault();

        try {
            await auth.signOut();
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout process error:", error);
            setWalletStatus("An error occurred during logout.", "error");
        }
    });
}

function renderWalletBalance(balance, message = "Wallet balance is up to date.") {
    if (walletBalance) {
        walletBalance.textContent = formatNaira(balance);
    }

    setWalletStatus(message);
}

function listenForUserWalletBalance(userId, originalError) {
    if (unsubscribeWallet) {
        unsubscribeWallet();
    }

    unsubscribeWallet = db.collection("users").doc(userId).onSnapshot(
        (doc) => {
            const userData = doc.exists ? doc.data() : {};
            const balance = Number(userData.walletBalance || 0);
            const message = originalError
                ? "Wallet loaded from your profile record. Add wallet rules later for live wallet documents."
                : "Wallet balance is up to date.";

            renderWalletBalance(balance, message);
        },
        (error) => {
            console.error("Fallback wallet balance load failed:", error);
            const reason = error.code ? ` (${error.code})` : "";
            setWalletStatus(`Unable to load wallet balance right now${reason}.`, "error");
        }
    );
}

function listenForWalletBalance(userId) {
    if (!walletBalance) return;

    if (unsubscribeWallet) {
        unsubscribeWallet();
    }

    unsubscribeWallet = db.collection("wallets").doc(userId).onSnapshot(
        (doc) => {
            const walletData = doc.exists ? doc.data() : {};
            const balance = Number(walletData.balance || 0);

            renderWalletBalance(balance, doc.exists ? "Wallet balance is up to date." : "Fund your wallet to get started.");
        },
        (error) => {
            console.error("Wallet balance load failed:", error);
            listenForUserWalletBalance(userId, error);
        }
    );
}

async function recordWalletFunding(user, amount, response) {
    const walletRef = db.collection("wallets").doc(user.uid);
    const userRef = db.collection("users").doc(user.uid);
    const transactionRef = walletRef.collection("transactions").doc(response.reference);
    const fundingRecord = {
        type: "funding",
        amount,
        currency: "NGN",
        status: "success",
        paymentStatus: "paid",
        reference: response.reference,
        paystackReference: response.reference,
        buyerId: user.uid,
        buyerEmail: user.email || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const walletUpdate = {
        buyerId: user.uid,
        buyerEmail: user.email || "",
        balance: firebase.firestore.FieldValue.increment(amount),
        lastFundingAmount: amount,
        lastFundingReference: response.reference,
        lastFundingStatus: "success",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const userWalletUpdate = {
        walletBalance: firebase.firestore.FieldValue.increment(amount),
        lastFundingAmount: amount,
        lastFundingReference: response.reference,
        lastFundingStatus: "success",
        walletUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    let walletWriteSucceeded = false;
    let userProfileWriteSucceeded = false;
    let walletWriteError = null;
    let userProfileWriteError = null;

    try {
        await walletRef.set(walletUpdate, { merge: true });
        walletWriteSucceeded = true;
    } catch (error) {
        walletWriteError = error;
        console.warn("Wallet document update failed:", error);
    }

    try {
        await userRef.set(userWalletUpdate, { merge: true });
        userProfileWriteSucceeded = true;
    } catch (error) {
        userProfileWriteError = error;
        console.warn("User profile wallet update failed:", error);
    }

    if (!walletWriteSucceeded && !userProfileWriteSucceeded) {
        throw walletWriteError || userProfileWriteError || new Error("Wallet update failed.");
    }

    try {
        await transactionRef.set(fundingRecord);
    } catch (error) {
        console.warn("Wallet subcollection transaction record failed:", error);
    }

    try {
        await db.collection("walletTransactions").doc(response.reference).set(fundingRecord);
    } catch (error) {
        console.warn("Top-level wallet transaction record failed:", error);
    }
}

function startWalletFunding(amount) {
    const user = currentUser || auth.currentUser;

    if (!user) {
        setModalMessage("Please login first.", "error");
        return;
    }

    if (!user.email) {
        setModalMessage("Your account needs an email address before Paystack can start payment.", "error");
        return;
    }

    if (!window.PaystackPop) {
        setModalMessage("Paystack could not load. Please check your connection and try again.", "error");
        return;
    }

    const amountInKobo = Math.round(amount * 100);
    const paymentReference = `AGRO_WALLET_${Date.now()}`;

    if (!Number.isFinite(amountInKobo) || amountInKobo < 10000) {
        setModalMessage("Please enter a valid amount of at least ₦100.", "error");
        return;
    }

    try {
        setWalletStatus("Opening secure Paystack checkout...");
        setModalMessage("Opening secure Paystack checkout...");
        setFundingButtonLoading(true);

        let paymentCompleted = false;

        const handler = PaystackPop.setup({
            key:"pk_test_411590b82445d671e70b557796ab587b9b40f62d",
            email: user.email,
            amount: amountInKobo,
            currency: "NGN",
            ref: paymentReference,
            metadata: {
                buyerId: user.uid,
                buyerName: getBuyerDisplayName(user),
                purpose: "wallet_funding"
            },
            callback: function (response) {
                paymentCompleted = true;

                try {
                    setWalletStatus("Confirming wallet funding...");
                    setModalMessage("Confirming wallet funding...");
                    recordWalletFunding(user, amount, response)
                        .then(() => {
                            setWalletStatus(`Wallet funded successfully. Reference: ${response.reference}`, "success");
                            setModalMessage(`Wallet funded successfully. Reference: ${response.reference}`, "success");
                            setFundingButtonLoading(false);
                        })
                        .catch((error) => {
                            console.error("Wallet funding save failed:", error);
                            setWalletStatus("Payment succeeded, but the wallet record could not be updated.", "error");
                            setModalMessage("Payment succeeded, but the wallet record could not be updated. Please contact support with your reference.", "error");
                            setFundingButtonLoading(false);
                        });
                } catch (error) {
                    console.error("Wallet funding save failed:", error);
                    setWalletStatus("Payment succeeded, but the wallet record could not be updated.", "error");
                    setModalMessage("Payment succeeded, but the wallet record could not be updated. Please contact support with your reference.", "error");
                    setFundingButtonLoading(false);
                }
            },
            onClose: function () {
                if (paymentCompleted) return;

                setWalletStatus("Wallet funding was cancelled.");
                setModalMessage("Wallet funding was cancelled.");
                setFundingButtonLoading(false);
            }
        });

        handler.openIframe();
    } catch (error) {
        console.error("Paystack setup failed:", error);
        setWalletStatus("Paystack could not start. Please try again.", "error");
        setModalMessage(`Paystack could not start: ${error.message || "Unknown error"}`, "error");
        setFundingButtonLoading(false);
    }
}

setupMobileMenu();
setupLogout();

if (fundWalletBtn) {
    fundWalletBtn.addEventListener("click", openFundWalletModal);
}

if (new URLSearchParams(window.location.search).get("fund") === "1") {
    const openFundingFromDashboard = () => {
        openFundWalletModal();
    };

    if (document.readyState === "complete") {
        openFundingFromDashboard();
    } else {
        window.addEventListener("load", openFundingFromDashboard);
    }
}

if (closeFundWalletModal) {
    closeFundWalletModal.addEventListener("click", closeFundingModal);
}

if (cancelFundWallet) {
    cancelFundWallet.addEventListener("click", closeFundingModal);
}

if (fundWalletModal) {
    fundWalletModal.addEventListener("click", (event) => {
        if (event.target === fundWalletModal) {
            closeFundingModal();
        }
    });
}

if (fundWalletForm) {
    fundWalletForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const amount = Number(fundAmount?.value || 0);

        if (!Number.isFinite(amount) || amount < 100) {
            setModalMessage("Please enter a valid amount of at least ₦100.", "error");
            fundAmount?.focus();
            return;
        }

        startWalletFunding(amount);
    });
}

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;
    if (buyerName) {
        buyerName.textContent = getBuyerDisplayName(user);
    }
    listenForWalletBalance(user.uid);
});
