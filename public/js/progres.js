// PROGRES PAGE - MOBILE-FIRST

/***********************
 * PATCH: TIMEZONE SAFE
 ***********************/
function parseLocalDateTime(value) {
  if (!value) return null;

  // datetime-local (YYYY-MM-DDTHH:mm)
  if (value.includes("T") && !value.endsWith("Z")) {
    const [date, time] = value.split("T");
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }

  // ISO string dari DB
  const d = new Date(value);
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    0,
    0
  );
}

/***********************
 * GLOBAL ELEMENTS
 ***********************/
const openMenuBtn = document.getElementById("openMenuBtn");
const menuBottomSheet = document.getElementById("menuBottomSheet");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const closeMenuBtn2 = document.getElementById("closeMenuBtn2");
const openFormBtn = document.getElementById("openFormBtn");
const formBottomSheet = document.getElementById("formBottomSheet");
const closeFormBtn = document.getElementById("closeFormBtn");
const closeFormBtn2 = document.getElementById("closeFormBtn2");
const unitSelectModal = document.getElementById("unitSelectModal");
const progresFormModal = document.getElementById("progresFormModal");
const progresList = document.getElementById("progresList");
const emptyState = document.getElementById("emptyState");
const formTitle = document.getElementById("formTitle");

let allProgres = [];
let allUnits = [];
let currentEditProgresId = null;

/***********************
 * PATCH: INTERVAL SAFE
 ***********************/
const countdownIntervals = new Map();

function clearAllCountdowns() {
  countdownIntervals.forEach(id => clearInterval(id));
  countdownIntervals.clear();
}

/***********************
 * PATCH: AUTO PROMOTE LOCK
 ***********************/
let isPromoting = false;

async function autoPromoteSafely() {
  if (isPromoting) return;
  isPromoting = true;

  try {
    const now = new Date();
    const progresListDB = await getAllProgresFromDB();

    for (const p of progresListDB) {
      const checkOut = parseLocalDateTime(p.checkOut);
      if (checkOut <= now && typeof updateUnitStatusByProgres === "function") {
        await updateUnitStatusByProgres(p.unitId);
      }
    }
  } finally {
    isPromoting = false;
  }
}

/***********************
 * FORMAT & UTIL
 ***********************/
function formatCurrency(value, currency = getCurrentCurrency()) {
  let numValue = parseFloat(value) || 0;
  if (currency === "id") {
    return `Rp ${numValue.toLocaleString("id-ID")}`;
  }
  return `$${numValue.toLocaleString("en-US")}`;
}

function parseCurrency(value) {
  if (!value) return 0;
  const num = parseFloat(value.toString().replace(/[^\d]/g, ""));
  return isNaN(num) ? 0 : num;
}

/***********************
 * COUNTDOWN LOGIC
 ***********************/
function calculateCountdown(checkIn, checkOut, isBooking = false) {
  const now = new Date();
  const checkInDate = parseLocalDateTime(checkIn);
  const checkOutDate = parseLocalDateTime(checkOut);

  let progress = 0;
  let countdownText = "";

  if (isBooking && now < checkInDate) {
    const diff = checkInDate - now;
    const days = Math.floor(diff / 86400000);
    countdownText = days > 0 ? `${days} hari lagi` : "Segera check in";
    progress = 0;
  } else {
    const total = checkOutDate - checkInDate;
    if (now >= checkOutDate) {
      progress = 100;
      countdownText = "Sudah Check Out";
    } else {
      progress = ((now - checkInDate) / total) * 100;
      const diff = checkOutDate - now;
      const days = Math.floor(diff / 86400000);
      countdownText = days > 0 ? `Sisa ${days} hari` : "Hampir selesai";
    }
  }

  return {
    countdown: countdownText,
    progress: Math.min(100, Math.max(0, progress))
  };
}

/***********************
 * PATCH: UPDATE COUNTDOWN
 ***********************/
function updateCountdown(cardId, checkIn, checkOut, unitId, isBooking) {
  const countdownEl = document.getElementById(`countdown-${cardId}`);
  const progressBarEl = document.getElementById(`progress-bar-${cardId}`);
  if (!countdownEl || !progressBarEl) return;

  const { countdown, progress } = calculateCountdown(checkIn, checkOut, isBooking);
  countdownEl.textContent = countdown;
  progressBarEl.style.width = `${progress}%`;

  if (progress >= 100) {
    progressBarEl.classList.add("completed");
  } else {
    progressBarEl.classList.remove("completed");
  }
}

/***********************
 * DOM READY
 ***********************/
document.addEventListener("DOMContentLoaded", async () => {
  await openDB();
  await loadUnits();
  await loadProgres();
  clearAllCountdowns();
  loadAllProgres();
  autoPromoteSafely();

  progresFormModal.addEventListener("submit", async e => {
    e.preventDefault();
    if (handleFormSubmit.locked) return;
    handleFormSubmit.locked = true;
    try {
      await handleFormSubmit();
    } finally {
      handleFormSubmit.locked = false;
    }
  });
});

/***********************
 * LOAD DATA
 ***********************/
async function loadUnits() {
  allUnits = await getAllPropertiesFromDB();
}

async function loadProgres() {
  allProgres = await getAllProgresFromDB();
}

async function loadAllProgres() {
  clearAllCountdowns(); // PATCH
  progresList.innerHTML = "";

  if (!allProgres.length) {
    emptyState.style.display = "block";
    progresList.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  progresList.style.display = "block";

  const now = new Date();

  allProgres.forEach(progres => {
    const checkIn = parseLocalDateTime(progres.checkIn);
    const isBooking = checkIn > now;

    const card = document.createElement("div");
    card.className = "progres-card";
    card.innerHTML = `
      <div class="progres-countdown" id="countdown-${progres.id}"></div>
      <div class="progres-progress-bar" id="progress-bar-${progres.id}"></div>
    `;

    progresList.appendChild(card);

    const intervalId = setInterval(() => {
      updateCountdown(progres.id, progres.checkIn, progres.checkOut, progres.unitId, isBooking);
    }, 1000);

    countdownIntervals.set(progres.id, intervalId);

    updateCountdown(progres.id, progres.checkIn, progres.checkOut, progres.unitId, isBooking);
  });
}

/***********************
 * FORM HANDLER
 ***********************/
async function handleFormSubmit() {
  const unitId = parseInt(unitSelectModal.value);
  const checkIn = document.getElementById("checkInModal").value;
  const checkOut = document.getElementById("checkOutModal").value;

  const data = {
    unitId,
    checkIn: new Date(checkIn).toISOString(),
    checkOut: new Date(checkOut).toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (currentEditProgresId) {
    await updateProgresInDB(currentEditProgresId, data);
  } else {
    await addProgresToDB(data);
  }

  await loadProgres();
  await autoPromoteSafely();
  loadAllProgres();
}
