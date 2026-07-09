   let currentUser = null;

        function getDisplayCategory(category) {
            const value = String(category || "").trim();
            const normalized = value.toLowerCase();

            if (normalized.includes("friut") || normalized.includes("fruit")) {
                return "Fruits & Vegetables";
            }

            return value || "N/A";
        }

        // ===============================
        // AUTH CHECK
        // ===============================
        auth.onAuthStateChanged((user) => {

            if (!user) {
                window.location.href = "login.html";
                return;
            }

            currentUser = user;

            document.getElementById("farmerName").textContent =
                user.displayName || user.email;

            loadListings();
        });

        // ===============================
        // LOAD PRODUCTS
        // ===============================

        function loadListings() {

            const container =
                document.getElementById("listingsContainer");

            container.innerHTML = `
        <div class="col-span-full text-center py-10">
            Loading products...
        </div>
    `;

            db.collection("listings")
                .where("farmerId", "==", currentUser.uid)
                .get()
                .then((snapshot) => {

                    container.innerHTML = "";

                    let totalProducts = 0;
                    let totalInventory = 0;

                    if (snapshot.empty) {

                        container.innerHTML = `
                    <div class="col-span-full bg-white p-8 rounded-2xl shadow text-center">

                        <i class="fa-solid fa-box-open text-5xl text-gray-300 mb-4"></i>

                        <h3 class="text-xl font-bold">
                            No Products Found
                        </h3>

                        <p class="text-gray-500 mt-2">
                            Upload your first product.
                        </p>

                    </div>
                `;

                        return;
                    }

                    const products = [];

                    snapshot.forEach((doc) => {
                        products.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });

                    products.reverse();

                    products.forEach((item) => {

                        totalProducts++;
                        totalInventory += Number(item.quantity || 0);

                        container.innerHTML += `
                    <div class="bg-white rounded-2xl overflow-hidden shadow hover:shadow-lg transition">

                        <img
                            src="${item.imageUrl || 'https://via.placeholder.com/400x250'}"
                            class="w-full h-52 object-cover"
                        >

                        <div class="p-5">

                            <div class="flex justify-between items-start">

                                <h3 class="font-bold text-lg">
                                    ${item.productName || 'Unnamed Product'}
                                </h3>

                                <span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                                    Active
                                </span>

                            </div>

                            <p class="text-emerald-600 font-bold text-xl mt-2">
                                ₦${Number(item.price || 0).toLocaleString()}
                            </p>

                            <div class="mt-3 text-sm text-slate-600 space-y-1">

                                <p>
                                    <i class="fa-solid fa-layer-group mr-2"></i>
                                    ${getDisplayCategory(item.category)}
                                </p>

                                <p>
                                    <i class="fa-solid fa-location-dot mr-2"></i>
                                    ${item.location || 'N/A'}
                                </p>

                                <p>
                                    <i class="fa-solid fa-cubes mr-2"></i>
                                    Quantity: ${item.quantity || 0}
                                </p>

                            </div>

                            <p class="mt-3 text-sm text-gray-500">
                                ${item.description || ''}
                            </p>

                            <div class="flex gap-2 mt-5">

                                <button
                                    onclick="deleteListing('${item.id}')"
                                    class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg">
                                    Delete
                                </button>

                            </div>

                        </div>

                    </div>
                `;
                    });

                    document.getElementById("totalProducts").textContent =
                        totalProducts;

                    document.getElementById("activeProducts").textContent =
                        totalProducts;

                    document.getElementById("inventoryCount").textContent =
                        totalInventory;

                })
                .catch((error) => {

                    console.error(error);

                    container.innerHTML = `
                <div class="col-span-full bg-red-100 text-red-600 p-6 rounded-xl">
                    Error: ${error.message}
                </div>
            `;
                });
        }

        // ===============================
        // DELETE PRODUCT
        // ===============================
        async function deleteListing(id) {

            const confirmed =
                confirm("Delete this product?");

            if (!confirmed) return;

            try {

                await db.collection("listings")
                    .doc(id)
                    .delete();

                alert("Product deleted successfully.");

                loadListings();

            } catch (error) {

                console.error(error);
                alert(error.message);
            }
        }
    
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const closeSidebarBtn = document.getElementById('closeSidebarBtn');
        const sidebar = document.getElementById('sidebar'); // Fixed to map correctly to container element ID
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');

        // Combined Toggle Navigation Handler Logic Execution Core
        function toggleMobileSidebar() {
            sidebar.classList.toggle('-translate-x-full');
            sidebarBackdrop.classList.toggle('hidden');
        }

        mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
        closeSidebarBtn.addEventListener('click', toggleMobileSidebar);
        sidebarBackdrop.addEventListener('click', toggleMobileSidebar);

        // Core Logout Action Execution Pipeline
        document.getElementById("logoutBtn").addEventListener("click", (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = "login.html";
            }).catch((err) => {
                console.error("Logout runtime system anomaly detected: ", err);
            });
        });
