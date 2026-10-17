// exporter.js — export gratuit (§ 3) : une ligne par rendez-vous d'une période, totaux par couleur et par agenda.
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.exporter = (function () {
  'use strict';
  var MAX_DAYS = 366, DAY = 86400000, W = 7;
  function dep(n) { return (typeof module !== 'undefined' && module.exports) ? require('./' + n + '.js') : AH[n]; }
  function validDate(s) {
    var a = String(s == null ? '' : s).trim().split('-');
    if (a.length !== 3 || a[0].length !== 4 || a[1].length !== 2 || a[2].length !== 2) return null;
    var y = Number(a[0]), m = Number(a[1]), d = Number(a[2]);
    if (!(y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    return new Date(Date.UTC(y, m - 1, d)).getUTCDate() === d ? [y, m, d] : null;
  }
  // Période [du 00:00, au lendemain 00:00) dans le fuseau de la feuille ; 366 jours au plus (6 minutes par exécution).
  function range(from, to, zone) {
    var a = validDate(from), b = validDate(to);
    if (!a || !b) return { ok: false, error: 'err.date' };
    var days = (Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / DAY + 1;
    if (days < 1) return { ok: false, error: 'err.order' };
    if (days > MAX_DAYS) return { ok: false, error: 'err.tooLong' };
    var next = new Date(Date.UTC(b[0], b[1] - 1, b[2] + 1));
    return { ok: true, range: { start: zone.fromLocal(a[0], a[1], a[2], 0, 0), end: zone.fromLocal(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0) } };
  }
  function colourName(v, lang) {
    var s = String(v || '');
    return s.charAt(0) === 'e' && dep('gcal').COLORS[s.slice(1)] ? dep('i18n').t(lang, 'color.' + s) : dep('i18n').t(lang, 'export.calColour');
  }
  function grid(events, rg, o) {
    var I = dep('i18n'), G = dep('sheetgrid'), lang = o.lang || 'en', sel = dep('events').select(events, rg, o.settings || {}, o.calendarOrder || []);
    var values = [], formats = [], bold = [], roles = [], byColour = {}, byCal = {}, colOrder = [], calOrder = [];
    function t(k, v) { return I.t(lang, k, v); }
    // Rôle de chaque ligne (plan 5) : l'apparence est décidée par sheetstyle.js.
    function row(cells, f, role) { var r = [], ff = []; for (var i = 0; i < W; i++) { r.push(cells[i] == null ? '' : cells[i]); ff.push(f && f[i] ? f[i] : ''); } values.push(r); formats.push(ff); roles.push(role || 'data'); }
    function add(m, ord, name, mn) { if (!Object.prototype.hasOwnProperty.call(m, name)) { m[name] = { minutes: 0, count: 0 }; ord.push(name); } m[name].minutes += mn; m[name].count += 1; }
    function totals(title, m, ord) {
      row([], null, 'blank'); row([title], null, 'section'); bold.push(values.length);
      row([t('export.name'), t('col.time'), t('export.count')], null, 'head'); bold.push(values.length);
      ord.slice().sort(function (a, b) { return m[b].minutes - m[a].minutes || (a < b ? -1 : 1); })
        .forEach(function (n) { row([G.safe(n), m[n].minutes / 1440, m[n].count], ['', '[h]:mm', '0']); });
    }
    row([t('export.title', { from: o.from, to: o.to })], null, 'title'); bold.push(1);
    row([t('export.sub')], null, 'sub'); row([], null, 'blank');
    row([t('col.date'), t('col.start'), t('col.end'), t('col.time'), t('col.event'), t('export.calendar'), t('export.colour')], null, 'head'); bold.push(4);
    if (!sel.kept.length) row(['', '', '', '', t('export.none')]);
    sel.kept.forEach(function (k) {
      var e = k.ev, names = o.calendarNames || {}, cal = Object.prototype.hasOwnProperty.call(names, e.calendarId) ? names[e.calendarId] : (e.calendarName || e.calendarId), col = colourName(e.color, lang);
      var title = (e.title || t('st.noTitle')) + (k.part.partial ? ' ' + t('st.partial') : '');
      row([{ d: k.part.start }, { d: k.part.start }, { d: k.part.end }, k.part.minutes / 1440, G.safe(title), G.safe(cal), col], ['ddd d mmm yyyy', 'hh:mm', 'hh:mm', '[h]:mm', '', '', '']);
      add(byColour, colOrder, col, k.part.minutes); add(byCal, calOrder, cal, k.part.minutes);
    });
    totals(t('export.byColour'), byColour, colOrder); totals(t('export.byCalendar'), byCal, calOrder);
    return { values: values, formats: formats, bold: bold, roles: roles, kind: 'export', freeze: 4, count: sel.kept.length };
  }
  return { MAX_DAYS: MAX_DAYS, validDate: validDate, range: range, grid: grid };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.exporter;
