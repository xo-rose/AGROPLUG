(() => {
    const sidebar = document.getElementById("sidebar");
    const openButton = document.getElementById("mobileMenuBtn");
    const closeButton = document.getElementById("closeSidebarBtn");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (!sidebar || !openButton || !closeButton || !backdrop) return;

    const setOpen = (isOpen) => {
        sidebar.classList.toggle("-translate-x-full", !isOpen);
        backdrop.classList.toggle("hidden", !isOpen);
        openButton.setAttribute("aria-expanded", String(isOpen));
    };

    openButton.addEventListener("click", () => setOpen(true));
    closeButton.addEventListener("click", () => setOpen(false));
    backdrop.addEventListener("click", () => setOpen(false));
    sidebar.querySelectorAll("a[href]").forEach((link) => link.addEventListener("click", () => setOpen(false)));
})();
