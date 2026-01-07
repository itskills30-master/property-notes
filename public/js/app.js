// ===============================
// SERVICE WORKER REGISTER
// ===============================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.log("✅ Service Worker registered");
      })
      .catch(err => {
        console.error("❌ SW failed:", err);
      });
  });
}

// ===============================
// GLOBAL CURRENCY HELPERS
// ===============================
const APP_CURRENCY_KEY = "app_currency";

function getCurrentCurrency() {
  const saved = localStorage.getItem(APP_CURRENCY_KEY);
  if (saved === "usd" || saved === "id") return saved;
  return "id"; // default Rupiah
}

function setCurrentCurrency(currency) {
  const normalized = currency === "usd" ? "usd" : "id";
  localStorage.setItem(APP_CURRENCY_KEY, normalized);
  return normalized;
}

function parseCurrency(value) {
  if (!value) return 0;
  const numValue = parseFloat(value.toString().replace(/[^\d]/g, ""));
  return isNaN(numValue) ? 0 : numValue;
}

function formatCurrency(value, currency = getCurrentCurrency()) {
  if (!value || value === "" || value === 0) return "";

  let numValue;
  if (typeof value === "number") {
    numValue = value;
  } else {
    numValue = parseFloat(value.toString().replace(/[^\d]/g, ""));
  }

  if (isNaN(numValue) || numValue === 0) return "";

  if (currency === "id") {
    return `Rp ${numValue.toLocaleString("id-ID")}`;
  }

  return `$${numValue.toLocaleString("en-US")}`;
}

// ===============================
// PWA INSTALL PROMPT (AUTO)
// ===============================
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  console.log("🔥 PWA install available");

  const installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.style.display = "block";
  }
});

// ===============================
// INSTALL BUTTON ACTION
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const installBtn = document.getElementById("installBtn");
  if (!installBtn) return;

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    console.log("User choice:", result.outcome);

    deferredPrompt = null;
    installBtn.style.display = "none";
  });
});

// ===============================
// DETEKSI SAAT APP TERINSTALL
// ===============================
window.addEventListener("appinstalled", () => {
  console.log("✅ PWA installed");
  window.location.href = "/unit.html";
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log("🔄 App updated");

    // tampilkan notifikasi ke user
    const updateBanner = document.getElementById("updateBanner");
    if (updateBanner) {
      updateBanner.style.display = "block";
    }
  });
}
