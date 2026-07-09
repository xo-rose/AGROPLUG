(function () {
    if (window.__agroplugChatbotLoaded) return;
    window.__agroplugChatbotLoaded = true;

    if (document.getElementById("assistantChat") && document.getElementById("assistantBtn")) {
        return;
    }

    const existingRobot = document.querySelector(".fa-robot")?.closest(".fixed");
    if (existingRobot && !existingRobot.id) {
        existingRobot.remove();
    }

    const pageText = `${document.title || ""} ${location.pathname}`.toLowerCase();
    const role = pageText.includes("farmer") || location.pathname.includes("/farmers/")
        ? "farmer"
        : pageText.includes("buyer") || location.pathname.includes("/buyers/")
            ? "buyer"
            : "visitor";

    const quickTips = {
        buyer: [
            "Browse produce, open a product, then choose wallet or bank payment at checkout.",
            "Use Messages to chat with farmers about delivery, stock, or order details.",
            "Fund your wallet from the Wallet page before buying with wallet funds."
        ],
        farmer: [
            "Add produce with clear names, prices, stock quantity, and a product image.",
            "Buyer orders appear on your dashboard after checkout succeeds.",
            "Use Messages to reply to buyers about orders and delivery timing."
        ],
        visitor: [
            "Create a buyer account to purchase produce from farmers.",
            "Create a farmer account to list produce and receive buyer orders.",
            "Use the dashboards to manage orders, wallet activity, and messages."
        ]
    };

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getReply(message) {
        const text = message.toLowerCase();

        if (text.includes("wallet") || text.includes("fund")) {
            return "Open Wallet / Payments, choose Fund Wallet, enter an amount, then complete Paystack checkout. Your balance should update on the wallet page and buyer dashboard.";
        }

        if (text.includes("buy") || text.includes("order") || text.includes("checkout")) {
            return "Open Browse Produce, choose Buy Now, select quantity, then pay with wallet funds or bank payment. Successful orders appear on the buyer dashboard and farmer dashboard.";
        }

        if (text.includes("chat") || text.includes("message")) {
            return "On a product card, click Chat to open a direct conversation with that farmer. Messages update in real time for both buyer and farmer.";
        }

        if (text.includes("product") || text.includes("listing") || text.includes("upload")) {
            return "Farmers can add produce from Add New Produce. Make sure the product has a price, quantity, location, image, and farmer account attached.";
        }

        if (text.includes("permission") || text.includes("firebase") || text.includes("rules")) {
            return "That usually means Firestore rules blocked a read or write. Check that your deployed rules allow the signed-in buyer or farmer to access the matching wallet, order, listing, and conversation records.";
        }

        if (text.includes("hello") || text.includes("hi") || text.includes("hey")) {
            return "Hello. I can help with buying produce, wallet funding, orders, listings, and messages.";
        }

        return quickTips[role][Math.floor(Math.random() * quickTips[role].length)];
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
        <button id="agroplugAssistantBtn" type="button"
            class="fixed bottom-6 right-6 z-[90] bg-gradient-to-r from-emerald-500 to-green-600 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-all duration-300"
            aria-label="Open AgroPlug assistant">
            <i class="fa-solid fa-robot text-2xl" aria-hidden="true"></i>
            <span class="sr-only">Open assistant</span>
        </button>

        <section id="agroplugAssistantChat"
            class="fixed bottom-24 right-6 w-80 max-w-[92vw] bg-white rounded-2xl shadow-2xl hidden overflow-hidden z-[90] border border-slate-200"
            aria-label="AgroPlug assistant chat">
            <div class="bg-emerald-600 text-white p-4 flex justify-between items-center">
                <div>
                    <h3 class="font-bold">AgroPlug Assistant</h3>
                    <p class="text-xs opacity-80">Online helper</p>
                </div>
                <button id="agroplugAssistantClose" type="button" class="h-9 w-9 rounded-xl hover:bg-white/10 transition" aria-label="Close assistant">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
            </div>

            <div id="agroplugAssistantMessages" class="h-80 overflow-y-auto p-4 bg-slate-50">
                <div class="bg-emerald-100 text-slate-700 p-3 rounded-xl text-sm">
                    Hi, I can help with products, orders, wallet payments, listings, and messages.
                </div>
            </div>

            <form id="agroplugAssistantForm" class="border-t border-slate-200 flex bg-white">
                <input type="text" id="agroplugAssistantInput" placeholder="Ask a question..."
                    class="flex-1 p-3 outline-none text-sm min-w-0">
                <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4" aria-label="Send message">
                    <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
                </button>
            </form>
        </section>
    `;

    document.body.appendChild(wrapper);

    const button = document.getElementById("agroplugAssistantBtn");
    const chat = document.getElementById("agroplugAssistantChat");
    const close = document.getElementById("agroplugAssistantClose");
    const form = document.getElementById("agroplugAssistantForm");
    const input = document.getElementById("agroplugAssistantInput");
    const messages = document.getElementById("agroplugAssistantMessages");

    function openChat() {
        chat.classList.remove("hidden");
        setTimeout(() => input.focus(), 50);
    }

    function closeChat() {
        chat.classList.add("hidden");
    }

    function addMessage(text, mine) {
        const row = document.createElement("div");
        row.className = `flex ${mine ? "justify-end" : "justify-start"} mt-3`;
        row.innerHTML = `
            <div class="${mine ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-700"} px-4 py-2 rounded-xl max-w-[82%] text-sm">
                ${escapeHtml(text)}
            </div>
        `;
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
    }

    button.addEventListener("click", openChat);
    close.addEventListener("click", closeChat);
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, true);
        input.value = "";

        setTimeout(() => {
            addMessage(getReply(text), false);
        }, 300);
    });
})();
