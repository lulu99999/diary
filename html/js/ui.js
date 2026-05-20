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
        '<div class="entry-swipe" data-entry-id="' + e.id + '">' +
        '<div class="entry-swipe-track">' +
        '<div class="entry-swipe-main">' +
        '<div class="entry-card">' + imgHtml +
        '<div class="entry-card-body">' +
        '<div class="entry-card-row">' +
        '<span class="entry-mood-ico">' + moodIco(e.mood, 24, false) + '</span>' +
        '<div class="entry-card-col">' +
        '<div class="entry-card-meta">' +
        '<span class="entry-date">' + esc(e.date) + '</span>' +
        '<span class="entry-meta-dot">·</span>' +
        '<span class="entry-sub">' + esc(e.time) + ' · ' + m.label + '</span>' +
        '</div>' +
        '<p class="entry-content">' + esc(e.content) + '</p>' +
        '</div></div></div></div>' +
        '</div>' +
        '<div class="entry-swipe-actions">' +
        '<button type="button" class="swipe-btn swipe-edit" data-edit="' + e.id + '" aria-label="编辑">' +
        ico('pencil', 20) + '<span class="swipe-label">编辑</span></button>' +
        '<button type="button" class="swipe-btn swipe-delete" data-delete="' + e.id + '" aria-label="删除">' +
        ico('trash', 20) + '<span class="swipe-label">删除</span></button>' +
        '</div></div></div>'
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

    formatWriteDate(year, month, day) {
      return year + '年' + (month + 1) + '月' + day + '日';
    },

    renderWriteDatePicker(draft, API) {
      const total = API.daysInMonth(draft.year, draft.month);
      const start = API.firstWeekday(draft.year, draft.month);
      const wd = ['日', '一', '二', '三', '四', '五', '六'];
      let cells = wd.map((d) => '<div class="cal-wd">' + d + '</div>').join('');
      for (let i = 0; i < start; i++) cells += '<div></div>';
      for (let d = 1; d <= total; d++) {
        const active = draft.day === d;
        cells +=
          '<button type="button" class="cal-day picker-day' + (active ? ' active' : '') + '" data-picker-day="' + d + '">' +
          '<div class="cal-num">' + d + '</div></button>';
      }
      return (
        '<div class="sheet-mask center" id="write-date-picker-mask">' +
        '<div class="sheet-panel rounded date-picker-panel">' +
        '<p class="sheet-title">选择日期</p>' +
        '<div class="date-nav date-picker-nav">' +
        '<div class="date-nav-group month-nav">' +
        '<button type="button" class="date-nav-btn" data-action="picker-month-prev" aria-label="上个月">' + ico('chevronLeft', 18) + '</button>' +
        '<button type="button" class="month-year-btn" data-action="picker-open-year">' +
        draft.year + '年' + (draft.month + 1) + '月' +
        '</button>' +
        '<button type="button" class="date-nav-btn" data-action="picker-month-next" aria-label="下个月">' + ico('chevronRight', 18) + '</button>' +
        '</div></div>' +
        '<div class="calendar-grid date-picker-grid">' + cells + '</div>' +
        '<button type="button" class="sheet-btn cancel" data-action="close-write-date-picker">取消</button>' +
        '</div></div>'
      );
    },

    renderWrite(state, API) {
      const moods = Object.keys(MOODS).map((k) => {
        const v = MOODS[k];
        return '<button type="button" class="mood-btn' + (state.mood === k ? ' active' : '') + '" data-mood="' + k + '">' + moodIco(k, 28, false) + '</button>';
      }).join('');
      const dateLabel = this.formatWriteDate(state.year, state.month, state.activeDay);
      return (
        '<div class="animate-in">' +
        '<div class="write-header">' +
        '<button type="button" data-action="cancel-write" aria-label="关闭">' + ico('x', 20) + '</button>' +
        '<div class="write-header-center">' +
        '<button type="button" class="write-date-btn" data-action="open-write-date-picker" aria-label="选择日期">' +
        '<span class="write-date-display">' + dateLabel + '</span>' +
        ico('calendar', 14) +
        '</button></div>' +
        '<button type="button" class="btn-save" data-action="save-diary" aria-label="保存">' + ico('check', 18) + '<span>保存</span></button></div>' +
        '<div class="mood-row">' + moods + '</div>' +
        '<textarea class="write-textarea" id="content-input" placeholder="此刻，你想留下什么...">' + esc(state.draftContent) + '</textarea>' +
        '<p class="char-count"><span id="char-count">0</span> / 5000 字</p>' +
        this.renderPhotoSection(state.images, API.MAX_IMAGES) +
        '</div>'
      );
    },

    renderStatsNav(state) {
      const isYear = state.statsPeriod === 'year';
      const centerLabel = isYear
        ? state.year + '年'
        : state.year + '年' + (state.month + 1) + '月';
      return (
        '<div class="stats-toolbar animate-in">' +
        '<div class="stats-scope-tabs view-tabs">' +
        '<button type="button" class="view-tab stats-scope-tab' + (!isYear ? ' active' : '') + '" data-action="stats-period-month">按月</button>' +
        '<button type="button" class="view-tab stats-scope-tab' + (isYear ? ' active' : '') + '" data-action="stats-period-year">按年</button>' +
        '</div>' +
        '<div class="date-nav stats-date-nav">' +
        '<div class="date-nav-group month-nav">' +
        '<button type="button" class="date-nav-btn" data-action="stats-prev" aria-label="' + (isYear ? '上一年' : '上个月') + '">' + ico('chevronLeft', 18) + '</button>' +
        '<button type="button" class="month-year-btn" data-action="open-year-picker">' + centerLabel + '</button>' +
        '<button type="button" class="date-nav-btn" data-action="stats-next" aria-label="' + (isYear ? '下一年' : '下个月') + '">' + ico('chevronRight', 18) + '</button>' +
        '</div></div></div>'
      );
    },

    statsPeriodLabel(state) {
      return state.statsPeriod === 'year'
        ? state.year + ' 年'
        : state.year + ' 年 ' + (state.month + 1) + ' 月';
    },

    computeMoodStats(entries) {
      const stats = { super: 0, happy: 0, meh: 0, sad: 0, angry: 0 };
      entries.forEach((e) => {
        if (stats[e.mood] !== undefined) stats[e.mood]++;
      });
      return stats;
    },

    renderMoodBars(stats) {
      const maxVal = Math.max(...Object.values(stats), 1);
      return Object.keys(MOODS).map((k) => {
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
    },

    renderStatsInsight(entries, state, API) {
      const total = entries.length;
      const period = this.statsPeriodLabel(state);
      const tip = total > 10 ? '你是一个热爱记录生活的人。' : '多给自己一点时间来记录吧。';
      if (state.statsPeriod === 'year') {
        const months = new Set(entries.map((e) => API.parseDate(e.date).month));
        const activeMonths = months.size;
        return (
          '<p>你在 <strong>' + period + '</strong> 共留下了 <strong>' + total + '</strong> 条心情' +
          (activeMonths ? '，分布在 <strong>' + activeMonths + '</strong> 个月里。' : '。') +
          tip + '</p>'
        );
      }
      return (
        '<p>你在 <strong>' + period + '</strong> 共留下了 <strong>' + total + '</strong> 条心情。' + tip + '</p>'
      );
    },

    renderStats(entries, state, API) {
      const nav = this.renderStatsNav(state);
      const period = this.statsPeriodLabel(state);

      if (!entries.length) {
        const emptyHint = state.statsPeriod === 'year'
          ? period + ' 还没有心情记录。<br>去写一篇日记吧。'
          : (state.month + 1) + ' 月还没有心情记录。<br>去写一篇日记吧。';
        return (
          '<div class="animate-in stats-page">' + nav +
          '<div class="empty-state-large">' +
          '<div class="ico-empty">' + ico('inbox', 48) + '</div>' +
          '<h3>这里空空如也</h3>' +
          '<p>' + emptyHint + '</p></div>' +
          '<div class="insight-box"><h4>' + ico('lightbulb', 16) + '小提示</h4>' +
          '<p>切换上方月份或年份查看其他时段；写下日记后这里会显示心情柱状图。</p></div></div>'
        );
      }

      const bars = this.renderMoodBars(this.computeMoodStats(entries));
      return (
        '<div class="animate-in stats-page">' + nav +
        '<div class="stats-bars">' + bars + '</div>' +
        '<div class="insight-box"><h4>' + ico('trending', 16) + '时光洞察</h4>' +
        this.renderStatsInsight(entries, state, API) +
        '</div></div>'
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
