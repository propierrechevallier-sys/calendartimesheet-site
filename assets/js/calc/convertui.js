// convertui.js — page « Google Calendar to Excel and CSV converter » (2026-10-19) : aperçu des lignes, fichier .xlsx ou .csv
// créé par le navigateur et enregistré sur l'ordinateur. Dépôt, lecture, période, cases et liste des fichiers : mécanique
// commune (src/calc/page.js). Rien n'est envoyé ni gardé ; les textes du fichier sont affichés par textContent, jamais comme
// du HTML. Textes, nombres et dates dans la langue de la page (src/calc/text.js) ; CSV au format de la langue du navigateur.
(function () {
  'use strict';
  if (typeof document === 'undefined' || !document.getElementById('conv')) return;
  var PREVIEW = 10, LEFT_OUT = ['allDay', 'declined', 'free', 'duplicate'], C = AH.convert;
  // current : lignes prêtes à télécharger (null tant qu'il n'y a rien de valable).
  var current = null;
  var P = AH.calcPage.create({ prefix: 'conv', texts: 'conv', reset: function () { ready(null); }, run: function (pd, p, opts) {
    var tb = C.table(p.events, Object.assign({ from: pd.from, to: pd.to, zone: P.zone, calendarOrder: p.order }, opts));
    ready(tb, pd.from, pd.to);
    render(tb, p.warnings, pd);
  } });
  var t = P.t, el = P.el, TX = AH.calcText.TEXT[P.L].conv, xlsx = P.$('conv-xlsx'), csv = P.$('conv-csv');
  var LABELS = { heads: ['date', 'start', 'end', 'duration', 'hours', 'title', 'calendar', 'location', 'description'].map(function (k) { return TX.heads[k]; }),
    sheet: TX.sheet, total: TX.total, part: TX.part, noTitle: t('noTitle') };
  // CSV qu'Excel ouvre en colonnes sur cet ordinateur : virgule décimale dans la langue du navigateur → point-virgule.
  var nav = (navigator.languages && navigator.languages[0]) || navigator.language || P.L;
  var DEC = new Intl.NumberFormat(nav).format(1.5).indexOf(',') >= 0 ? ',' : '.', FMT = { sep: DEC === ',' ? ';' : ',', decimal: DEC };
  function ready(table, from, to) { current = table && table.rows.length ? { table: table, from: from, to: to } : null; xlsx.disabled = csv.disabled = !current; }
  // Aperçu : les premières lignes, telles qu'elles seront dans le fichier (titre marqué si coupé par la période).
  function preview(rows) {
    var wrap = el('div', 'calc-scroll'), tb = el('table', 'calc-table conv-table'), head = el('tr'), th = el('thead'), body = el('tbody');
    [TX.heads.date, TX.heads.start, TX.heads.end, TX.heads.duration, TX.heads.title, TX.heads.calendar].forEach(function (h) { head.appendChild(el('th', null, h)); });
    th.appendChild(head); tb.appendChild(th);
    rows.slice(0, PREVIEW).forEach(function (r) {
      var tr = el('tr');
      [P.day(AH.zone.dateKey(r.start, P.zone)), C.clock(r.start, P.zone), C.clock(r.end, P.zone), AH.hours.hm(r.minutes),
        (r.title || t('noTitle')) + (r.partial ? ' ' + TX.part : ''), r.calendar].forEach(function (c) { tr.appendChild(el('td', null, c)); });
      body.appendChild(tr);
    });
    tb.appendChild(body); wrap.appendChild(tb);
    return wrap;
  }
  function render(tb, ws, pd) {
    var total = tb.rows.reduce(function (a, r) { return a + r.minutes; }, 0);
    var left = LEFT_OUT.filter(function (k) { return tb.excluded[k]; }).map(function (k) { return t('left.' + k, { n: tb.excluded[k] }); });
    P.result([P.heading(pd),
      el('p', 'calc-sub conv-sum', t('conv.summary', { n: tb.rows.length, hours: P.hours.format(total / 60) }) + (left.length ? ' · ' + t('leftOut', { list: left.join(', ') }) : '')),
      tb.rows.length ? preview(tb.rows) : el('p', 'muted', TX.none),
      tb.rows.length > PREVIEW && el('p', 'muted conv-more', t('conv.preview', { shown: PREVIEW, n: tb.rows.length })),
      P.warn(ws.filter(function (w) { return w.code === 'rule'; }), 'conv.warnRule'),
      P.warn(ws.filter(function (w) { return w.code === 'long'; }), 'conv.warnLong')]);
  }
  // Fichier créé dans le navigateur et proposé à l'enregistrement : aucune requête réseau.
  function download(kind) {
    if (!current) return;
    var blob = kind === 'xlsx'
      ? new Blob([AH.xlsx.build(C.sheet(current.table, P.zone, LABELS))], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      : new Blob([C.csv(current.table, P.zone, LABELS, FMT)], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = C.fileName(current.from, current.to, kind);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }
  xlsx.addEventListener('click', function () { download('xlsx'); });
  csv.addEventListener('click', function () { download('csv'); });
})();
