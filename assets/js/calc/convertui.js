// convertui.js — page « Google Calendar to Excel and CSV converter » (2026-10-19) : fichiers déposés, période, aperçu des
// lignes, fichier .xlsx ou .csv créé par le navigateur et enregistré sur l'ordinateur. Rien n'est envoyé ni gardé. Les textes
// du fichier (titres, lieux, noms d'agendas) sont affichés par textContent, jamais comme du HTML. Textes, nombres et dates
// dans la langue de la page (<html lang>, src/calc/text.js) ; CSV au format de la langue du navigateur.
(function () {
  'use strict';
  if (typeof document === 'undefined' || !document.getElementById('conv')) return;
  function $(id) { return document.getElementById(id); }
  var L = AH.calcText.lang(document.documentElement.lang), TX = AH.calcText.TEXT[L].conv;
  function t(key, vars) { return AH.calcText.say(L, key, vars); }
  var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
  var zoneFor = AH.ics.zones(), zone = zoneFor(tz) || zoneFor('UTC');
  // files : [{ name, cal }] lus une fois au dépôt ; expanded : rendez-vous de la période, refaits si elle change ;
  // current : lignes prêtes à télécharger (null tant qu'il n'y a rien de valable).
  var files = [], expanded = null, current = null, timer = null, ticket = 0, PREVIEW = 10;
  var LEFT_OUT = ['allDay', 'declined', 'free', 'duplicate'];
  var LABELS = { heads: ['date', 'start', 'end', 'duration', 'hours', 'title', 'calendar', 'location', 'description'].map(function (k) { return TX.heads[k]; }),
    sheet: TX.sheet, total: TX.total, part: TX.part, noTitle: t('noTitle') };
  // CSV qu'Excel ouvre en colonnes sur cet ordinateur : virgule décimale dans la langue du navigateur → point-virgule.
  var nav = (navigator.languages && navigator.languages[0]) || navigator.language || L;
  var DEC = new Intl.NumberFormat(nav).format(1.5).indexOf(',') >= 0 ? ',' : '.', FMT = { sep: DEC === ',' ? ';' : ',', decimal: DEC };
  // Période proposée : le mois dernier.
  var last = AH.periods.previousMonth(Date.now(), zone);
  $('conv-from').value = AH.zone.dateKey(last.start, zone);
  $('conv-to').value = AH.zone.dateKey(last.end - 1, zone);
  var DAYFMT = new Intl.DateTimeFormat(L === 'en' ? 'en-GB' : L, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  var HOURS = new Intl.NumberFormat(L, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function day(s) { var a = s.split('-').map(Number); return DAYFMT.format(new Date(Date.UTC(a[0], a[1] - 1, a[2]))); }
  function clock(ms) { var p = zone.parts(ms); return pad(p.h) + ':' + pad(p.min); }
  function dayOf(ms) { var p = zone.parts(ms); return DAYFMT.format(new Date(Date.UTC(p.y, p.m - 1, p.d))); }
  function hm(m) { return Math.floor(m / 60) + ':' + pad(m % 60); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function error(code) { var p = $('conv-error'); if (!code) { p.hidden = true; p.textContent = ''; return; } p.textContent = t('msg.' + code) || code; p.hidden = false; }
  function ready(table, from, to) { current = table && table.rows.length ? { table: table, from: from, to: to } : null; $('conv-xlsx').disabled = $('conv-csv').disabled = !current; }
  // Seul le dernier dépôt compte : un dépôt plus ancien qui finit après lui est ignoré.
  function take(list) {
    if (!list || !list.length) return;
    var mine = ++ticket;
    error(null); ready(null);
    $('conv-result').replaceChildren(el('p', 'muted', t('reading')));
    Promise.all(Array.prototype.map.call(list, AH.calcFiles.read)).then(function (groups) {
      if (mine !== ticket) return;
      files = [].concat.apply([], groups).map(function (f) { return { name: f.name, cal: AH.ics.parse(f.text, f.name) }; });
      expanded = null;
      if (!files.length) { error('no-ics'); render(null); return; }
      compute();
    }, function (e) {
      if (mine !== ticket) return;
      var code = e && e.message;
      files = []; expanded = null; error(t('msg.' + code) ? code : 'not-zip'); render(null);
    });
  }
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
    var from = $('conv-from').value, to = $('conv-to').value, rg = AH.exporter.range(from, to, zone);
    if (!rg.ok) {
      error(rg.error.replace(/^err[.]/, '')); ready(null);
      renderFiles(files.map(function (f) { return { name: f.name, calendar: f.cal.calendarName, bad: !!f.cal.error, count: null }; }));
      render(null, null, t('invalidPeriod'));
      return;
    }
    error(null);
    var p = expand(from, to, rg.range);
    renderFiles(p.shown);
    if (!p.order.length) { error('no-ics'); ready(null); render(null); return; }
    var tb = AH.convert.table(p.events, { from: from, to: to, zone: zone, calendarOrder: p.order,
      skipAllDay: $('conv-allday').checked, skipDeclined: $('conv-declined').checked, skipFree: $('conv-free').checked });
    if (!tb.ok) { error(tb.error); ready(null); render(null); return; }
    ready(tb, from, to);
    render(tb, p.warnings, null, from, to);
  }
  function renderFiles(shown) {
    $('conv-files').replaceChildren.apply($('conv-files'), shown.map(function (f) {
      if (f.bad) return el('li', 'bad', t('notCalendar', { name: f.name }));
      return el('li', '', f.count == null ? f.calendar : f.calendar + ' · ' + t('inPeriod', { n: f.count }));
    }));
  }
  function warn(list, key) {
    if (!list.length) return null;
    return el('p', 'calc-warn', t(key, { n: list.length, titles: list.map(function (w) { return w.title || t('noTitle'); }).join(', ') }));
  }
  // Aperçu : les premières lignes, telles qu'elles seront dans le fichier (titre marqué si coupé par la période).
  function preview(rows) {
    var wrap = el('div', 'calc-scroll'), tb = el('table', 'calc-table conv-table'), head = el('tr'), th = el('thead'), body = el('tbody');
    [TX.heads.date, TX.heads.start, TX.heads.end, TX.heads.duration, TX.heads.title, TX.heads.calendar].forEach(function (h) { head.appendChild(el('th', null, h)); });
    th.appendChild(head); tb.appendChild(th);
    rows.slice(0, PREVIEW).forEach(function (r) {
      var tr = el('tr');
      [dayOf(r.start), clock(r.start), clock(r.end), hm(r.minutes), (r.title || t('noTitle')) + (r.partial ? ' ' + TX.part : ''), r.calendar]
        .forEach(function (c) { tr.appendChild(el('td', null, c)); });
      body.appendChild(tr);
    });
    tb.appendChild(body); wrap.appendChild(tb);
    return wrap;
  }
  function render(tb, warnings, note, from, to) {
    var box = $('conv-result'), parts = [], ws = warnings || [];
    if (!tb) { box.replaceChildren(el('p', 'muted', note || TX.placeholder)); return; }
    var total = tb.rows.reduce(function (a, r) { return a + r.minutes; }, 0);
    var left = LEFT_OUT.filter(function (k) { return tb.excluded[k]; }).map(function (k) { return t('left.' + k, { n: tb.excluded[k] }); });
    parts.push(el('p', 'muted', t('heading', { from: day(from), to: day(to), zone: tz })));
    parts.push(el('p', 'calc-sub conv-sum', t('conv.summary', { n: tb.rows.length, hours: HOURS.format(total / 60) }) + (left.length ? ' · ' + t('leftOut', { list: left.join(', ') }) : '')));
    if (!tb.rows.length) parts.push(el('p', 'muted', TX.none));
    else {
      parts.push(preview(tb.rows));
      if (tb.rows.length > PREVIEW) parts.push(el('p', 'muted conv-more', t('conv.preview', { shown: PREVIEW, n: tb.rows.length })));
    }
    parts.push(warn(ws.filter(function (w) { return w.code === 'rule'; }), 'conv.warnRule'));
    parts.push(warn(ws.filter(function (w) { return w.code === 'long'; }), 'conv.warnLong'));
    box.replaceChildren.apply(box, parts.filter(Boolean));
  }
  // Fichier créé dans le navigateur et proposé à l'enregistrement : aucune requête réseau.
  function download(kind) {
    if (!current) return;
    var blob = kind === 'xlsx'
      ? new Blob([AH.xlsx.build(AH.convert.sheet(current.table, zone, LABELS))], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      : new Blob([AH.convert.csv(current.table, zone, LABELS, FMT)], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = AH.convert.fileName(current.from, current.to, kind);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }
  $('conv-xlsx').addEventListener('click', function () { download('xlsx'); });
  $('conv-csv').addEventListener('click', function () { download('csv'); });
  // Valeur vidée après lecture : choisir de nouveau le même fichier (nouvel export du même nom) relance la lecture.
  $('conv-file').addEventListener('change', function (e) { take(e.target.files); e.target.value = ''; });
  var drop = $('conv-drop');
  ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function () { drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); take(e.dataTransfer && e.dataTransfer.files); });
  function later() { clearTimeout(timer); timer = setTimeout(compute, 250); }
  ['conv-from', 'conv-to'].forEach(function (id) { $(id).addEventListener('input', later); });
  ['conv-allday', 'conv-declined', 'conv-free'].forEach(function (id) { $(id).addEventListener('change', compute); });
})();
