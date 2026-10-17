// billable.js — calculatrice d'heures facturables du site (2026-10-17) : durées tapées une par ligne (1:30, 1h30, 45 min,
// 1,5 heure, ou une plage 9:00-10:35), arrondi au-dessus et minimum par ligne avec la règle du module (src/core/billing.js,
// billedMinutes), montant au centime, et tableau de conversion des minutes en heures décimales. Logique pure.
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.billable = (function () {
  'use strict';
  function dep(n) { return (typeof module !== 'undefined' && module.exports) ? require('../core/' + n + '.js') : AH[n]; }
  var DASHES = ['–', '—', '‒', '−'];
  // Unités écrites en toutes lettres dans les 7 langues du site, les plus longues d'abord.
  var HOUR = ['stunden', 'heures', 'hours', 'stunde', 'heure', 'horas', 'hour', 'hora', 'hrs', 'std', 'uur', '時間', 'hr', 'h'];
  var MINUTE = ['minuten', 'minutes', 'minutos', 'minute', 'minuto', 'mins', 'min', 'mn', '分', 'm'];
  var H = '(' + HOUR.join('|') + ')', M = '(' + MINUTE.join('|') + ')';
  var RE_HM = new RegExp('^([0-9]+)' + H + '([0-9]{1,2})' + M + '?$'), RE_H = new RegExp('^([0-9]+(?:[.,][0-9]+)?)' + H + '$'), RE_M = new RegExp('^([0-9]+)' + M + '$');
  var MAX = 1440;
  // Saisie ramenée à une forme simple : caractères pleine largeur d'un clavier japonais (« １：３０ ») en caractères ordinaires,
  // espaces de toute sorte (tabulation d'un tableur comprise) en espaces, minuscules, tirets typographiques en « - ».
  function normal(s) {
    var t = String(s == null ? '' : s), out = '';
    for (var i = 0; i < t.length; i++) {
      var c = t.charCodeAt(i);
      out += c >= 65281 && c <= 65374 ? String.fromCharCode(c - 65248) : (c === 9 || c === 160 || c === 12288 ? ' ' : t.charAt(i));
    }
    out = out.toLowerCase();
    DASHES.forEach(function (d) { out = out.split(d).join('-'); });
    return out.trim();
  }
  function num(s) { return Number(String(s).replace(',', '.')); }
  // Heure de la journée (9:00, 9h, 9h30, 9, 11:30am, 1pm) → minutes depuis minuit ; null si invalide.
  function clock(s) {
    var m = /^([0-9]{1,2})(?:[:h]([0-9]{2})?)?(am|pm)?$/.exec(s);
    if (!m) return null;
    var h = Number(m[1]), min = m[2] ? Number(m[2]) : 0;
    if (min > 59) return null;
    if (m[3]) { if (h < 1 || h > 12) return null; h = h % 12 + (m[3] === 'pm' ? 12 : 0); } else if (h > 23) return null;
    return h * 60 + min;
  }
  // Plage « 1-2pm » : le côté sans am/pm prend celui de l'autre s'il reste avant lui (« 11-1pm » = 11 h à 13 h).
  function range(left, right) {
    var b = clock(right), suffix = /(am|pm)$/.exec(right), a = null;
    if (suffix && !/(am|pm)$/.test(left)) { var withSuffix = clock(left + suffix[1]); if (withSuffix != null && b != null && withSuffix <= b) a = withSuffix; }
    if (a == null) a = clock(left);
    if (a == null || b == null) return null;
    return b >= a ? b - a : b + 1440 - a;
  }
  // Une ligne → minutes, ou null si elle ne se lit pas. Deux nombres séparés par une espace (« 1 30 ») et toute saisie de
  // plus de 24 heures (« 45 » lu 45 heures) sont refusés : la ligne est signalée au lieu d'être facturée à tort.
  function parse(raw) {
    var t = normal(raw), m, v = null;
    if (!t || /[0-9][ ]+[0-9]/.test(t)) return null;
    var s = t.split(' ').join(''), dash = s.indexOf('-');
    if (dash === 0) return null;
    if (dash > 0) v = range(s.slice(0, dash), s.slice(dash + 1));
    else if ((m = /^([0-9]+):([0-9]{2})$/.exec(s))) v = Number(m[2]) > 59 ? null : Number(m[1]) * 60 + Number(m[2]);
    else if ((m = RE_HM.exec(s))) v = Number(m[3]) > 59 ? null : Number(m[1]) * 60 + Number(m[3]);
    else if ((m = RE_H.exec(s))) v = Math.round(num(m[1]) * 60);
    else if ((m = RE_M.exec(s))) v = Number(m[1]);
    else if ((m = /^[0-9]+(?:[.,][0-9]+)?$/.exec(s))) v = Math.round(num(m[0]) * 60);
    return v == null || v > MAX ? null : v;
  }
  // o : { rounding (minutes), minimum (minutes), rateCents (null : pas de montant) }.
  function compute(lines, o) {
    var B = dep('billing'), rows = [], invalid = [], total = { minutes: 0, billed: 0, amountCents: o.rateCents == null ? null : 0 };
    (lines || []).forEach(function (raw) {
      var txt = String(raw == null ? '' : raw).trim();
      if (!txt) return;
      var min = parse(txt);
      if (min == null) { invalid.push(txt); return; }
      var billed = B.billedMinutes(min, o.rounding, o.minimum), amount = o.rateCents == null ? null : B.amountCents(billed, o.rateCents);
      rows.push({ input: txt, minutes: min, billed: billed, amountCents: amount });
      total.minutes += min; total.billed += billed;
      if (amount != null) total.amountCents += amount;
    });
    // Pour comparer : le total arrondi une seule fois, sans minimum (le minimum vaut par rendez-vous).
    // Sans arrondi, pas de comparaison : seul le minimum ferait l'écart.
    var once = o.rounding > 0 ? B.billedMinutes(total.minutes, o.rounding, 0) : null;
    return { rows: rows, invalid: invalid, total: total, once: once == null ? null : { billed: once, amountCents: o.rateCents == null ? null : B.amountCents(once, o.rateCents) } };
  }
  // Tableau de conversion : chaque minute de 1 à 60 en heures décimales (deux décimales), et les tranches de 6 minutes.
  function chart() {
    var minutes = [], tenths = [];
    for (var m = 1; m <= 60; m++) minutes.push({ m: m, h: Math.round(m / 60 * 100) / 100 });
    for (var t = 1; t <= 10; t++) tenths.push({ from: t * 6 - 5, to: t * 6, h: t / 10 });
    return { minutes: minutes, tenths: tenths };
  }
  return { parse: parse, compute: compute, chart: chart };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.billable;
