   let currentUser = null;
        const listingCache = new Map();

        function escapeHtml(value) {
            return String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

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
                .onSnapshot((snapshot) => {

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

                    listingCache.clear();
                    products.forEach((item) => listingCache.set(item.id, item));

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
                                    onclick="openEditListing('${item.id}')"
                                    class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg">
                                    Edit / Restock
                                </button>

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

                }, (error) => {

                    console.error(error);

                    container.innerHTML = `
                <div class="col-span-full bg-red-100 text-red-600 p-6 rounded-xl">
                    Error: ${error.message}
                </div>
            `;
                });
        }

        function openEditListing(id) {
            const item = listingCache.get(id);
            if (!item) return;

            document.getElementById("listingEditModal")?.remove();

            const modal = document.createElement("div");
            modal.id = "listingEditModal";
            modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4";
            modal.innerHTML = `
                <form id="listingEditForm" class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                    <div class="flex items-center justify-between gap-4 mb-5">
                        <h2 class="text-xl font-bold text-slate-900">Edit listing</h2>
                        <button type="button" id="closeListingEdit" class="text-slate-400 hover:text-slate-700 text-xl" aria-label="Close">&times;</button>
                    </div>
                    <div class="grid sm:grid-cols-2 gap-4">
                        <label class="text-sm font-medium text-slate-700">Product name<input id="editProductName" required value="${escapeHtml(item.productName)}" class="mt-1 w-full rounded-lg border p-2.5"></label>
                        <label class="text-sm font-medium text-slate-700">Price (₦)<input id="editPrice" required min="0" step="0.01" type="number" value="${Number(item.price || 0)}" class="mt-1 w-full rounded-lg border p-2.5"></label>
                        <label class="text-sm font-medium text-slate-700">Total stock<input id="editQuantity" required min="0" step="1" type="number" value="${Number(item.quantity || 0)}" class="mt-1 w-full rounded-lg border p-2.5"></label>
                        <label class="text-sm font-medium text-slate-700">Location<input id="editLocation" value="${escapeHtml(item.location)}" class="mt-1 w-full rounded-lg border p-2.5"></label>
                        <label class="text-sm font-medium text-slate-700">Category<input id="editCategory" value="${escapeHtml(item.category)}" class="mt-1 w-full rounded-lg border p-2.5"></label>
                        <label class="text-sm font-medium text-slate-700">Status<select id="editStatus" class="mt-1 w-full rounded-lg border p-2.5"><option value="active" ${item.status === "active" ? "selected" : ""}>Active</option><option value="inactive" ${item.status === "inactive" ? "selected" : ""}>Inactive</option></select></label>
                    </div>
                    <label class="block mt-4 text-sm font-medium text-slate-700">Description<textarea id="editDescription" rows="3" class="mt-1 w-full rounded-lg border p-2.5">${escapeHtml(item.description)}</textarea></label>
                    <p id="listingEditError" class="hidden mt-3 text-sm text-red-600"></p>
                    <div class="mt-6 flex justify-end gap-3"><button type="button" id="cancelListingEdit" class="rounded-lg border px-4 py-2 text-slate-700">Cancel</button><button class="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">Save changes</button></div>
                </form>`;
            document.body.appendChild(modal);

            const close = () => modal.remove();
            document.getElementById("closeListingEdit").addEventListener("click", close);
            document.getElementById("cancelListingEdit").addEventListener("click", close);
            modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
            document.getElementById("listingEditForm").addEventListener("submit", async (event) => {
                event.preventDefault();
                const quantity = Number(document.getElementById("editQuantity").value);
                const price = Number(document.getElementById("editPrice").value);
                const error = document.getElementById("listingEditError");
                if (!Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(price) || price < 0) {
                    error.textContent = "Enter a valid non-negative price and whole-number stock quantity.";
                    error.classList.remove("hidden");
                    return;
                }
                try {
                    await db.collection("listings").doc(id).update({
                        productName: document.getElementById("editProductName").value.trim(),
                        price,
                        quantity,
                        location: document.getElementById("editLocation").value.trim(),
                        category: document.getElementById("editCategory").value.trim(),
                        status: document.getElementById("editStatus").value,
                        description: document.getElementById("editDescription").value.trim(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    close();
                } catch (updateError) {
                    error.textContent = updateError.message || "Unable to update this listing.";
                    error.classList.remove("hidden");
                }
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
