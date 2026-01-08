const DB_NAME = "property_notes_db";
const DB_VERSION = 3;
const STORE_NAME = "properties";
const PROGRES_STORE_NAME = "progres";

let db = null;

/************************
 * PATCH: TIMEZONE SAFE
 ************************/
function parseLocalDateTime(value) {
  if (!value) return null;

  if (value.includes("T") && !value.endsWith("Z")) {
    const [date, time] = value.split("T");
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }

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

/************************
 * PATCH: STATUS LOCK
 ************************/
const unitStatusLocks = new Set();

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

    request.onerror = () => reject("IndexedDB error");
  });
}

/***********************
 * PROPERTY FUNCTIONS
 ***********************/
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
      if (!property) return reject(false);
      Object.assign(property, updates);
      const updateRequest = store.put(property);
      updateRequest.onsuccess = () => resolve(true);
      updateRequest.onerror = () => reject(false);
    };

    request.onerror = () => reject(false);
  });
}

/***********************
 * PROGRES FUNCTIONS
 ***********************/
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

    request.onsuccess = () => {
      // PATCH: SORT BY CHECKIN
      const sorted = request.result.sort((a, b) => {
        return parseLocalDateTime(a.checkIn) - parseLocalDateTime(b.checkIn);
      });
      resolve(sorted);
    };

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
      if (!progresList.length) return resolve(0);

      let done = 0;
      progresList.forEach(p => {
        const del = store.delete(p.id);
        del.onsuccess = () => ++done === progresList.length && resolve(done);
        del.onerror = () => ++done === progresList.length && resolve(done);
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
      if (!progres) return reject(false);
      Object.assign(progres, updates);
      const updateRequest = store.put(progres);
      updateRequest.onsuccess = () => resolve(true);
      updateRequest.onerror = () => reject(false);
    };

    request.onerror = () => reject(false);
  });
}

/*******************************
 * PATCHED STATUS CALCULATOR
 *******************************/
async function updateUnitStatusByProgres(unitId) {
  if (unitStatusLocks.has(unitId)) return;
  unitStatusLocks.add(unitId);

  try {
    const progresList = await getProgresByUnitId(unitId);
    const now = new Date();

    const hasActiveProgres = progresList.some(p => {
      const checkIn = parseLocalDateTime(p.checkIn);
      const checkOut = parseLocalDateTime(p.checkOut);
      return checkIn <= now && checkOut > now;
    });

    const hasBooking = progresList.some(p => {
      const checkIn = parseLocalDateTime(p.checkIn);
      return checkIn > now;
    });

    const units = await getAllPropertiesFromDB();
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    let newStatus = "Kosong";
    if (hasActiveProgres) newStatus = "Penuh";
    else if (hasBooking) newStatus = "Booking";

    if (unit.status !== newStatus) {
      await updatePropertyInDB(unitId, { status: newStatus });
    }
  } catch (e) {
    console.error("Error updating unit status:", e);
  } finally {
    unitStatusLocks.delete(unitId);
  }
}
