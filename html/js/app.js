/**
 * 应用主逻辑
 */
(function () {
  const API = window.ShiguangAPI;
  const UI = window.ShiguangUI;
  const Storage = window.ShiguangStorage;

  const SESSION_KEY = 'shiguang_session_ok';

  const now = new Date();
  let state = {
    entries: [],
    settings: {},
    view: 'calendar',
    lastDiaryView: 'calendar',
    year: now.getFullYear(),
    month: now.getMonth(),
    activeDay: now.getDate(),
    draftContent: '',
    mood: 'happy',
    images: [],
    editingId: null,
    passInput: ''
  };

  const $ = (id) => document.getElementById(id);
  const I = () => window.ShiguangIcons;

  let viewerImages = [];
  let viewerIndex = 0;

  function toast(msg, err) {
    const el = $('toast');
    el.textContent = msg;
    el.className = 'toast ' + (err ? 'err' : 'ok');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add('hidden'), 2500);
  }

  function applyTheme() {
    const s = state.settings;
    document.documentElement.setAttribute('data-skin', s.skin || 'creamy');
    document.documentElement.setAttribute('data-dark', s.dark ? 'true' : 'false');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#FDFCF8';
    const icons = I();
    if (icons) icons.set($('btn-dark'), s.dark ? 'sun' : 'moon', 20);
    document.querySelectorAll('.skin-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.skin === s.skin);
    });
    syncPassPanel();
  }

  function monthEntries() {
    return API.filterByMonth(state.entries, state.year, state.month);
  }

  function findEntry(id) {
    return state.entries.find((e) => e.id === id);
  }

  async function refreshData() {
    const data = await API.reload();
    state.entries = data.entries;
    state.settings = data.settings;
  }

  function showScreen(name) {
    ['splash', 'enter-gate', 'lock-screen', 'app'].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.classList.toggle('hidden', id !== name);
    });
    if (name === 'app') render();
  }

  function isSessionUnlocked() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function setSessionUnlocked() {
    sessionStorage.setItem(SESSION_KEY, '1');
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function isPassLockActive() {
    const s = state.settings;
    return !!(s.passEnabled && /^\d{4}$/.test(String(s.passcode || '')));
  }

  async function sanitizePassSettings() {
    if (!state.settings.passEnabled) return;
    if (/^\d{4}$/.test(String(state.settings.passcode || ''))) return;
    state.settings.passEnabled = false;
    await API.updateSettings({ passEnabled: false });
  }

  /** 启动流程：启动页 → 进入页（可选密码）→ 主应用 */
  function afterSplash() {
    $('splash').classList.add('hidden');
    applyTheme();
    showEnterGate();
  }

  function showEnterGate() {
    showScreen('enter-gate');
  }

  function showLockScreen() {
    if (!isPassLockActive()) {
      enterApp();
      return;
    }
    showScreen('lock-screen');
    state.passInput = '';
    buildKeypad();
    updatePassDots();
  }

  function enterApp() {
    if (isPassLockActive() && !isSessionUnlocked()) {
      showLockScreen();
      return;
    }
    setSessionUnlocked();
    if (!state.settings.hasEntered) {
      API.updateSettings({ hasEntered: true }).then(() => { state.settings.hasEntered = true; });
    }
    showScreen('app');
  }

  function buildKeypad() {
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'X'];
    $('keypad').innerHTML = keys.map((v) => {
      if (v === null) return '<div></div>';
      const del = I() ? I().svg('x', 18) : '×';
      return '<button type="button" class="key-btn" data-key="' + v + '">' + (v === 'X' ? del : v) + '</button>';
    }).join('');
    $('keypad').querySelectorAll('.key-btn').forEach((btn) => {
      btn.onclick = () => {
        const k = btn.dataset.key;
        if (k === 'X') { state.passInput = ''; updatePassDots(); return; }
        if (state.passInput.length >= 4) return;
        state.passInput += k;
        updatePassDots();
        if (state.passInput.length === 4) {
          if (state.passInput === state.settings.passcode) {
            setSessionUnlocked();
            state.passInput = '';
            toast('解锁成功');
            enterApp();
          } else {
            toast('密码错误', true);
            setTimeout(() => { state.passInput = ''; updatePassDots(); }, 400);
          }
        }
      };
    });
  }

  function updatePassDots() {
    document.querySelectorAll('.pass-dot').forEach((dot, i) => {
      dot.classList.toggle('filled', i < state.passInput.length);
    });
  }

  function render() {
    applyTheme();
    const main = $('main-content');
    const bottom = $('bottom-nav');
    const showBottom = ['calendar', 'list', 'mood_stats'].includes(state.view);
    bottom.classList.toggle('hidden', !showBottom);
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      if (btn.dataset.nav === 'diary') {
        btn.classList.toggle('active', state.view === 'calendar' || state.view === 'list');
      } else {
        btn.classList.toggle('active', btn.dataset.view === state.view);
      }
    });

    const month = monthEntries();

    if (state.view === 'calendar') {
      main.innerHTML = UI.renderDateNav(state) + UI.renderCalendar(state, month, API);
    } else if (state.view === 'list') {
      main.innerHTML = UI.renderDateNav(state) + UI.renderList(month, API);
    } else if (state.view === 'write') {
      main.innerHTML = UI.renderWrite(state, API);
      bindWrite();
    } else if (state.view === 'mood_stats') {
      main.innerHTML = UI.renderStats(month, state);
    }
    bindMainEvents();
  }

  function bindMainEvents() {
    const main = $('main-content');

    main.querySelectorAll('[data-action]').forEach((el) => {
      el.onclick = () => handleAction(el.dataset.action);
    });
    main.querySelectorAll('[data-view]').forEach((el) => {
      el.onclick = () => setView(el.dataset.view);
    });
    main.querySelectorAll('.cal-day').forEach((el) => {
      el.onclick = () => { state.activeDay = parseInt(el.dataset.day, 10); render(); };
    });
    main.querySelectorAll('.entry-mini').forEach((el) => {
      el.onclick = () => openEdit(parseInt(el.dataset.id, 10));
    });
    main.querySelectorAll('[data-edit]').forEach((el) => {
      el.onclick = (ev) => { ev.stopPropagation(); openEdit(parseInt(el.dataset.edit, 10)); };
    });
    main.querySelectorAll('[data-delete]').forEach((el) => {
      el.onclick = (ev) => { ev.stopPropagation(); removeEntry(parseInt(el.dataset.delete, 10)); };
    });
    main.querySelectorAll('[data-remove-img]').forEach((el) => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        const i = parseInt(el.dataset.removeImg, 10);
        state.images.splice(i, 1);
        render();
        if (state.view === 'write') bindWrite();
      };
    });
    bindViewableImages(main);
  }

  function openImageViewer(images, startIndex) {
    viewerImages = (images || []).filter(Boolean);
    if (!viewerImages.length) return;
    viewerIndex = Math.max(0, Math.min(startIndex || 0, viewerImages.length - 1));
    updateImageViewer();
    $('image-viewer').classList.remove('hidden');
  }

  function closeImageViewer() {
    const el = $('image-viewer');
    if (!el) return;
    el.classList.add('hidden');
    const img = $('image-viewer-img');
    if (img) img.removeAttribute('src');
  }

  function updateImageViewer() {
    const img = $('image-viewer-img');
    const counter = $('image-viewer-counter');
    const prev = $('image-viewer-prev');
    const next = $('image-viewer-next');
    if (!img || !viewerImages.length) return;
    img.src = viewerImages[viewerIndex];
    const multi = viewerImages.length > 1;
    if (counter) {
      counter.textContent = multi ? (viewerIndex + 1) + ' / ' + viewerImages.length : '';
      counter.classList.toggle('hidden', !multi);
    }
    if (prev) prev.classList.toggle('hidden', !multi);
    if (next) next.classList.toggle('hidden', !multi);
  }

  function viewerStep(delta) {
    if (viewerImages.length < 2) return;
    viewerIndex = (viewerIndex + delta + viewerImages.length) % viewerImages.length;
    updateImageViewer();
  }

  function bindViewableImages(root) {
    if (!root) return;
    root.querySelectorAll('.entry-img-gallery .entry-img-thumb').forEach((thumb) => {
      thumb.onclick = (ev) => {
        ev.stopPropagation();
        const gallery = thumb.closest('.entry-img-gallery');
        const list = [...gallery.querySelectorAll('.entry-img-thumb img')].map((i) => i.src);
        const idx = [...gallery.querySelectorAll('.entry-img-thumb')].indexOf(thumb);
        openImageViewer(list, idx);
      };
    });
    root.querySelectorAll('.entry-card > img.cover').forEach((img) => {
      img.onclick = (ev) => {
        ev.stopPropagation();
        openImageViewer([img.src], 0);
      };
    });
    root.querySelectorAll('.entry-mini-thumbs img').forEach((img) => {
      img.onclick = (ev) => {
        ev.stopPropagation();
        const wrap = img.closest('.entry-mini-thumbs');
        const list = [...wrap.querySelectorAll('img')].map((i) => i.src);
        openImageViewer(list, [...wrap.querySelectorAll('img')].indexOf(img));
      };
    });
    root.querySelectorAll('.photo-thumb img').forEach((img) => {
      img.onclick = (ev) => {
        ev.stopPropagation();
        const list = [...root.querySelectorAll('.photo-thumb img')].map((i) => i.src);
        openImageViewer(list, list.indexOf(img.src));
      };
    });
  }

  function bindImageViewer() {
    if (bindImageViewer._done) return;
    bindImageViewer._done = true;
    const viewer = $('image-viewer');
    if (!viewer) return;
    viewer.querySelectorAll('[data-action="close-image-viewer"]').forEach((el) => {
      el.onclick = closeImageViewer;
    });
    $('image-viewer-prev').onclick = (ev) => { ev.stopPropagation(); viewerStep(-1); };
    $('image-viewer-next').onclick = (ev) => { ev.stopPropagation(); viewerStep(1); };
    document.addEventListener('keydown', (e) => {
      if (viewer.classList.contains('hidden')) return;
      if (e.key === 'Escape') closeImageViewer();
      if (e.key === 'ArrowLeft') viewerStep(-1);
      if (e.key === 'ArrowRight') viewerStep(1);
    });
  }

  function handleAction(action) {
    switch (action) {
      case 'month-prev': changeMonth(-1); break;
      case 'month-next': changeMonth(1); break;
      case 'open-year-picker': openYearPicker(); break;
      case 'close-year-picker': closeYearPicker(); break;
      case 'open-photo-sheet': openPhotoSheet(); break;
      case 'close-photo-sheet': closePhotoSheet(); break;
      case 'cancel-write': setView('calendar'); break;
      case 'save-diary': saveDiary(); break;
      case 'pick-camera': closePhotoSheet(); openCameraPicker(); break;
      case 'pick-album': closePhotoSheet(); openAlbumPicker(); break;
      case 'pick-url': closePhotoSheet(); pickImageUrl(); break;
    }
  }

  function openYearPicker() {
    const root = $('year-picker-root');
    root.innerHTML = UI.renderYearPicker(state.year);
    root.classList.remove('hidden');
    root.querySelector('#year-picker-mask').onclick = (e) => {
      if (e.target.id === 'year-picker-mask') closeYearPicker();
    };
    root.querySelectorAll('[data-year]').forEach((btn) => {
      btn.onclick = () => {
        state.year = parseInt(btn.dataset.year, 10);
        clampActiveDay();
        closeYearPicker();
        render();
      };
    });
    root.querySelector('[data-action="close-year-picker"]').onclick = closeYearPicker;
  }

  function closeYearPicker() {
    const root = $('year-picker-root');
    root.innerHTML = '';
    root.classList.add('hidden');
  }

  function openPhotoSheet() {
    $('photo-sheet').classList.remove('hidden');
    $('photo-sheet').onclick = (e) => {
      if (e.target.id === 'photo-sheet') closePhotoSheet();
    };
    $('photo-sheet-panel').onclick = (e) => e.stopPropagation();
    $('photo-sheet').querySelectorAll('[data-action]').forEach((el) => {
      el.onclick = () => handleAction(el.dataset.action);
    });
  }

  function closePhotoSheet() {
    $('photo-sheet').classList.add('hidden');
  }

  function changeMonth(d) {
    let m = state.month + d;
    let y = state.year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    state.month = m;
    state.year = y;
    clampActiveDay();
    render();
  }

  function clampActiveDay() {
    const max = API.daysInMonth(state.year, state.month);
    if (state.activeDay > max) state.activeDay = max;
  }

  function setView(v) {
    if (v === 'calendar' || v === 'list') state.lastDiaryView = v;
    state.view = v;
    render();
  }

  function startWrite() {
    state.draftContent = '';
    state.mood = 'happy';
    state.images = [];
    state.editingId = null;
    setView('write');
  }

  function openEdit(id) {
    const e = findEntry(id);
    if (!e) return;
    const p = API.parseDate(e.date);
    state.year = p.year;
    state.month = p.month;
    state.activeDay = p.day;
    state.editingId = id;
    state.draftContent = e.content;
    state.mood = e.mood || 'happy';
    state.images = API.getImages(e).slice();
    setView('write');
  }

  async function saveDiary() {
    const cv = API.validateContent(state.draftContent);
    if (!cv.ok) { toast(cv.msg, true); return; }
    const iv = API.validateImages(state.images);
    if (!iv.ok) { toast(iv.msg, true); return; }

    const dateStr = API.dateKey(state.year, state.month, state.activeDay);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (state.editingId) {
      const old = findEntry(state.editingId);
      await API.saveEntry({
        id: state.editingId,
        date: dateStr,
        time: old ? old.time : timeStr,
        content: cv.value,
        mood: state.mood,
        images: iv.value
      });
      toast('已更新');
    } else {
      await API.saveEntry({
        id: Date.now(),
        date: dateStr,
        time: timeStr,
        content: cv.value,
        mood: state.mood,
        images: iv.value
      });
      toast('保存成功');
    }
    await refreshData();
    setView('list');
  }

  async function removeEntry(id) {
    if (!confirm('确定删除这条日记吗？')) return;
    await API.removeEntry(id);
    await refreshData();
    toast('已删除');
    render();
  }

  function bindWrite() {
    document.querySelectorAll('.mood-btn').forEach((btn) => {
      btn.onclick = () => {
        state.mood = btn.dataset.mood;
        document.querySelectorAll('.mood-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.mood === state.mood);
        });
      };
    });
    const ta = $('content-input');
    const counter = $('char-count');
    const upd = () => {
      state.draftContent = ta.value;
      counter.textContent = ta.value.length;
    };
    ta.oninput = upd;
    upd();
    bindViewableImages(document);
  }

  function openAlbumPicker() {
    const input = $('file-album');
    if (!input) return;
    input.multiple = true;
    input.accept = 'image/*';
    input.value = '';
    input.click();
  }

  function openCameraPicker() {
    const input = $('file-camera');
    if (!input) return;
    input.value = '';
    input.click();
  }

  async function addImagesFromFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type && f.type.startsWith('image/'));
    if (!files.length) return;
    const left = API.MAX_IMAGES - state.images.length;
    if (left <= 0) {
      toast('最多 ' + API.MAX_IMAGES + ' 张照片', true);
      return;
    }
    const toAdd = files.slice(0, left);
    const skipped = files.length - toAdd.length;
    try {
      const compressed = await Promise.all(toAdd.map((f) => API.compressImage(f)));
      state.images.push(...compressed);
      render();
      if (state.view === 'write') bindWrite();
      let msg = '已添加 ' + toAdd.length + ' 张照片';
      if (skipped > 0) msg += '（已达上限，另有 ' + skipped + ' 张未加入）';
      toast(msg);
    } catch {
      toast('照片处理失败', true);
    }
  }

  function bindPhotoInputs() {
    if (bindPhotoInputs._done) return;
    bindPhotoInputs._done = true;
    const camera = $('file-camera');
    const album = $('file-album');
    if (camera) {
      camera.onchange = (e) => {
        addImagesFromFiles(e.target.files);
        e.target.value = '';
      };
    }
    if (album) {
      album.onchange = (e) => {
        addImagesFromFiles(e.target.files);
        e.target.value = '';
      };
    }
  }

  function pickImageUrl() {
    if (state.images.length >= API.MAX_IMAGES) {
      toast('最多 ' + API.MAX_IMAGES + ' 张照片', true);
      return;
    }
    const url = prompt('粘贴图片链接（http 或 https）');
    if (!url) return;
    const iv = API.validateOneImage(url.trim());
    if (!iv.ok) { toast(iv.msg, true); return; }
    state.images.push(iv.value);
    render();
    if (state.view === 'write') bindWrite();
    toast('链接已添加');
  }

  function openSidebar() {
    $('sidebar').classList.remove('hidden');
    syncPassPanel();
  }
  function closeSidebar() { $('sidebar').classList.add('hidden'); }

  async function toggleDark() {
    state.settings.dark = !state.settings.dark;
    await API.updateSettings({ dark: state.settings.dark });
    applyTheme();
  }

  async function setSkin(id) {
    state.settings.skin = id;
    await API.updateSettings({ skin: id });
    closeSidebar();
    applyTheme();
    toast('皮肤已切换');
  }

  function syncPassPanel() {
    const toggle = $('toggle-pass');
    const panel = $('pass-setup');
    const btn = $('btn-save-pass');
    const input = $('new-pass');
    if (!toggle || !panel) return;
    const enabled = !!state.settings.passEnabled;
    const pending = toggle.checked && !enabled;
    toggle.checked = enabled || pending;
    panel.classList.toggle('hidden', !toggle.checked);
    if (btn) btn.textContent = enabled && state.settings.passcode ? '保存修改' : '保存并开启';
    if (input) {
      input.placeholder = enabled && state.settings.passcode ? '输入新密码以修改' : '4 位数字密码';
    }
    const lockBtn = $('btn-lock');
    if (lockBtn) lockBtn.classList.toggle('hidden', !isPassLockActive());
  }

  async function savePasscode() {
    if (!$('toggle-pass').checked) {
      toast('请先开启「进入时要求密码」', true);
      return;
    }
    const v = $('new-pass').value.trim();
    if (!/^\d{4}$/.test(v)) { toast('请输入4位数字密码', true); return; }
    state.settings.passcode = v;
    state.settings.passEnabled = true;
    await API.updateSettings({ passcode: v, passEnabled: true });
    $('new-pass').value = '';
    syncPassPanel();
    toast('密码锁已开启');
  }

  async function onTogglePassChange(enabled) {
    if (!enabled) {
      state.settings.passEnabled = false;
      await API.updateSettings({ passEnabled: false });
      $('new-pass').value = '';
      syncPassPanel();
      toast('已关闭密码锁');
      return;
    }
    if (state.settings.passcode) {
      state.settings.passEnabled = true;
      await API.updateSettings({ passEnabled: true });
      syncPassPanel();
      toast('已开启密码锁');
      return;
    }
    syncPassPanel();
  }

  function lockApp() {
    closeSidebar();
    if (!isPassLockActive()) {
      toast('请先在设置中开启并保存密码', true);
      return;
    }
    clearSession();
    showLockScreen();
  }

  async function exportData() {
    const data = await API.exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '拾光备份_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    toast('备份已下载');
  }

  function importData() {
    const n = state.entries.length;
    const msg =
      '导入备份会「完全覆盖」本设备上的所有日记（不是合并）。\n\n' +
      (n ? '现有 ' + n + ' 条日记将被替换。\n\n' : '') +
      '建议先导出备份。\n\n确定继续吗？';
    if (!confirm(msg)) return;
    $('import-file').click();
  }

  async function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        await API.importBackup(data, 'replace');
        await refreshData();
        render();
        toast('已覆盖导入，共 ' + state.entries.length + ' 条');
      } catch {
        toast('文件无效', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function clearAllData() {
    if (!confirm('确定清空所有日记？建议先导出备份')) return;
    await API.clearAll();
    await refreshData();
    render();
    toast('已清空');
  }

  function initStaticIcons() {
    const icons = I();
    if (!icons) return;
    icons.setLogo($('splash-icon'), 54);
    icons.setLogo($('enter-icon'), 54);
    icons.set($('lock-icon'), 'lock', 36);
    icons.set($('btn-menu'), 'menu', 20);
    icons.set($('btn-sidebar-close'), 'x', 20);
    icons.set($('btn-plus'), 'plus', 28);
    const navDiary = $('nav-diary');
    const navStats = $('nav-stats');
    if (navDiary) navDiary.innerHTML = '<span class="nav-label">' + icons.label('book', 22, '日记') + '</span>';
    if (navStats) navStats.innerHTML = '<span class="nav-label">' + icons.label('chart', 22, '统计') + '</span>';
    $('btn-export').innerHTML = icons.label('download', 18, '导出备份');
    $('btn-import').innerHTML = icons.label('upload', 18, '导入备份');
    $('btn-lock').innerHTML = icons.label('lock', 18, '锁定应用');
    $('sheet-btn-camera').innerHTML = icons.label('camera', 20, '拍照');
    $('sheet-btn-album').innerHTML = icons.label('images', 20, '从相册选择（可多选）');
    $('sheet-btn-url').innerHTML = icons.label('link', 20, '粘贴图片链接');
    icons.set($('image-viewer-close'), 'x', 20);
    icons.set($('image-viewer-prev'), 'chevronLeft', 22);
    icons.set($('image-viewer-next'), 'chevronRight', 22);
  }

  function bindGlobal() {
    initStaticIcons();
    bindPhotoInputs();
    bindImageViewer();
    $('btn-menu').onclick = openSidebar;
    $('btn-sidebar-close').onclick = closeSidebar;
    $('btn-dark').onclick = toggleDark;
    $('btn-enter').onclick = enterApp;
    $('btn-plus').onclick = startWrite;
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.onclick = () => {
        if (btn.dataset.nav === 'diary') setView(state.lastDiaryView || 'calendar');
        else setView(btn.dataset.view);
      };
    });
    document.querySelectorAll('.skin-btn').forEach((btn) => {
      btn.onclick = () => setSkin(btn.dataset.skin);
    });
    $('btn-save-pass').onclick = savePasscode;
    $('toggle-pass').onchange = (e) => onTogglePassChange(e.target.checked);
    $('btn-export').onclick = exportData;
    $('btn-import').onclick = importData;
    $('import-file').onchange = handleImportFile;
    $('btn-clear').onclick = clearAllData;
    $('btn-lock').onclick = lockApp;
    $('sidebar-backdrop').onclick = closeSidebar;
  }

  async function init() {
    if (!window.indexedDB) {
      alert('您的浏览器不支持本地存储，请换用 Chrome / Safari 最新版');
      return;
    }
    const data = await API.init();
    state.entries = data.entries;
    state.settings = data.settings;
    await sanitizePassSettings();

    bindGlobal();
    applyTheme();

    Storage.onDataChanged(async () => {
      await refreshData();
      if (!$('app').classList.contains('hidden')) render();
    });

    if (location.protocol === 'file:') {
      setTimeout(() => {
        toast('请用本地小服务器打开（见说明），双击文件可能导致多窗口数据不同步', true);
      }, 2500);
    }

    setTimeout(afterSplash, 2000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
