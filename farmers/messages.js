/**
 * Farmer Messages (1:1 with buyers) - Firestore real-time chat
 * Uses Firebase compat globals from farmers/firebase-config.js:
 *   - firebase (namespace)
 *   - auth
 *   - db
 *
 * UI element ids must match farmers/messages.html
 */
function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatTime(ts) {
    try {
        if (!ts) return "";
        const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
        if (Number.isNaN(d.getTime())) return "";
        return new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit" }).format(d);
    } catch {
        return "";
    }
}

function conversationIdForBuyerFarmer(buyerUid, farmerUid) {
    // Keep the same convention used in buyers/messages.js
    return `${buyerUid}_${farmerUid}`;
}

let currentUser = null;
let activeConversationId = null;
let messagesUnsub = null;
let conversationsUnsub = null;

// DOM
const conversationList = document.getElementById("conversationList");
const threadTitle = document.getElementById("threadTitle");
const threadSubtitle = document.getElementById("threadSubtitle");
const threadStatus = document.getElementById("threadStatus");
const messagesArea = document.getElementById("messagesArea");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const refreshBtn = document.getElementById("refreshBtn");

// Manual start new chat UI (added to farmers/messages.html)
const newChatBuyerSelect = document.getElementById("newChatBuyerSelect");
const startNewChatBtn = document.getElementById("startNewChatBtn");

async function loadUserDisplayName(uid) {
    try {
        const snap = await db.collection("users").doc(uid).get();
        const data = snap.data() || {};
        return data.fullname || data.displayName || (data.email ? data.email.split("@")[0] : "User");
    } catch (e) {
        console.error("loadUserDisplayName error:", e);
        return "User";
    }
}

function renderMessages(messages) {
    if (!messages.length) {
        messagesArea.innerHTML = `<div class="text-sm text-slate-500">No messages yet.</div>`;
        return;
    }

    const html = messages.map((m) => {
        const mine = m.senderId === currentUser.uid;
        const bubbleClass = mine
            ? "bg-emerald-600 text-white mr-auto rounded-2xl"
            : "bg-white border border-slate-200 text-slate-800 rounded-2xl";

        const align = mine ? "flex justify-start" : "flex justify-end";

        return `
            <div class="${align} mb-3">
                <div class="max-w-[75%] px-4 py-3 ${bubbleClass}">
                    <div class="whitespace-pre-wrap text-sm leading-relaxed">${escapeHtml(m.text)}</div>
                    <div class="mt-1 text-[10px] opacity-70 text-right">${escapeHtml(m._timeLabel)}</div>
                </div>
            </div>
        `;
    }).join("");

    messagesArea.innerHTML = html;
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function startListeningForMessages(convId) {
    if (messagesUnsub) messagesUnsub();

    activeConversationId = convId;

    if (messageInput) messageInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;

    messagesUnsub = db
        .collection("conversations")
        .doc(convId)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .onSnapshot(
            (snapshot) => {
                const msgs = snapshot.docs.map((d) => {
                    const data = d.data() || {};
                    return {
                        id: d.id,
                        senderId: data.senderId,
                        senderRole: data.senderRole,
                        text: data.text || "",
                        createdAt: data.createdAt || null,
                        _timeLabel: formatTime(data.createdAt),
                    };
                });
                renderMessages(msgs);
            },
            (error) => {
                console.error("Messages listener failed:", error);
                messagesArea.innerHTML = `<div class="text-sm text-red-600">Unable to load messages.</div>`;
            }
        );
}

function renderConversations(conversations) {
    if (!conversations.length) {
        conversationList.innerHTML = `<div class="p-4 text-sm text-slate-500">No conversations yet.</div>`;
        return;
    }

    conversationList.innerHTML = conversations
        .map((c) => {
            const isActive = c.id === activeConversationId;
            const otherName = c.otherName || "Buyer";

            return `
                <button
                    type="button"
                    data-conv-id="${escapeHtml(c.id)}"
                    class="w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition ${isActive ? "bg-slate-50" : ""
                }"
                >
                    <div class="flex items-center justify-between gap-3">
                        <div class="min-w-0">
                            <div class="font-bold text-slate-800 truncate">${escapeHtml(otherName)}</div>
                            <div class="text-xs text-slate-500 truncate mt-0.5">${escapeHtml(
                    c.lastMessageText || "Say hi 👋"
                )}</div>
                        </div>
                        <div class="text-[11px] text-slate-400 shrink-0">${escapeHtml(c.lastTimeLabel || "")}</div>
                    </div>
                </button>
            `;
        })
        .join("");

    const buttons = conversationList.querySelectorAll("button[data-conv-id]");
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            openConversation(btn.getAttribute("data-conv-id"));
        });
    });
}

async function openConversation(convId) {
    const convSnap = await db.collection("conversations").doc(convId).get();
    const conv = convSnap.data();
    if (!conv) return;

    activeConversationId = convId;

    // Best-effort repair so farmer always has buyerId populated
    if (currentUser && (!conv.buyerId || !conv.farmerId)) {
        await repairConversationParticipants(convId, currentUser.uid);
    }

    const refreshedSnap = await db.collection("conversations").doc(convId).get();
    const refreshed = refreshedSnap.data() || {};

    const otherUid = refreshed.buyerId || (Array.isArray(refreshed.participants) ? refreshed.participants.find((uid) => uid !== currentUser.uid) : null);
    const otherName = otherUid ? await loadUserDisplayName(otherUid) : "Buyer";

    if (threadTitle) threadTitle.textContent = otherName;
    if (threadSubtitle) threadSubtitle.textContent = "Buyer";
    if (threadStatus) threadStatus.textContent = refreshed.lastMessageAt ? `Last active: ${formatTime(refreshed.lastMessageAt)}` : "Select this buyer to start a conversation";


    if (messageInput) {
        messageInput.placeholder = `Message ${otherName}...`;
        messageInput.disabled = false;
    }
    if (sendBtn) sendBtn.disabled = false;

    startListeningForMessages(convId);
}


async function repairConversationParticipants(convId, farmerId) {
    try {
        const convSnap = await db.collection("conversations").doc(convId).get();
        const conv = convSnap.data();
        if (!conv) return;

        const participants = Array.isArray(conv.participants) ? conv.participants : [];
        const buyerFromParticipants = participants.find((uid) => uid !== farmerId) || conv.buyerId || null;

        const updates = {
            buyerId: buyerFromParticipants,
            farmerId,
            participants: buyerFromParticipants ? [buyerFromParticipants, farmerId] : participants,
        };

        await db.collection("conversations").doc(convId).set(updates, { merge: true });
    } catch (e) {
        console.warn("repairConversationParticipants failed:", e);
    }
}

function loadConversationsForFarmer(farmerId) {
    if (conversationsUnsub) conversationsUnsub();

    // Use participants for robustness (older docs may have missing/wrong farmerId field)
    conversationsUnsub = db
        .collection("conversations")
        .where("participants", "array-contains", farmerId)
        .orderBy("lastMessageAt", "desc")
        .onSnapshot(
            async (snapshot) => {
                const list = [];

                snapshot.forEach((doc) => {
                    const data = doc.data() || {};
                    const lastAt = data.lastMessageAt || null;
                    const participants = Array.isArray(data.participants) ? data.participants : [];
                    const buyerId = data.buyerId || participants.find((uid) => uid !== farmerId) || null;

                    list.push({
                        id: doc.id,
                        buyerId,
                        otherName: null,
                        lastMessageText: data.lastMessageText || "",
                        lastMessageAt: lastAt,
                        lastTimeLabel: formatTime(lastAt),
                    });
                });

                for (const item of list) {
                    if (!item.buyerId) {
                        await repairConversationParticipants(item.id, farmerId);
                        const repaired = await db.collection("conversations").doc(item.id).get();
                        const repairedData = repaired.data() || {};
                        const participants = Array.isArray(repairedData.participants) ? repairedData.participants : [];
                        item.buyerId = repairedData.buyerId || participants.find((uid) => uid !== farmerId) || null;
                    }
                    item.otherName = item.buyerId ? await loadUserDisplayName(item.buyerId) : "Buyer";
                }

                renderConversations(list);
            },
            (error) => {
                console.error("Conversations listener failed:", error);
                conversationList.innerHTML = `<div class="p-4 text-sm text-red-600">Unable to load conversations.</div>`;
            }
        );
}

async function ensureConversation(farmerId, buyerId) {
    const convId = conversationIdForBuyerFarmer(buyerId, farmerId);
    const convRef = db.collection("conversations").doc(convId);

    const existing = await convRef.get();

    // Always merge/re-assert fields so older docs remain consistent.
    await convRef.set(
        {
            buyerId,
            farmerId,
            participants: [buyerId, farmerId],
            lastMessageText: existing.exists ? (existing.data().lastMessageText || "") : "",
            lastMessageAt: existing.exists ? (existing.data().lastMessageAt || null) : null,
        },
        { merge: true }
    );

    return convId;
}


// Manual start: load all buyers (option 1)
async function loadBuyersForFarmer(farmerId) {
    if (!newChatBuyerSelect) return;

    newChatBuyerSelect.disabled = true;
    try {
        newChatBuyerSelect.innerHTML = `<option value="">Loading...</option>`;

        const buyersSnap = await db
            .collection("users")
            .where("role", "==", "buyer")
            .get();

        const buyerIds = [];
        buyersSnap.forEach((doc) => {
            const data = doc.data() || {};
            if (data.role === "buyer") buyerIds.push(doc.id);
        });

        if (buyerIds.length === 0) {
            newChatBuyerSelect.innerHTML = `<option value="">No buyers found</option>`;
            return;
        }

        const buyerOptions = [];
        for (const bid of buyerIds) {
            const name = await loadUserDisplayName(bid);
            buyerOptions.push({ bid, name });
        }

        buyerOptions.sort((a, b) => a.name.localeCompare(b.name));

        newChatBuyerSelect.innerHTML = `
            <option value="">Select a buyer</option>
            ${buyerOptions.map((o) => `<option value="${escapeHtml(o.bid)}">${escapeHtml(o.name)}</option>`).join("")}
        `;
    } catch (e) {
        console.error("loadBuyersForFarmer error:", e);
        newChatBuyerSelect.innerHTML = `<option value="">Unable to load buyers</option>`;
    } finally {
        newChatBuyerSelect.disabled = false;
    }
}

async function startNewChat() {
    if (!currentUser) return;
    if (!newChatBuyerSelect) return;
    if (!startNewChatBtn) return;

    const selectedBuyerId = newChatBuyerSelect.value;
    if (!selectedBuyerId) {
        if (threadStatus) threadStatus.textContent = "Select a buyer to start the chat.";
        return;
    }

    const convId = await ensureConversation(currentUser.uid, selectedBuyerId);
    await openConversation(convId);
}

async function sendMessage() {
    if (!currentUser) return;

    const text = (messageInput && messageInput.value ? messageInput.value : "").trim();
    if (!text) return;

    if (!activeConversationId) {
        if (threadStatus) threadStatus.textContent = "Select a conversation from the list first.";
        return;
    }

    const convSnap = await db.collection("conversations").doc(activeConversationId).get();
    const conv = convSnap.data();
    if (!conv) return;

    // Ensure buyerId exists
    if (!conv.buyerId || !conv.farmerId) {
        await repairConversationParticipants(activeConversationId, currentUser.uid);
    }

    const refreshedSnap = await db.collection("conversations").doc(activeConversationId).get();
    const refreshed = refreshedSnap.data() || {};
    const buyerId = refreshed.buyerId || (Array.isArray(refreshed.participants) ? refreshed.participants.find((uid) => uid !== currentUser.uid) : null);
    if (!buyerId) return;

    const convId = await ensureConversation(currentUser.uid, buyerId);

    await db
        .collection("conversations")
        .doc(convId)
        .collection("messages")
        .add({
            senderId: currentUser.uid,
            senderRole: "farmer",
            text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

    await db.collection("conversations").doc(convId).set(
        {
            buyerId,
            farmerId: currentUser.uid,
            participants: [buyerId, currentUser.uid],
            lastMessageText: text,
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
    );

    if (messageInput) messageInput.value = "";
}


function wireEvents() {
    if (messageForm) {
        messageForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await sendMessage();
        });
    }

    if (startNewChatBtn && newChatBuyerSelect) {
        startNewChatBtn.addEventListener("click", async () => {
            startNewChatBtn.disabled = true;
            try {
                await startNewChat();
            } catch (e) {
                console.error("startNewChat error:", e);
            } finally {
                startNewChatBtn.disabled = false;
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            if (currentUser) loadConversationsForFarmer(currentUser.uid);
        });
    }
}

firebase.auth().onAuthStateChanged((user) => {
    currentUser = user || null;

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Role guard: farmer only
    db.collection("users")
        .doc(user.uid)
        .get()
        .then((snap) => {
            const data = snap.data() || {};
            if (data.role !== "farmer") {
                window.location.href = "login.html";
                return;
            }
            loadConversationsForFarmer(user.uid);
            // Manual start new chat dropdown
        })
        .catch((e) => {
            console.error("Role check failed:", e);
            window.location.href = "login.html";
        });
});

wireEvents();
