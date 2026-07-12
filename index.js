// NAVIGATION BAR 
const footer = document.getElementById(`Footer`)
const nav = document.getElementById('navbar');
const links = document.querySelectorAll('.nav-link');
const LogoText = document.getElementById("LogoText");
window.addEventListener("scroll", () => {
    if (window.scrollY > 600) {
        // When scrolled: add background shade and darken text
        nav.classList.add("bg-white", "shadow-md");
        nav.classList.remove("bg-white/30", "shadow-md", "backdrop-blur-lg");

        LogoText.classList.remove("text-white");
        LogoText.classList.add("text-slate-900");

        links.forEach(link => {
            link.classList.remove("text-white", "hover:text-emerald-600");
            link.classList.add("text-emerald-600", "hover:text-emerald-500");
        });
    }  else {
        // Back to original top state
        nav.classList.remove("bg-white");
        nav.classList.add("bg-white/30", "shadow-md", "backdrop-blur-lg");

        links.forEach(link => {
            link.classList.add("text-white", "hover:text-emerald-500");
            link.classList.remove("text-emerald-600", "hover:text-emerald-600");
        });
        LogoText.classList.add("text-white");
        // LogoText.classList.add("text-slate-800");
        
    }
});


const observerOptions = {
    threshold: 0.15, // Triggers when 15% of the element is visible
    rootMargin: "0px 0px -50px 0px" // Triggers slightly before entry for smoother flow
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Remove hidden states
            entry.target.classList.remove("opacity-0", "translate-y-5");
            // Add visible states
            entry.target.classList.add("opacity-100", "translate-y-0");

            // Stop observing once animated
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Activate the observer on elements with the 'scroll-animate' class
const hiddenElements = document.querySelectorAll('.scroll-animate');
hiddenElements.forEach(el => observer.observe(el));



// NAVLINKS SMOOTH ENTRY
document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach((item, index) => {
        setTimeout(() => {
            // Remove the initial hidden/shifted states
            item.classList.remove('opacity-0', 'translate-y-2');
            // Add the final visible states (Tailwind's transition takes care of the animation)
            item.classList.add('opacity-100', 'translate-y-0');
        }, index * 150); // 150ms delay multiplier creates the staggered effect
    });
});
// NAVIGATION CLOSE


// FOOTER DATE SECTION
document.getElementById(`year`).textContent = new Date().getFullYear()



//FRESH DROP ARRAY
const products = [
    {
        id: 1,
        title: "Plump Organic Red Tomatoes",
        category: "vegetables",
        stockleft: "10",
        stock: "Red Tomatoes Avaliable",
        desc: "Harvested this morning. Super sweet, thick skin, perfect for restaurants or family storage.",
        price: "₦12,500",
        location: "Umuahia South    ",
        img: "https://plus.unsplash.com/premium_photo-1661811820259-2575b82101bf?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8dG9tYXRvZXN8ZW58MHx8MHx8fDA%3D"
    },
    {
        id: 2,
        title: "Cucumbers",
        category: "vegetables",
        stockleft: "10",
        stock: "Fresh Cucumbers",
        desc: "Harvested this morning. Super sweet, thick skin, perfect for restaurants or family storage.",
        price: "₦16,500",
        location: "Umuhaia North",
        img: "https://images.unsplash.com/photo-1694153192731-ab5445654427?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fGN1Y3VtYmVyc3xlbnwwfHwwfHx8MA%3D%3D"
    },
    {
        id: 3,
        title: "Potatoes",
        category: "tubers",
        stockleft: "10",
        stock: "Fresh Carrots Avaliabe",
        desc: "Harvested this morning. Super sweet, thick skin, perfect for restaurants or family storage.",
        price: "₦50,500",
        location: "Obi Ngwa",
        img:
            "https://images.unsplash.com/photo-1730815048561-45df6f7f331d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8WWFtfGVufDB8fDB8fHww"
    },

]
const section = document.querySelector(".marketplace");
const filterBtn = document.querySelectorAll(".btn")
const filter = document.querySelector(`search`)
const search = document.getElementById("search")

// FRESH DROP SECTION

window.addEventListener("DOMContentLoaded", function () {
    displayItems(products)
});
filterBtn.forEach(function (btn) {
    btn.addEventListener("click", (e) => {
        const category = e.currentTarget.dataset.id;
        const menucat = products.filter(function (menuItem) {
            // console.log(menucat);
            if (menuItem.category === category) {
                return menuItem;
            }
        })
        if (category === "all") {
            displayItems(products)
        }
        else {
            displayItems(menucat)
        }
    });

});

function displayItems(menuItems) {
    var display = menuItems.map((item) => {
        // console.log(item);
        return `
<div
    class="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div class="relative aspect-[4/3] bg-slate-100 overflow-hidden">

        <img src="${item.img}"
            class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 hover:bg-black">
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-300"></div>
        <button class="absolute top-1/2 left-1/2 
                 -translate-x-1/2 -translate-y-1/2
                 opacity-0 group-hover:opacity-100
                 bg-white text-red-500 font-bold px-5 py-2 rounded-lg
                 transition duration-300 hover:scale-105 hover:ytranslate-y-1" onclick="modalBtn()">
            Purchase <i class="fa-solid fa-basket-shopping"></i>
        </button>
        <span
            class="absolute left-3 top-3 inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-2xs font-semibold tracking-wide uppercase text-white shadow-sm text-sm">
            ${item.stock}
        </span>
        <span
            class="absolute right-3 top-3 inline-flex items-center rounded-full bg-slate-900/80 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white">
            ${item.stockleft}
        </span>
    </div>

    <div class="flex flex-1 flex-col p-6">
        <div class="flex items-center justify-between gap-2 mb-1.5">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wide">${item.category}</span>
            <span
                class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                📍 ${item.location}
            </span>
        </div>

        <h3 class="text-lg font-black text-slate-900 mb-1">
            ${item.title}
        </h3>

        <p class="text-xs text-slate-500 line-clamp-2 mb-4">
            ${item.desc}
        </p>

        <div class="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div>
                <span class="block text-2xs uppercase tracking-wider text-slate-400 font-bold">Price</span>
                <span class="text-xl font-black text-slate-900">${item.price}<span
                        class="text-xs font-medium text-slate-500">/ basket</span></span>
            </div>

            <button type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 transition transform active:scale-95 cursor-pointer"
                 onclick="modalBtn()">
                Get Plugged <i class="fa-solid fa-plug"></i>
            </button>
        </div>
    </div>
</div>
</div>`;
    });
    display = display.join("");
    section.innerHTML = display
}
// document.getElementById("demo").addEventListener("click", () => {
// })

// APP DOWNLOAD MODAL SECTION //
const modal = document.getElementById("modal");
const openBtns = document.querySelectorAll(".modalBtn");
const closeBtn = document.getElementById("closeBtn");
const appQrLink = document.getElementById("appQrLink");
const appQrCode = document.getElementById("appQrCode");

const appPreviewUrl = new URL("https://ibb.co/zh7xH6p0  ", window.location.href).href;
if (appQrLink && appQrCode) {
    appQrLink.href = appPreviewUrl;
    appQrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(appPreviewUrl)}`;
}

// OPEN MODAL
openBtns.forEach((button) => {
    button.addEventListener("click", () => {
        modalBtn();
    });
});

function modalBtn() {
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeAppModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

// CLOSE MODAL
if (closeBtn) {
    closeBtn.addEventListener("click", closeAppModal);
}

// CLOSE WHEN CLICKING OUTSIDE
if (modal) {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeAppModal();
        }
    });
}

document.addEventListener("click", (e) => {
    const getPluggedButton = e.target.closest(".get-plugged-btn");
    if (getPluggedButton) {
        e.preventDefault();
        modalBtn();
    }
});

// THE FAQ DROPDOWN

document.addEventListener("click", (e) => {
    const button = e.target.closest(".dropdown-btn");
    const currentDropdown = button
        ? button.closest(".dropdown")
        : null;

    // Close all other dropdowns
    // Close all other dropdowns
    document.querySelectorAll(".dropdown").forEach((dropdown) => {
        const content = dropdown.querySelector(".dropdown-content");

        if (dropdown !== currentDropdown) {
            content.classList.remove("max-h-96", "opacity-100");
            content.classList.add("max-h-0", "opacity-0");
        }
    });

    // Toggle clicked dropdown
    if (button) {
        const currentContent =
            currentDropdown.querySelector(".dropdown-content");

        currentContent.classList.toggle("max-h-0");
        currentContent.classList.toggle("max-h-96");
        currentContent.classList.toggle("opacity-0");
        currentContent.classList.toggle("opacity-100");
    }
});


// //WELCOME MODAL SECTION

const Close = document.getElementById("close")
const text = document.getElementById("over")
const Welcome = document.getElementById("welcome")
const textSeries = [
    "Your digital farming companion.",
    "Track Your Crops",
    "Manage Your Harvest",
    "Connect With Buyers"

];

window.addEventListener("DOMContentLoaded", () => {
    Welcome.classList.remove("hidden");
    Welcome.classList.add("flex");

    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeWriter() {
        const currentText = textSeries[textIndex];

        if (!isDeleting) {
            text.textContent = currentText.slice(0, charIndex++);
        } else {
            text.textContent = currentText.slice(0, charIndex--);
        }

        let speed = isDeleting ? 50 : 100;

        if (!isDeleting && charIndex > currentText.length) {
            isDeleting = true;
            speed = 1500;
        }

        if (isDeleting && charIndex < 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % textSeries.length;
            speed = 500;
        }

        setTimeout(typeWriter, speed);
    }

    typeWriter();
});
// MODAL FUNCTION
function showModal() {
    Welcome.classList.remove("hidden");
    Welcome.classList.add("flex");
}

function hideModal() {
    Welcome.classList.add("hidden");
    Welcome.classList.remove("flex");
}

Close.addEventListener("click", hideModal);

Welcome.addEventListener("click", (e) => {
    if (e.target === Welcome) {
        hideModal();
    }
});


