// Buyer Account Settings

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showMessage(el, message, type = "info") {
    if (!el) return;
    if (!message) {
        el.classList.add("hidden");
        el.textContent = "";
        el.className = "hidden rounded-xl border px-4 py-3 text-sm";
        return;
    }

    el.classList.remove("hidden");
    el.textContent = message;

    if (type === "error") {
        el.className = "rounded-xl border px-4 py-3 text-sm border-red-100 bg-red-50 text-red-700";
    } else if (type === "success") {
        el.className = "rounded-xl border px-4 py-3 text-sm border-emerald-100 bg-emerald-50 text-emerald-700";
    } else {
        el.className = "rounded-xl border px-4 py-3 text-sm border-slate-200 bg-slate-50 text-slate-700";
    }
}

function setupSidebarMobileMenu() {
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

    logoutBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
            await auth.signOut();
            window.location.href = "login.html";
        } catch (err) {
            console.error("Logout failed:", err);
            showMessage(document.getElementById("settingsMessage"), "Logout failed. Try again.", "error");
        }
    });
}

function getBuyerDisplayName(user) {
    return user.displayName || (user.email ? user.email.split("@")[0] : "Buyer");
}

setupSidebarMobileMenu();
setupLogout();

const signedInAsEl = document.getElementById("signedInAs");
const settingsForm = document.getElementById("settingsForm");
const settingsMessageEl = document.getElementById("settingsMessage");

const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const currentPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");

const profilePicInput = document.getElementById("profilePicInput");
const profilePicPreview = document.getElementById("profilePicPreview");
const profilePicStatus = document.getElementById("profilePicStatus");

let currentUser = null;
let pendingProfilePicFile = null;
let savedProfilePicUrl = "";
let profilePicHandlerAttached = false;

const IMGBB_API_KEY = "81541084619d1bb355c6af306489c31d";

function validateFullName(name) {
    const v = String(name || "").trim();
    return v.length >= 2;
}

function normalizePhone(phone) {
    // Keep digits and + only, but do not over-normalize.
    const v = String(phone || "").trim();
    return v;
}

function validatePhone(phone) {
    const v = normalizePhone(phone);
    const digits = v.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function validateImageUrl(url) {
    return /^https?:\/\/.+/i.test(String(url || "").trim());
}

function setFormLoading(isLoading) {
    const saveBtn = document.getElementById("saveBtn");
    if (!saveBtn) return;
    saveBtn.disabled = isLoading;
    if (isLoading) {
        saveBtn.textContent = "Saving...";
        saveBtn.classList.add("opacity-80", "cursor-not-allowed");
    } else {
        saveBtn.textContent = "Save Changes";
        saveBtn.classList.remove("opacity-80", "cursor-not-allowed");
    }
}

async function loadProfile(uid) {
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
        showMessage(settingsMessageEl, "Profile record not found in database.", "error");
        return null;
    }

    const data = snap.data() || {};

    const fullName = data.fullname || "";
    const phone = data.phone || "";
    const email = data.email || currentUser?.email || "";

    if (fullNameInput) fullNameInput.value = fullName;
    if (phoneInput) phoneInput.value = phone;
    if (emailInput) emailInput.value = email;

    if (signedInAsEl) signedInAsEl.textContent = escapeHtml(getBuyerDisplayName(currentUser));

    // Profile pic preview (optional field)
    if (profilePicPreview) {
        const picUrl = data.profilePicUrl;
        if (picUrl) {
            profilePicPreview.src = picUrl;
            savedProfilePicUrl = picUrl;
        } else {
            profilePicPreview.removeAttribute("src");
            savedProfilePicUrl = "";
        }
    }

    return data;
}

async function updateProfile(uid, payload) {
    // firestore.rules allows update if request.auth.uid == userId
    const userRef = db.collection("users").doc(uid);
    await userRef.set(payload, { merge: true });

    // Best-effort: update Auth displayName to keep UI consistent
    if (payload.fullname && currentUser) {
        try {
            await currentUser.updateProfile({ displayName: payload.fullname });
        } catch (e) {
            // ignore: auth displayName update may require re-auth depending on configuration
        }
    }
}

async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });

    const data = await response.json().catch(() => ({}));
    const url = data?.data?.display_url || data?.data?.url;

    if (!response.ok || !data?.success || !validateImageUrl(url)) {
        throw new Error(data?.error?.message || "Image upload failed.");
    }

    return url;
}

function getImageUploadMessage(error) {
    const message = String(error?.message || "").trim();

    if (/api\s*v?1\s*key|invalid.*key|key.*invalid/i.test(message)) {
        return "Photo upload is not configured correctly. The ImgBB API key is invalid.";
    }

    return message || "Photo upload failed.";
}

async function reauthenticateWithPassword(password) {
    if (!currentUser?.email) {
        throw new Error("Unable to verify this account email. Please log in again.");
    }

    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
    await currentUser.reauthenticateWithCredential(credential);
}

function attachProfilePicHandlers(uid) {
    if (!profilePicInput || profilePicHandlerAttached) return;
    profilePicHandlerAttached = true;

    profilePicInput.addEventListener("change", () => {
        const file = profilePicInput.files && profilePicInput.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showMessage(settingsMessageEl, "Please select a valid image file.", "error");
            if (profilePicStatus) profilePicStatus.textContent = "Invalid image file.";
            profilePicInput.value = "";
            pendingProfilePicFile = null;
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showMessage(settingsMessageEl, "Profile picture is too large. Max 5MB.", "error");
            if (profilePicStatus) profilePicStatus.textContent = "File too large.";
            profilePicInput.value = "";
            pendingProfilePicFile = null;
            return;
        }

        pendingProfilePicFile = file;

        // Preview immediately
        const reader = new FileReader();
        reader.onload = () => {
            if (profilePicPreview && reader.result) profilePicPreview.src = String(reader.result);
        };
        reader.readAsDataURL(file);

        if (profilePicStatus) {
            profilePicStatus.textContent = "Photo selected. It will upload as a link when you save changes.";
        }
    });
}

function init() {
    if (!settingsForm) return;

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        currentUser = user;

        if (signedInAsEl) signedInAsEl.textContent = escapeHtml(getBuyerDisplayName(user));
        showMessage(settingsMessageEl, "", "info");

        try {
            await loadProfile(user.uid);
        } catch (err) {
            console.error("Load profile failed:", err);
            showMessage(settingsMessageEl, "Unable to load profile. Try again.", "error");
        }

        attachProfilePicHandlers(user.uid);

        settingsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            showMessage(settingsMessageEl, "", "info");

            const fullname = String(fullNameInput?.value || "").trim();
            const email = String(emailInput?.value || "").trim();
            const phone = String(phoneInput?.value || "").trim();
            const currentPassword = String(currentPasswordInput?.value || "");
            const newPassword = String(newPasswordInput?.value || "");
            const confirmPassword = String(confirmPasswordInput?.value || "");
            const emailChanged = email && email !== user.email;
            const passwordChanged = Boolean(newPassword || confirmPassword);

            if (!validateFullName(fullname)) {
                showMessage(settingsMessageEl, "Please enter a valid name (at least 2 characters).", "error");
                fullNameInput?.focus();
                return;
            }

            if (!validateEmail(email)) {
                showMessage(settingsMessageEl, "Please enter a valid email address.", "error");
                emailInput?.focus();
                return;
            }

            if (!validatePhone(phone)) {
                showMessage(settingsMessageEl, "Please enter a valid phone number (10-15 digits).", "error");
                phoneInput?.focus();
                return;
            }

            if ((emailChanged || passwordChanged) && !currentPassword) {
                showMessage(settingsMessageEl, "Enter your current password to change email or password.", "error");
                currentPasswordInput?.focus();
                return;
            }

            if (passwordChanged) {
                if (newPassword.length < 6) {
                    showMessage(settingsMessageEl, "New password must be at least 6 characters.", "error");
                    newPasswordInput?.focus();
                    return;
                }

                if (newPassword !== confirmPassword) {
                    showMessage(settingsMessageEl, "New password and confirmation do not match.", "error");
                    confirmPasswordInput?.focus();
                    return;
                }
            }

            try {
                setFormLoading(true);

                if (emailChanged || passwordChanged) {
                    await reauthenticateWithPassword(currentPassword);
                }

                let profilePicUrl = savedProfilePicUrl;
                let profilePicUploadError = "";

                if (pendingProfilePicFile) {
                    if (profilePicStatus) profilePicStatus.textContent = "Uploading photo...";

                    try {
                        profilePicUrl = await uploadToImgBB(pendingProfilePicFile);
                        savedProfilePicUrl = profilePicUrl;
                        pendingProfilePicFile = null;
                        profilePicInput.value = "";
                        if (profilePicPreview) profilePicPreview.src = profilePicUrl;
                        if (profilePicStatus) profilePicStatus.textContent = "Photo uploaded and saved as a link.";
                    } catch (uploadError) {
                        console.error("Profile photo upload failed:", uploadError);
                        profilePicUploadError = getImageUploadMessage(uploadError);
                        if (profilePicStatus) {
                            profilePicStatus.textContent = `${profilePicUploadError} Your other changes can still be saved.`;
                        }
                    }
                }

                if (emailChanged) {
                    await user.updateEmail(email);
                }

                if (passwordChanged) {
                    await user.updatePassword(newPassword);
                }

                await updateProfile(user.uid, {
                    fullname,
                    email,
                    phone,
                    profilePicUrl,
                    profilePicProvider: profilePicUrl ? "imgbb" : "",
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                if (profilePicUploadError) {
                    showMessage(settingsMessageEl, `Profile updated, but the photo was not uploaded. ${profilePicUploadError}`, "info");
                } else {
                    showMessage(settingsMessageEl, "Profile updated successfully.", "success");
                }

                if (currentPasswordInput) currentPasswordInput.value = "";
                if (newPasswordInput) newPasswordInput.value = "";
                if (confirmPasswordInput) confirmPasswordInput.value = "";
                if (emailInput) emailInput.value = email;
            } catch (err) {
                console.error("Profile update failed:", err);
                let msg = err?.message || "Update failed.";
                if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
                    msg = "Current password is incorrect.";
                } else if (err?.code === "auth/email-already-in-use") {
                    msg = "That email address is already in use.";
                } else if (err?.code === "auth/requires-recent-login") {
                    msg = "Please log out, log in again, and retry this account change.";
                }
                showMessage(settingsMessageEl, msg, "error");
            } finally {
                setFormLoading(false);
            }
        });
    });
}

init();

