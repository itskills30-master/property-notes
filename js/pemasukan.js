// PEMASUKAN PAGE - MOBILE-FIRST

const openMenuBtn = document.getElementById("openMenuBtn");
const menuBottomSheet = document.getElementById("menuBottomSheet");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const closeMenuBtn2 = document.getElementById("closeMenuBtn2");

document.addEventListener("DOMContentLoaded", async () => {
  // Event listener untuk open menu
  openMenuBtn.addEventListener("click", () => {
    menuBottomSheet.classList.add("active");
  });

  // Event listener untuk close menu
  closeMenuBtn.addEventListener("click", closeMenuBottomSheet);
  closeMenuBtn2.addEventListener("click", closeMenuBottomSheet);
  
  menuBottomSheet.addEventListener("click", (e) => {
    if (e.target === menuBottomSheet || e.target === closeMenuBtn) {
      closeMenuBottomSheet();
    }
  });
});

function closeMenuBottomSheet() {
  menuBottomSheet.classList.remove("active");
}
