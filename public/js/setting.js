// SETTING PAGE - MOBILE-FIRST

const openMenuBtn = document.getElementById("openMenuBtn");
const menuBottomSheet = document.getElementById("menuBottomSheet");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const closeMenuBtn2 = document.getElementById("closeMenuBtn2");
const currencyOptions = document.querySelectorAll(".setting-currency-option");

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

  // Set current currency state
  const currentCurrency = getCurrentCurrency();
  setActiveCurrencyOption(currentCurrency);

  currencyOptions.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selected = btn.getAttribute("data-currency");
      const normalized = setCurrentCurrency(selected);
      setActiveCurrencyOption(normalized);
    });
  });
});

function closeMenuBottomSheet() {
  menuBottomSheet.classList.remove("active");
}

function setActiveCurrencyOption(currency) {
  currencyOptions.forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-currency") === currency);
  });
}
