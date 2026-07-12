import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAf6VnPt4CKbQHiy9BvFYuc0SoSTDc9jt4",
  authDomain: "agroplug.firebaseapp.com",
  projectId: "agroplug",
  storageBucket: "agroplug.firebasestorage.app",
  messagingSenderId: "182515025466",
  appId: "1:182515025466:web:2aadc130704ca5e0dc9703",
  measurementId: "G-JEXRP5BYRX"
};

// Initialize Firebase Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); 

// Grab Form elements
const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");

// Grab Modal popup elements
const modal = document.getElementById("modal");
const overlayText = document.getElementById("overlay");
const signInBtn = document.getElementById("signIn");
const closeBtn = document.getElementById("closeBtn");

// Track target routing location globally across modal clicks
let targetRedirectionUrl = "";

async function isAdmin(userId) {
    const adminSnapshot = await getDoc(doc(db, "admins", userId));
    if (adminSnapshot.exists() && adminSnapshot.data().enabled === true) return true;

    const userSnapshot = await getDoc(doc(db, "users", userId));
    return userSnapshot.exists() && userSnapshot.data().role === "admin";
}

// Dynamic Popup State Manager
function showPopup(message, isSuccess = true, redirectUrl = "") {
    if (!overlayText || !modal) {
        // Fallback to text if modal elements aren't pasted in login.html yet
        if (errorMsg) errorMsg.textContent = message;
        return;
    }

    if (errorMsg) errorMsg.textContent = ""; // Clear inline error text if modal works
    overlayText.textContent = message;
    targetRedirectionUrl = redirectUrl;
    
    if (isSuccess) {
        overlayText.className = "font-semibold text-slate-700 mt-4 text-center";
        if (signInBtn) {
            signInBtn.textContent = "Proceed to Dashboard";
            signInBtn.className = "flex-1 font-extrabold rounded-xl bg-emerald-600 py-3 text-white hover:bg-emerald-700 transition text-center block";
        }
    } else {
        overlayText.className = "font-semibold text-red-600 mt-4 text-center";
        if (signInBtn) {
            signInBtn.textContent = "Try Again";
            signInBtn.className = "flex-1 font-extrabold rounded-xl bg-red-600 py-3 text-white hover:bg-red-700 transition text-center block";
        }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        if (errorMsg) errorMsg.textContent = ""; 

        const submitBtn = loginForm.querySelector("button[type='submit']");
        if (submitBtn && submitBtn.disabled) return;

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Verifying Account...";
            }

            // 1. Authenticate credentials against Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Admins may sign in from either the buyer or farmer login page.
            if (await isAdmin(user.uid)) {
                window.location.href = "../agroplug-dashboard.html";
                return;
            }

            // Fetch the profile metadata mapping document from Firestore.
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();

                // 3. Split routing based on account role.
                if (userData.role === "farmer") {
                    window.location.href = "dashboard.html";
                // } else if (userData.role === "buyer") {
                //     window.location.href = "../buyers/marketplace.html";
                } else {
                    showPopup("Account access role unrecognized.", false);
                }
            } else {
                showPopup("User data profile record not found in database.", false);
            }

        } catch (error) {
            // 🛠️ Check your browser inspect console to see exact error description if this fires!
            console.error("Detailed Login Error Details:", error);
            
            let friendlyMessage = "";
            switch (error.code) {
                case "auth/invalid-credential":
                case "auth/user-not-found":
                case "auth/wrong-password":
                    friendlyMessage = "Invalid email or password.";
                    break;
                case "auth/too-many-requests":
                    friendlyMessage = "Access temporarily locked due to too many failed attempts.";
                    break;
                case "permission-denied":
                    friendlyMessage = "Database access denied. Please check your Firestore security rules.";
                    break;
                default:
                    friendlyMessage = `Authentication Error: ${error.message || "Please check network connection."}`;
            }

            showPopup(friendlyMessage, false);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Login";
            }
        }
    });
}

// Modal closing logic handles destination updates cleanly
const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("flex");
    modal.classList.add("hidden");
    
    // If a redirect URL was set during success, send them there now!
    if (targetRedirectionUrl) {
        window.location.href = targetRedirectionUrl;
    }
};

if (signInBtn) signInBtn.addEventListener("click", closeModal);
if (closeBtn) closeBtn.addEventListener("click", closeModal);
