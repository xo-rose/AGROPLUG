(function () {
    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getTimestampValue(value) {
        if (!value) return 0;
        if (typeof value.toMillis === "function") return value.toMillis();
        if (typeof value.toDate === "function") return value.toDate().getTime();
        return new Date(value).getTime() || 0;
    }

    function formatDate(value) {
        const millis = getTimestampValue(value);
        if (!millis) return "Just now";

        return new Intl.DateTimeFormat("en-NG", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }).format(new Date(millis));
    }

    function getNotificationLink(notification) {
        if (notification.type === "message") {
            const otherId = notification.senderId || notification.buyerId || notification.farmerId || "";
            const otherName = notification.senderName || "";
            const isFarmerPage = window.location.pathname.includes("/farmers/");
            const idParam = isFarmerPage ? "buyerId" : "farmerId";
            const nameParam = isFarmerPage ? "buyerName" : "farmerName";
            return `messages.html?${idParam}=${encodeURIComponent(otherId)}&${nameParam}=${encodeURIComponent(otherName)}`;
        }

        if (notification.type === "order_placed") {
            return "order.html";
        }

        return "#";
    }

    function ensurePanel() {
        let panel = document.getElementById("notificationPanel");
        if (panel) return panel;

        panel = document.createElement("div");
        panel.id = "notificationPanel";
        panel.className = "hidden absolute right-0 top-full mt-3 w-80 max-w-[88vw] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-[80]";
        panel.innerHTML = `
            <div class="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 class="font-bold text-sm text-slate-900">Notifications</h3>
                <button id="markNotificationsRead" type="button" class="text-[11px] font-semibold text-emerald-700 hover:underline">Mark read</button>
            </div>
            <div id="notificationList" class="max-h-80 overflow-y-auto">
                <div class="p-4 text-sm text-slate-500">Loading notifications...</div>
            </div>
        `;

        const button = document.getElementById("notificationButton");
        if (button?.parentElement) {
            button.parentElement.appendChild(panel);
        }

        return panel;
    }

    function renderNotifications(notifications) {
        const list = document.getElementById("notificationList");
        const badge = document.getElementById("notificationBadge");
        const unread = notifications.filter((item) => !item.read).length;

        if (badge) {
            badge.textContent = unread > 9 ? "9+" : String(unread);
            badge.classList.toggle("hidden", unread === 0);
        }

        if (!list) return;

        if (!notifications.length) {
            list.innerHTML = '<div class="p-4 text-sm text-slate-500">No notifications yet.</div>';
            return;
        }

        list.innerHTML = notifications.slice(0, 8).map((notification) => {
            const unreadClass = notification.read ? "bg-white" : "bg-emerald-50/70";
            const iconClass = notification.type === "message"
                ? "fa-regular fa-comment-dots text-blue-600"
                : "fa-solid fa-basket-shopping text-emerald-600";

            return `
                <a href="${escapeHtml(getNotificationLink(notification))}" class="block p-4 border-b border-slate-100 hover:bg-slate-50 ${unreadClass}">
                    <div class="flex gap-3">
                        <div class="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0">
                            <i class="${iconClass} text-sm"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="text-sm font-semibold text-slate-800 leading-snug">${escapeHtml(notification.title || "New notification")}</p>
                            <p class="text-xs text-slate-500 mt-1 leading-snug">${escapeHtml(notification.message || "")}</p>
                            <p class="text-[10px] text-slate-400 mt-1">${escapeHtml(formatDate(notification.createdAt))}</p>
                        </div>
                    </div>
                </a>
            `;
        }).join("");
    }

    function showToast(notification) {
        let toast = document.getElementById("notificationToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "notificationToast";
            toast.className = "fixed top-4 right-4 z-[100] hidden max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl p-4";
            document.body.appendChild(toast);
        }

        toast.innerHTML = `
            <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">New notification</p>
            <p class="text-sm font-semibold text-slate-900 mt-1">${escapeHtml(notification.title || "AgroPlug")}</p>
            <p class="text-xs text-slate-500 mt-1">${escapeHtml(notification.message || "")}</p>
        `;
        toast.classList.remove("hidden");

        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => toast.classList.add("hidden"), 5000);
    }

    async function markAllRead(notifications) {
        const unread = notifications.filter((item) => !item.read);
        await Promise.all(unread.map((item) => db.collection("notifications").doc(item.id).update({ read: true })));
    }

    function initNotifications(user) {
        const button = document.getElementById("notificationButton");
        if (!button || !window.db || !user) return;

        const panel = ensurePanel();
        let latestSeenCreatedAt = 0;
        let initialized = false;
        let latestNotifications = [];

        button.addEventListener("click", () => {
            panel.classList.toggle("hidden");
        });

        document.addEventListener("click", (event) => {
            if (!panel.contains(event.target) && !button.contains(event.target)) {
                panel.classList.add("hidden");
            }
        });

        document.getElementById("markNotificationsRead")?.addEventListener("click", async () => {
            try {
                await markAllRead(latestNotifications);
            } catch (error) {
                console.error("Unable to mark notifications read:", error);
            }
        });

        db.collection("notifications")
            .where("recipientId", "==", user.uid)
            .onSnapshot((snapshot) => {
                latestNotifications = snapshot.docs
                    .map((doc) => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));

                renderNotifications(latestNotifications);

                const newest = latestNotifications[0];
                const newestCreatedAt = getTimestampValue(newest?.createdAt);
                if (initialized && newest && newestCreatedAt > latestSeenCreatedAt && !newest.read) {
                    showToast(newest);
                }

                latestSeenCreatedAt = Math.max(latestSeenCreatedAt, newestCreatedAt);
                initialized = true;
            }, (error) => {
                console.error("Notifications load failed:", error);
                const list = document.getElementById("notificationList");
                if (list) list.innerHTML = '<div class="p-4 text-sm text-red-600">Unable to load notifications.</div>';
            });
    }

    if (!window.auth) return;

    auth.onAuthStateChanged((user) => {
        if (user) initNotifications(user);
    });
})();
