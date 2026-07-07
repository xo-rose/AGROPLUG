// ===============================
// FIREBASE CONFIG
// ===============================

const firebaseConfig = {
    apiKey: "AIzaSyAf6VnPt4CKbQHiy9BvFYuc0SoSTDc9jt4",
    authDomain: "agroplug.firebaseapp.com",
    projectId: "agroplug",
    storageBucket: "agroplug.firebasestorage.app",
    messagingSenderId: "182515025466",
    appId: "1:182515025466:web:2aadc130704ca5e0dc9703",
    measurementId: "G-JEXRP5BYRX"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// ===============================
// GLOBAL AUTH LISTENER
// ===============================

auth.onAuthStateChanged(async (user) => {

    if (!user) {

        // Pages that require login
        const protectedPages = [
            "dashboard.html",
            "listing.html",
            "profile.html",
            "orders.html",
            "earnings.html"
        ];

        const currentPage =
            window.location.pathname.split("/").pop();

        if (protectedPages.includes(currentPage)) {
            window.location.replace("login.html");
        }

        return;
    }

    try {

        const uid = user.uid;

        // ===============================
        // FARMER NAME
        // ===============================

        const farmerName =
            document.getElementById("farmerName");

        if (farmerName) {

            if (user.displayName) {
                farmerName.textContent =
                    user.displayName;
            } else {

                const emailName =
                    user.email
                        ? user.email.split("@")[0]
                        : "Farmer";

                farmerName.textContent =
                    emailName;
            }
        }

        // ===============================
        // DASHBOARD COUNTERS
        // ===============================

        const totalListingsElement =
            document.getElementById("totalListingsCount");

        const todayOrdersElement =
            document.getElementById("todayOrdersCount");

        const todayEarningsElement =
            document.getElementById("todayEarningsCount");

        if (
            totalListingsElement ||
            todayOrdersElement ||
            todayEarningsElement
        ) {

            // Listings Count
            const listingsSnapshot =
                await db
                    .collection("listings")
                    .where("farmerId", "==", uid)
                    .get();

            if (totalListingsElement) {
                totalListingsElement.textContent =
                    listingsSnapshot.size;
            }

            // Today's Sales
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);

            const salesSnapshot =
                await db
                    .collection("sales")
                    .where("farmerId", "==", uid)
                    .where("timestamp", ">=", startOfToday)
                    .where("timestamp", "<=", endOfToday)
                    .get();

            let totalOrdersToday = 0;
            let totalEarnedToday = 0;

            salesSnapshot.forEach((doc) => {

                const sale = doc.data();

                totalOrdersToday++;

                totalEarnedToday += Number(
                    sale.amount || 0
                );
            });

            if (todayOrdersElement) {
                todayOrdersElement.textContent =
                    totalOrdersToday;
            }

            if (todayEarningsElement) {
                todayEarningsElement.innerHTML =
                    "&#8358;" +
                    totalEarnedToday.toLocaleString();
            }
        }

    } catch (error) {

        console.error(
            "Firebase initialization error:",
            error
        );
    }
});