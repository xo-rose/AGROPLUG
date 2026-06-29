// MODAL FUNCTIONS 
const closeBtn = document.getElementById("closeBtn")
const cancelBtn = document.getElementById("cancelBtn")
const overlayTxt = document.getElementById("overlay")
window.addEventListener("DOMContentLoaded", () => {
    modal.classList.remove("hidden")
    modal.classList.add("flex")
})
signIn.addEventListener("click", hideModal)
function hideModal() {
    modal.classList.add("hidden")
    modal.classList.remove("flex")
}
// cancelBtn.addEventListener("click", hideModal)
closeBtn.addEventListener("click", hideModal)
overlayTxt.textContent = "  Please if you don't have an account kindy register to access amazing products for affordabel prices."

// FOR THE HIDE AND SHOW PASSWORD
const togglePassword =
    document.getElementById("togglePassword");

const password =
    document.getElementById("password");

togglePassword.addEventListener("click", () => {

    if (password.type === "password") {
        password.type = "text";
        togglePassword.classList.remove("fa-eye");
        togglePassword.classList.add("fa-eye-slash");
        togglePassword.classList.add("text-white")
    } else {
        password.type = "password";
        togglePassword.classList.remove("fa-eye-slash");
        togglePassword.classList.add("fa-eye");
        togglePassword.classList.remove("text-white")

    }

});