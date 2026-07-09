const RECENT_DAYS = 30;

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

function normalizeStatus(status) {
    return String(status || "pending")
        .toLowerCase()
        .replace(/\s+/g, "_");
}

function statusLabel(status) {
    return normalizeStatus(status)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusBadgeClass(status) {
    const normalized = normalizeStatus(status);

    if (["delivered", "completed", "paid"].includes(normalized)) {
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
    }

    if (["in_transit", "shipped"].includes(normalized)) {
        return "bg-blue-50 text-blue-700 border-blue-100";
    }

    if (["cancelled", "failed"].includes(normalized)) {
        return "bg-red-50 text-red-700 border-red-100";
    }

    return "bg-amber-50 text-amber-700 border-amber-100";
}

function orderIconClass(status) {
    const normalized = normalizeStatus(status);

    if (["delivered", "completed"].includes(normalized)) {
        return "fa-solid fa-circle-check text-emerald-500";
    }

    if (["in_transit", "shipped"].includes(normalized)) {
        return "fa-solid fa-truck-fast text-blue-500";
    }

    return "fa-solid fa-box text-amber-500";
}

function formatDate(value) {
    const millis = getTimestampValue(value);
    if (!millis) return "Recently";

    return new Intl.DateTimeFormat("en-NG", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(millis));
}

function renderOrdersList(containerEl, orders) {
    if (!containerEl) return;

    if (!orders.length) {
        containerEl.innerHTML = `
      <div class="p-5 text-sm text-slate-500">
        No orders found.
      </div>
    `;
        return;
    }

    containerEl.innerHTML = "";

    orders.forEach((order) => {
        const shortId = String(order.id || "").slice(0, 6).toUpperCase();
        const status = order.orderStatus || order.paymentStatus || "pending";
        const unit = order.unit || order.category || "unit";
        const productName = order.productName || "Produce";
        const farmerName = order.farmerName || "Unknown Farmer";
        const totalPrice = formatNaira(order.totalPrice);
        const dateStr = formatDate(order.createdAt);

        containerEl.innerHTML += `
      <article class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-slate-50/80 transition gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 shrink-0 flex items-center justify-center text-slate-400">
            <i class="${orderIconClass(status)} text-base"></i>
          </div>
          <div class="min-w-0">
            <h3 class="font-semibold text-sm text-slate-900 truncate">Order #${escapeHtml(shortId)}</h3>
            <p class="text-[11px] text-slate-500 truncate">${escapeHtml(productName)} from ${escapeHtml(farmerName)}</p>
            <p class="text-[10px] text-slate-400 truncate mt-1">Quantity: ${escapeHtml(Number(order.quantity || 0).toLocaleString())} ${escapeHtml(unit)}</p>
          </div>
        </div>
        <div class="flex items-center justify-between sm:justify-end gap-4 shrink-0">
          <span class="${statusBadgeClass(status)} px-2.5 py-1 rounded-lg text-[10px] font-semibold border">
            ${escapeHtml(statusLabel(status))}
          </span>
          <div class="text-right">
            <p class="text-[9px] font-medium text-slate-400">${escapeHtml(dateStr)}</p>
            <h3 class="font-bold text-sm text-slate-900">${escapeHtml(totalPrice)}</h3>
          </div>
        </div>
      </article>
    `;
    });
}

function splitRecentOld(orders) {
    const now = Date.now();
    const recentCutoff = now - RECENT_DAYS * 24 * 60 * 60 * 1000;

    const recent = [];
    const old = [];

    for (const order of orders) {
        const createdAtMs = getTimestampValue(order.createdAt);
        if (!createdAtMs || createdAtMs >= recentCutoff) recent.push(order);
        else old.push(order);
    }

    return {
        recent: recent.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt)),
        old: old.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt)),
    };
}

function initOrderPage() {
    const recentOrdersContainer = document.getElementById("recentOrdersContainer");
    const oldOrdersContainer = document.getElementById("oldOrdersContainer");
    const recentDaysLabel = document.getElementById("recentDaysLabel");
    const recentOrdersDaysLabel = document.getElementById("recentOrdersDaysLabel");

    if (recentDaysLabel) recentDaysLabel.textContent = `${RECENT_DAYS} days`;
    if (recentOrdersDaysLabel) recentOrdersDaysLabel.textContent = String(RECENT_DAYS);

    if (!recentOrdersContainer && !oldOrdersContainer) return;

    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        db.collection("orders")
            .where("buyerId", "==", user.uid)
            .onSnapshot(
                (snapshot) => {
                    const orders = snapshot.docs
                        .map((doc) => ({ id: doc.id, ...doc.data() }))
                        .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));

                    const { recent, old } = splitRecentOld(orders);

                    renderOrdersList(recentOrdersContainer, recent);
                    renderOrdersList(oldOrdersContainer, old);
                },
                (error) => {
                    console.error("Buyer orders load failed:", error);
                    if (recentOrdersContainer) {
                        recentOrdersContainer.innerHTML = `
              <div class="p-5 text-sm text-red-600">Unable to load your recent orders right now.</div>
            `;
                    }
                    if (oldOrdersContainer) {
                        oldOrdersContainer.innerHTML = `
              <div class="p-5 text-sm text-red-600">Unable to load your old orders right now.</div>
            `;
                    }
                }
            );
    });
}

function setupMobileMenu() {
    const menuToggle = document.getElementById("menuToggle");
    const menuList = document.getElementById("menuList");
    const toggleIcon = document.getElementById("toggleIcon");
    const sidebar = document.getElementById("sidebar");

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
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", (event) => {
        event.preventDefault();
        auth.signOut()
            .then(() => {
                window.location.href = "login.html";
            })
            .catch((error) => {
                console.error("Logout process error:", error);
                alert("An error occurred during logout.");
            });
    });
}

setupMobileMenu();
setupLogout();
initOrderPage();

