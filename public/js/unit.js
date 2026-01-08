const listEl = document.getElementById("propertyList");
const nameInput = document.getElementById("name");
const typeSelect = document.getElementById("type");
const noteInput = document.getElementById("note");
const form = document.getElementById("propertyForm");
const emptyState = document.getElementById("emptyState");
const propertyCount = document.getElementById("propertyCount");
const propertyTypeFilter = document.getElementById("propertyTypeFilter");
const openFormBtn = document.getElementById("openFormBtn");
const openMenuBtn = document.getElementById("openMenuBtn");
const formBottomSheet = document.getElementById("formBottomSheet");
const menuBottomSheet = document.getElementById("menuBottomSheet");
const closeFormBtn = document.getElementById("closeFormBtn");
const closeFormBtn2 = document.getElementById("closeFormBtn2");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const closeMenuBtn2 = document.getElementById("closeMenuBtn2");
const editNoteBottomSheet = document.getElementById("editNoteBottomSheet");
const editNoteInput = document.getElementById("editNote");
const editNoteForm = document.getElementById("editNoteForm");
const closeEditNoteBtn = document.getElementById("closeEditNoteBtn");
const closeEditNoteBtn2 = document.getElementById("closeEditNoteBtn2");

let allProperties = [];
let currentEditPropertyId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await openDB();
  loadProperties();
  
  // Event listener untuk filter
  propertyTypeFilter.addEventListener("change", () => {
    loadProperties();
  });
  
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

  // Event listener untuk open bottom sheet
  openFormBtn.addEventListener("click", () => {
    formBottomSheet.classList.add("active");
    // Focus ke input name setelah animasi
    setTimeout(() => {
      nameInput.focus();
    }, 300);
  });
  
  // Event listener untuk close bottom sheet
  closeFormBtn.addEventListener("click", closeBottomSheet);
  closeFormBtn2.addEventListener("click", closeBottomSheet);
  
  // Close saat klik backdrop
  formBottomSheet.addEventListener("click", (e) => {
    if (e.target === formBottomSheet || e.target === closeFormBtn) {
      closeBottomSheet();
    }
  });

  // Event listener untuk edit note bottom sheet
  closeEditNoteBtn.addEventListener("click", closeEditNoteBottomSheet);
  closeEditNoteBtn2.addEventListener("click", closeEditNoteBottomSheet);
  
  editNoteBottomSheet.addEventListener("click", (e) => {
    if (e.target === editNoteBottomSheet || e.target === closeEditNoteBtn) {
      closeEditNoteBottomSheet();
    }
  });

  // Event listener untuk form edit note
  editNoteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (currentEditPropertyId === null) return;

    const note = editNoteInput.value.trim();
    
    await updatePropertyInDB(currentEditPropertyId, { note });
    
    closeEditNoteBottomSheet();
    loadProperties();
  });
});

function closeEditNoteBottomSheet() {
  editNoteBottomSheet.classList.remove("active");
  currentEditPropertyId = null;
  editNoteInput.value = "";
}

function closeMenuBottomSheet() {
  menuBottomSheet.classList.remove("active");
}

function closeBottomSheet() {
  formBottomSheet.classList.remove("active");
  form.reset();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const type = typeSelect.value;
  const note = noteInput.value.trim();

  if (!name) {
    alert("Nama properti wajib diisi");
    return;
  }

  const property = {
    name,
    type,
    note: note || "",
    status: "Kosong",
    createdAt: new Date()
  };

  await addPropertyToDB(property);

  form.reset();
  closeBottomSheet();
  loadProperties();
});

// Update status semua unit berdasarkan progres
// Menggunakan fungsi updateUnitStatusByProgres dari db.js
async function updateAllUnitsStatusByProgres() {
  try {
    const allUnits = await getAllPropertiesFromDB();
    
    // Update status setiap unit
    for (const unit of allUnits) {
      // Skip jika status adalah "Booking" (akan di-handle di updateUnitStatusByProgres)
      if (unit.status === "Booking") {
        continue;
      }
      
      // Update status unit berdasarkan progres
      if (typeof updateUnitStatusByProgres === 'function') {
        await updateUnitStatusByProgres(unit.id);
      }
    }
  } catch (error) {
    console.error("Error updating all units status:", error);
  }
}

async function loadProperties() {
  // Update status semua unit berdasarkan progres sebelum load
  await updateAllUnitsStatusByProgres();
  
  allProperties = await getAllPropertiesFromDB();

  // Filter berdasarkan jenis properti
  const selectedType = propertyTypeFilter.value;
  let filteredProperties = allProperties;
  
  if (selectedType) {
    filteredProperties = allProperties.filter(p => p.type === selectedType);
  }

  // update jumlah
  propertyCount.textContent = `${filteredProperties.length} properti`;

  listEl.innerHTML = "";

  if (filteredProperties.length === 0) {
    listEl.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  listEl.style.display = "grid";
  emptyState.style.display = "none";

  filteredProperties.forEach((p) => {
    const card = document.createElement("div");
    card.className = "unit-property-card";

    // Tentukan class CSS berdasarkan status
    let statusClass = "unit-status-kosong"; // default
    if (p.status === "Penuh") {
      statusClass = "unit-status-penuh"; // Warna merah untuk status Penuh
    } else if (p.status === "Kosong") {
      statusClass = "unit-status-kosong";
    } else if (p.status === "Booking") {
      statusClass = "unit-status-kosong"; // Booking menggunakan style kosong untuk sementara
    }

    const noteHtml = p.note ? `
      <div class="unit-property-note">
        <span class="unit-property-note-icon">📝</span>
        <span class="unit-property-note-text">${p.note}</span>
      </div>
    ` : "";

    card.innerHTML = `
      <h3 class="unit-property-name">${p.name}</h3>
      <div class="unit-property-meta">
        <span class="unit-type-pill">${p.type}</span>
        <span class="unit-status-pill ${statusClass}">
          <span class="unit-status-dot"></span>
          ${p.status}
        </span>
      </div>
      ${noteHtml}
      <div class="unit-property-actions">
        <button class="unit-property-edit" data-id="${p.id}" aria-label="Edit catatan">
          ✏️
        </button>
        <button class="unit-property-delete" data-id="${p.id}" aria-label="Hapus properti">
          🗑️
        </button>
      </div>
    `;

    // Event listener untuk edit button
    const editBtn = card.querySelector(".unit-property-edit");
    editBtn.addEventListener("click", () => {
      currentEditPropertyId = p.id;
      editNoteInput.value = p.note || "";
      editNoteBottomSheet.classList.add("active");
      setTimeout(() => {
        editNoteInput.focus();
      }, 300);
    });

    // Event listener untuk delete button
    const deleteBtn = card.querySelector(".unit-property-delete");
    deleteBtn.addEventListener("click", async () => {
      // Cek apakah unit memiliki data progres
      const progresList = await getProgresByUnitId(p.id);
      const hasProgres = progresList && progresList.length > 0;
      
      let confirmMessage = `Apakah Anda yakin ingin menghapus properti "${p.name}"?`;
      if (hasProgres) {
        confirmMessage = `⚠️ PERINGATAN!\n\nProperti "${p.name}" memiliki ${progresList.length} data progres yang sedang berjalan.\n\nJika Anda menghapus properti ini, semua data progres terkait juga akan ikut terhapus.\n\nApakah Anda yakin ingin melanjutkan?`;
      }
      
      if (confirm(confirmMessage)) {
        // Hapus semua progres terkait jika ada
        if (hasProgres) {
          const deletedCount = await deleteAllProgresByUnitId(p.id);
          if (deletedCount > 0) {
            alert(`✅ Properti "${p.name}" dan ${deletedCount} data progres terkait telah dihapus.`);
          }
        }
        
        // Hapus properti
        await deletePropertyFromDB(p.id);
        loadProperties();
      }
    });

    listEl.appendChild(card);
  });
}