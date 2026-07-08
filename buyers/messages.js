/**
 * Buyer Messages (1:1 with farmers) - Firestore real-time chat
 * Uses Firebase compat globals from firebase-config.js:
 *   - firebase (namespace)
 *   - auth
 *   - db
 */



function getOtherUserId(conversationData, buyerId) {
    // NOTE: not used by current MVP. Kept for future ref.
    return conversationData && conversationData.buyerId === buyerId
        ? conversationData.farmerId
        : conversationData && conversationData.farmerId === buyerId
            ? conversationData.buyerId
            : null;
}

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
const sidebarMenuToggle = document.getElementById("menuToggle");

// Manual start new chat UI (optional; added to messages.html)
const newChatFarmerSelect = document.getElementById("newChatFarmerSelect");
const startNewChatBtn = document.getElementById("startNewChatBtn");

// Ensure sidebar toggle works if present (optional)
if (sidebarMenuToggle && document.getElementById("menuList")) {
    sidebarMenuToggle.addEventListener("click", () => {
        // Messages page already has standard layout; if not, ignore.
        document.getElementById("menuList").classList.toggle("hidden");
    });
}

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
            ? "bg-emerald-600 text-white ml-auto rounded-2xl"
            : "bg-white border border-slate-200 text-slate-800 rounded-2xl";

        const align = mine ? "flex justify-end" : "flex justify-start";

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

    // enable inputs
    if (messageInput) messageInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;

    // messages listener
    messagesUnsub = db
        .collection("conversations")
        .doc(convId)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .onSnapshot((snapshot) => {
            const msgs = snapshot.docs.map((d) => {
                const data = d.data() || {};
                return {
                    id: d.id,
                    senderId: data.senderId,
                    senderRole: data.senderRole,
                    text: data.text || "",
                    createdAt: data.createdAt || null,
                    _timeLabel: formatTime(data.createdAt)
                };
            });

            renderMessages(msgs);
        }, (error) => {
            console.error("Messages listener failed:", error);
            messagesArea.innerHTML = `<div class="text-sm text-red-600">Unable to load messages.</div>`;
        });
}

function renderConversations(conversations) {
    if (!conversations.length) {
        conversationList.innerHTML = `<div class="p-4 text-sm text-slate-500">No conversations yet.</div>`;
        return;
    }

    conversationList.innerHTML = conversations.map((c) => {
        const isActive = c.id === activeConversationId;
        const otherName = c.otherName || "Farmer";

        return `
            <button
                type="button"
                data-conv-id="${escapeHtml(c.id)}"
                class="w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition ${isActive ? "bg-slate-50" : ""}">
                <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <div class="font-bold text-slate-800 truncate">${escapeHtml(otherName)}</div>
                        <div class="text-xs text-slate-500 truncate mt-0.5">${escapeHtml(c.lastMessageText || "Say hi 👋")}</div>
                    </div>
                    <div class="text-[11px] text-slate-400 shrink-0">${escapeHtml(c.lastTimeLabel || "")}</div>
                </div>
            </button>
        `;
    }).join("");

    // attach click handlers
    const buttons = conversationList.querySelectorAll("button[data-conv-id]");
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const convId = btn.getAttribute("data-conv-id");
            openConversation(convId);
        });
    });
}

async function openConversation(convId) {
    const convSnap = await db.collection("conversations").doc(convId).get();
    const conv = convSnap.data();
    if (!conv) return;

    activeConversationId = convId;

    // Best-effort repair so buyer always has farmerId populated
    if (currentUser && (!conv.farmerId || !conv.buyerId)) {
        await repairConversationParticipants(convId, currentUser.uid);
    }

    const refreshedSnap = await db.collection("conversations").doc(convId).get();
    const refreshed = refreshedSnap.data() || {};

    const otherUid = refreshed.farmerId || (Array.isArray(refreshed.participants) ? refreshed.participants.find((uid) => uid !== currentUser.uid) : null);
    const otherName = otherUid ? await loadUserDisplayName(otherUid) : "Farmer";

    threadTitle.textContent = otherName;
    threadSubtitle.textContent = "Farmer";
    threadStatus.textContent = refreshed.lastMessageAt ? `Last active: ${formatTime(refreshed.lastMessageAt)}` : "";

    // Update input placeholder
    if (messageInput) {
        messageInput.placeholder = `Message ${otherName}...`;
        messageInput.disabled = false;
    }
    if (sendBtn) sendBtn.disabled = false;

    startListeningForMessages(convId);
}


async function repairConversationParticipants(convId, buyerId) {
    // Best-effort repair: ensure buyerId/farmerId/participants exist correctly.
    // This fixes older conversation docs created by earlier code versions.
    try {
        const convSnap = await db.collection("conversations").doc(convId).get();
        const conv = convSnap.data();
        if (!conv) return;

        const participants = Array.isArray(conv.participants) ? conv.participants : [];
        const farmerFromParticipants = participants.find((uid) => uid !== buyerId) || conv.farmerId || null;

        const updates = {
            buyerId,
            farmerId: farmerFromParticipants,
            participants: farmerFromParticipants ? [buyerId, farmerFromParticipants] : participants,
        };

        await db.collection("conversations").doc(convId).set(updates, { merge: true });
    } catch (e) {
        console.warn("repairConversationParticipants failed:", e);
    }
}

function loadConversationsForBuyer(buyerId) {
    if (conversationsUnsub) conversationsUnsub();

    // Use participants for robustness (older docs may have missing/wrong buyerId field)
    conversationsUnsub = db
        .collection("conversations")
        .where("participants", "array-contains", buyerId)
        .orderBy("lastMessageAt", "desc")
        .onSnapshot(async (snapshot) => {
            const list = [];

            snapshot.forEach((doc) => {
                const data = doc.data() || {};
                const lastAt = data.lastMessageAt || null;
                const participants = Array.isArray(data.participants) ? data.participants : [];
                const farmerId = data.farmerId || participants.find((uid) => uid !== buyerId) || null;

                list.push({
                    id: doc.id,
                    farmerId,
                    otherName: null,
                    lastMessageText: data.lastMessageText || "",
                    lastMessageAt: lastAt,
                    lastTimeLabel: formatTime(lastAt),
                });
            });

            // Repair docs + fetch names
            for (const item of list) {
                if (!item.farmerId) {
                    await repairConversationParticipants(item.id, buyerId);
                    const repaired = await db.collection("conversations").doc(item.id).get();
                    const repairedData = repaired.data() || {};
                    const participants = Array.isArray(repairedData.participants) ? repairedData.participants : [];
                    item.farmerId = repairedData.farmerId || participants.find((uid) => uid !== buyerId) || null;
                }
                item.otherName = item.farmerId ? await loadUserDisplayName(item.farmerId) : "Farmer";
            }

            renderConversations(list);
        }, (error) => {
            console.error("Conversations listener failed:", error);
            conversationList.innerHTML = `<div class="p-4 text-sm text-red-600">Unable to load conversations.</div>`;
        });
}


async function ensureConversation(buyerId, farmerId) {
    const convId = conversationIdForBuyerFarmer(buyerId, farmerId);
    const convRef = db.collection("conversations").doc(convId);

    const existing = await convRef.get();
    if (!existing.exists) {
        await convRef.set({
            buyerId,
            farmerId,
            participants: [buyerId, farmerId],
            lastMessageText: "",
            lastMessageAt: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    return convId;
}

// Manual start: load eligible farmers (option 2: farmers with active listings)
async function loadEligibleFarmersForBuyer(buyerId) {
    // Populate only if the UI exists
    if (!newChatFarmerSelect) return;

    newChatFarmerSelect.disabled = true;

    try {
        newChatFarmerSelect.innerHTML = `<option value="">Loading...</option>`;

        // Try to infer the "active listings" field. Most likely 'status' is used elsewhere in the app.
        // We'll treat "Active" and "active" equally (best-effort).
        const listingsSnap = await db
            .collection("listings")
            .where("status", "==", "Active")
            .get();

        // If no docs found, attempt "active" fallback.
        const baseDocs = listingsSnap.docs;
        let docs = baseDocs;

        if (baseDocs.length === 0) {
            const listingsSnap2 = await db
                .collection("listings")
                .where("status", "==", "active")
                .get();
            docs = listingsSnap2.docs;
        }

        const farmerIdSet = new Set();
        docs.forEach((d) => {
            const data = d.data() || {};
            if (data.farmerId) farmerIdSet.add(data.farmerId);
        });

        const farmerIds = Array.from(farmerIdSet);

        // If none found, show empty state but keep composer disabled until user picks
        if (farmerIds.length === 0) {
            newChatFarmerSelect.innerHTML = `<option value="">No active farmers found</option>`;
            return;
        }

        // Load display names
        const farmerOptions = [];
        for (const fid of farmerIds) {
            const name = await loadUserDisplayName(fid);
            farmerOptions.push({ fid, name });
        }

        farmerOptions.sort((a, b) => a.name.localeCompare(b.name));

        newChatFarmerSelect.innerHTML = `
            <option value="">Select a farmer</option>
            ${farmerOptions.map((o) => `<option value="${escapeHtml(o.fid)}">${escapeHtml(o.name)}</option>`).join("")}
        `;
    } catch (e) {
        console.error("loadEligibleFarmersForBuyer error:", e);
        newChatFarmerSelect.innerHTML = `<option value="">Unable to load farmers</option>`;
    } finally {
        newChatFarmerSelect.disabled = false;
    }
}

// Manual start new chat: ensure conversation + open it (enables input)
async function startNewChat() {
    if (!currentUser) return;
    if (!newChatFarmerSelect) return;
    if (!startNewChatBtn) return;

    const selectedFarmerId = newChatFarmerSelect.value;
    if (!selectedFarmerId) {
        threadStatus.textContent = "Select a farmer to start the chat.";
        return;
    }

    // Create/ensure conversation doc and select it
    const convId = await ensureConversation(currentUser.uid, selectedFarmerId);

    // Open conversation and enable UI immediately
    await openConversation(convId);
}

async function sendMessage() {
    if (!currentUser) return;
    const text = (messageInput.value || "").trim();
    if (!text) return;

    // require a selected conversation to determine farmerId
    if (!activeConversationId) {
        // No conversation selected: MVP can't start without a list selection yet.
        // So we guide user to pick a conversation from the list.
        threadStatus.textContent = "Select a conversation from the list first.";
        return;
    }

    // Find farmerId from conversation doc
    const convSnap = await db.collection("conversations").doc(activeConversationId).get();
    const conv = convSnap.data();
    if (!conv) return;

    const farmerId = conv.farmerId;

    const convId = await ensureConversation(currentUser.uid, farmerId);

    // Add message
    const messagesRef = db
        .collection("conversations")
        .doc(convId)
        .collection("messages");

    const payload = {
        senderId: currentUser.uid,
        senderRole: "buyer",
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await messagesRef.add(payload);

    // Update conversation last message
    await db.collection("conversations").doc(convId).set({
        buyerId: currentUser.uid,
        farmerId,
        participants: [currentUser.uid, farmerId],
        lastMessageText: text,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    messageInput.value = "";
}

function wireEvents() {
    if (messageForm) {
        messageForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await sendMessage();
        });
    }

    if (startNewChatBtn && newChatFarmerSelect) {
        // Composer stays disabled until Start is pressed and we open a conversation.
        startNewChatBtn.addEventListener("click", async () => {
            // Disable button while starting
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
            // On snapshot, list auto-updates; we just reload listeners
            if (currentUser) loadConversationsForBuyer(currentUser.uid);
        });
    }
}

firebase.auth().onAuthStateChanged((user) => {
    // compat auth listener
    currentUser = user || null;

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Role guard: buyer only
    db.collection("users").doc(user.uid).get().then((snap) => {
        const data = snap.data() || {};
        if (data.role !== "buyer") {
            window.location.href = "login.html";
            return;
        }

        // Start conversations list
        loadConversationsForBuyer(user.uid);

        // Manual start new chat: populate eligible farmers list
        loadEligibleFarmersForBuyer(user.uid);
    }).catch((e) => {
        console.error("Role check failed:", e);
        window.location.href = "login.html";
    });
});

wireEvents();

