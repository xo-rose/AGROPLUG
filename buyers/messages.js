const ROLE = "buyer";

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

async function ensureConversation(buyerId, farmerId, farmerName = "") {
  if (!buyerId || !farmerId) {
    throw new Error("Missing buyer or farmer id for this conversation.");
  }

  const conversationId = getConversationId(buyerId, farmerId);
  const ref = db.collection("conversations").doc(conversationId);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() : {};
  const buyerName =
    existing.buyerName ||
    currentUser?.displayName ||
    (currentUser?.email
      ? currentUser.email.split("@")[0]
      : "Buyer");

  await ref.set(
    {
      buyerId,
      farmerId,
      buyerName,
      farmerName: farmerName || existing.farmerName || "Farmer",
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
    const fallbackRole = isMine ? ROLE : "farmer";
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
  const { conversationId, farmerId, farmerName } = conversation;

  currentConversationId = conversationId;
  if (activeChatTitleEl) activeChatTitleEl.textContent = farmerName || "Farmer";
  if (activeChatSubtitleEl)
    activeChatSubtitleEl.textContent = `Conversation with ${farmerName || "Farmer"} • ${farmerId}`;
  setSendDisabled(false, "");

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
        const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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

  const parts = currentConversationId.split("_");
  // Not perfect when IDs contain "_" but ok for deterministic ids we create.
  const conversationDoc = db.collection("conversations").doc(currentConversationId);
  const convSnap = await conversationDoc.get();

  const data = convSnap.exists ? convSnap.data() : {};
  const buyerId = data?.buyerId || currentUser.uid;
  const farmerId = data?.farmerId || parts.find(p => p !== buyerId) || "";

  const message = {
    senderId: currentUser.uid,
    senderRole: ROLE,
    buyerId,
    farmerId,
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await conversationDoc.collection("messages").add(message);

    await conversationDoc.set({
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastMessagePreview: text
    }, { merge: true });

    try {
      await db.collection("notifications").add({
        type: "message",
        title: "New buyer message",
        recipientId: farmerId,
        senderId: currentUser.uid,
        senderName: data?.buyerName || currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "Buyer"),
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

  conversationHintEl.textContent = "Loading conversations…";

  return db
    .collection("conversations")
    .where("participants", "array-contains", currentUser.uid)
    .limit(50)
    .onSnapshot(
      (snapshot) => {
        const conversations = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => getTimestampValue(b.lastMessageAt || b.createdAt) - getTimestampValue(a.lastMessageAt || a.createdAt));
        if (!conversations.length) {
          conversationHintEl.textContent = "No conversations yet.";
          conversationsListEl.innerHTML = `
            <div class="p-4 text-sm text-slate-500">
              Browse produce, then click <b>Chat</b> to start talking with a farmer.
            </div>
          `;
          renderEmptyMessages();
          return;
        }

        conversationHintEl.textContent = `${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`;

        conversationsListEl.innerHTML = conversations.map(c => {
          const farmerName = c.farmerName || "Farmer";
          const farmerId = c.farmerId || "";
          const isSelected = c.id === currentConversationId;

          return `
            <button
              type="button"
              data-conv-id="${escapeHtml(c.id)}"
              class="w-full text-left p-4 hover:bg-slate-50 transition border-b border-slate-100 ${isSelected ? "bg-emerald-50/80" : "bg-white"}">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-bold text-sm text-slate-900 truncate">${escapeHtml(farmerName)}</div>
                  <div class="text-xs text-slate-500 truncate mt-1">
                    ${escapeHtml(c.lastMessagePreview || "No messages yet")}
                  </div>
                </div>
                <div class="text-[10px] text-slate-400 shrink-0">
                  ${escapeHtml(formatDate(c.lastMessageAt))}
                </div>
              </div>
            </button>
          `;
        }).join("");

        conversationsListEl.querySelectorAll("button[data-conv-id]").forEach(btn => {
          btn.addEventListener("click", async () => {
            const conversationId = btn.getAttribute("data-conv-id");
            const conv = conversations.find(x => x.id === conversationId);
            if (!conv) return;
            selectConversation({
              conversationId: conv.id,
              farmerId: conv.farmerId,
              farmerName: conv.farmerName
            });
          });
        });

        // Auto-select first conversation once
        if (!currentConversationId) {
          const first = conversations[0];
          selectConversation({
            conversationId: first.id,
            farmerId: first.farmerId,
            farmerName: first.farmerName
          });
          currentConversationId = first.id;
        }
      },
      (error) => {
        console.error("Conversations load failed:", error);
        conversationHintEl.textContent = "Unable to load conversations.";
        conversationsListEl.innerHTML = `
          <div class="p-4 text-sm text-red-600">
            Unable to load conversations right now.
          </div>
        `;
      }
    );
}

function bindSendForm() {
  if (!sendFormEl || !messageInputEl) return;

  sendFormEl.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });
}

async function openChatWithFarmer(farmerId, farmerName = "") {
  if (!currentUser) return;
  if (!farmerId) {
    setSendDisabled(true, "This product does not have a farmer account attached.");
    if (activeChatTitleEl) activeChatTitleEl.textContent = "Cannot start chat";
    if (activeChatSubtitleEl) activeChatSubtitleEl.textContent = "The selected listing is missing farmer details.";
    return;
  }

  let conversationId;
  try {
    conversationId = await ensureConversation(currentUser.uid, farmerId, farmerName);
  } catch (error) {
    console.error("Unable to start chat:", error);
    setSendDisabled(true, "Unable to start chat. Check Firestore conversation permissions.");
    return;
  }

  // If conversations subscription is running, we can simply select by ID.
  // Otherwise, render will happen after snapshot update.
  currentConversationId = conversationId;
  activeChatTitleEl.textContent = farmerName || "Farmer";
  activeChatSubtitleEl.textContent = `Conversation • ${farmerId}`;

  // Force load messages for this specific conversation
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
        const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderMessages(messages);
      },
      (error) => {
        console.error("Messages load failed:", error);
        renderEmptyMessages();
      }
    );
}

function init() {
  if (!conversationsListEl || !activeChatTitleEl || !messagesPaneEl) return;

  bindSendForm();
  renderEmptyMessages();

  // Optional deep link: messages.html?farmerId=...&farmerName=...
  const params = new URLSearchParams(window.location.search);
  const farmerId = params.get("farmerId");
  const farmerName = params.get("farmerName") || "";

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    currentUser = user;

    subscribeConversations();

    if (farmerId) {
      openChatWithFarmer(farmerId, farmerName);
    }
  });
}

init();

// Expose for browseProducts.js inline buttons (if used)
window.__openBuyerChat = openChatWithFarmer;
