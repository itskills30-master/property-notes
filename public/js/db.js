const DB_NAME = "property_notes_db";
// Bump versi untuk memicu onupgradeneeded dan memastikan object store baru dibuat
const DB_VERSION = 3;
const STORE_NAME = "properties";
const PROGRES_STORE_NAME = "progres";

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      db = e.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true
        });

        store.createIndex("name", "name", { unique: false });
        store.createIndex("type", "type", { unique: false });
      }

      if (!db.objectStoreNames.contains(PROGRES_STORE_NAME)) {
        const progresStore = db.createObjectStore(PROGRES_STORE_NAME, {
          keyPath: "id",
          autoIncrement: true
        });

        progresStore.createIndex("unitId", "unitId", { unique: false });
        progresStore.createIndex("checkIn", "checkIn", { unique: false });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => {
      reject("IndexedDB error");
    };
  });
}

function addPropertyToDB(property) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(property);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(false);
  });
}

function getAllPropertiesFromDB() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject([]);
  });
}

function deletePropertyFromDB(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(false);
  });
}

function updatePropertyInDB(id, updates) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const property = request.result;
      if (property) {
        Object.assign(property, updates);
        const updateRequest = store.put(property);
        updateRequest.onsuccess = () => resolve(true);
        updateRequest.onerror = () => reject(false);
      } else {
        reject(false);
      }
    };

    request.onerror = () => reject(false);
  });
}

// PROGRES FUNCTIONS
function addProgresToDB(progres) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROGRES_STORE_NAME, "readwrite");
    const store = tx.objectStore(PROGRES_STORE_NAME);
    const request = store.add(progres);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(false);
  });
}

function getAllProgresFromDB() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROGRES_STORE_NAME, "readonly");
    const store = tx.objectStore(PROGRES_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject([]);
  });
}

function getProgresByUnitId(unitId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROGRES_STORE_NAME, "readonly");
    const store = tx.objectStore(PROGRES_STORE_NAME);
    const index = store.index("unitId");
    const request = index.getAll(unitId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject([]);
  });
}

function deleteProgresFromDB(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROGRES_STORE_NAME, "readwrite");
    const store = tx.objectStore(PROGRES_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(false);
  });
}

function deleteAllProgresByUnitId(unitId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROGRES_STORE_NAME, "readwrite");
    const store = tx.objectStore(PROGRES_STORE_NAME);
    const index = store.index("unitId");
    const request = index.getAll(unitId);

    request.onsuccess = () => {
      const progresList = request.result;
      if (progresList.length === 0) {
        resolve(0);
        return;
      }

      let deletedCount = 0;
      let errorCount = 0;
      const total = progresList.length;

      progresList.forEach(progres => {
        const deleteRequest = store.delete(progres.id);
        deleteRequest.onsuccess = () => {
          deletedCount++;
          if (deletedCount + errorCount === total) {
            resolve(deletedCount);
          }
        };
        deleteRequest.onerror = () => {
          errorCount++;
          if (deletedCount + errorCount === total) {
            resolve(deletedCount);
          }
        };
      });
    };

    request.onerror = () => reject(0);
  });
}

function updateProgresInDB(id, updates) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROGRES_STORE_NAME, "readwrite");
    const store = tx.objectStore(PROGRES_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const progres = request.result;
      if (progres) {
        Object.assign(progres, updates);
        const updateRequest = store.put(progres);
        updateRequest.onsuccess = () => resolve(true);
        updateRequest.onerror = () => reject(false);
      } else {
        reject(false);
      }
    };

    request.onerror = () => reject(false);
  });
}

// Update status unit berdasarkan progres
// Logika: 
// - Jika ada progres aktif (check out belum lewat) → "Penuh" (prioritas tertinggi)
// - Jika tidak ada progres aktif tapi ada booking (check in di masa depan) → "Booking"
// - Jika tidak ada keduanya → "Kosong"
async function updateUnitStatusByProgres(unitId) {
  try {
    const progresList = await getProgresByUnitId(unitId);
    const now = new Date();
    
    // Cek progres aktif: check in sudah lewat dan check out belum lewat
    const hasActiveProgres = progresList.some(progres => {
      const checkInDate = new Date(progres.checkIn);
      const checkOutDate = new Date(progres.checkOut);
      return checkInDate <= now && checkOutDate > now;
    });
    
    // Cek booking: check in di masa depan
    const hasBooking = progresList.some(progres => {
      const checkInDate = new Date(progres.checkIn);
      return checkInDate > now;
    });
    
    // Dapatkan unit dari database
    const allUnits = await getAllPropertiesFromDB();
    const unit = allUnits.find(u => u.id === unitId);
    
    if (!unit) return;
    
    // Tentukan status baru berdasarkan logika
    let newStatus;
    if (hasActiveProgres) {
      // Prioritas 1: Ada progres aktif → "Penuh"
      newStatus = "Penuh";
    } else if (hasBooking) {
      // Prioritas 2: Ada booking → "Booking"
      newStatus = "Booking";
    } else {
      // Prioritas 3: Tidak ada keduanya → "Kosong"
      newStatus = "Kosong";
    }
    
    // Hanya update jika status berbeda
    if (unit.status !== newStatus) {
      await updatePropertyInDB(unitId, { status: newStatus });
    }
  } catch (error) {
    console.error("Error updating unit status:", error);
  }
}