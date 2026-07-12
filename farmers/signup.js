import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAf6VnPt4CKbQHiy9BvFYuc0SoSTDc9jt4",
    authDomain: "agroplug.firebaseapp.com",
    projectId: "agroplug",
    storageBucket: "agroplug.firebasestorage.app",
    messagingSenderId: "182515025466",
    appId: "1:182515025466:web:2aadc130704ca5e0dc9703",
    measurementId: "G-JEXRP5BYRX"
};

// Initialize Firebase SDK instances
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const signupForm = document.getElementById("farmerSignupForm");
const errorMsg = document.getElementById("errorMsg");
const modal = document.getElementById("modal");
const overlayText = document.getElementById("overlay");
const signInBtn = document.getElementById("signIn");
const closeBtn = document.getElementById("closeBtn");
let successRedirectUrl = "login.html";

// Dynamic Popup State Manager
function showPopup(message, isSuccess = true) {
    if (!overlayText || !modal) return;
    
    overlayText.textContent = message;
    
    if (isSuccess) {
        overlayText.className = "text-center text-sm font-semibold text-emerald-950";
        if (signInBtn) {
            signInBtn.textContent = "Proceed to Login";
            signInBtn.className = "w-full bg-[#0A4D26] hover:bg-emerald-900 text-white py-2.5 rounded-xl text-xs font-bold transition text-center block";
        }
    } else {
        overlayText.className = "text-center text-sm font-semibold text-red-600";
        if (signInBtn) {
            signInBtn.textContent = "Try Again";
            signInBtn.className = "w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition text-center block";
        }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        
        const submitBtn = signupForm.querySelector("button[type='submit']");
        if (submitBtn && submitBtn.disabled) return;
        if (errorMsg) errorMsg.textContent = ""; 

        // 🛠️ Safe Element Value Gathering (Prevents code crashes if an ID is misspelled in HTML)
        const fullNameEl = document.getElementById("fullName");
        const emailEl = document.getElementById("email");
        const phoneEl = document.getElementById("phoneNumber") || document.getElementById("phone");
        const passwordEl = document.getElementById("password");
        const roleEl = document.getElementById("role");
        const accountNameEl = document.getElementById("accountName");
        const bankNameEl = document.getElementById("bankName");
        const bankCodeEl = document.getElementById("bankCode");
        const accountNumberEl = document.getElementById("accountNumber");

        const fullName = fullNameEl ? fullNameEl.value.trim() : "User";
        const email = emailEl ? emailEl.value.trim() : "";
        const phone = phoneEl ? phoneEl.value.trim() : "";
        const password = passwordEl ? passwordEl.value : "";
        const role = roleEl?.value === "buyer" ? "buyer" : "farmer";
        const payoutAccount = {
            accountName: accountNameEl ? accountNameEl.value.trim() : "",
            bankName: bankNameEl ? bankNameEl.value.trim() : "",
            bankCode: bankCodeEl ? bankCodeEl.value.trim() : "",
            accountNumber: accountNumberEl ? accountNumberEl.value.replace(/\s/g, "") : ""
        };

        if (role === "farmer" && (!payoutAccount.accountName || !payoutAccount.bankName || !payoutAccount.bankCode || !/^\d{10}$/.test(payoutAccount.accountNumber))) {
            showPopup("Enter the account name, bank name, Paystack bank code, and a valid 10-digit account number.", false);
            return;
        }

        let user = null;

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Creating Account...";
            }

            // Step 1: Create account in Auth system
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            user = userCredential.user;
            await updateProfile(user, { displayName: fullName });

            console.log("Auth Account created successfully:", user.uid);

        } catch (authError) {
            console.error("Firebase Authentication Error: ", authError);
            let friendlyMessage = "";

            switch (authError.code) {
                case "auth/email-already-in-use":
                    friendlyMessage = "This email address is already registered.";
                    break;
                case "auth/invalid-email":
                    friendlyMessage = "Please enter a valid email address.";
                    break;
                case "auth/weak-password":
                    friendlyMessage = "The password is too weak. Please use at least 6 characters.";
                    break;
                default:
                    friendlyMessage = `Authentication failed: ${authError.message}`;
            }

            showPopup(friendlyMessage, false);
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Create Account";
            }
            return; // Stop right here since Auth failed
        }

        // Step 2 & 3: Run database save. If database fails, still fire success because account is made!
        try {
            await setDoc(doc(db, "users", user.uid), {
                fullname: fullName,
                email: email,
                phone: phone,
                // Only regular app roles are ever created from the public form.
                // Admin access is granted separately by a trusted admin marker.
                role: role,
                ...(role === "farmer" ? { payoutAccount } : {}),
                createdAt: new Date().toISOString()
            });
            
            console.log("Firestore profile document saved successfully.");
        } catch (firestoreError) {
            console.error("Firestore Database Error (Profile skipped but account exists):", firestoreError);
        }

        // 🛠️ ALWAYS fires green success layout now because user authentication succeeded!
        successRedirectUrl = role === "buyer" ? "../buyers/login.html" : "login.html";
        showPopup(`Hello ${fullName}, your ${role} registration was successful!`, true);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Create Account";
        }
    });
}

// Modal Interactivity
const closeModal = () => {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
    
    if (!overlayText.classList.contains("text-red-600")) {
        window.location.href = successRedirectUrl;
    }
};

if (signInBtn) signInBtn.addEventListener("click", closeModal);
if (closeBtn) closeBtn.addEventListener("click", closeModal);
