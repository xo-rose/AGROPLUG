const footer = document.getElementById(`Footer`)
const nav = document.getElementById('navbar');
const links = document.querySelectorAll('.nav-link');
window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        // When scrolled: add background shade and darken text
        nav.classList.add("bg-white", "shadow-md");
        nav.classList.remove("bg-transparent");

        links.forEach(link => {
            link.classList.remove("text-white", "hover:text-emerald-600");
            link.classList.add("text-emerald-600", "hover:text-emerald-500");
        });
    } else {
        // Back to original top state
        nav.classList.remove("bg-white");
        // nav.classList.remove("bg-black", "shadow-md");

        links.forEach(link => {
            link.classList.add("text-white", "hover:text-emerald-500");
            link.classList.remove("text-emerald-600", "hover:text-emerald-600");
        });
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

document.getElementById(`year`).textContent = new Date().getFullYear()




const products = [
    {
        id: 1,
        title: "Plump Organic Red Tomatoes",
        category: "vegetables",
        desc: "Harvested this morning. Super sweet, thick skin, perfect for restaurants or family storage.",
        price: "₦12,500",
        img: "https://myhealthopedia.com/wp-content/uploads/2025/11/Tomatoes-1.jpg"
    },
    {
        id: 2,
        title: "Carrots",
        category: "tubers",
        desc: "Harvested this morning. Super sweet, thick skin, perfect for restaurants or family storage.",
        price: "₦50,500",
        img: "https://www.bing.com/th/id/OIP.OInJQMsGKQs4dyzatfskbQHaE9?w=204&h=128&c=8&rs=1&qlt=90&o=6&dpr=1.7&pid=3.1&rm=2"
    },
    {
        id: 3,
        title: "Chicken",
        category: "livestock",
        desc: "Harvested this morning. Super sweet, thick skin, perfect for restaurants or family storage.",
        price: "₦12,500",
        img: "https://www.bing.com/th/id/OIP.0w3K2dBe50IJPfmxH3MF9gHaFS?w=175&h=128&c=8&rs=1&qlt=90&o=6&dpr=1.7&pid=3.1&rm=2"
    }
]
const section = document.querySelector(".marketplace");
const filterBtn = document.querySelectorAll(".btn")
const filter = document.querySelector(`.search`)

filter.addEventListener("input", (e) => {
    const value = e.target.value.toLowerCase();

    const filtered = products.filter(item => {
        return (
            item.title.toLowerCase().includes(value) ||
            item.category.toLowerCase().includes(value)
        );
    });

    displayItems(filtered);
});

// filter.addEventListener(`input`, () => {
//     const category = e.currentTarget.dataset.id;
//     const menucat = products.filter(function (menuItem) {
//         if (menuItem.category === category) {
//             return menuItem;
//         }
//     })
// })



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
        // console.log(menucat);
        if (category === "all") {
            displayItems(products)
        } else {
            displayItems(menucat)
        }
    });
});

function displayItems(menuItems) {
    var display = menuItems.map((item) => {
        // console.log(item);
        return ` 
     <div class="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div class="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img src="${item.img}" class="h-full w-full object-cover grgt roup-hover:scale-105 transition-transform duration-500">
                    
                    <span class="absolute left-3 top-3 inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-2xs font-extrabold tracking-wider uppercase text-white shadow-sm">
                        🔥 Fresh Drop
                    </span>
                    <span class="absolute right-3 top-3 inline-flex items-center rounded-full bg-slate-900/80 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white">
                        4 Baskets left
                    </span>
                </div>

                <div class="flex flex-1 flex-col p-6">
                    <div class="flex items-center justify-between gap-2 mb-1.5">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-wide">${item.category}</span>
                        <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                            📍 Umudike (2.5km)
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
                            <span class="text-xl font-black text-slate-900">${item.price}<span class="text-xs font-medium text-slate-500">/ basket</span></span>
                        </div>
                        
                        <a href="claim.php?listing_id=1" class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 transition transform active:scale-95">
                            Get Plugged 🔌
                        </a>
                    </div>
                </div>
            </div> 
        </div>`;
    });
    display = display.join("");
    section.innerHTML = display
}
//     const openBuyerForm = document.getElementById("openBuyerForm");
// const buyerModal = document.getElementById("buyerModal");
// const closeBuyerForm = document.getElementById("closeBuyerForm");

// if (openBuyerForm && buyerModal && closeBuyerForm) {

//     openBuyerForm.addEventListener("click", function (e) {
//         e.preventDefault();
//         buyerModal.classList.remove("hidden");
//     });

//     closeBuyerForm.addEventListener("click", function () {
//         buyerModal.classList.add("hidden");
//     });

//     buyerModal.addEventListener("click", function (e) {
//         if (e.target === buyerModal) {
//             buyerModal.classList.add("hidden");
//         }
//     });

// }