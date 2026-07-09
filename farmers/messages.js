const ROLE = "farmer";

// Deterministic conversation id for buyer<->farmer pairs
function getConversationId(buyerId, farmerId) {
    const a = String(buyerId || "");
    const b = String(farmerId || "");
    return [a, b].sort().join("_");
}
function escapeHtml(value) {
  return String(value ?? "")
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
    if (!millis) return "";
    return new Intl.DateTimeFormat("en-NG", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(millis));
}

let currentUser = null;
let currentConversationId = null;
let unsubscribeMessages = null;

const msgBadgeEl = document.getElementById("msgBadge");

function updateMsgBadge(totalUnread) {
    if (!msgBadgeEl) return;
    if (totalUnread > 0) {
        msgBadgeEl.textContent = totalUnread > 99 ? "99+" : String(totalUnread);
        msgBadgeEl.classList.remove("hidden");
        msgBadgeEl.classList.add("flex");
    } else {
        msgBadgeEl.textContent = "";
        msgBadgeEl.classList.add("hidden");
        msgBadgeEl.classList.remove("flex");
    }
}

const conversationsListEl = document.getElementById("conversationsList");
const conversationHintEl = document.getElementById("conversationHint");
const activeChatTitleEl = document.getElementById("activeChatTitle");
const activeChatSubtitleEl = document.getElementById("activeChatSubtitle");
const messagesPaneEl = document.getElementById("messagesPane");

const sendFormEl = document.getElementById("sendForm");
const messageInputEl = document.getElementById("messageInput");
const sendBtnEl = document.getElementById("sendBtn");
const sendStatusEl = document.getElementById("sendStatus");

function setSendDisabled(disabled, statusText = "") {
    if (sendBtnEl) sendBtnEl.disabled = !!disabled;
    if (sendStatusEl) sendStatusEl.textContent = statusText || "";
}

async function ensureConversation(buyerId, farmerId, buyerName = "") {
    if (!buyerId || !farmerId) {
        throw new Error("Missing buyer or farmer id for this conversation.");
    }

    const conversationId = getConversationId(buyerId, farmerId);
    const ref = db.collection("conversations").doc(conversationId);
    const snap = await ref.get();
    const existing = snap.exists ? snap.data() : {};
    const farmerName =
        existing.farmerName ||
        currentUser?.displayName ||
        (currentUser?.email ? currentUser.email.split("@")[0] : "Farmer");

    await ref.set(
        {
            buyerId,
            farmerId,
            buyerName: buyerName || existing.buyerName || "Buyer",
            farmerName,
            participants: [buyerId, farmerId],
            createdAt: existing.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageAt: existing.lastMessageAt || null,
            lastMessagePreview: existing.lastMessagePreview || "",
        },
        { merge: true }
    );

    return conversationId;
}

function renderEmptyMessages() {
    if (!messagesPaneEl) return;
    messagesPaneEl.innerHTML =
        '<div class="text-sm text-slate-500">Select a conversation to view messages.</div>';
}

function renderMessages(messages) {
    if (!messagesPaneEl) return;

    if (!messages.length) {
        messagesPaneEl.innerHTML = `
      <div class="text-sm text-slate-500">
        No messages yet. Send the first message to start the conversation.
      </div>
    `;
        return;
    }

    let html = "";
    for (const msg of messages) {
        const isMine = msg.senderId === currentUser.uid;
        const fallbackRole = isMine ? ROLE : "buyer";
        const senderRole = String(msg.senderRole || fallbackRole).toLowerCase();
        const isBuyerMessage = senderRole === "buyer";
        const bubbleClass = isBuyerMessage
            ? "bg-blue-600 text-white"
            : "bg-emerald-600 text-white";
        const metaClass = isBuyerMessage ? "text-blue-100" : "text-emerald-100";
        const roleLabel = isBuyerMessage ? "Buyer" : "Farmer";
        const alignClass = isMine ? "justify-end" : "justify-start";

        html += `
      <div class="flex ${alignClass} mt-3">
        <div class="px-4 py-2 rounded-xl max-w-[80%] text-sm ${bubbleClass}">
          <div class="text-[10px] font-semibold uppercase tracking-wide opacity-80 mb-1">
            ${roleLabel}
          </div>
          ${escapeHtml(msg.text)}
          <div class="text-[10px] opacity-80 mt-1 ${metaClass}">
            ${escapeHtml(formatDate(msg.createdAt))}
          </div>
        </div>
      </div>
    `;
    }

    messagesPaneEl.innerHTML = html;
    messagesPaneEl.scrollTop = messagesPaneEl.scrollHeight;
}

function selectConversation(conversation) {
    const { conversationId, buyerId, buyerName } = conversation;

    currentConversationId = conversationId;

    if (activeChatTitleEl) activeChatTitleEl.textContent = buyerName || "Buyer";
    if (activeChatSubtitleEl)
        activeChatSubtitleEl.textContent = `Conversation with ${buyerName || "Buyer"} • ${buyerId}`;

    setSendDisabled(false, "");

    // Mark this conversation as read (reset unreadCount for farmer)
    db.collection("conversations").doc(conversationId).set(
        { unreadCountFarmer: 0 },
        { merge: true }
    ).catch(() => {});

    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }

    unsubscribeMessages = db
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .limit(200)
        .onSnapshot(
            (snapshot) => {
                const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                renderMessages(messages);
            },
            (error) => {
                console.error("Messages load failed:", error);
                renderEmptyMessages();
            }
        );
}

async function sendMessage() {
    if (!currentUser) return;

    const text = (messageInputEl?.value || "").trim();
    if (!text) return;

    if (!currentConversationId) {
        setSendDisabled(true, "Select a conversation first.");
        return;
    }

    setSendDisabled(true, "Sending…");

    const conversationDoc = db.collection("conversations").doc(currentConversationId);
    const convSnap = await conversationDoc.get();
    const data = convSnap.exists ? convSnap.data() : {};

    const buyerId = data?.buyerId || "";
    const farmerId = data?.farmerId || currentUser.uid;

    const message = {
        senderId: currentUser.uid,
        senderRole: ROLE,
        buyerId,
        farmerId,
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
        await conversationDoc.collection("messages").add(message);

        await conversationDoc.set(
            {
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessagePreview: text,
                lastSenderId: currentUser.uid,
                // Increment unread count for the buyer
                unreadCountBuyer: firebase.firestore.FieldValue.increment(1),
            },
            { merge: true }
        );

        try {
            await db.collection("notifications").add({
                type: "message",
                title: "New farmer message",
                recipientId: buyerId,
                senderId: currentUser.uid,
                senderName: data?.farmerName || currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "Farmer"),
                buyerId,
                farmerId,
                conversationId: currentConversationId,
                message: text.length > 120 ? `${text.slice(0, 117)}...` : text,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (notificationError) {
            console.warn("Message notification skipped:", notificationError);
        }

        if (messageInputEl) messageInputEl.value = "";
        setSendDisabled(false, "");
    } catch (error) {
        console.error("Send message failed:", error);
        setSendDisabled(false, "Failed to send message. Try again.");
    }
}

function subscribeConversations() {
    if (!conversationsListEl) return;

    if (conversationHintEl) conversationHintEl.textContent = "Loading conversations…";

    return db
        .collection("conversations")
        .where("participants", "array-contains", currentUser.uid)
        .limit(50)
        .onSnapshot(
            (snapshot) => {
                const conversations = snapshot.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => getTimestampValue(b.lastMessageAt || b.createdAt) - getTimestampValue(a.lastMessageAt || a.createdAt));

                if (!conversations.length) {
                    if (conversationHintEl) conversationHintEl.textContent = "No conversations yet.";
                    conversationsListEl.innerHTML = `
            <div class="p-4 text-sm text-slate-500">
              When buyers chat with you, conversations will appear here.
            </div>
          `;
                    renderEmptyMessages();
                    return;
                }

                if (conversationHintEl)
                    conversationHintEl.textContent = `${conversations.length} conversation${conversations.length === 1 ? "" : "s"
                        }`;

                // Tally unread for farmer across all conversations
                const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCountFarmer || 0), 0);
                updateMsgBadge(totalUnread);

                conversationsListEl.innerHTML = conversations
                    .map((c) => {
                        const buyerName = c.buyerName || "Buyer";
                        const isSelected = c.id === currentConversationId;
                        const lastPreview = c.lastMessagePreview || "No messages yet";
                        const unread = c.unreadCountFarmer || 0;

                        return `
              <button
                type="button"
                data-conv-id="${escapeHtml(c.id)}"
                class="w-full text-left p-4 hover:bg-slate-50 transition border-b border-slate-100 ${isSelected ? "bg-emerald-50/80" : "bg-white"
                            }">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="font-bold text-sm text-slate-900 truncate">${escapeHtml(buyerName)}</div>
                    <div class="text-xs ${unread > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-500'} truncate mt-1">${escapeHtml(lastPreview)}</div>
                  </div>
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <div class="text-[10px] text-slate-400">${escapeHtml(formatDate(c.lastMessageAt))}</div>
                    ${unread > 0 ? `<span class="bg-[#3CD670] text-[#0A4D26] text-[10px] font-bold px-1.5 py-0.5 min-w-4 h-4 flex items-center justify-center rounded-full">${unread > 99 ? '99+' : unread}</span>` : ''}
                  </div>
                </div>
              </button>
            `;
                    })
                    .join("");

                conversationsListEl.querySelectorAll("button[data-conv-id]").forEach((btn) => {
                    btn.addEventListener("click", () => {
                        const conversationId = btn.getAttribute("data-conv-id");
                        const conv = conversations.find((x) => x.id === conversationId);
                        if (!conv) return;

                        selectConversation({
                            conversationId: conv.id,
                            buyerId: conv.buyerId,
                            buyerName: conv.buyerName,
                        });
                    });
                });

                if (!currentConversationId) {
                    const first = conversations[0];
                    selectConversation({
                        conversationId: first.id,
                        buyerId: first.buyerId,
                        buyerName: first.buyerName,
                    });
                    currentConversationId = first.id;
                }
            },
            (error) => {
                console.error("Conversations load failed:", error);
                if (conversationHintEl) conversationHintEl.textContent = "Unable to load conversations.";
                conversationsListEl.innerHTML = `
          <div class="p-4 text-sm text-red-600">
            Unable to load conversations right now.
          </div>
        `;
            }
        );
}

function bindSendForm() {
    if (!sendFormEl) return;
    sendFormEl.addEventListener("submit", (e) => {
        e.preventDefault();
        sendMessage();
    });
}

function init() {
    if (!conversationsListEl || !activeChatTitleEl || !messagesPaneEl) return;

    bindSendForm();
    renderEmptyMessages();

    // Optional deep link
    const params = new URLSearchParams(window.location.search);
    const buyerId = params.get("buyerId");
    const buyerName = params.get("buyerName") || "";

    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        currentUser = user;

        subscribeConversations();

        if (buyerId) {
            ensureConversation(buyerId, currentUser.uid, buyerName)
                .then((conversationId) => {
                    selectConversation({ conversationId, buyerId, buyerName });
                })
                .catch((error) => {
                    console.error("Unable to start chat:", error);
                    setSendDisabled(true, "Unable to start chat. Check Firestore conversation permissions.");
                });
        }
    });
}

init();

// Expose for future wiring
window.__openFarmerChat = async function (buyerId, buyerName = "") {
    if (!currentUser) return;
    try {
        const conversationId = await ensureConversation(buyerId, currentUser.uid, buyerName);
        selectConversation({ conversationId, buyerId, buyerName });
    } catch (error) {
        console.error("Unable to start chat:", error);
        setSendDisabled(true, "Unable to start chat. Check Firestore conversation permissions.");
    }
};

// Logout
(function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        auth.signOut()
            .then(() => { window.location.href = "login.html"; })
            .catch((err) => { console.error("Logout failed:", err); });
    });
})();
