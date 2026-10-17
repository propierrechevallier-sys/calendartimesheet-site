// events.js — sélection des rendez-vous d'une période : doublons, exclusions, durée inhabituelle (§ 5.2, § 5.3).
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.events = (function () {
  'use strict';
  var LONG_MIN = 720;
  function dep(n) { return (typeof module !== 'undefined' && module.exports) ? require('./' + n + '.js') : AH[n]; }
  function isLong(part) { return part.minutes > LONG_MIN; }
  // Verdict d'une copie : { skip } hors période, { reason } exclue, { part } gardable.
  function verdict(ev, range, s, P) {
    if (!ev || typeof ev.start !== 'number' || typeof ev.end !== 'number' || ev.end < ev.start) return { reason: 'invalid' };
    if (ev.end === ev.start) return ev.start >= range.start && ev.start < range.end ? { reason: 'zero' } : { skip: true };
    var part = P.clip(ev, range);
    if (!part) return { skip: true };
    if (ev.allDay && s.excludeAllDay !== false) return { reason: 'allDay' };
    if (ev.myStatus === 'NO' && s.excludeDeclined !== false) return { reason: 'declined' };
    if (ev.myStatus === 'INVITED' && s.excludeNoReply === true) return { reason: 'noReply' };
    if (ev.transparency === 'transparent' && s.excludeTransparent === true) return { reason: 'transparent' };
    if (!(part.minutes > 0)) return { reason: 'zero' };
    return { part: part };
  }
  // Un même rendez-vous dans plusieurs agendas (même identifiant, même début) n'est gardé qu'une fois : la première copie
  // non exclue, dans l'ordre des agendas ; les autres copies non exclues sont jointes (alts) pour le classement.
  function select(events, range, settings, calendarOrder) {
    var P = dep('periods'), s = settings || {}, order = calendarOrder || [];
    var groups = {}, keys = [], kept = [], excluded = [];
    function rank(e) { var i = order.indexOf(e && e.calendarId); return i < 0 ? order.length : i; }
    var list = (events || []).slice().sort(function (a, b) { return rank(a) - rank(b); });
    list.forEach(function (ev) {
      var v = verdict(ev, range, s, P);
      if (v.skip) return;
      if (v.reason === 'invalid' || v.reason === 'zero' && ev.end === ev.start || !ev.id) {
        if (v.reason) excluded.push({ ev: ev, reason: v.reason });
        else kept.push({ ev: ev, part: v.part, long: isLong(v.part), alts: [] });
        return;
      }
      var key = ev.id + '|' + ev.start;
      if (!groups[key]) { groups[key] = []; keys.push(key); }
      groups[key].push({ ev: ev, v: v });
    });
    keys.forEach(function (key) {
      var copies = groups[key], ok = copies.filter(function (c) { return !c.v.reason; });
      if (!ok.length) {
        copies.forEach(function (c, i) { excluded.push({ ev: c.ev, reason: i === 0 ? c.v.reason : 'duplicate' }); });
        return;
      }
      var first = ok[0];
      kept.push({ ev: first.ev, part: first.v.part, long: isLong(first.v.part),
        alts: ok.slice(1).map(function (c) { return { ev: c.ev, part: c.v.part }; }) });
      copies.forEach(function (c) { if (c !== first) excluded.push({ ev: c.ev, reason: c.v.reason || 'duplicate' }); });
    });
    kept.sort(function (a, b) { return a.part.start - b.part.start; });
    return { kept: kept, excluded: excluded };
  }
  // Clé d'un rendez-vous : l'identifiant d'occurrence de Google quand il existe (stable si le rendez-vous est déplacé),
  // sinon identifiant + début. Sert aux Notes, à « À classer » et aux choix faits à la main.
  function key(ev) { return ev.key ? 'ev:' + ev.key : 'ev:' + ev.id + '|' + ev.start; }
  return { select: select, key: key, LONG_MIN: LONG_MIN };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.events;
