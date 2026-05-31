/**
 * 业务 API 层
 */
(function (global) {
  const S = global.ShiguangStorage;
  const MAX_IMAGES = 9;

  function pad(n) { return String(n).padStart(2, '0'); }

  function parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  }

  function dateKey(year, month, day) {
    return year + '-' + pad(month + 1) + '-' + pad(day);
  }

  /** 24 小时制 HH:mm */
  function formatTime24(date) {
    const d = date instanceof Date ? date : new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /** 展示用：把历史 12 小时制等格式统一为 HH:mm */
  function displayTime24(timeStr) {
    if (timeStr == null || timeStr === '') return '12:00';
    const s = String(timeStr).trim();

    let m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = m[2];
      const pm = m[3].toUpperCase() === 'PM';
      if (h === 12) h = pm ? 12 : 0;
      else if (pm) h += 12;
      return pad(h) + ':' + min;
    }

    if (/下午|晚上/.test(s)) {
      m = s.match(/(\d{1,2}):(\d{2})/);
      if (m) {
        let h = parseInt(m[1], 10);
        const min = m[2];
        if (h < 12) h += 12;
        return pad(h) + ':' + min;
      }
    }
    if (/中午/.test(s)) {
      m = s.match(/(\d{1,2}):(\d{2})/);
      if (m) return '12:' + m[2];
    }
    if (/上午|凌晨|早上|清晨/.test(s)) {
      m = s.match(/(\d{1,2}):(\d{2})/);
      if (m) {
        let h = parseInt(m[1], 10);
        const min = m[2];
        if (h === 12) h = 0;
        return pad(h) + ':' + min;
      }
    }

    m = s.match(/^(\d{1,2}):(\d{2})/);
    if (m) {
      const h = parseInt(m[1], 10);
      const min = m[2];
      if (h >= 0 && h <= 23) return pad(h) + ':' + min;
    }

    return s;
  }

  /** 统一条目格式，兼容旧版单图 */
  function normalizeEntry(e) {
    const entry = { ...e };
    if (!Array.isArray(entry.images)) {
      entry.images = entry.image ? [entry.image] : [];
    }
    if (entry.image !== undefined) delete entry.image;
    return entry;
  }

  function getImages(entry) {
    const e = normalizeEntry(entry);
    return e.images || [];
  }

  function filterByMonth(entries, year, month) {
    return entries.filter((e) => {
      const p = parseDate(e.date);
      return p.year === year && p.month === month;
    });
  }

  function filterByYear(entries, year) {
    return entries.filter((e) => parseDate(e.date).year === year);
  }

  function groupByDay(entries) {
    const map = {};
    entries.forEach((e) => {
      const day = parseDate(e.date).day;
      if (!map[day]) map[day] = [];
      map[day].push(e);
    });
    return map;
  }

  function validateContent(text) {
    const v = (text || '').trim();
    if (!v) return { ok: false, msg: '请写点内容再保存' };
    if (v.length > 5000) return { ok: false, msg: '内容不能超过5000字' };
    return { ok: true, value: v };
  }

  function validateOneImage(data) {
    if (!data) return { ok: true };
    if (data.startsWith('data:image/')) {
      if (data.length > 2_500_000) return { ok: false, msg: '单张图片太大，请换一张较小的' };
      return { ok: true, value: data };
    }
    const u = data.trim();
    try {
      const p = new URL(u);
      if (!['http:', 'https:'].includes(p.protocol)) {
        return { ok: false, msg: '图片链接需以 http 或 https 开头' };
      }
    } catch {
      return { ok: false, msg: '图片链接格式不正确' };
    }
    return { ok: true, value: u };
  }

  function validateImages(images) {
    if (!images || !images.length) return { ok: true, value: [] };
    if (images.length > MAX_IMAGES) {
      return { ok: false, msg: '最多添加 ' + MAX_IMAGES + ' 张照片' };
    }
    const out = [];
    for (const img of images) {
      const r = validateOneImage(img);
      if (!r.ok) return r;
      if (r.value) out.push(r.value);
    }
    return { ok: true, value: out };
  }

  function compressImage(file, maxW) {
    maxW = maxW || 900;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxW) { h = (h * maxW) / w; w = maxW; }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('读取失败'));
      reader.readAsDataURL(file);
    });
  }

  async function loadEntries() {
    const raw = await S.getAllEntries();
    return raw.map(normalizeEntry);
  }

  async function init() {
    await S.migrateFromLegacy();
    await S.migrateEntryImages();
    return {
      deviceId: S.getDeviceId(),
      settings: await S.getSettings(),
      entries: await loadEntries()
    };
  }

  async function reload() {
    return {
      settings: await S.getSettings(),
      entries: await loadEntries()
    };
  }

  async function saveEntry(entry) {
    await S.putEntry(normalizeEntry(entry));
  }

  async function removeEntry(id) {
    await S.deleteEntryById(id);
  }

  async function updateSettings(partial) {
    const cur = await S.getSettings();
    await S.saveSettings({ ...cur, ...partial });
  }

  function normalizeImportEntry(e) {
    const entry = normalizeEntry({
      id: e.id || Date.now() + Math.random(),
      date: e.date || '2000-01-01',
      time: e.time || '12:00',
      content: e.content || '',
      mood: e.mood || 'happy',
      images: e.images,
      image: e.image
    });
    return entry;
  }

  async function importBackup(data, mode) {
    const cur = await loadEntries();
    let entries = data.entries || data.diaries;

    if (Array.isArray(entries)) {
      entries = entries.map(normalizeImportEntry);
    } else if (entries && typeof entries === 'object') {
      const arr = [];
      Object.keys(entries).forEach((k) => {
        (entries[k] || []).forEach((e) => arr.push(normalizeImportEntry({ ...e, date: e.date || k })));
      });
      entries = arr;
    } else {
      entries = [];
    }

    if (mode === 'merge') {
      const ids = new Set(cur.map((e) => e.id));
      entries.forEach((e) => { if (!ids.has(e.id)) cur.push(e); });
      await S.replaceAllEntries(cur.map(normalizeEntry));
    } else {
      await S.replaceAllEntries(entries.map(normalizeEntry));
    }

    if (data.pass || data.passcode) {
      await updateSettings({ passcode: data.pass || data.passcode, passEnabled: true });
    }
    if (data.skin) await updateSettings({ skin: data.skin });
    if (data.dark !== undefined) await updateSettings({ dark: !!data.dark });
  }

  async function exportBackup() {
    const settings = await S.getSettings();
    const entries = await loadEntries();
    return {
      version: 5,
      deviceId: S.getDeviceId(),
      exportedAt: new Date().toISOString(),
      entries,
      skin: settings.skin,
      dark: settings.dark,
      passEnabled: settings.passEnabled
    };
  }

  async function clearAll() {
    await S.clearAllEntries();
  }

  global.ShiguangAPI = {
    MAX_IMAGES,
    pad,
    parseDate,
    dateKey,
    formatTime24,
    displayTime24,
    normalizeEntry,
    getImages,
    filterByMonth,
    filterByYear,
    groupByDay,
    validateContent,
    validateImages,
    validateOneImage,
    compressImage,
    init,
    reload,
    saveEntry,
    removeEntry,
    updateSettings,
    importBackup,
    exportBackup,
    clearAll,
    daysInMonth: (y, m) => new Date(y, m + 1, 0).getDate(),
    firstWeekday: (y, m) => new Date(y, m, 1).getDay()
  };
})(window);
