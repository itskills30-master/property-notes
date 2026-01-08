// PROGRES PAGE - MOBILE-FIRST

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
let countdownIntervals = new Map(); // Store intervals for cleanup

// Format mata uang mengikuti pengaturan global
function formatCurrency(value, currency = getCurrentCurrency()) {
  // Normalisasi nilai - pastikan selalu number
  let numValue;
  
  // Jika value null, undefined, atau string kosong, set ke 0
  if (value === null || value === undefined || value === "") {
    numValue = 0;
  } else if (typeof value === "number") {
    numValue = value;
  } else {
    numValue = parseFloat(value.toString().replace(/[^\d]/g, ""));
  }
  
  // Jika tidak valid atau NaN, set ke 0
  if (isNaN(numValue) || numValue === null || numValue === undefined) {
    numValue = 0;
  }

  // Pastikan nilai selalu ditampilkan, termasuk 0
  // Nilai 0 akan ditampilkan sebagai "Rp 0" atau "$0"
  if (currency === "id") {
    return `Rp ${numValue.toLocaleString("id-ID")}`;
  } else {
    return `$${numValue.toLocaleString("en-US")}`;
  }
}

// Parse mata uang ke angka
function parseCurrency(value) {
  if (!value) return 0;
  const numValue = parseFloat(value.toString().replace(/[^\d]/g, ""));
  return isNaN(numValue) ? 0 : numValue;
}

// Calculate countdown and progress
// isBooking: true jika ini adalah booking yang belum check in (countdown ke check in)
// isBooking: false jika ini adalah progres aktif (countdown ke check out)
function calculateCountdown(checkIn, checkOut, isBooking = false) {
  const now = new Date();
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  
  let timeRemaining;
  let countdownText = "";
  let progress = 0;
  
  if (isBooking && now < checkInDate) {
    // Booking: countdown ke check in
    timeRemaining = checkInDate - now;
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      countdownText = `${days} hari lagi`;
    } else if (hours > 0) {
      countdownText = `${hours} jam lagi`;
    } else if (minutes > 0) {
      countdownText = `${minutes} menit lagi`;
    } else {
      countdownText = "Segera check in";
    }
    
    progress = 0; // Booking belum mulai
  } else {
    // Progres aktif: countdown ke check out
    timeRemaining = checkOutDate - now;
    
    // Calculate total duration
    const totalDuration = checkOutDate - checkInDate;
    
    // Calculate progress percentage (0% at check in, 100% at check out)
    if (now < checkInDate) {
      progress = 0; // Before check in
    } else if (now >= checkOutDate) {
      progress = 100; // After check out
    } else {
      const elapsed = now - checkInDate;
      progress = (elapsed / totalDuration) * 100;
    }
    
    // Format countdown
    if (timeRemaining <= 0) {
      countdownText = "Sudah Check Out";
    } else {
      const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      
      if (days > 0) {
        countdownText = `Sisa ${days} hari ${hours} jam`;
      } else if (hours > 0) {
        countdownText = `Sisa ${hours} jam ${minutes} menit`;
      } else if (minutes > 0) {
        countdownText = `Sisa ${minutes} menit ${seconds} detik`;
      } else {
        countdownText = `Sisa ${seconds} detik`;
      }
    }
  }
  
  return {
    countdown: countdownText,
    progress: Math.min(100, Math.max(0, progress))
  };
}

// Update countdown for a specific card
// isBooking: true jika countdown ke check in, false jika countdown ke check out
async function updateCountdown(cardId, checkIn, checkOut, unitId = null, isBooking = false) {
  const countdownEl = document.getElementById(`countdown-${cardId}`);
  const progressBarEl = document.getElementById(`progress-bar-${cardId}`);
  
  if (!countdownEl || !progressBarEl) return;
  
  const { countdown, progress } = calculateCountdown(checkIn, checkOut, isBooking);
  
  countdownEl.textContent = countdown;
  progressBarEl.style.width = `${progress}%`;
  
  // Change color if progress is 100%
  if (progress >= 100) {
    progressBarEl.classList.add("completed");
    
    // Update unit status jika progres sudah selesai (100% / check out)
    // Cari unitId dari progres jika tidak diberikan
    if (!unitId) {
      const progres = allProgres.find(p => p.id === cardId);
      if (progres) {
        unitId = progres.unitId;
      }
    }
    
    // Update status unit setelah check out selesai
    // Status akan berubah dari "Penuh" ke "Booking" jika ada booking, atau "Kosong" jika tidak ada
    if (unitId && typeof updateUnitStatusByProgres === 'function') {
      await updateUnitStatusByProgres(unitId);
    }
  } else {
    progressBarEl.classList.remove("completed");
    
    // Update unit status menjadi "Penuh" jika progres aktif
    // Hanya update jika check in sudah lewat (bukan booking)
    if (!unitId) {
      const progres = allProgres.find(p => p.id === cardId);
      if (progres) {
        unitId = progres.unitId;
        const checkInDate = new Date(progres.checkIn);
        const now = new Date();
        
        // Hanya update status jika check in sudah lewat (progres aktif, bukan booking)
        if (checkInDate <= now && unitId && typeof updateUnitStatusByProgres === 'function') {
          await updateUnitStatusByProgres(unitId);
        }
      }
    } else {
      const progres = allProgres.find(p => p.id === cardId);
      if (progres) {
        const checkInDate = new Date(progres.checkIn);
        const now = new Date();
        
        // Hanya update status jika check in sudah lewat (progres aktif, bukan booking)
        if (checkInDate <= now && typeof updateUnitStatusByProgres === 'function') {
          await updateUnitStatusByProgres(unitId);
        }
      }
    }
  }
}

// Format input mata uang
function setupCurrencyInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", (e) => {
    const value = e.target.value;
    const numValue = parseCurrency(value);
    if (numValue > 0) {
      const currency = getCurrentCurrency();
      const formatted = formatCurrency(numValue, currency);
      e.target.value = formatted;
      // Jaga caret di akhir agar tidak meloncat di tengah prefix/sufiks
      const endPos = formatted.length;
      requestAnimationFrame(() => {
        e.target.setSelectionRange(endPos, endPos);
      });
    } else {
      e.target.value = "";
    }
  });

  input.addEventListener("focus", (e) => {
    const value = e.target.value;
    if (value) {
      const numValue = parseCurrency(value);
      if (numValue > 0) {
        e.target.value = numValue.toString();
      }
    }
  });

  input.addEventListener("blur", (e) => {
    const value = e.target.value;
    const numValue = parseCurrency(value);
    if (numValue > 0) {
      const currency = getCurrentCurrency();
      e.target.value = formatCurrency(numValue, currency);
    } else {
      e.target.value = "";
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await openDB();
  
  // Load units
  await loadUnits();
  
  // Load progres
  await loadProgres();
  
  // Setup currency inputs
  setupCurrencyInput("pendapatanKotorModal");
  setupCurrencyInput("pendapatanBersihModal");
  setupCurrencyInput("komisiModal");
  
  // Load all progres
  loadAllProgres();
  
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

  // Event listener untuk open form
  openFormBtn.addEventListener("click", () => {
    currentEditProgresId = null;
    formTitle.textContent = "Tambah Progres";
    progresFormModal.reset();
  
    // 🔓 BUKA SPINNER UNIT UNTUK TAMBAH
    unlockUnitSpinner();

    // 🔓 CHECK-IN & CHECK-OUT BOLEH DIISI SAAT TAMBAH
    unlockCheckInOut();


    formBottomSheet.classList.add("active");
  });
  
  
  // Event listener untuk close form
  closeFormBtn.addEventListener("click", closeFormBottomSheet);
  closeFormBtn2.addEventListener("click", closeFormBottomSheet);
  
  formBottomSheet.addEventListener("click", (e) => {
    if (e.target === formBottomSheet || e.target === closeFormBtn) {
      closeFormBottomSheet();
    }
  });

  // Event listener untuk form modal
  progresFormModal.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleFormSubmit();
  });
});

function closeMenuBottomSheet() {
  menuBottomSheet.classList.remove("active");
}

function closeFormBottomSheet() {
  formBottomSheet.classList.remove("active");
  currentEditProgresId = null;
  progresFormModal.reset();
}

async function loadUnits() {
  allUnits = await getAllPropertiesFromDB();
  
  // Populate unit select modal
  unitSelectModal.innerHTML = '<option value="">-- Pilih Unit --</option>';
  
  allUnits.forEach(unit => {
    const option = document.createElement("option");
    option.value = unit.id;
    option.textContent = unit.name;
    unitSelectModal.appendChild(option);
  });
}

async function loadProgres() {
  allProgres = await getAllProgresFromDB();
}

async function loadAllProgres() {
  progresList.innerHTML = "";
  
  if (allProgres.length === 0) {
    progresList.style.display = "none";
    emptyState.style.display = "block";
    return;
  }
  
  progresList.style.display = "block";
  emptyState.style.display = "none";
  const currency = getCurrentCurrency();
  const now = new Date();
  
  // Pisahkan progres aktif dan booking
  // Aktif: check in sudah lewat atau sekarang, check out belum lewat
  // Booking: check in belum lewat (masa depan)
  const activeProgres = [];
  const bookingProgres = [];
  const bookingByUnitId = new Map(); // Map untuk menyimpan booking per unit
  const unitsWithActiveProgres = new Set(); // Track unit yang punya progres aktif
  
  // Identifikasi semua progres aktif dan booking
  allProgres.forEach(progres => {
    const checkInDate = new Date(progres.checkIn);
    const checkOutDate = new Date(progres.checkOut);
    
    if (checkInDate > now) {
      // Booking (check in di masa depan)
      bookingProgres.push(progres);
      // Simpan booking per unit untuk referensi
      if (!bookingByUnitId.has(progres.unitId)) {
        bookingByUnitId.set(progres.unitId, []);
      }
      bookingByUnitId.get(progres.unitId).push(progres);
    } else if (checkOutDate > now) {
      // Aktif (sedang berjalan)
      activeProgres.push(progres);
      unitsWithActiveProgres.add(progres.unitId);
    }
    // Progres yang sudah selesai (check out sudah lewat) tidak ditampilkan
  });
  
  
  // Render progres aktif terlebih dahulu (dengan countdown)
  activeProgres.forEach(progres => {
    const card = document.createElement("div");
    card.className = "progres-card";
    
    const checkInDate = new Date(progres.checkIn);
    const checkOutDate = new Date(progres.checkOut);
    
    const checkInStr = checkInDate.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    
    const checkOutStr = checkOutDate.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    
    const unit = allUnits.find(u => u.id === progres.unitId);
    const unitName = unit ? unit.name : "Unknown";
    
    // Calculate initial countdown (progres aktif, countdown ke check out)
    const { countdown, progress } = calculateCountdown(progres.checkIn, progres.checkOut, false);
    
    // Normalisasi nilai mata uang - pastikan null/undefined menjadi 0
    const pendapatanKotor = progres.pendapatanKotor != null ? Number(progres.pendapatanKotor) || 0 : 0;
    const pendapatanBersih = progres.pendapatanBersih != null ? Number(progres.pendapatanBersih) || 0 : 0;
    const komisi = progres.komisi != null ? Number(progres.komisi) || 0 : 0;
    
    card.innerHTML = `
      <div class="progres-card-header">
        <h3 class="progres-card-title">${unitName}</h3>
        <div class="progres-card-actions">
          <button class="progres-card-edit" data-id="${progres.id}" aria-label="Edit">
            ✏️
          </button>
          <button class="progres-card-delete" data-id="${progres.id}" aria-label="Hapus">
            🗑️
          </button>
        </div>
      </div>
      <div class="progres-card-body">
        <div class="progres-countdown-container">
          <div class="progres-countdown" id="countdown-${progres.id}">${countdown}</div>
          <div class="progres-progress-bar-container">
            <div class="progres-progress-bar" id="progress-bar-${progres.id}" style="width: ${progress}%"></div>
          </div>
        </div>
        <div class="progres-card-item">
          <span class="progres-card-label">Check In:</span>
          <span class="progres-card-value">📅 ${checkInStr}</span>
        </div>
        <div class="progres-card-item">
          <span class="progres-card-label">Check Out:</span>
          <span class="progres-card-value">🕐 ${checkOutStr}</span>
        </div>
        <div class="progres-card-item">
          <span class="progres-card-label">Pendapatan Kotor:</span>
          <span class="progres-card-value">${formatCurrency(pendapatanKotor, currency)}</span>
        </div>
        <div class="progres-card-item">
          <span class="progres-card-label">Pendapatan Bersih:</span>
          <span class="progres-card-value">${formatCurrency(pendapatanBersih, currency)}</span>
        </div>
        <div class="progres-card-item">
          <span class="progres-card-label">Komisi:</span>
          <span class="progres-card-value">${formatCurrency(komisi, currency)}</span>
        </div>
        ${progres.catatan ? `
        <div class="progres-card-item">
          <span class="progres-card-label">Catatan:</span>
          <span class="progres-card-value">${progres.catatan}</span>
        </div>
        ` : ""}
        ${bookingByUnitId.has(progres.unitId) ? `
        <div class="progres-card-item progres-booking-note">
          ${bookingByUnitId.get(progres.unitId).map(booking => {
            const bookingCheckIn = new Date(booking.checkIn);
            const bookingCheckOut = new Date(booking.checkOut);
            const bookingCheckInStr = bookingCheckIn.toLocaleString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric"
            });
            const bookingCheckOutStr = bookingCheckOut.toLocaleString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric"
            });
            let bookingNoteHtml = `<span class="progres-card-value" style="font-weight: 700; margin-bottom: 0.5rem; display: block;">📋 Booking</span>`;
            bookingNoteHtml += `<span class="progres-card-value" style="display: block; font-size: 0.9rem; margin-top: 0.25rem;">Check In: ${bookingCheckInStr}</span>`;
            bookingNoteHtml += `<span class="progres-card-value" style="display: block; font-size: 0.9rem; margin-top: 0.25rem;">Check Out: ${bookingCheckOutStr}</span>`;
            if (booking.catatan && booking.catatan.trim()) {
              bookingNoteHtml += `<span class="progres-card-value" style="display: block; font-size: 0.85rem; margin-top: 0.5rem; font-style: italic; color: #666;">📝 ${booking.catatan}</span>`;
            }
            return bookingNoteHtml;
          }).join('')}
        </div>
        ` : ""}
      </div>
    `;
    
    // Edit button
    const editBtn = card.querySelector(".progres-card-edit");
    editBtn.addEventListener("click", () => {
      editProgres(progres);
    });
    
    // Delete button
    const deleteBtn = card.querySelector(".progres-card-delete");
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Apakah Anda yakin ingin menghapus data progres ini?")) {
        // Clear interval before deleting
        if (countdownIntervals.has(progres.id)) {
          clearInterval(countdownIntervals.get(progres.id));
          countdownIntervals.delete(progres.id);
        }
        
        const unitIdToUpdate = progres.unitId;
        await deleteProgresFromDB(progres.id);
        await loadProgres();
        
        // Update status unit setelah delete progres
        if (typeof updateUnitStatusByProgres === 'function') {
          await updateUnitStatusByProgres(unitIdToUpdate);
        }
        
        loadAllProgres();
      }
    });
    
    // Setup countdown interval untuk progres aktif (countdown ke check out)
    // Update every second for accuracy
    const intervalId = setInterval(() => {
      updateCountdown(progres.id, progres.checkIn, progres.checkOut, progres.unitId, false);
    }, 1000);
    
    countdownIntervals.set(progres.id, intervalId);
    
    // Initial update
    updateCountdown(progres.id, progres.checkIn, progres.checkOut, progres.unitId, false);
    
    progresList.appendChild(card);
  });
  
  
  // Tampilkan card untuk unit yang hanya memiliki booking (tidak ada progres aktif)
  const unitsYangSudahAdaCard = new Set(activeProgres.map(p => p.unitId));
  const standaloneBookings = bookingProgres.filter(p => !unitsYangSudahAdaCard.has(p.unitId));

  standaloneBookings.forEach(progres => {
    const card = document.createElement("div");
    card.className = "progres-card";
    
    const checkInDate = new Date(progres.checkIn);
    const checkOutDate = new Date(progres.checkOut);
    
    const checkInStr = checkInDate.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    
    const checkOutStr = checkOutDate.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    
    const unit = allUnits.find(u => u.id === progres.unitId);
    const unitName = unit ? unit.name : "Unknown";
    
    // Countdown untuk booking (menuju check in)
    const { countdown, progress } = calculateCountdown(progres.checkIn, progres.checkOut, true);
    
    const pendapatanKotor = progres.pendapatanKotor != null ? Number(progres.pendapatanKotor) || 0 : 0;
    const pendapatanBersih = progres.pendapatanBersih != null ? Number(progres.pendapatanBersih) || 0 : 0;
    const komisi = progres.komisi != null ? Number(progres.komisi) || 0 : 0;
    
    card.innerHTML = `
      <div class="progres-card-header">
        <h3 class="progres-card-title">${unitName}</h3>
        <div class="progres-card-actions">
          <button class="progres-card-edit" data-id="${progres.id}" aria-label="Edit">
            ✏️
          </button>
          <button class="progres-card-delete" data-id="${progres.id}" aria-label="Hapus">
            🗑️
          </button>
        </div>
      </div>
      <div class="progres-card-body">
        <div class="progres-countdown-container">
          <div class="progres-countdown" id="countdown-${progres.id}">${countdown}</div>
          <div class="progres-progress-bar-container">
            <div class="progres-progress-bar" id="progress-bar-${progres.id}" style="width: ${progress}%"></div>
          </div>
        </div>
        <div class="progres-card-item">
          <span class="progres-card-label">Check In:</span>
          <span class="progres-card-value">📅 ${checkInStr}</span>
        </div>
        <div class="progres-card-item">
          <span class="progres-card-label">Check Out:</span>
          <span class="progres-card-value">🕐 ${checkOutStr}</span>
        </div>
        <div class="progres-card-item">
          <span class="progres-card-label">Pendapatan Kotor:</span>
          <span class="progres-card-value">${formatCurrency(pendapatanKotor, currency)}</span>
        </div>
        <div class="progres-card-item">
          <span class="progres-card-label">Pendapatan Bersih:</span>
          <span class="progres-card-value">${formatCurrency(pendapatanBersih, currency)}</span>
        </div>
        <div class="progres-card-item">
          <span class="progres-card-label">Komisi:</span>
          <span class="progres-card-value">${formatCurrency(komisi, currency)}</span>
        </div>
        ${progres.catatan ? `
        <div class="progres-card-item">
          <span class="progres-card-label">Catatan:</span>
          <span class="progres-card-value">${progres.catatan}</span>
        </div>
        ` : ""}
      </div>
    `;

    // Edit button
    const editBtn = card.querySelector(".progres-card-edit");
    editBtn.addEventListener("click", () => {
      editProgres(progres);
    });
    
    // Delete button
    const deleteBtn = card.querySelector(".progres-card-delete");
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Apakah Anda yakin ingin menghapus data booking ini?")) {
        const unitIdToUpdate = progres.unitId;
        await deleteProgresFromDB(progres.id);
        await loadProgres();
        
        if (typeof updateUnitStatusByProgres === 'function') {
          await updateUnitStatusByProgres(unitIdToUpdate);
        }
        
        loadAllProgres();
      }
    });

    // Countdown interval untuk booking (menuju check in)
    const intervalId = setInterval(() => {
      updateCountdown(progres.id, progres.checkIn, progres.checkOut, progres.unitId, true);
    }, 1000);

    countdownIntervals.set(progres.id, intervalId);

    // Initial update
    updateCountdown(progres.id, progres.checkIn, progres.checkOut, progres.unitId, true);

    progresList.appendChild(card);
  });
  
  // Clean up intervals for cards that no longer exist
  const currentProgresIds = new Set(allProgres.map(p => p.id));
  countdownIntervals.forEach((intervalId, progresId) => {
    if (!currentProgresIds.has(progresId)) {
      clearInterval(intervalId);
      countdownIntervals.delete(progresId);
    }
  });
}


function lockUnitSpinner() {
  const unitSelect = document.getElementById("unitSelectModal");
  if (!unitSelect) return;

  unitSelect.disabled = true;
  unitSelect.classList.add("progres-lock");
}

function unlockUnitSpinner() {
  const unitSelect = document.getElementById("unitSelectModal");
  if (!unitSelect) return;

  unitSelect.disabled = false;
  unitSelect.classList.remove("progres-lock");
}











function lockCheckInOut() {
  const checkIn = document.getElementById("checkInModal");
  const checkOut = document.getElementById("checkOutModal");
  if (checkIn) {
    checkIn.disabled = true;
    checkIn.classList.add("progres-lock");
  }
  if (checkOut) {
    checkOut.disabled = true;
    checkOut.classList.add("progres-lock");
  }
}

function unlockCheckInOut() {
  const checkIn = document.getElementById("checkInModal");
  const checkOut = document.getElementById("checkOutModal");
  if (checkIn) {
    checkIn.disabled = false;
    checkIn.classList.remove("progres-lock");
  }
  if (checkOut) {
    checkOut.disabled = false;
    checkOut.classList.remove("progres-lock");
  }
}

function editProgres(progres) {
  currentEditProgresId = progres.id;
  formTitle.textContent = "Edit Progres";

  lockUnitSpinner();

    // 🔒 LOCK CHECK-IN & CHECK-OUT (progres berjalan / selesai)
    if (new Date() >= new Date(progres.checkIn)) {
      lockCheckInOut();
    } else {
      unlockCheckInOut();
    }  
  
  // Set form values
  unitSelectModal.value = progres.unitId;
  
  // Format datetime untuk input
  const checkInDate = new Date(progres.checkIn);
  const checkOutDate = new Date(progres.checkOut);
  
  const checkInStr = checkInDate.toISOString().slice(0, 16);
  const checkOutStr = checkOutDate.toISOString().slice(0, 16);
  
  document.getElementById("checkInModal").value = checkInStr;
  document.getElementById("checkOutModal").value = checkOutStr;
  
  // Set currency values as numbers (will be formatted on blur)
  document.getElementById("pendapatanKotorModal").value = progres.pendapatanKotor.toString();
  document.getElementById("pendapatanBersihModal").value = progres.pendapatanBersih.toString();
  document.getElementById("komisiModal").value = progres.komisi.toString();
  document.getElementById("catatanModal").value = progres.catatan || "";
  
  formBottomSheet.classList.add("active");
  
  // Trigger blur to format currency
  setTimeout(() => {
    document.getElementById("pendapatanKotorModal").dispatchEvent(new Event("blur"));
    document.getElementById("pendapatanBersihModal").dispatchEvent(new Event("blur"));
    document.getElementById("komisiModal").dispatchEvent(new Event("blur"));
  }, 100);
}

async function handleFormSubmit() {
  const unitId = unitSelectModal.value;
  const checkIn = document.getElementById("checkInModal").value;
  const checkOut = document.getElementById("checkOutModal").value;
  
  // Parse currency values - handle empty or formatted values
  // Jika kosong atau tidak valid, langsung set ke 0
  const pendapatanKotorInput = document.getElementById("pendapatanKotorModal").value || "";
  const pendapatanBersihInput = document.getElementById("pendapatanBersihModal").value || "";
  const komisiInput = document.getElementById("komisiModal").value || "";
  
  // Parse dan pastikan selalu angka (0 jika kosong/tidak valid)
  // Gunakan Math.max(0, ...) untuk memastikan minimal 0 dan tidak ada NaN/null/undefined
  let pendapatanKotor = parseCurrency(pendapatanKotorInput);
  let pendapatanBersih = parseCurrency(pendapatanBersihInput);
  let komisi = parseCurrency(komisiInput);
  
  // Pastikan selalu number dan minimal 0
  pendapatanKotor = isNaN(pendapatanKotor) || pendapatanKotor === null || pendapatanKotor === undefined ? 0 : Math.max(0, Number(pendapatanKotor));
  pendapatanBersih = isNaN(pendapatanBersih) || pendapatanBersih === null || pendapatanBersih === undefined ? 0 : Math.max(0, Number(pendapatanBersih));
  komisi = isNaN(komisi) || komisi === null || komisi === undefined ? 0 : Math.max(0, Number(komisi));
  const catatan = document.getElementById("catatanModal").value.trim();
  
  if (!unitId) {
    alert("Pilih unit terlebih dahulu");
    return;
  }
  
  if (!checkIn || !checkOut) {
    alert("Check In dan Check Out wajib diisi");
    return;
  }
  
  // Validasi opsional: jika diisi, harus >= 0 (boleh 0 atau positif)
  if (pendapatanKotor < 0 || pendapatanBersih < 0 || komisi < 0) {
    alert("Nilai pendapatan dan komisi tidak boleh negatif");
    return;
  }

  const progresData = {
    unitId: parseInt(unitId),
    checkIn: new Date(checkIn).toISOString(),
    checkOut: new Date(checkOut).toISOString(),
    pendapatanKotor: pendapatanKotor, // Sudah dipastikan 0 jika kosong
    pendapatanBersih: pendapatanBersih, // Sudah dipastikan 0 jika kosong
    komisi: komisi, // Sudah dipastikan 0 jika kosong
    catatan: catatan || "",
    createdAt: currentEditProgresId ? undefined : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    if (currentEditProgresId) {
      await updateProgresInDB(currentEditProgresId, progresData);
    } else {
      await addProgresToDB(progresData);
    }
    
    await loadProgres();
    
    // Update status unit berdasarkan progres
    if (typeof updateUnitStatusByProgres === 'function') {
      await updateUnitStatusByProgres(parseInt(unitId));
    }
    
    closeFormBottomSheet();
    loadAllProgres();
  } catch (error) {
    console.error("Error saving progres:", error);
    alert("Terjadi kesalahan saat menyimpan data. Silakan coba lagi.");
  }
}