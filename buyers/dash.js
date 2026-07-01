var menu = document.getElementById("menuList");

function toggleMenu() {
            if (menu.classList.contains("hidden")) {
                menu.classList.remove("hidden");
                // menu.classList.add("flex");
            } else {
                menu.classList.remove("flex");
                menu.classList.add("hidden");
            }
        }

