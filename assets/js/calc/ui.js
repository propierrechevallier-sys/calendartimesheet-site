// ui.js — page « Google Calendar hours calculator » (seo/ESSAI-B.md) : fichiers déposés, période, mots-clés, résultats.
// Tout reste dans le navigateur : lecture du fichier, décompression, calcul. Aucun envoi, aucun stockage. Les textes du
// fichier (titres, noms d'agendas) sont affichés par textContent, jamais comme du HTML. Textes, nombres et dates dans la
// langue de la page (<html lang>, src/calc/text.js).
(function () {
  'use strict';
  if (typeof document === 'undefined' || !document.getElementById('calc')) return;
  function $(id) { return document.getElementById(id); }
  var L = AH.calcText.lang(document.documentElement.lang);
  function t(key, vars) { return AH.calcText.say(L, key, vars); }
  var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
  var zoneFor = AH.ics.zones(), zone = zoneFor(tz) || zoneFor('UTC');
  // files : [{ name, cal }] lus une fois au dépôt ; expanded : rendez-vous de la période en cours, refaits si elle change.
  var files = [], expanded = null, timer = null, ticket = 0;
  var LEFT_OUT = ['allDay', 'declined', 'free', 'duplicate'];
  // Période proposée : le mois dernier, celui qu'on facture.
  var last = AH.periods.previousMonth(Date.now(), zone);
  $('calc-from').value = AH.zone.dateKey(last.start, zone);
  $('calc-to').value = AH.zone.dateKey(last.end - 1, zone);
  var DAYFMT = new Intl.DateTimeFormat(L === 'en' ? 'en-GB' : L, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  var HOURS = new Intl.NumberFormat(L, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function day(s) { var a = s.split('-').map(Number); return DAYFMT.format(new Date(Date.UTC(a[0], a[1] - 1, a[2]))); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function error(code) { var p = $('calc-error'); if (!code) { p.hidden = true; p.textContent = ''; return; } p.textContent = t('msg.' + code) || code; p.hidden = false; }
  function inflateRaw(u8) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('no-inflate'));
    return new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function decode(u8) { return new TextDecoder('utf-8').decode(u8); }
  // Un fichier déposé → [{ name, text }] : les .ics d'un .zip, ou le fichier lui-même.
  function readFile(f) {
    return f.arrayBuffer().then(function (buf) {
      var u8 = new Uint8Array(buf);
      if (AH.zip.isZip(u8)) {
        return AH.zip.read(u8, inflateRaw).then(function (list) {
          return list.filter(function (e) { return /[.]ics$/i.test(e.name); }).map(function (e) { return { name: e.name.split('/').pop(), text: decode(e.bytes) }; });
        });
      }
      return [{ name: f.name, text: decode(u8) }];
    });
  }
  // Seul le dernier dépôt compte : un dépôt plus ancien qui finit après lui est ignoré.
  function take(list) {
    if (!list || !list.length) return;
    var mine = ++ticket;
    error(null);
    $('calc-result').replaceChildren(el('p', 'muted', t('reading')));
    Promise.all(Array.prototype.map.call(list, readFile)).then(function (groups) {
      if (mine !== ticket) return;
      files = [].concat.apply([], groups).map(function (f) { return { name: f.name, cal: AH.ics.parse(f.text, f.name) }; });
      expanded = null;
      if (!files.length) { error('no-ics'); render(null); return; }
      compute();
    }, function (e) {
      if (mine !== ticket) return;
      // Erreur connue (no-inflate, zip-method…) : son message ; toute autre (archive abîmée) : « ce .zip n'a pas pu être ouvert ».
      var code = e && e.message;
      files = []; expanded = null; error(t('msg.' + code) ? code : 'not-zip'); render(null);
    });
  }
  // Rendez-vous de la période, gardés tant qu'elle ne change pas : mots-clés et cases ne refont que les totaux.
  function expand(from, to, range) {
    if (expanded && expanded.key === from + '|' + to) return expanded;
    var p = { key: from + '|' + to, events: [], warnings: [], order: [], shown: [] };
    files.forEach(function (f) {
      var res = AH.ics.expand(f.cal, { range: range, zoneFor: zoneFor, defaultTz: tz });
      p.shown.push({ name: f.name, calendar: res.calendarName, bad: !!res.error, count: res.events.length });
      if (res.error) return;
      p.order.push(res.calendarId);
      p.events = p.events.concat(res.events);
      p.warnings = p.warnings.concat(res.warnings);
    });
    expanded = p;
    return p;
  }
  function compute() {
    if (!files.length) return;
    var from = $('calc-from').value, to = $('calc-to').value, rg = AH.exporter.range(from, to, zone);
    if (!rg.ok) {
      error(rg.error.replace(/^err[.]/, ''));
      renderFiles(files.map(function (f) { return { name: f.name, calendar: f.cal.calendarName, bad: !!f.cal.error, count: null }; }));
      render(null, null, t('invalidPeriod'));
      return;
    }
    error(null);
    var p = expand(from, to, rg.range);
    renderFiles(p.shown);
    if (!p.order.length) { error('no-ics'); render(null); return; }
    render(AH.hours.compute(p.events, { from: from, to: to, zone: zone, keywords: $('calc-kw').value, calendarOrder: p.order,
      skipAllDay: $('calc-allday').checked, skipDeclined: $('calc-declined').checked, skipFree: $('calc-free').checked }), p.warnings);
  }
  function renderFiles(shown) {
    $('calc-files').replaceChildren.apply($('calc-files'), shown.map(function (f) {
      if (f.bad) return el('li', 'bad', t('notCalendar', { name: f.name }));
      return el('li', '', f.count == null ? f.calendar : f.calendar + ' · ' + t('inPeriod', { n: f.count }));
    }));
  }
  function table(title, head, rows) {
    var s = el('div', 'calc-block'), tb = el('table', 'calc-table'), tr = el('tr'), th = el('thead'), body = el('tbody');
    s.appendChild(el('h2', null, title));
    head.forEach(function (h) { tr.appendChild(el('th', null, h)); });
    th.appendChild(tr); tb.appendChild(th);
    rows.forEach(function (r) { var row = el('tr'); r.forEach(function (c) { row.appendChild(el('td', null, c)); }); body.appendChild(row); });
    tb.appendChild(body); s.appendChild(tb);
    return s;
  }
  // Avertissement de lecture : nombre de rendez-vous concernés, puis leurs titres.
  function warn(list, key) {
    if (!list.length) return null;
    return el('p', 'calc-warn', t(key, { n: list.length, titles: list.map(function (w) { return w.title || t('noTitle'); }).join(', ') }));
  }
  function render(r, warnings, note) {
    var box = $('calc-result'), H = AH.hours, parts = [], ws = warnings || [];
    if (!r) { box.replaceChildren(el('p', 'muted', note || t('placeholder'))); return; }
    if (!r.ok) { error(r.error); return; }
    var left = LEFT_OUT.filter(function (k) { return r.excluded[k]; }).map(function (k) { return t('left.' + k, { n: r.excluded[k] }); });
    parts.push(el('p', 'muted', t('heading', { from: day($('calc-from').value), to: day($('calc-to').value), zone: r.zone })));
    parts.push(el('p', 'calc-big', H.hm(r.total.minutes)));
    parts.push(el('p', 'calc-sub', t('summary', { hours: HOURS.format(r.total.minutes / 60), n: r.total.count }) + (left.length ? ' · ' + t('leftOut', { list: left.join(', ') }) : '')));
    function row(x) { return [x.other ? t('noKeyword') : x.name, H.hm(x.minutes), String(x.count)]; }
    if (r.byKeyword) parts.push(table(t('byKeyword'), [t('colKeyword'), t('colHours'), t('colEvents')], r.byKeyword.map(row)));
    parts.push(table(t('byCalendar'), [t('colCalendar'), t('colHours'), t('colEvents')], r.byCalendar.map(row)));
    parts.push(table(t('byWeek'), [t('colWeek'), t('colHours'), t('colEvents')], r.byWeek.map(function (w) {
      return [day(w.monday) + (w.partial ? ' ' + t('partWeek') : ''), H.hm(w.minutes), String(w.count)];
    })));
    parts.push(warn(ws.filter(function (w) { return w.code === 'rule'; }), 'warnRule'));
    parts.push(warn(ws.filter(function (w) { return w.code === 'long'; }), 'warnLong'));
    box.replaceChildren.apply(box, parts.filter(Boolean));
  }
  // Valeur vidée après lecture : choisir de nouveau le même fichier (nouvel export du même nom) relance le calcul.
  $('calc-file').addEventListener('change', function (e) { take(e.target.files); e.target.value = ''; });
  var drop = $('calc-drop');
  ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function () { drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); take(e.dataTransfer && e.dataTransfer.files); });
  function later() { clearTimeout(timer); timer = setTimeout(compute, 250); }
  ['calc-from', 'calc-to', 'calc-kw'].forEach(function (id) { $(id).addEventListener('input', later); });
  ['calc-allday', 'calc-declined', 'calc-free'].forEach(function (id) { $(id).addEventListener('change', compute); });
})();
