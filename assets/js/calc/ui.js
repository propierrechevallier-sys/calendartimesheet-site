// ui.js — page « Google Calendar hours calculator » (seo/ESSAI-B.md) : fichiers déposés, période, mots-clés, résultats.
// Tout reste dans le navigateur : lecture du fichier, décompression, calcul. Aucun envoi, aucun stockage. Les textes du
// fichier (titres, noms d'agendas) sont affichés par textContent, jamais comme du HTML.
(function () {
  'use strict';
  if (typeof document === 'undefined' || !document.getElementById('calc')) return;
  function $(id) { return document.getElementById(id); }
  var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
  var zoneFor = AH.ics.zones(), zone = zoneFor(tz) || zoneFor('UTC');
  // files : [{ name, cal }] lus une fois au dépôt ; expanded : rendez-vous de la période en cours, refaits si elle change.
  var files = [], expanded = null, timer = null, ticket = 0;
  var MSG = {
    'not-zip': 'This .zip could not be opened. Try unzipping it and dropping the .ics files.',
    'no-inflate': 'Your browser cannot open .zip files. Unzip the export first, then drop the .ics files.',
    'zip-method': 'This .zip uses a compression the calculator cannot read. Unzip it first, then drop the .ics files.',
    'no-ics': 'No calendar file (.ics) was found in what you dropped.',
    date: 'Choose a valid start date and end date.', order: 'The end date is before the start date.', tooLong: 'Choose a period of 366 days or less.'
  };
  var LEFT_OUT = [['allDay', 'all-day'], ['declined', 'declined'], ['free', 'marked free'], ['duplicate', 'found twice']];
  // Période proposée : le mois dernier, celui qu'on facture.
  var last = AH.periods.previousMonth(Date.now(), zone);
  $('calc-from').value = AH.zone.dateKey(last.start, zone);
  $('calc-to').value = AH.zone.dateKey(last.end - 1, zone);
  var DAYFMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  function day(s) { var a = s.split('-').map(Number); return DAYFMT.format(new Date(Date.UTC(a[0], a[1] - 1, a[2]))); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function plural(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }
  function error(code) { var p = $('calc-error'); if (!code) { p.hidden = true; p.textContent = ''; return; } p.textContent = MSG[code] || code; p.hidden = false; }
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
    $('calc-result').replaceChildren(el('p', 'muted', 'Reading your calendar…'));
    Promise.all(Array.prototype.map.call(list, readFile)).then(function (groups) {
      if (mine !== ticket) return;
      files = [].concat.apply([], groups).map(function (f) { return { name: f.name, cal: AH.ics.parse(f.text, f.name) }; });
      expanded = null;
      if (!files.length) { error('no-ics'); render(null); return; }
      compute();
    }, function (e) { if (mine !== ticket) return; files = []; expanded = null; error(e && e.message); render(null); });
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
      render(null, null, 'Choose a valid period to see your totals.');
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
      if (f.bad) return el('li', 'bad', f.name + ': not a calendar file');
      return el('li', '', f.count == null ? f.calendar : f.calendar + ' · ' + plural(f.count, 'event') + ' in the period');
    }));
  }
  function table(title, head, rows) {
    var s = el('div', 'calc-block'), t = el('table', 'calc-table'), tr = el('tr'), th = el('thead'), tb = el('tbody');
    s.appendChild(el('h2', null, title));
    head.forEach(function (h) { tr.appendChild(el('th', null, h)); });
    th.appendChild(tr); t.appendChild(th);
    rows.forEach(function (r) { var row = el('tr'); r.forEach(function (c) { row.appendChild(el('td', null, c)); }); tb.appendChild(row); });
    t.appendChild(tb); s.appendChild(t);
    return s;
  }
  // Avertissement de lecture : nombre de rendez-vous concernés, puis leurs titres.
  function warn(list, one, many, tail) {
    if (!list.length) return null;
    return el('p', 'calc-warn', list.length + (list.length === 1 ? one : many) + tail + list.map(function (w) { return w.title || '(no title)'; }).join(', ') + '.');
  }
  function render(r, warnings, note) {
    var box = $('calc-result'), H = AH.hours, parts = [], ws = warnings || [];
    if (!r) { box.replaceChildren(el('p', 'muted', note || 'Your totals appear here as soon as a file is read.')); return; }
    if (!r.ok) { error(r.error); return; }
    var left = LEFT_OUT.filter(function (k) { return r.excluded[k[0]]; }).map(function (k) { return r.excluded[k[0]] + ' ' + k[1]; });
    parts.push(el('p', 'muted', day($('calc-from').value) + ' to ' + day($('calc-to').value) + ' · times in ' + r.zone));
    parts.push(el('p', 'calc-big', H.hm(r.total.minutes)));
    parts.push(el('p', 'calc-sub', (r.total.minutes / 60).toFixed(2) + ' hours in ' + plural(r.total.count, 'event') + (left.length ? ' · left out: ' + left.join(', ') : '')));
    function row(x) { return [x.name, H.hm(x.minutes), String(x.count)]; }
    if (r.byKeyword) parts.push(table('By keyword', ['Keyword', 'Hours', 'Events'], r.byKeyword.map(row)));
    parts.push(table('By calendar', ['Calendar', 'Hours', 'Events'], r.byCalendar.map(row)));
    parts.push(table('By week', ['Week starting', 'Hours', 'Events'], r.byWeek.map(function (w) {
      return [day(w.monday) + (w.partial ? ' (part of the week)' : ''), H.hm(w.minutes), String(w.count)];
    })));
    parts.push(warn(ws.filter(function (w) { return w.code === 'rule'; }), ' repeating event uses', ' repeating events use',
      ' a rule this calculator cannot expand; only the first date is counted: '));
    parts.push(warn(ws.filter(function (w) { return w.code === 'long'; }), ' repeating event goes', ' repeating events go',
      ' back too far to be expanded in full; the total may be short: '));
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
