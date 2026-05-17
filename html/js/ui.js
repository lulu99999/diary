/**
 * UI 渲染层
 */
(function (global) {
  const MOODS = {
    super: { label: '超棒', color: '#FFD700' },
    happy: { label: '开心', color: '#A8D5BA' },
    meh:   { label: '一般', color: '#9FB3C8' },
    sad:   { label: '委屈', color: '#A78BFA' },
    angry: { label: '生气', color: '#FFB7C5' }
  };

  function ico(name, size) {
    return (global.ShiguangIcons && global.ShiguangIcons.svg(name, size)) || '';
  }

  function moodIco(key, size, color) {
    if (!global.ShiguangIcons) return '';
    if (color === false) return global.ShiguangIcons.mood(key, size);
    const c = color || (MOODS[key] || MOODS.happy).color;
    return global.ShiguangIcons.mood(key, size, c);
  }

  function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function imgSrc(image) {
    if (!image) return '';
    return esc(image);
  }

  function renderImagesBlock(images, mode) {
    const list = images || [];
    if (!list.length) return '';
    if (mode === 'scroll') {
      const thumbs = list.map((src) =>
        '<div class="entry-img-thumb"><img src="' + imgSrc(src) + '" alt="" loading="lazy" /></div>'
      ).join('');
      const count = list.length > 1
        ? '<span class="entry-img-count">' + list.length + ' 张</span>'
        : '';
      return (
        '<div class="entry-img-gallery">' +
        count +
        '<div class="entry-img-scroll">' + thumbs + '</div></div>'
      );
    }
    if (mode === 'mini') {
      const show = list.slice(0, 2);
      const more = list.length > 2
        ? '<span class="entry-mini-badge">+' + (list.length - 2) + '</span>'
        : '';
      return '<div class="entry-mini-thumbs">' +
        show.map((src) => '<img src="' + imgSrc(src) + '" alt="" />').join('') +
        more + '</div>';
    }
    return '<img class="cover" src="' + imgSrc(list[0]) + '" alt="" />';
  }

  global.ShiguangUI = {
    MOODS,
    esc,
    imgSrc,
    renderImagesBlock,

    renderDateNav(state) {
      return (
        '<div class="date-nav animate-in">' +
        '<div class="date-nav-group month-nav">' +
        '<button type="button" class="date-nav-btn" data-action="month-prev" aria-label="上个月">' + ico('chevronLeft', 18) + '</button>' +
        '<button type="button" class="month-year-btn" data-action="open-year-picker">' +
        state.year + '年' + (state.month + 1) + '月' +
        '</button>' +
        '<button type="button" class="date-nav-btn" data-action="month-next" aria-label="下个月">' + ico('chevronRight', 18) + '</button>' +
        '</div>' +
        '<div class="view-tabs">' +
        '<button type="button" class="view-tab' + (state.view === 'calendar' ? ' active' : '') + '" data-view="calendar" aria-label="日历">' + ico('calendar', 18) + '</button>' +
        '<button type="button" class="view-tab' + (state.view === 'list' ? ' active' : '') + '" data-view="list" aria-label="列表">' + ico('list', 18) + '</button>' +
        '</div></div>'
      );
    },

    renderCalendar(state, monthEntries, API) {
      const total = API.daysInMonth(state.year, state.month);
      const start = API.firstWeekday(state.year, state.month);
      const byDay = API.groupByDay(monthEntries);
      const wd = ['日', '一', '二', '三', '四', '五', '六'];
      let cells = wd.map((d) => '<div class="cal-wd">' + d + '</div>').join('');
      for (let i = 0; i < start; i++) cells += '<div></div>';
      for (let d = 1; d <= total; d++) {
        const has = byDay[d] && byDay[d].length;
        const active = state.activeDay === d;
        cells +=
          '<div class="cal-day' + (active ? ' active' : '') + '" data-day="' + d + '">' +
          '<div class="cal-num">' + d + '</div>' +
          (has && !active ? '<div class="cal-dot"></div>' : '') +
          '</div>';
      }
      const dayEntries = (byDay[state.activeDay] || []).sort((a, b) => (b.id || 0) - (a.id || 0));
      const list = dayEntries.length
        ? dayEntries.map((e) => this.renderEntryMini(e, API)).join('')
        : '<p class="empty-hint">这一天还没有留下足迹...</p>';
      return (
        '<div class="calendar-grid">' + cells + '</div>' +
        '<p class="section-label">' + ico('clock', 12) + state.activeDay + ' 日的拾光</p>' + list
      );
    },

    renderEntryMini(e, API) {
      const m = MOODS[e.mood] || MOODS.happy;
      const imgs = API.getImages(e);
      return (
        '<div class="entry-mini" data-id="' + e.id + '">' +
        '<span class="entry-mood-ico">' + moodIco(e.mood, 22, false) + '</span>' +
        '<div class="entry-mini-text"><p>' + esc(e.content) + '</p><span>' + esc(e.time) + '</span></div>' +
        (imgs.length ? renderImagesBlock(imgs, 'mini') : '') +
        '</div>'
      );
    },

    renderList(monthEntries, API) {
      const sorted = monthEntries.slice().sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.id || 0) - (a.id || 0);
      });
      if (!sorted.length) {
        return '<p class="empty-hint">本月还没有日记，点下方 + 开始记录</p>';
      }
      return sorted.map((e) => this.renderEntryCard(e, API)).join('');
    },

    renderEntryCard(e, API) {
      const m = MOODS[e.mood] || MOODS.happy;
      const imgs = API.getImages(e);
      const imgHtml = imgs.length
        ? (imgs.length === 1 ? renderImagesBlock(imgs, 'cover') : renderImagesBlock(imgs, 'scroll'))
        : '';
      return (
        '<div class="entry-card">' + imgHtml +
        '<div class="entry-card-body">' +
        '<div class="entry-card-head">' +
        '<div class="entry-meta"><span class="date">' + esc(e.date) + '</span> ' +
        '<span>' + esc(e.time) + ' · ' + m.label + '</span></div>' +
        '<div class="entry-actions">' +
        '<button type="button" class="icon-btn" data-edit="' + e.id + '" title="编辑">' + ico('pencil', 14) + '</button>' +
        '<button type="button" class="icon-btn danger" data-delete="' + e.id + '" title="删除">' + ico('trash', 14) + '</button>' +
        '</div></div>' +
        '<p class="entry-content">' + esc(e.content) + '</p>' +
        '</div></div>'
      );
    },

    renderPhotoSection(images, max) {
      max = max || 9;
      const thumbs = (images || []).map((src, i) =>
        '<div class="photo-thumb">' +
        '<img src="' + imgSrc(src) + '" alt="" />' +
        '<button type="button" class="remove" data-remove-img="' + i + '" aria-label="删除">' + ico('x', 12) + '</button>' +
        '</div>'
      ).join('');
      const canAdd = (images || []).length < max;
      const addBtn = canAdd
        ? '<button type="button" class="photo-add-btn" data-action="pick-album" aria-label="从相册选择多张照片">' +
          '<span class="ico-plus">' + ico('plus', 22) + '</span><span>添加</span></button>'
        : '';
      return (
        '<div class="photo-section">' +
        '<div class="photo-section-head">' +
        '<span>照片</span>' +
        '<span class="count">' + (images || []).length + ' / ' + max + '</span>' +
        '</div>' +
        '<div class="photo-strip" id="photo-strip">' + thumbs + addBtn + '</div>' +
        '</div>'
      );
    },

    renderWrite(state, API) {
      const moods = Object.keys(MOODS).map((k) => {
        const v = MOODS[k];
        return '<button type="button" class="mood-btn' + (state.mood === k ? ' active' : '') + '" data-mood="' + k + '">' + moodIco(k, 28, false) + '</button>';
      }).join('');
      return (
        '<div class="animate-in">' +
        '<div class="write-header">' +
        '<button type="button" data-action="cancel-write" aria-label="关闭">' + ico('x', 20) + '</button>' +
        '<div style="text-align:center">' +
        '<div style="font-size:0.85rem;font-weight:800">' + state.year + '/' + (state.month + 1) + '/' + state.activeDay + '</div>' +
        '<p style="font-size:0.65rem;opacity:0.5">' + (state.editingId ? '编辑' : '新建') + '日记</p></div>' +
        '<button type="button" class="btn-save" data-action="save-diary" aria-label="保存">' + ico('check', 18) + '<span>保存</span></button></div>' +
        '<div class="mood-row">' + moods + '</div>' +
        this.renderPhotoSection(state.images, API.MAX_IMAGES) +
        '<textarea class="write-textarea" id="content-input" placeholder="此刻，你想留下什么...">' + esc(state.draftContent) + '</textarea>' +
        '<p class="char-count"><span id="char-count">0</span> / 5000 字</p></div>'
      );
    },

    renderStats(monthEntries, state) {
      const total = monthEntries.length;
      if (total === 0) {
        return (
          '<div class="animate-in">' +
          '<div class="write-header" style="margin-bottom:20px">' +
          '<button type="button" class="icon-round" data-view="calendar" aria-label="返回">' + ico('chevronLeft', 20) + '</button>' +
          '<h2 style="font-size:1.1rem;font-weight:800">情绪统计</h2><span></span></div>' +
          '<div class="empty-state-large">' +
          '<div class="ico-empty">' + ico('inbox', 48) + '</div>' +
          '<h3>这里空空如也</h3>' +
          '<p>' + (state.month + 1) + ' 月还没有心情记录。<br>不是加载失败哦～去写一篇日记吧。</p>' +
          '</div>' +
          '<div class="insight-box"><h4>' + ico('lightbulb', 16) + '小提示</h4>' +
          '<p>写下第一篇日记后，这里会显示你的心情柱状图。</p></div></div>'
        );
      }

      const stats = { super: 0, happy: 0, meh: 0, sad: 0, angry: 0 };
      monthEntries.forEach((e) => {
        if (stats[e.mood] !== undefined) stats[e.mood]++;
      });
      const maxVal = Math.max(...Object.values(stats), 1);
      const bars = Object.keys(MOODS).map((k) => {
        const c = stats[k] || 0;
        const h = Math.max((c / maxVal) * 100, 8);
        return (
          '<div class="stat-col">' +
          '<div class="stat-bar-wrap">' +
          (c ? '<span class="stat-count">' + c + '</span>' : '<span class="stat-count" style="opacity:0.25">·</span>') +
          '<div class="stat-bar' + (c ? ' has-data' : '') + '" style="height:' + h + '%"></div>' +
          '</div><span class="ico-mood">' + moodIco(k, 22, false) + '</span></div>'
        );
      }).join('');
      const tip = total > 10 ? '你是一个热爱记录生活的人。' : '多给自己一点时间来记录吧。';
      return (
        '<div class="animate-in">' +
        '<div class="write-header" style="margin-bottom:20px">' +
        '<button type="button" class="icon-round" data-view="calendar" aria-label="返回">' + ico('chevronLeft', 20) + '</button>' +
        '<h2 style="font-size:1.1rem;font-weight:800">' + state.year + '年' + (state.month + 1) + '月 统计</h2><span></span></div>' +
        '<div class="stats-bars">' + bars + '</div>' +
        '<div class="insight-box"><h4>' + ico('trending', 16) + '时光洞察</h4>' +
        '<p>你在 ' + (state.month + 1) + ' 月共留下了 <strong>' + total + '</strong> 条心情。' + tip + '</p></div></div>'
      );
    },

    renderYearPicker(currentYear) {
      const years = [];
      for (let y = currentYear - 6; y <= currentYear + 2; y++) years.push(y);
      const items = years.map((y) =>
        '<button type="button" class="year-item' + (y === currentYear ? ' active' : '') + '" data-year="' + y + '">' + y + '</button>'
      ).join('');
      return (
        '<div class="sheet-mask center" id="year-picker-mask">' +
        '<div class="sheet-panel rounded" style="max-width:320px">' +
        '<p class="sheet-title">选择年份</p>' +
        '<div class="year-grid">' + items + '</div>' +
        '<button type="button" class="sheet-btn cancel" data-action="close-year-picker">取消</button>' +
        '</div></div>'
      );
    }
  };
})(window);
