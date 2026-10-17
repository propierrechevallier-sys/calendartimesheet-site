// periods.js — mois, bornes locales et découpage au prorata (cahier des charges § 5.1). Logique pure.
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.periods = (function () {
  'use strict';
  var MIN = 60000;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function monthRange(y, m, zone) {
    var ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
    return { start: zone.fromLocal(y, m, 1, 0, 0), end: zone.fromLocal(ny, nm, 1, 0, 0), key: y + '-' + pad(m) };
  }
  function monthOf(ms, zone) { var p = zone.parts(ms); return monthRange(p.y, p.m, zone); }
  function previousMonth(ms, zone) { var p = zone.parts(ms); return p.m === 1 ? monthRange(p.y - 1, 12, zone) : monthRange(p.y, p.m - 1, zone); }
  function dayStart(dateStr, zone) { var a = String(dateStr).split('-').map(Number); return zone.fromLocal(a[0], a[1], a[2], 0, 0); }
  function clip(ev, range) {
    var s = Math.max(ev.start, range.start), e = Math.min(ev.end, range.end);
    if (!(e > s)) return null;
    return { start: s, end: e, minutes: Math.round((e - s) / MIN), partial: s !== ev.start || e !== ev.end };
  }
  function closeAt(ms, hour, zone) { var p = zone.parts(ms); return zone.fromLocal(p.y, p.m, 1, hour, 0); }
  // Clé « AAAA-MM » → bornes du mois (une seule fonction, utilisée par app, sheetgrid et tabs).
  function rangeOfKey(key, zone) { var a = String(key).split('-').map(Number); return monthRange(a[0], a[1], zone); }
  return { monthRange: monthRange, monthOf: monthOf, previousMonth: previousMonth, dayStart: dayStart, clip: clip, closeAt: closeAt, rangeOfKey: rangeOfKey };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.periods;
