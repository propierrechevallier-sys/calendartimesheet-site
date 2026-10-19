// ui.js — page « Google Calendar hours calculator » (seo/ESSAI-B.md) : totaux par mot-clé, par agenda et par semaine.
// Dépôt, lecture, période, cases et liste des fichiers : mécanique commune (src/calc/page.js, revue du 2026-10-19). Tout
// reste dans le navigateur ; les textes du fichier sont affichés par textContent, jamais comme du HTML. Textes, nombres et
// dates dans la langue de la page (<html lang>, src/calc/text.js).
(function () {
  'use strict';
  if (typeof document === 'undefined' || !document.getElementById('calc')) return;
  var LEFT_OUT = ['allDay', 'declined', 'free', 'duplicate'], H = AH.hours;
  var P = AH.calcPage.create({ prefix: 'calc', inputs: ['kw'], run: function (pd, p, opts) {
    render(H.compute(p.events, Object.assign({ from: pd.from, to: pd.to, zone: P.zone, keywords: P.$('calc-kw').value, calendarOrder: p.order }, opts)), p.warnings, pd);
  } });
  var t = P.t, el = P.el;
  function table(title, head, rows) {
    var s = el('div', 'calc-block'), tb = el('table', 'calc-table'), tr = el('tr'), th = el('thead'), body = el('tbody');
    s.appendChild(el('h2', null, title));
    head.forEach(function (h) { tr.appendChild(el('th', null, h)); });
    th.appendChild(tr); tb.appendChild(th);
    rows.forEach(function (r) { var row = el('tr'); r.forEach(function (c) { row.appendChild(el('td', null, c)); }); body.appendChild(row); });
    tb.appendChild(body); s.appendChild(tb);
    return s;
  }
  function render(r, ws, pd) {
    if (!r.ok) { P.error(r.error); return; }
    var left = LEFT_OUT.filter(function (k) { return r.excluded[k]; }).map(function (k) { return t('left.' + k, { n: r.excluded[k] }); });
    function row(x) { return [x.other ? t('noKeyword') : x.name, H.hm(x.minutes), String(x.count)]; }
    P.result([P.heading(pd), el('p', 'calc-big', H.hm(r.total.minutes)),
      el('p', 'calc-sub', t('summary', { hours: P.hours.format(r.total.minutes / 60), n: r.total.count }) + (left.length ? ' · ' + t('leftOut', { list: left.join(', ') }) : '')),
      r.byKeyword && table(t('byKeyword'), [t('colKeyword'), t('colHours'), t('colEvents')], r.byKeyword.map(row)),
      table(t('byCalendar'), [t('colCalendar'), t('colHours'), t('colEvents')], r.byCalendar.map(row)),
      table(t('byWeek'), [t('colWeek'), t('colHours'), t('colEvents')], r.byWeek.map(function (w) {
        return [P.day(w.monday) + (w.partial ? ' ' + t('partWeek') : ''), H.hm(w.minutes), String(w.count)];
      })),
      P.warn(ws.filter(function (w) { return w.code === 'rule'; }), 'warnRule'),
      P.warn(ws.filter(function (w) { return w.code === 'long'; }), 'warnLong')]);
  }
})();
