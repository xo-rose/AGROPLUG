const RECENT_LIMIT = 100;

function getTimestampValue(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    return new Date(value).getTime() || 0;
}

function formatNaira(amount) {
    return `₦${Number(amount || 0).toLocaleString()}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDateTime(value) {
    const millis = getTimestampValue(value);
    if (!millis) return "";
    return new Intl.DateTimeFormat("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(millis));
}

function renderEmpty(container, message) {
    if (!container) return;
    container.innerHTML = `
    <div class="p-5 text-sm text-slate-500">${escapeHtml(message)}</div>
  `;
}

function renderEarningsList(container, earnings) {
    if (!container) return;
    if (!earnings.length) {
        renderEmpty(container, "No earnings found yet.");
        return;
    }

    container.innerHTML = earnings
        .slice(0, RECENT_LIMIT)
        .map((e) => {
            const amount = formatNaira(e.amount);
            const when = formatDateTime(e.timestamp || e.createdAt);
            const ref = e.orderId || e.reference || e.paymentReference || e.txRef || "";
            const label = e.type || "sale";
            return `
        <div class="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <i class="fa-solid fa-wallet"></i>
              </div>
              <div class="min-w-0">
                <div class="font-bold text-sm text-slate-900 truncate">${escapeHtml(label.toUpperCase())}</div>
                <div class="text-[11px] text-slate-500 truncate mt-0.5">Ref: ${escapeHtml(ref)}</div>
              </div>
            </div>
          </div>

          <div class="sm:text-right">
            <div class="font-extrabold text-slate-900">${escapeHtml(amount)}</div>
            <div class="text-[11px] text-slate-500 mt-1">${escapeHtml(when)}</div>
          </div>
        </div>
      `;
        })
        .join("");
}

async function loadAuthUser() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged((user) => resolve(user));
    });
}

async function fetchSalesEarnings(uid) {
    // Preferred: buyers/wallet.js uses collection("sales") with fields: farmerId, amount, timestamp
    const snap = await db
        .collection("sales")
        .where("farmerId", "==", uid)
        .orderBy("timestamp", "desc")
        .limit(RECENT_LIMIT)
        .get();

    const earnings = snap.docs.map((d) => ({
        id: d.id,
        type: "sale",
        amount: d.data().amount,
        timestamp: d.data().timestamp,
        reference: d.data().reference || d.data().paymentReference,
        paymentReference: d.data().paymentReference,
        orderId: d.data().orderId,
        createdAt: d.data().createdAt,
    }));

    return earnings;
}

async function fetchPaidOrdersEarnings(uid) {
    // Fallback: compute from orders where farmerId==uid and paymentStatus==paid
    const snap = await db
        .collection("orders")
        .where("farmerId", "==", uid)
        .where("paymentStatus", "==", "paid")
        .orderBy("createdAt", "desc")
        .limit(RECENT_LIMIT)
        .get();

    return snap.docs.map((d) => {
        const data = d.data() || {};
        return {
            id: d.id,
            type: "order_paid",
            amount: data.totalPrice,
            timestamp: data.createdAt,
            createdAt: data.createdAt,
            paymentReference: data.paymentReference,
            reference: data.paymentReference,
            orderId: d.id,
        };
    });
}

function init() {
    const container = document.getElementById("earningsContainer");
    const countLabel = document.getElementById("earningsCountLabel");

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        try {
            // Fetch sales first (if empty, fallback to orders)
            let earnings = await fetchSalesEarnings(user.uid);

            if (!earnings.length) {
                earnings = await fetchPaidOrdersEarnings(user.uid);
            }

            const totalCount = earnings.length;
            if (countLabel) countLabel.textContent = String(totalCount);

            // Sort newest first
            earnings.sort((a, b) => getTimestampValue(b.timestamp || b.createdAt) - getTimestampValue(a.timestamp || a.createdAt));

            renderEarningsList(container, earnings);
        } catch (err) {
            console.error("Earnings load failed:", err);
            renderEmpty(container, "Unable to load earnings right now.");
        }
    });
}

init();

