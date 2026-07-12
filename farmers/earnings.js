// ================================================
// AGROPLUG - Farmer Earnings: Day / Month / Year
// ================================================

// ── Helpers ────────────────────────────────────

function getTimestampValue(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    return new Date(value).getTime() || 0;
}

function formatNaira(amount) {
    return `₦${Number(amount || 0).toLocaleString("en-NG", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
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
    if (!millis) return "—";
    return new Intl.DateTimeFormat("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(millis));
}

// ── Period helpers ─────────────────────────────

function getStartOf(period) {
    const now = new Date();
    if (period === "day") {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    if (period === "month") {
        return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
    if (period === "year") {
        return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    }
    return null; // "all"
}

function isInPeriod(earningTs, period) {
    const start = getStartOf(period);
    if (!start) return true;
    return earningTs >= start.getTime();
}

// ── Firestore Fetchers ─────────────────────────

async function fetchSalesEarnings(uid) {
    const snap = await db
        .collection("sales")
        .where("farmerId", "==", uid)
        .get();

    return snap.docs.map((d) => ({
        id: d.id,
        type: "sale",
        amount: Number(d.data().amount || 0),
        timestamp: d.data().timestamp,
        reference: d.data().reference || d.data().paymentReference,
        paymentReference: d.data().paymentReference,
        orderId: d.data().orderId,
        createdAt: d.data().createdAt,
    }));
}

async function fetchPaidOrdersEarnings(uid) {
    const snap = await db
        .collection("orders")
        .where("farmerId", "==", uid)
        .get();

    // Keep this query aligned with the farmer-scoped Firestore rule. Filtering
    // paid orders locally also avoids requiring a composite Firestore index.
    return snap.docs
        .filter((d) => String(d.data().paymentStatus || "").toLowerCase() === "paid")
        .map((d) => {
        const data = d.data() || {};
        return {
            id: d.id,
            type: "order_paid",
            amount: Number(data.totalPrice || 0),
            timestamp: data.createdAt,
            createdAt: data.createdAt,
            paymentReference: data.paymentReference,
            reference: data.paymentReference,
            orderId: d.id,
            settlementId: data.settlementId || "",
        };
    });
}

function updatePayoutBalance(earnings, pendingWithdrawals = 0) {
    // A balance must include only this farmer's paid orders that have not
    // already been included in an end-of-day settlement. `fetchEarnings` is
    // scoped to auth.currentUser.uid, so no other farmer or platform totals
    // can be included here.
    const unpaidOrders = earnings.filter((earning) =>
        earning.type === "order_paid" && !earning.settlementId
    );
    const gross = unpaidOrders.reduce((sum, earning) => sum + Number(earning.amount || 0), 0);
    const commission = unpaidOrders.reduce((sum, earning) => {
        const amount = Number(earning.amount || 0);
        return sum + (amount >= 20000 ? amount * 0.05 : 0);
    }, 0);

    const availableBalance = Math.max(0, gross - commission - pendingWithdrawals);
    const values = {
        payoutGross: gross,
        payoutCommission: commission,
        pendingWithdrawals,
        payoutBalance: availableBalance,
    };
    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = formatNaira(value);
    });
}

async function fetchPendingWithdrawals(uid) {
    const snap = await db
        .collection("withdrawalRequests")
        .where("farmerId", "==", uid)
        .get();

    return snap.docs.reduce((total, doc) => {
        const request = doc.data() || {};
        return String(request.status || "").toLowerCase() === "pending"
            ? total + Number(request.amount || 0)
            : total;
    }, 0);
}

function netEarningAmount(earning) {
    const amount = Number(earning.amount || 0);
    // The platform charge applies to paid orders of ₦20,000 and above.
    // Legacy sales have no order data, so their recorded amount is retained.
    if (earning.type === "order_paid" && amount >= 20000) return amount * 0.95;
    return amount;
}

async function fetchEarnings(uid) {
    // Orders are created by the current checkout flow and are readable by the
    // farmer under the existing /orders rule.
    const paidOrders = await fetchPaidOrdersEarnings(uid);

    // `sales` is a legacy source. Prefer paid orders because they contain the
    // settlement marker used for the payout balance, and fall back to sales
    // only for older farmer accounts.
    try {
        const sales = await fetchSalesEarnings(uid);
        return paidOrders.length ? paidOrders : sales;
    } catch (error) {
        if (error.code === "permission-denied") {
            console.warn("Legacy sales records are unavailable; showing paid orders instead.");
            return paidOrders;
        }
        throw error;
    }
}

// ── Summary Computation ────────────────────────

function computeSummary(earnings) {
    const dayStart   = getStartOf("day").getTime();
    const monthStart = getStartOf("month").getTime();
    const yearStart  = getStartOf("year").getTime();

    let day = 0, month = 0, year = 0, total = 0;

    for (const e of earnings) {
        const ts  = getTimestampValue(e.timestamp || e.createdAt);
        const amt = netEarningAmount(e);
        total += amt;
        if (ts >= dayStart)   day   += amt;
        if (ts >= monthStart) month += amt;
        if (ts >= yearStart)  year  += amt;
    }

    return { day, month, year, total };
}

// ── Update summary card values ─────────────────

function updateSummaryValues(summary) {
    const map = {
        earningsDay:   summary.day,
        earningsMonth: summary.month,
        earningsYear:  summary.year,
        earningsAll:   summary.total,
    };
    for (const [id, val] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.textContent = formatNaira(val);
    }
}

// ── Earnings List ──────────────────────────────

function renderEarningsTable(container, earnings, activePeriod) {
    if (!container) return;

    const filtered = earnings.filter((e) => {
        const ts = getTimestampValue(e.timestamp || e.createdAt);
        return isInPeriod(ts, activePeriod);
    });

    if (!filtered.length) {
        container.innerHTML = `
      <div class="flex flex-col items-center justify-center gap-3 py-14 text-slate-400">
        <i class="fa-solid fa-receipt text-4xl opacity-30"></i>
        <p class="text-sm font-medium">No earnings for this period.</p>
      </div>`;
        return;
    }

    container.innerHTML = filtered.map((e) => {
        const grossAmount = Number(e.amount || 0);
        const commission = e.type === "order_paid" && grossAmount >= 20000
            ? grossAmount * 0.05
            : 0;
        const amount = formatNaira(grossAmount - commission);
        const when   = formatDateTime(e.timestamp || e.createdAt);
        const ref    = e.orderId || e.reference || e.paymentReference || "—";
        const label  = e.type === "order_paid" ? "Order Payment" : "Sale";
        const labelColor =
            e.type === "order_paid"
                ? "bg-blue-50 text-blue-700 border-blue-100"
                : "bg-emerald-50 text-emerald-700 border-emerald-100";

        return `
      <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70 transition-colors duration-150">
        <div class="flex items-center gap-4 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <i class="fa-solid fa-circle-check text-base"></i>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-sm text-slate-900">${escapeHtml(label)}</span>
              <span class="text-[10px] font-semibold border px-2 py-0.5 rounded-full ${labelColor}">${escapeHtml(label)}</span>
            </div>
            <div class="text-[11px] text-slate-400 truncate mt-0.5">Ref: ${escapeHtml(ref)}</div>
          </div>
        </div>
        <div class="sm:text-right shrink-0">
          <div class="font-extrabold text-slate-900 text-base">${escapeHtml(amount)}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">Gross ${escapeHtml(formatNaira(grossAmount))}${commission ? ` · Charge ${escapeHtml(formatNaira(commission))}` : ""}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(when)}</div>
        </div>
      </div>`;
    }).join("");
}

// ── Active Filter UI ───────────────────────────

function setActiveFilter(activePeriod) {
    // Highlight active summary card
    document.querySelectorAll(".summary-card").forEach((btn) => {
        const isActive = btn.dataset.period === activePeriod;
        btn.classList.toggle("ring-2",           isActive);
        btn.classList.toggle("ring-emerald-500", isActive);
        btn.classList.toggle("ring-offset-2",    isActive);
        btn.classList.toggle("shadow-lg",        isActive);
    });

    // Highlight active tab pill
    document.querySelectorAll(".period-tab").forEach((tab) => {
        const isActive = tab.dataset.period === activePeriod;
        tab.classList.toggle("bg-[#0A4D26]",   isActive);
        tab.classList.toggle("text-white",      isActive);
        tab.classList.toggle("shadow-md",       isActive);
        tab.classList.toggle("text-slate-500",  !isActive);
        tab.classList.toggle("bg-white",        !isActive);
        tab.classList.toggle("hover:bg-slate-50", !isActive);
    });

    // Update list heading
    const labelMap = { day: "Today", month: "This Month", year: "This Year", all: "All Time" };
    const listHeading = document.getElementById("listHeading");
    if (listHeading) listHeading.textContent = `Transactions — ${labelMap[activePeriod] || "All"}`;
}

// ── Main Init ──────────────────────────────────

function initEarnings() {
    const earningsContainer  = document.getElementById("earningsContainer");
    const earningsCountLabel = document.getElementById("earningsCountLabel");

    let allEarnings   = [];
    let currentPeriod = "day"; // default to today

    function applyFilter(period) {
        currentPeriod = period;
        setActiveFilter(period);

        const filtered = allEarnings.filter((e) => {
            const ts = getTimestampValue(e.timestamp || e.createdAt);
            return isInPeriod(ts, period);
        });

        if (earningsCountLabel)
            earningsCountLabel.textContent = String(filtered.length);

        renderEarningsTable(earningsContainer, allEarnings, period);
    }

    // Attach tab listeners early (cards are rendered dynamically later)
    document.querySelectorAll(".period-tab").forEach((tab) => {
        tab.addEventListener("click", () => applyFilter(tab.dataset.period));
    });

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        try {
            // Show loading state
            if (earningsContainer) {
                earningsContainer.innerHTML = `
          <div class="flex flex-col items-center justify-center gap-3 py-14 text-slate-400 animate-pulse">
            <i class="fa-solid fa-spinner fa-spin text-3xl text-emerald-400"></i>
            <p class="text-sm">Loading your earnings…</p>
          </div>`;
            }

            const [earnings, pendingWithdrawals] = await Promise.all([
                fetchEarnings(user.uid),
                fetchPendingWithdrawals(user.uid),
            ]);

            // Sort newest first
            allEarnings = earnings.sort(
                (a, b) =>
                    getTimestampValue(b.timestamp || b.createdAt) -
                    getTimestampValue(a.timestamp || a.createdAt)
            );

            // Compute & display summary values
            const summary = computeSummary(allEarnings);
            updateSummaryValues(summary);
            updatePayoutBalance(allEarnings, pendingWithdrawals);

            // Attach card listeners
            document.querySelectorAll(".summary-card").forEach((btn) => {
                btn.addEventListener("click", () => applyFilter(btn.dataset.period));
            });

            // Render with default filter
            applyFilter(currentPeriod);

        } catch (err) {
            console.error("Earnings load failed:", err);
            if (earningsContainer) {
                earningsContainer.innerHTML = `
          <div class="flex flex-col items-center justify-center gap-3 py-14 text-red-400">
            <i class="fa-solid fa-triangle-exclamation text-4xl opacity-50"></i>
            <p class="text-sm font-medium">Unable to load earnings right now.</p>
            <p class="text-xs text-slate-400">${escapeHtml(err.message || "")}</p>
          </div>`;
            }
        }
    });
}

initEarnings();

