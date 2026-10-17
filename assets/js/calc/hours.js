// hours.js — totaux de la calculatrice du site (seo/ESSAI-B.md) : une période, par agenda, par mot-clé tapé, par semaine.
// Aucun montant ni taux (bornes de l'essai B). Sélection et exclusions par le moteur du module (src/core/events.js) ; un
// mot-clé est une règle « titre » du moteur (src/core/rules.js : sans majuscules ni accents, la première qui convient).
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.hours = (function () {
  'use strict';
  var DAY = 86400000, OTHER = 'No keyword';
  // Motif d'exclusion du moteur → compteur affiché.
  var REASON = { allDay: 'allDay', declined: 'declined', transparent: 'free', duplicate: 'duplicate' };
  function dep(n) { return (typeof module !== 'undefined' && module.exports) ? require('../core/' + n + '.js') : AH[n]; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // Mots-clés tapés, séparés par des virgules, vides retirés.
  function keywords(s) { return String(s || '').split(',').map(function (k) { return k.trim(); }).filter(Boolean); }
  // Semaines du lundi au dimanche qui touchent la période, dans le fuseau choisi.
  function weeks(from, rg, zone) {
    var a = from.split('-').map(Number), t = Date.UTC(a[0], a[1] - 1, a[2]), out = [];
    t -= ((new Date(t).getUTCDay() + 6) % 7) * DAY;
    for (; ; t += 7 * DAY) {
      var d = new Date(t), n = new Date(t + 7 * DAY);
      var w = { monday: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()),
        start: zone.fromLocal(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 0, 0), end: zone.fromLocal(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate(), 0, 0) };
      if (w.start >= rg.end) break;
      w.partial = w.start < rg.start || w.end > rg.end;
      out.push(w);
    }
    return out;
  }
  // o : { from, to (AAAA-MM-JJ), zone, keywords, skipAllDay, skipDeclined, skipFree, calendarOrder }.
  function compute(events, o) {
    var r = dep('exporter').range(o.from, o.to, o.zone);
    if (!r.ok) return { ok: false, error: r.error.replace(/^err[.]/, '') };
    var rg = r.range, P = dep('periods'), R = dep('rules');
    var sel = dep('events').select(events, rg, { excludeAllDay: !!o.skipAllDay, excludeDeclined: !!o.skipDeclined, excludeTransparent: !!o.skipFree }, o.calendarOrder || []);
    var kws = keywords(o.keywords), rules = R.prepare(kws.map(function (k) { return { type: 'title', value: k }; }));
    var cals = {}, calNames = [], byKw = kws.map(function (k) { return { name: k, minutes: 0, count: 0 }; });
    var other = { name: OTHER, other: true, minutes: 0, count: 0 }, wk = weeks(o.from, rg, o.zone).map(function (w) { return Object.assign(w, { minutes: 0, count: 0 }); });
    var total = { minutes: 0, count: 0 }, excluded = { allDay: 0, declined: 0, free: 0, duplicate: 0 };
    sel.excluded.forEach(function (x) { var k = REASON[x.reason]; if (k) excluded[k] += 1; });
    sel.kept.forEach(function (k) {
      var mn = k.part.minutes, id = k.ev.calendarId || k.ev.calendarName || '';
      total.minutes += mn; total.count += 1;
      if (!cals[id]) { cals[id] = { id: id, name: k.ev.calendarName || id, minutes: 0, count: 0 }; calNames.push(id); }
      cals[id].minutes += mn; cals[id].count += 1;
      if (kws.length) {
        var ctx = R.context(k.ev), i = -1;
        for (var j = 0; j < rules.length; j++) if (R.matches(rules[j], k.ev, ctx)) { i = j; break; }
        var slot = i >= 0 ? byKw[i] : other;
        slot.minutes += mn; slot.count += 1;
      }
      wk.forEach(function (w) { var p = P.clip(k.part, w); if (p) { w.minutes += p.minutes; w.count += 1; } });
    });
    // Deux agendas du même nom : l'adresse de chacun est ajoutée pour les distinguer.
    var byCal = calNames.map(function (n) { return cals[n]; });
    byCal.forEach(function (c) { if (byCal.filter(function (d) { return d.name === c.name; }).length > 1) c.label = c.name + ' (' + c.id + ')'; });
    return { ok: true, range: rg, zone: o.zone.tz, total: total, excluded: excluded,
      byCalendar: byCal.map(function (c) { return { name: c.label || c.name, minutes: c.minutes, count: c.count }; })
        .sort(function (a, b) { return b.minutes - a.minutes || (a.name < b.name ? -1 : 1); }),
      byKeyword: kws.length ? byKw.concat([other]) : null,
      byWeek: wk.map(function (w) { return { monday: w.monday, partial: w.partial, minutes: w.minutes, count: w.count }; }) };
  }
  // 86 h 45 → « 86:45 ».
  function hm(minutes) { var m = Math.round(minutes); return Math.floor(m / 60) + ':' + pad(m % 60); }
  return { compute: compute, keywords: keywords, hm: hm, OTHER: OTHER };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.hours;
