// convert.js — convertisseur « Google Calendar to Excel and CSV » du site (2026-10-19) : une ligne par rendez-vous d'une
// période, récurrences développées par ics.js, sélection et exclusions par le moteur du module (src/core/events.js, comme la
// calculatrice), partie dans la période seulement (marquée comme dans la feuille du module). Deux sorties : feuille Excel
// typée avec total (xlsx.js), CSV pour Excel (BOM, CRLF, séparateur et virgule décimale de la langue). Logique pure.
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.convert = (function () {
  'use strict';
  var DAY = 86400000, EPOCH = 25569, CRLF = String.fromCharCode(13, 10), BOM = String.fromCharCode(0xFEFF);
  function dep(n) { return (typeof module !== 'undefined' && module.exports) ? require('../core/' + n + '.js') : AH[n]; }
  // Règles partagées avec la calculatrice : sélection, exclusions, libellé des agendas, durée en h:mm (src/calc/hours.js).
  function hours() { return (typeof module !== 'undefined' && module.exports) ? require('./hours.js') : AH.hours; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // o : { from, to (AAAA-MM-JJ), zone, skipAllDay, skipDeclined, skipFree, calendarOrder }.
  function table(events, o) {
    var s = hours().pick(events, o);
    if (!s.ok) return s;
    // Deux agendas du même nom (deux comptes « Work ») : l'adresse de chacun est ajoutée, comme dans la calculatrice.
    var label = hours().calendarLabels(s.kept.map(function (k) { return k.ev; }));
    return { ok: true, range: s.range, excluded: s.excluded, rows: s.kept.map(function (k) {
      return { start: k.part.start, end: k.part.end, minutes: k.part.minutes, partial: !!k.part.partial, title: k.ev.title || '',
        calendar: label(k.ev), location: k.ev.location || '', description: k.ev.description || '' };
    }) };
  }
  // Heure locale du fuseau → numéro de série d'Excel (jours depuis le 30/12/1899, fraction = heure).
  function serial(ms, zone) { var p = zone.parts(ms); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s || 0) / DAY + EPOCH; }
  function title(r, text) { return (r.title || text.noTitle) + (r.partial ? ' ' + text.part : ''); }
  var STYLES = ['date', 'time', 'time', 'duration', 'hours', 'text', 'text', 'text', 'text'], WIDTHS = [12, 7, 7, 9, 7, 40, 24, 24, 40];
  // text : { heads (9 colonnes), sheet, total, part, noTitle }.
  function sheet(t, zone, text) {
    return { name: text.sheet, total: { label: text.total, sum: [3, 4] },
      columns: text.heads.map(function (h, i) { return { head: h, style: STYLES[i], width: WIDTHS[i] }; }),
      rows: t.rows.map(function (r) {
        var s = serial(r.start, zone);
        return [Math.floor(s), s, serial(r.end, zone), r.minutes / 1440, r.minutes / 60, title(r, text), r.calendar, r.location, r.description];
      }) };
  }
  // Champ CSV : un texte qui commencerait par = + - @ (ou tabulation, retour) serait lu comme une formule par Excel → apostrophe
  // devant ; guillemets si séparateur, guillemet ou retour à la ligne.
  function field(v, sep, isText) {
    var s = String(v == null ? '' : v), c = s.charCodeAt(0);
    if (isText && s && ('=+-@'.indexOf(s.charAt(0)) >= 0 || c === 9 || c === 13)) s = "'" + s;
    if (s.indexOf(sep) >= 0 || s.indexOf('"') >= 0 || s.indexOf(String.fromCharCode(10)) >= 0 || s.indexOf(String.fromCharCode(13)) >= 0) s = '"' + s.split('"').join('""') + '"';
    return s;
  }
  // fmt : { sep, decimal } choisis par la page selon la langue du navigateur (virgule décimale → point-virgule, comme Excel).
  function csv(t, zone, text, fmt) {
    var sep = fmt.sep, lines = [text.heads.map(function (h) { return field(h, sep, true); }).join(sep)];
    t.rows.forEach(function (r) {
      var hrs = (Math.round(r.minutes / 60 * 100) / 100).toFixed(2).replace('.', fmt.decimal);
      lines.push([dep('zone').dateKey(r.start, zone), clock(r.start, zone), clock(r.end, zone), hours().hm(r.minutes), field(hrs, sep, false)]
        .concat([title(r, text), r.calendar, r.location, r.description].map(function (x) { return field(x, sep, true); })).join(sep));
    });
    return BOM + lines.join(CRLF) + CRLF;
  }
  // Heure locale « HH:MM » (CSV et aperçu de la page).
  function clock(ms, zone) { var p = zone.parts(ms); return pad(p.h) + ':' + pad(p.min); }
  function fileName(from, to, ext) { return 'google-calendar-' + from + '-to-' + to + '.' + ext; }
  return { table: table, sheet: sheet, csv: csv, clock: clock, fileName: fileName, serial: serial };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.convert;
