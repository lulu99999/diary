/**
 * 数据层：IndexedDB + 设备 ID + 多标签页同步
 * 同一网址下所有窗口共享同一份数据
 */
(function (global) {
  const DB_NAME = 'shiguang_db_v4';
  const DB_VERSION = 1;
  const DEVICE_KEY = 'shiguang_device_id';
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('shiguang_sync') : null;

  let dbPromise = null;

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('entries')) {
          const store = db.createObjectStore('entries', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function withStore(storeName, mode, fn) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(storeName, mode);
      const store = t.objectStore(storeName);
      Promise.resolve(fn(store)).then(resolve).catch(reject);
      t.onerror = () => reject(t.error);
    }));
  }

  function notifyChange() {
    if (channel) channel.postMessage({ type: 'data-changed' });
  }

  /** 从旧版 localStorage 迁移 */
  async function migrateFromLegacy() {
    const migrated = await getMeta('migrated_v4');
    if (migrated) return;

    const legacyKeys = ['shiguang_diaries_v3', 'shiguang_diaries_v2'];
    let legacy = null;
    for (const k of legacyKeys) {
      try {
        const s = localStorage.getItem(k);
        if (s) { legacy = JSON.parse(s); break; }
      } catch (e) {}
    }

    if (legacy && typeof legacy === 'object') {
      const entries = [];
      Object.keys(legacy).forEach((dayKey) => {
        (legacy[dayKey] || []).forEach((e) => {
          entries.push({
            id: e.id || Date.now() + Math.random(),
            date: e.date || dayKey,
            time: e.time || '12:00',
            content: e.content || '',
            mood: e.mood || 'happy',
            image: e.image || null
          });
        });
      });
      for (const e of entries) {
        await putEntry(e);
      }
    }

    const pass = localStorage.getItem('shiguang_pass');
    const skin = localStorage.getItem('shiguang_skin');
    const dark = localStorage.getItem('shiguang_dark');
    const settings = await getSettings();
    if (pass && pass !== '1234') {
      settings.passcode = pass;
      settings.passEnabled = true;
    }
    if (skin) settings.skin = skin;
    if (dark === 'true') settings.dark = true;
    await saveSettings(settings);
    await setMeta('migrated_v4', true);
    notifyChange();
  }

  /** 单图字段 → 多图数组，保留旧记录 */
  async function migrateEntryImages() {
    if (await getMeta('migrated_v5_images')) return;
    const all = await getAllEntries();
    for (const e of all) {
      let changed = false;
      const next = { ...e };
      if (!Array.isArray(next.images)) {
        next.images = next.image ? [next.image] : [];
        changed = true;
      }
      if (next.image !== undefined) {
        delete next.image;
        changed = true;
      }
      if (changed) await putEntry(next);
    }
    await setMeta('migrated_v5_images', true);
    notifyChange();
  }

  async function getAllEntries() {
    return withStore('entries', 'readonly', (store) => new Promise((res, rej) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    }));
  }

  async function putEntry(entry) {
    await withStore('entries', 'readwrite', (store) => new Promise((res, rej) => {
      const r = store.put(entry);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    }));
    notifyChange();
  }

  async function deleteEntryById(id) {
    await withStore('entries', 'readwrite', (store) => new Promise((res, rej) => {
      const r = store.delete(id);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    }));
    notifyChange();
  }

  async function clearAllEntries() {
    await withStore('entries', 'readwrite', (store) => new Promise((res, rej) => {
      const r = store.clear();
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    }));
    notifyChange();
  }

  async function replaceAllEntries(entries) {
    await withStore('entries', 'readwrite', (store) => new Promise((res, rej) => {
      const clr = store.clear();
      clr.onsuccess = () => {
        let i = 0;
        const next = () => {
          if (i >= entries.length) { res(); return; }
          const req = store.put(entries[i++]);
          req.onsuccess = next;
          req.onerror = () => rej(req.error);
        };
        next();
      };
      clr.onerror = () => rej(clr.error);
    }));
    notifyChange();
  }

  async function getMeta(key) {
    return withStore('meta', 'readonly', (store) => new Promise((res) => {
      const r = store.get(key);
      r.onsuccess = () => res(r.result ? r.result.value : null);
      r.onerror = () => res(null);
    }));
  }

  async function setMeta(key, value) {
    await withStore('meta', 'readwrite', (store) => new Promise((res, rej) => {
      const r = store.put({ key, value });
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    }));
  }

  const DEFAULT_SETTINGS = {
    skin: 'creamy',
    dark: false,
    passcode: '',
    passEnabled: false,
    hasEntered: false
  };

  async function getSettings() {
    const raw = await getMeta('settings');
    return { ...DEFAULT_SETTINGS, ...(raw || {}) };
  }

  async function saveSettings(settings) {
    await setMeta('settings', settings);
    notifyChange();
  }

  function onDataChanged(callback) {
    if (channel) {
      channel.onmessage = (e) => {
        if (e.data && e.data.type === 'data-changed') callback();
      };
    }
    window.addEventListener('storage', (e) => {
      if (e.key === DEVICE_KEY) callback();
    });
  }

  global.ShiguangStorage = {
    getDeviceId,
    migrateFromLegacy,
    migrateEntryImages,
    getAllEntries,
    putEntry,
    deleteEntryById,
    clearAllEntries,
    replaceAllEntries,
    getSettings,
    saveSettings,
    onDataChanged
  };
})(window);
