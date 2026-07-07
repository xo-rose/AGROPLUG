import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

// DOM Elements matching your HTML structure exactly
const signupForm = document.getElementById("farmerSignupForm"); // Form ID from your HTML
const errorMsg = document.getElementById("errorMsg");
const modal = document.getElementById("modal");
const overlayText = document.getElementById("overlay");
const signInBtn = document.getElementById("signIn");
const closeBtn = document.getElementById("closeBtn");

// Helper function to handle the blur modal popup display states
function showPopup(message, isSuccess = true) {
    if (!overlayText || !modal) return;
    
    overlayText.textContent = message;
    
    if (isSuccess) {
        overlayText.className = "font-semibold text-emerald-950 text-center mt-2";
        if (signInBtn) {
            signInBtn.textContent = "Proceed to Login";
            signInBtn.className = "flex-1 font-extrabold rounded-xl bg-emerald-600 py-3 text-white hover:bg-emerald-700 transition text-center block";
        }
    } else {
        overlayText.className = "font-semibold text-red-600 text-center mt-2";
        if (signInBtn) {
            signInBtn.textContent = "Try Again";
            signInBtn.className = "flex-1 font-extrabold rounded-xl bg-red-600 py-3 text-white hover:bg-red-700 transition text-center block";
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

        // Gather explicit values from your input IDs
        const fullName = document.getElementById("fullName").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phoneNumber").value.trim();
        const password = document.getElementById("password").value;

        let user = null;

        try {
            // Lock submit button against instant double taps
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Creating Account...";
            }

            // Step 1: Create the User account inside Auth records
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            user = userCredential.user;

        } catch (authError) {
            console.error("Authentication Core Fault:", authError);
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
                    friendlyMessage = "Registration failed. Please check your network connection.";
            }

            showPopup(friendlyMessage, false);
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Create Account";
            }
            return; // Exit execution thread
        }

        // Step 2: Store complementary data (Labeling role explicitly as "buyer")
        try {
            await setDoc(doc(db, "users", user.uid), {
                fullname: fullName,
                email: email,
                phone: phone,
                role: "buyer", // 👈 Crucial tag differentiating buyers from farmers
                createdAt: new Date().toISOString()
            });
        } catch (firestoreError) {
            console.error("Firestore database record skipped:", firestoreError);
        }

        // Step 3: Trigger the clean success popup screen views directly
        showPopup(`Hello ${fullName}, your Buyer account registration was successful!`, true);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Create Account";
        }
    });
}

// Modal closing and routing flow controls
const closeModal = () => {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
    
    // Redirect cleanly ONLY if it's the green success message state
    if (!overlayText.classList.contains("text-red-600")) {
        window.location.href = "../farmers/login.html"; // Redirects to the login route listed in your anchor tags
    }
};

if (signInBtn) signInBtn.addEventListener("click", closeModal);
if (closeBtn) closeBtn.addEventListener("click", closeModal);