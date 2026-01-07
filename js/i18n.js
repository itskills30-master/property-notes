const LANG_KEY = "app_language";

function detectLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved) return saved;

  return navigator.language.startsWith("id") ? "id" : "en";
}

async function loadLang(lang) {
  const res = await fetch(`/lang/${lang}.json`);
  const dict = await res.json();

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = dict[el.dataset.i18n] || "";
  });
}

loadLang(detectLang());
