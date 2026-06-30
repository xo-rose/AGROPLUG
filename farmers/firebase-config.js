// API KEY FOR FIRE BASE
const firebaseConfig = {
    apiKey: "AIzaSyAf6VnPt4CKbQHiy9BvFYuc0SoSTDc9jt4",
    authDomain: "agroplug.firebaseapp.com",
    projectId: "agroplug",
    storageBucket: "agroplug.firebasestorage.app",
    messagingSenderId: "182515025466",
    appId: "1:182515025466:web:2aadc130704ca5e0dc9703",
    measurementId: "G-JEXRP5BYRX"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// 🔒 UNIFIED ROUTE GUARD & DATA FETCH
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        try {
            const uid = user.uid;

            // 1. GET PROFILE RECORDS            // 1. GET PROFILE RECORDS (From Auth Profile)
            if (user.displayName) {
                document.getElementById("farmerName").textContent = user.displayName;
                // document.getElementById("greetingName").textContent = user.displayName.split(" ")[0]; // Just the first name for the greeting
            } else {
                // Fallback if displayName is empty, using email handle
                const emailName = user.email ? user.email.split('@')[0] : "Farmer";
                document.getElementById("farmerName").textContent = emailName;
                // document.getElementById("greetingName").textContent = emailName;
            }

            // 2. LIVE COLLECTION QUERIES (Dynamic Counters)

            // Count Active Listings
            const listingsSnapshot = await db.collection("listings").where("farmerId", "==", uid).get();
            document.getElementById("totalListingsCount").textContent = listingsSnapshot.size;

            // Calculate Orders in Progress & Today's Earnings
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);

            const salesSnapshot = await db.collection("sales")
                .where("farmerId", "==", uid)
                .where("timestamp", ">=", startOfToday)
                .where("timestamp", "<=", endOfToday)
                .get();

            let totalOrdersToday = 0;
            let totalEarnedToday = 0;

            salesSnapshot.forEach((doc) => {
                const saleData = doc.data();
                totalOrdersToday += 1;
                totalEarnedToday += Number(saleData.amount || 0);
            });

            document.getElementById("todayOrdersCount").textContent = totalOrdersToday;
            document.getElementById("todayEarningsCount").innerHTML = "&#8358;" + totalEarnedToday.toLocaleString();

        } catch (error) {
            console.error("Error setting up operational dashboard nodes:", error);
        }

        // Render structural layout safely now that authorization checks out
        document.body.style.setProperty("display", "block", "important");
    }
});
