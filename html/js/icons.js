/**
 * 统一线性图标集（currentColor 随皮肤/主题变色）
 */
(function (global) {
  const PATHS = {
    sparkles: '<path d="M9.94 2.94a1.5 1.5 0 0 1 2.12 0l.35.35a1.5 1.5 0 0 0 2.12 0l.35-.35a1.5 1.5 0 0 1 2.12 2.12l-.35.35a1.5 1.5 0 0 0 0 2.12l.35.35a1.5 1.5 0 0 1-2.12 2.12l-.35-.35a1.5 1.5 0 0 0-2.12 0l-.35.35a1.5 1.5 0 0 1-2.12-2.12l.35-.35a1.5 1.5 0 0 0 0-2.12l-.35-.35a1.5 1.5 0 0 1 0-2.12Z"/><path d="M19 2v4M21 4h-4"/><path d="M5 18v4M7 20H3"/>',
    lock: '<rect width="14" height="10" x="5" y="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    calendar: '<rect width="16" height="16" x="4" y="4" rx="2"/><path d="M16 2v4M8 2v4M4 10h16"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-6M22 20H2"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19v20H6.5a2.5 2.5 0 0 1 0-5H19"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/>',
    images: '<rect width="16" height="16" x="2" y="2" rx="2"/><path d="M6 8h.01M14 16l-4-4-3 3-2-2-3 3"/><circle cx="8.5" cy="7.5" r="1.5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    inbox: '<path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>',
    lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
    trending: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
    moodSuper: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
    moodHappy: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
    moodMeh: '<circle cx="12" cy="12" r="9"/><path d="M8 15h8"/><path d="M9 9h.01M15 9h.01"/>',
    moodSad: '<circle cx="12" cy="12" r="9"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><path d="M9 9h.01M15 9h.01"/>',
    moodAngry: '<circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 9h.01"/><path d="M8 14c1 1 2.5 1.5 4 1.5s3-.5 4-1.5"/><path d="m9 7-1-2M15 7l1-2"/>'
  };

  const MOOD_ICON = {
    super: 'moodSuper',
    happy: 'moodHappy',
    meh: 'moodMeh',
    sad: 'moodSad',
    angry: 'moodAngry'
  };

  function svg(name, size, className) {
    const path = PATHS[name];
    if (!path) return '';
    size = size || 20;
    const cls = 'ico' + (className ? ' ' + className : '');
    return (
      '<svg class="' + cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      path + '</svg>'
    );
  }

  function set(el, name, size) {
    if (!el) return;
    el.innerHTML = svg(name, size);
  }

  function mood(moodKey, size, color) {
    const iconName = MOOD_ICON[moodKey] || MOOD_ICON.happy;
    const style = color ? ' style="color:' + color + '"' : '';
    return svg(iconName, size).replace('<svg ', '<svg' + style + ' ');
  }

  function label(name, size, text) {
    return svg(name, size) + '<span>' + text + '</span>';
  }

  const STAR_PATH = 'M12 4.2l1.55 4.75 4.75 1.55-4.75 1.55L12 15.8l-1.55-4.75-4.75-1.55 4.75-1.55L12 4.2z';

  function sparkleDot(cx, cy, r, wrapClass) {
    return (
      '<g class="sparkle-wrap ' + wrapClass + '">' +
      '<circle class="sparkle-dot" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="currentColor"/></g>'
    );
  }

  /** 品牌 Logo：大星 + 4 个光点 */
  function logo(size) {
    size = size || 54;
    return (
      '<svg class="ico ico-logo" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path class="logo-star" fill="currentColor" d="' + STAR_PATH + '"/>' +
      sparkleDot(18.2, 5.8, 1.05, 'dot-a') +
      sparkleDot(5.8, 6.5, 0.9, 'dot-b') +
      sparkleDot(19.1, 12, 0.85, 'dot-c') +
      sparkleDot(12, 19.1, 1, 'dot-d') +
      '</svg>'
    );
  }

  function setLogo(el, size) {
    if (!el) return;
    el.innerHTML = logo(size);
  }

  global.ShiguangIcons = {
    svg,
    set,
    mood,
    label,
    logo,
    setLogo,
    MOOD_ICON
  };
})(window);
