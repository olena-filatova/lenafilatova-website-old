/* ============================================================
   Low-GI Recipes — shared runtime
   • EN/UA language switch (localStorage lf_lang)
   • Cross-recipe shopping list (localStorage lf_shopping_list / lf_shopping_checked)
   • Slide-in shopping-list drawer (injected once per page)
   • Recipe-page share panel + "Add to shopping list"
   No framework — plain JS, works standalone on every recipe page.
   ============================================================ */
(function () {
  var LS_LANG = 'lf_lang', LS_LIST = 'lf_shopping_list', LS_CHK = 'lf_shopping_checked';
  // Honour a ?lang=ua|en URL param (used by redirects from the old lenafilatova.com
  // recipe pages so Russian/Ukrainian-speaking visitors land on the UA version) and
  // persist it so the rest of the site follows.
  var urlLang = (location.search.match(/[?&]lang=(ua|en)/) || [])[1];
  if (urlLang) { try { localStorage.setItem(LS_LANG, urlLang); } catch (e) {} }
  var lang = ((urlLang || localStorage.getItem(LS_LANG)) === 'ua') ? 'ua' : 'en';

  var STR = {
    en: {
      recipes: function (n) { return n + ' ' + (n === 1 ? 'recipe' : 'recipes'); },
      items:   function (n) { return n + ' ' + (n === 1 ? 'item' : 'items'); },
      dot: ' · ',
      title: 'Shopping list',
      empty: 'Your shopping list is empty. Browse recipes and add them to build one combined list.',
      serves: function (n) { return 'Serves ' + n; },
      remove: 'Remove', clearAll: 'Clear list', email: 'Email', save: 'Save', print: 'Print',
      sendList: 'Send list', yourEmail: 'Your email address',
      optIn: 'Send me more recipes and information',
      listSent: 'List sent — check your inbox', subject: 'Shopping list',
      copied: 'Copied!', copy: 'Copy link', shareRecipe: 'Recipe sent — check your inbox'
    },
    ua: {
      recipes: function (n) {
        var a = n % 10, b = n % 100;
        var w = (a === 1 && b !== 11) ? 'рецепт' : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 'рецепти' : 'рецептів';
        return n + ' ' + w;
      },
      items: function (n) {
        var a = n % 10, b = n % 100;
        var w = (a === 1 && b !== 11) ? 'інгредієнт' : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 'інгредієнти' : 'інгредієнтів';
        return n + ' ' + w;
      },
      dot: ' · ',
      title: 'Список покупок',
      empty: 'Ваш список покупок порожній. Переглядайте рецепти й додавайте їх, щоб зібрати спільний список.',
      serves: function (n) { return 'На ' + n + ' порц.'; },
      remove: 'Прибрати', clearAll: 'Очистити список', email: 'Ел. пошта', save: 'Зберегти', print: 'Друк',
      sendList: 'Надіслати список', yourEmail: 'Ваша електронна адреса',
      optIn: 'Надсилати мені більше рецептів та інформації',
      listSent: 'Список надіслано — перевірте пошту', subject: 'Список покупок',
      copied: 'Скопійовано!', copy: 'Копіювати посилання', shareRecipe: 'Рецепт надіслано — перевірте пошту'
    }
  };
  function S() { return STR[lang]; }

  function load(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; } }
  function persist(key, o) { localStorage.setItem(key, JSON.stringify(o)); }
  var list = load(LS_LIST), chk = load(LS_CHK);

  function count() { return Object.keys(list).length; }
  function itemCount() { var n = 0; for (var id in list) n += list[id].items_en.length; return n; }
  function title(rec) { return lang === 'ua' ? rec.title_ua : rec.title_en; }
  function items(rec) { return lang === 'ua' ? rec.items_ua : rec.items_en; }

  /* ---- i18n ---- */
  function applyI18n() {
    document.documentElement.lang = (lang === 'ua') ? 'uk' : 'en';
    document.querySelectorAll('[data-en]').forEach(function (el) {
      var v = (lang === 'ua') ? el.getAttribute('data-ua') : el.getAttribute('data-en');
      if (v !== null) el.textContent = v;
    });
    document.querySelectorAll('.lang [data-lang]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-lang') === lang);
    });
    if (window.LF_RECIPE && window.LF_RECIPE.onLang) window.LF_RECIPE.onLang(lang);
    if (window.LF_ONLANG) window.LF_ONLANG(lang);
    renderBadge(); renderDrawer(); syncAddBtn();
  }
  function setLang(l) { lang = l; localStorage.setItem(LS_LANG, l); applyI18n(); }

  /* ---- shopping list model ---- */
  function inList(id) { return !!list[id]; }
  function addRecipe(rec) {
    list[rec.id] = { title_en: rec.title_en, title_ua: rec.title_ua,
                     serves_en: rec.serves_en, serves_ua: rec.serves_ua,
                     items_en: rec.items_en.slice(), items_ua: rec.items_ua.slice() };
    persist(LS_LIST, list); afterChange();
  }
  function servesOf(rec) { return lang === 'ua' ? rec.serves_ua : rec.serves_en; }
  function removeRecipe(id) {
    delete list[id];
    Object.keys(chk).forEach(function (k) { if (k.indexOf(id + '::') === 0) delete chk[k]; });
    persist(LS_CHK, chk); persist(LS_LIST, list); afterChange();
  }
  function clearAll() { list = {}; chk = {}; persist(LS_LIST, list); persist(LS_CHK, chk); afterChange(); }
  function afterChange() { renderBadge(); renderDrawer(); syncAddBtn(); }

  /* ---- header badge ---- */
  function renderBadge() {
    var b = document.getElementById('listBadge');
    if (!b) return;
    var n = count(); b.textContent = n; b.classList.toggle('show', n > 0);
  }

  /* ---- recipe-page "Add to list" button ---- */
  function syncAddBtn() {
    var btn = document.getElementById('addListBtn');
    if (!btn || !window.LF_RECIPE) return;
    var on = inList(window.LF_RECIPE.id);
    btn.classList.toggle('green', on);
    btn.classList.toggle('primary', !on);
    var lbl = btn.querySelector('.lbl');
    if (lbl) lbl.textContent = on ? btn.getAttribute(lang === 'ua' ? 'data-added-ua' : 'data-added-en')
                                  : btn.getAttribute(lang === 'ua' ? 'data-add-ua' : 'data-add-en');
    btn.querySelector('.i-plus') && (btn.querySelector('.i-plus').style.display = on ? 'none' : '');
    btn.querySelector('.i-check') && (btn.querySelector('.i-check').style.display = on ? '' : 'none');
  }

  /* ---- drawer (injected once) ---- */
  var scrim, drawer, body, summary, foot;
  function injectDrawer() {
    scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.id = 'lfScrim';
    drawer = document.createElement('aside'); drawer.className = 'drawer no-print'; drawer.id = 'lfDrawer';
    drawer.innerHTML =
      '<div class="drawer-head"><div><div class="title" id="lfDrawerTitle"></div><div class="summary" id="lfSummary"></div></div>' +
      '<button class="x-btn" id="lfClose" aria-label="Close">&times;</button></div>' +
      '<div class="drawer-body" id="lfBody"></div>' +
      '<div class="drawer-foot" id="lfFoot"></div>';
    document.body.appendChild(scrim); document.body.appendChild(drawer);
    body = drawer.querySelector('#lfBody'); summary = drawer.querySelector('#lfSummary'); foot = drawer.querySelector('#lfFoot');
    scrim.addEventListener('click', closeDrawer);
    drawer.querySelector('#lfClose').addEventListener('click', closeDrawer);
  }
  function openDrawer() { renderDrawer(); scrim.classList.add('open'); drawer.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { scrim.classList.remove('open'); drawer.classList.remove('open'); document.body.style.overflow = ''; }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]; }); }

  function renderDrawer() {
    if (!drawer) return;
    drawer.querySelector('#lfDrawerTitle').textContent = S().title;
    var ids = Object.keys(list);
    summary.textContent = ids.length ? (S().recipes(ids.length) + S().dot + S().items(itemCount())) : '';

    if (!ids.length) {
      body.innerHTML =
        '<div class="cart-empty"><div class="disc">' + CLIP_SVG + '</div><p>' + esc(S().empty) + '</p></div>';
      foot.innerHTML = ''; return;
    }
    var html = '';
    ids.forEach(function (id) {
      var rec = list[id];
      html += '<div class="cart-group"><div class="g-head"><div><span class="g-title">' + esc(title(rec)) +
              '</span> <span class="g-serves">' + esc(servesOf(rec)) + '</span></div>' +
              '<button class="remove" data-rm="' + esc(id) + '">' + esc(S().remove) + '</button></div>' +
              '<div class="cart-list">';
      items(rec).forEach(function (it, idx) {
        var key = id + '::' + idx, on = !!chk[key];
        html += '<label class="cart-item"><input type="checkbox" data-chk="' + esc(key) + '"' + (on ? ' checked' : '') +
                '><span class="box"></span><span>' + esc(it) + '</span></label>';
      });
      html += '</div></div>';
    });
    body.innerHTML = html;

    foot.innerHTML =
      '<div class="cart-email" id="lfEmailBox"><input type="email" id="lfEmailAddr" placeholder="' + esc(S().yourEmail) + '">' +
      '<label class="opt" style="display:flex;gap:9px;align-items:flex-start;margin:10px 0;font-size:13px;color:var(--ink-2);">' +
      '<input type="checkbox" id="lfEmailOpt" checked><span>' + esc(S().optIn) + '</span></label>' +
      '<button class="btn primary full" id="lfSendList">' + esc(S().sendList) + '</button>' +
      '<div class="confirm" id="lfListSent">' + CHECK_SVG + '<span>' + esc(S().listSent) + '</span></div></div>' +
      '<div class="cart-actions">' +
      '<button class="btn" id="lfEmailBtn">' + MAIL_SVG + '<span>' + esc(S().email) + '</span></button>' +
      '<button class="btn" id="lfSaveBtn">' + SAVE_SVG + '<span>' + esc(S().save) + '</span></button>' +
      '<button class="btn" id="lfPrintBtn">' + PRINT_SVG + '<span>' + esc(S().print) + '</span></button></div>' +
      '<button class="clear-all" id="lfClearAll">' + esc(S().clearAll) + '</button>';

    body.querySelectorAll('[data-rm]').forEach(function (b) { b.addEventListener('click', function () { removeRecipe(b.getAttribute('data-rm')); }); });
    body.querySelectorAll('[data-chk]').forEach(function (c) {
      c.addEventListener('change', function () { chk[c.getAttribute('data-chk')] = c.checked; persist(LS_CHK, chk); });
    });
    foot.querySelector('#lfClearAll').addEventListener('click', clearAll);
    foot.querySelector('#lfEmailBtn').addEventListener('click', function () { foot.querySelector('#lfEmailBox').classList.toggle('open'); });
    foot.querySelector('#lfSendList').addEventListener('click', emailList);
    foot.querySelector('#lfSaveBtn').addEventListener('click', saveListAction);
    foot.querySelector('#lfPrintBtn').addEventListener('click', printList);
  }

  function listText() {
    var out = [];
    Object.keys(list).forEach(function (id) {
      var rec = list[id];
      out.push(title(rec) + ' (' + servesOf(rec) + ')');
      items(rec).forEach(function (it) { out.push('  - ' + it); });
      out.push('');
    });
    return out.join('\n').trim();
  }
  function emailList() {
    var addr = (foot.querySelector('#lfEmailAddr').value || '').trim();
    var opt = foot.querySelector('#lfEmailOpt').checked;
    var body2 = listText() + (opt ? '\n\n(' + S().optIn + ')' : '');
    window.location.href = 'mailto:' + encodeURIComponent(addr) + '?subject=' + encodeURIComponent(S().subject) + '&body=' + encodeURIComponent(body2);
    foot.querySelector('#lfListSent').classList.add('show');
  }
  function saveListAction() {
    if (navigator.share) { navigator.share({ title: S().title, text: listText() }).catch(function () {}); return; }
    var blob = new Blob([listText()], { type: 'text/plain' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'shopping-list.txt'; a.click();
  }
  function printList() {
    var w = window.open('', '_blank'); if (!w) return;
    var h = '<h1 style="font-family:Georgia,serif">' + esc(S().title) + '</h1>';
    Object.keys(list).forEach(function (id) {
      var rec = list[id];
      h += '<h2 style="font-family:Georgia,serif;margin:18px 0 4px">' + esc(title(rec)) + ' <small>(' + esc(servesOf(rec)) + ')</small></h2><ul>';
      items(rec).forEach(function (it) { h += '<li>' + esc(it) + '</li>'; });
      h += '</ul>';
    });
    w.document.write('<html><head><title>' + esc(S().title) + '</title><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#331B33;max-width:640px;margin:24px auto;padding:0 20px;line-height:1.6}li{margin:2px 0}</style></head><body>' + h + '</body></html>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 200);
  }

  /* ---- recipe-page share panel ---- */
  function wireShare() {
    var toggle = document.getElementById('shareToggle');
    var panel = document.getElementById('sharePanel');
    if (toggle && panel) {
      toggle.addEventListener('click', function () { var o = panel.classList.toggle('open'); toggle.classList.toggle('primary', o); });
    }
    var nativeBtn = document.getElementById('shNative');
    if (nativeBtn) nativeBtn.addEventListener('click', function () {
      var t = window.LF_RECIPE ? title(window.LF_RECIPE) : document.title;
      if (navigator.share) navigator.share({ title: t, url: location.href }).catch(function () {});
      else copyLink();
    });
    var copyBtn = document.getElementById('shCopy');
    if (copyBtn) copyBtn.addEventListener('click', copyLink);
    var form = document.getElementById('shareForm');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var addr = (document.getElementById('shareEmail').value || '').trim();
      var opt = document.getElementById('shareOpt').checked;
      var rec = window.LF_RECIPE || {};
      var subj = title(rec) || document.title;
      var lead = (lang === 'ua' ? rec.lead_ua : rec.lead_en) || '';
      var b = subj + '\n\n' + lead + '\n\n' + location.href + (opt ? '\n\n(' + S().optIn + ')' : '');
      window.location.href = 'mailto:' + encodeURIComponent(addr) + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(b);
      document.getElementById('shareSent').classList.add('show');
    });
  }
  function copyLink() {
    var btn = document.getElementById('shCopy'); var lbl = btn && btn.querySelector('.lbl');
    function done() { if (lbl) { lbl.textContent = S().copied; setTimeout(function () { lbl.textContent = S().copy; }, 2000); } }
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, done);
    else { var t = document.createElement('textarea'); t.value = location.href; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(t); done(); }
  }

  /* ---- wire header + init ---- */
  function init() {
    injectDrawer();
    var lb = document.getElementById('listBtn'); if (lb) lb.addEventListener('click', openDrawer);
    document.querySelectorAll('.lang [data-lang]').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
    });
    // recipe page: add-to-list button + share
    var add = document.getElementById('addListBtn');
    if (add && window.LF_RECIPE) add.addEventListener('click', function () {
      if (inList(window.LF_RECIPE.id)) removeRecipe(window.LF_RECIPE.id);
      else addRecipe(window.LF_RECIPE.snapshot());
    });
    wireShare();
    applyI18n();
  }

  window.LF = { get lang() { return lang; }, setLang: setLang, applyI18n: applyI18n,
                addRecipe: addRecipe, removeRecipe: removeRecipe, inList: inList,
                openDrawer: function () { openDrawer(); }, closeDrawer: function () { closeDrawer(); } };

  /* ---- inline icons (Feather/Lucide style) ---- */
  var CLIP_SVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 13l2 2 4-4"/></svg>';
  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  var MAIL_SVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
  var SAVE_SVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>';
  var PRINT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
