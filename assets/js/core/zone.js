// zone.js — fuseau de la feuille : heures locales d'un instant et instant d'une heure locale (§ 5.1). Logique pure.
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.zone = (function () {
  'use strict';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // partsFn(ms) → { y, m, d, h, min, s } dans le fuseau tz ; fromLocal corrige deux fois le décalage (changements d'heure).
  function make(tz, partsFn) {
    function offset(ms) { var p = partsFn(ms); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000; }
    function fromLocal(y, m, d, h, min) {
      var wall = Date.UTC(y, m - 1, d, h || 0, min || 0);
      var t = wall - offset(wall);
      return wall - offset(t);
    }
    return { tz: tz, parts: partsFn, fromLocal: fromLocal };
  }
  function intlParts(tz) {
    var fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    return function (ms) {
      var o = {};
      fmt.formatToParts(new Date(ms)).forEach(function (p) { if (p.type !== 'literal') o[p.type] = Number(p.value); });
      return { y: o.year, m: o.month, d: o.day, h: o.hour, min: o.minute, s: o.second };
    };
  }
  // Apps Script : format = Utilities.formatDate(date, tz, motif).
  function formatParts(tz, format) {
    return function (ms) {
      var a = String(format(new Date(ms), tz, 'yyyy-M-d-H-m-s')).split('-').map(Number);
      return { y: a[0], m: a[1], d: a[2], h: a[3], min: a[4], s: a[5] };
    };
  }
  function dateKey(ms, zone) { var p = zone.parts(ms); return p.y + '-' + pad(p.m) + '-' + pad(p.d); }
  return { make: make, intlParts: intlParts, formatParts: formatParts, dateKey: dateKey };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.zone;
