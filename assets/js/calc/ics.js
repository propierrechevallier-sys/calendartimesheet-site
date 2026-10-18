// ics.js — lecture d'un fichier .ics exporté par Google Agenda, pour la calculatrice du site (seo/ESSAI-B.md). Logique pure,
// dans le navigateur comme sous Node. Rend des rendez-vous au format du moteur (src/core/gcal.js normalize) : répétitions
// développées sur la période demandée, exceptions appliquées. Hors du module publié (pas dans CORE de tools/build.js).
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.ics = (function () {
  'use strict';
  // Caractères de contrôle écrits par leur code : aucune barre oblique inverse dans les sources (test/source.test.js).
  var DAY = 86400000, MAX_STEPS = 200000, CR = String.fromCharCode(13), LF = String.fromCharCode(10), TAB = String.fromCharCode(9), BS = String.fromCharCode(92);
  var WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  var STATUS = { ACCEPTED: 'YES', DECLINED: 'NO', TENTATIVE: 'MAYBE', 'NEEDS-ACTION': 'INVITED' };
  var RULE_KEYS = ['FREQ', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY', 'BYMONTHDAY', 'BYMONTH', 'WKST'];
  function dep(n) { return (typeof module !== 'undefined' && module.exports) ? require('../core/' + n + '.js') : AH[n]; }
  // Fuseaux nommés (IANA) mis en cache ; un nom inconnu du navigateur rend null.
  function zones() {
    var Z = dep('zone'), cache = {};
    return function (tz) {
      if (!Object.prototype.hasOwnProperty.call(cache, tz)) {
        try { cache[tz] = Z.make(tz, Z.intlParts(tz)); } catch (e) { cache[tz] = null; }
      }
      return cache[tz];
    };
  }
  // Lignes dépliées (RFC 5545 § 3.1) → { name, params, value }.
  function lines(text) {
    var raw = String(text || '').split(CR + LF).join(LF).split(CR).join(LF).split(LF), out = [];
    raw.forEach(function (l) {
      if ((l.charAt(0) === ' ' || l.charAt(0) === TAB) && out.length) out[out.length - 1] += l.slice(1);
      else if (l) out.push(l);
    });
    return out.map(function (l) {
      var i = -1, q = false;
      for (var k = 0; k < l.length; k++) { var c = l.charAt(k); if (c === '"') q = !q; else if (c === ':' && !q) { i = k; break; } }
      if (i < 0) return null;
      var head = l.slice(0, i).split(';'), params = {};
      head.slice(1).forEach(function (p) { var j = p.indexOf('='); if (j > 0) params[p.slice(0, j).toUpperCase()] = p.slice(j + 1).replace(/^"|"$/g, ''); });
      return { name: head[0].toUpperCase(), params: params, value: l.slice(i + 1) };
    }).filter(Boolean);
  }
  // Texte échappé (RFC 5545 § 3.3.11) : la barre oblique inverse devant une virgule, un point-virgule, elle-même ou « n ».
  function unescape(s) {
    var t = String(s), out = '';
    for (var i = 0; i < t.length; i++) {
      var c = t.charAt(i);
      if (c === BS && i + 1 < t.length) { var n = t.charAt(++i); out += n === 'n' || n === 'N' ? LF : n; } else out += c;
    }
    return out;
  }
  // Valeur de date : { date: [a, m, j], time: [h, min, s] | null, utc }.
  function dateValue(v) {
    var m = /^([0-9]{4})([0-9]{2})([0-9]{2})(?:T([0-9]{2})([0-9]{2})([0-9]{2})(Z?))?$/.exec(String(v).trim());
    if (!m) return null;
    return { date: [+m[1], +m[2], +m[3]], time: m[4] ? [+m[4], +m[5], +m[6]] : null, utc: m[7] === 'Z' };
  }
  function addDays(date, n) { var d = new Date(Date.UTC(date[0], date[1] - 1, date[2] + n)); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; }
  function weekday(date) { return new Date(Date.UTC(date[0], date[1] - 1, date[2])).getUTCDay(); }
  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function cmpDate(a, b) { return (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]); }
  // Durée ISO 8601 (DURATION) en millisecondes.
  function duration(v) {
    var m = /^([+-])?P(?:([0-9]+)W)?(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?)?$/.exec(String(v || '').trim());
    if (!m) return null;
    var ms = (((+m[2] || 0) * 7 + (+m[3] || 0)) * 24 * 3600 + (+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0)) * 1000;
    return m[1] === '-' ? -ms : ms;
  }
  function parseRule(v) {
    var r = {}, bad = false;
    String(v || '').split(';').forEach(function (p) {
      var j = p.indexOf('='); if (j < 0) return;
      var k = p.slice(0, j).toUpperCase(), val = p.slice(j + 1);
      if (RULE_KEYS.indexOf(k) < 0) { bad = true; return; }
      r[k] = val;
    });
    r.FREQ = String(r.FREQ || '').toUpperCase();
    if (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].indexOf(r.FREQ) < 0) bad = true;
    r.interval = Math.max(1, parseInt(r.INTERVAL, 10) || 1);
    r.count = r.COUNT ? parseInt(r.COUNT, 10) : null;
    r.byday = r.BYDAY ? r.BYDAY.split(',').map(function (s) {
      var m = /^([+-]?[0-9]{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(s.trim().toUpperCase());
      if (!m) { bad = true; return null; }
      return { n: m[1] ? parseInt(m[1], 10) : 0, wd: WD[m[2]] };
    }).filter(Boolean) : null;
    r.bymonthday = r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(Number) : null;
    r.bymonth = r.BYMONTH ? r.BYMONTH.split(',').map(Number) : null;
    r.wkst = WD[String(r.WKST || 'MO').toUpperCase()];
    if (r.wkst == null) r.wkst = 1;
    // Jours de la semaine sur toute une année (« YEARLY;BYDAY=… » sans mois) : jamais produit par Google Agenda, non deviné.
    if (r.FREQ === 'YEARLY' && !r.bymonth && (r.byday || r.bymonthday)) bad = true;
    if (r.FREQ !== 'MONTHLY' && r.FREQ !== 'YEARLY' && r.byday && r.byday.some(function (d) { return d.n; })) bad = true;
    r.bad = bad;
    return r;
  }
  // Jours candidats d'un mois selon BYMONTHDAY / BYDAY ; jour de départ sinon.
  function monthDays(y, m, rule, startDay) {
    var dim = daysIn(y, m), out = [];
    if (rule.bymonthday) rule.bymonthday.forEach(function (d) { var x = d < 0 ? dim + d + 1 : d; if (x >= 1 && x <= dim) out.push(x); });
    else if (!rule.byday) { if (startDay <= dim) out.push(startDay); }
    if (rule.byday) {
      var fromBy = [];
      rule.byday.forEach(function (b) {
        var all = [];
        for (var d = 1; d <= dim; d++) if (weekday([y, m, d]) === b.wd) all.push(d);
        if (!b.n) fromBy = fromBy.concat(all);
        else { var x = b.n > 0 ? all[b.n - 1] : all[all.length + b.n]; if (x) fromBy.push(x); }
      });
      out = rule.bymonthday ? out.filter(function (d) { return fromBy.indexOf(d) >= 0; }) : fromBy;
    }
    return out.filter(function (d, i) { return out.indexOf(d) === i; }).sort(function (a, b) { return a - b; });
  }
  // Dates de la répétition, dans l'ordre, à partir de la date de départ ; visit(date) rend false pour arrêter. La génération
  // s'arrête aussi quand une période commence après limit (ms), même sans date retenue (règle qui ne tombe jamais).
  function eachDate(start, rule, visit, limit) {
    var steps = 0, go = true;
    function emit(d) { if (cmpDate(d, start) < 0) return true; return visit(d) !== false; }
    function filt(d) {
      if (rule.bymonth && rule.bymonth.indexOf(d[1]) < 0) return false;
      if (rule.FREQ === 'DAILY' || rule.FREQ === 'WEEKLY') {
        if (rule.FREQ === 'DAILY' && rule.byday && !rule.byday.some(function (b) { return b.wd === weekday(d); })) return false;
        if (rule.bymonthday && rule.bymonthday.indexOf(d[2]) < 0 && rule.bymonthday.indexOf(d[2] - daysIn(d[0], d[1]) - 1) < 0) return false;
      }
      return true;
    }
    while (go && steps < MAX_STEPS) {
      var batch = [], first;
      steps += 1;
      if (rule.FREQ === 'DAILY') {
        first = addDays(start, (steps - 1) * rule.interval);
        batch = [first];
      } else if (rule.FREQ === 'WEEKLY') {
        first = addDays(start, -((weekday(start) - rule.wkst + 7) % 7) + (steps - 1) * 7 * rule.interval);
        var wds = rule.byday ? rule.byday.map(function (b) { return b.wd; }) : [weekday(start)];
        for (var i = 0; i < 7; i++) { var d = addDays(first, i); if (wds.indexOf(weekday(d)) >= 0) batch.push(d); }
      } else if (rule.FREQ === 'MONTHLY') {
        var mi = (start[1] - 1) + (steps - 1) * rule.interval, yy = start[0] + Math.floor(mi / 12), mm = (mi % 12) + 1;
        first = [yy, mm, 1];
        batch = monthDays(yy, mm, rule, start[2]).map(function (x) { return [yy, mm, x]; });
      } else {
        var yr = start[0] + (steps - 1) * rule.interval, months = rule.bymonth || [start[1]];
        first = [yr, 1, 1];
        months.slice().sort(function (a, b) { return a - b; }).forEach(function (mo) {
          monthDays(yr, mo, rule, start[2]).forEach(function (x) { batch.push([yr, mo, x]); });
        });
      }
      if (Date.UTC(first[0], first[1] - 1, first[2]) - 2 * DAY > limit || first[0] > 9999) break;
      for (var k = 0; k < batch.length && go; k++) if (filt(batch[k])) go = emit(batch[k]);
    }
    return go && steps >= MAX_STEPS;
  }
  function prop(ev, n) { return ev[n] && ev[n][0]; }
  function uid(ev) { return String((prop(ev, 'UID') || {}).value || ''); }
  function cancelled(ev) { var s = prop(ev, 'STATUS'); return !!s && String(s.value).toUpperCase() === 'CANCELLED'; }
  // Lecture du texte, une fois par fichier : agenda, fuseau, adresses de l'agenda, rendez-vous bruts.
  function parse(text, fileName) {
    var all = lines(text);
    var fileId = String(fileName || '').split('/').pop().split(BS).pop();
    if (/[.]ics$/i.test(fileId)) fileId = fileId.slice(0, -4);
    fileId = fileId.replace(/ [(][0-9]+[)]$/, '');
    var cal = { calendarId: fileId, calendarName: fileId, calTz: null, vevents: [], owners: [] };
    if (!all.length || all[0].name !== 'BEGIN' || String(all[0].value).toUpperCase() !== 'VCALENDAR') { cal.error = 'not-ics'; return cal; }
    var cur = null, depth = 0;
    all.forEach(function (l) {
      var v = String(l.value).toUpperCase();
      if (l.name === 'BEGIN') { if (v === 'VEVENT' && !depth) cur = {}; else if (cur) depth++; return; }
      if (l.name === 'END') { if (v === 'VEVENT' && cur && !depth) { cal.vevents.push(cur); cur = null; } else if (cur && depth) depth--; return; }
      if (cur) { if (!depth) (cur[l.name] = cur[l.name] || []).push(l); return; }
      if (l.name === 'X-WR-CALNAME') cal.calendarName = unescape(l.value);
      if (l.name === 'X-WR-TIMEZONE') cal.calTz = l.value.trim();
    });
    // Adresse de l'agenda : nom du fichier de Google, ou nom de l'agenda principal (son adresse) si le fichier a été renommé.
    cal.owners = [fileId.toLowerCase()].concat(cal.calendarName.indexOf('@') > 0 ? [cal.calendarName.trim().toLowerCase()] : []);
    return cal;
  }
  // Rendez-vous d'un agenda lu, pour une période (o.range en ms) ; o.zoneFor(nom) → fuseau ; o.defaultTz : fuseau de l'utilisateur.
  function expand(cal, o) {
    var range = o.range, zoneFor = o.zoneFor, warnings = [];
    var result = { calendarId: cal.calendarId, calendarName: cal.calendarName, events: [], warnings: warnings };
    if (cal.error) { result.error = cal.error; result.calendarName = cal.calendarId; return result; }
    // Journées entières et heures flottantes : fuseau de l'utilisateur (celui des bornes de la période), sinon celui de l'agenda.
    var fallback = (o.defaultTz && zoneFor(o.defaultTz)) ? o.defaultTz : cal.calTz;
    function zoneOf(tz) { return (tz && zoneFor(tz)) || zoneFor(fallback) || zoneFor('UTC'); }
    // Instant d'une date de l'agenda ; tz : fuseau de la propriété.
    function ms(date, time, tz, utc) {
      if (utc) return Date.UTC(date[0], date[1] - 1, date[2], time[0], time[1], time[2]);
      var t = time || [0, 0, 0], z = zoneOf(tz);
      return z.fromLocal(date[0], date[1], date[2], t[0], t[1]) + t[2] * 1000;
    }
    function when(p) { if (!p) return null; var dv = dateValue(p.value); if (!dv) return null; dv.tz = p.params.TZID; dv.ms = ms(dv.date, dv.time, dv.tz, dv.utc); return dv; }
    // Fenêtre en jours (UTC) autour de la période : une date de répétition hors d'elle n'est pas convertie dans son fuseau,
    // ce qui évite des milliers d'appels pour un rendez-vous répété depuis des années.
    var winStart = Math.floor(range.start / DAY) - 2, winEnd = Math.floor(range.end / DAY) + 2;
    function dayNum(d) { return Date.UTC(d[0], d[1] - 1, d[2]) / DAY; }
    // Texte d'une propriété (titre, lieu, description), caractères échappés rendus ; vide si absente.
    function txt(ev, name) { var p = prop(ev, name); return p ? unescape(p.value) : ''; }
    function base(ev) {
      var att = (ev.ATTENDEE || []).filter(function (a) { return cal.owners.indexOf(String(a.value).replace(/^mailto:/i, '').trim().toLowerCase()) >= 0; })[0];
      var tr = prop(ev, 'TRANSP');
      return { id: uid(ev), calendarId: cal.calendarId, calendarName: cal.calendarName, title: txt(ev, 'SUMMARY'), location: txt(ev, 'LOCATION'), description: txt(ev, 'DESCRIPTION'),
        myStatus: att ? (STATUS[String(att.params.PARTSTAT || '').toUpperCase()] || 'INVITED') : 'OWNER',
        transparency: tr && String(tr.value).toUpperCase() === 'TRANSPARENT' ? 'transparent' : 'opaque' };
    }
    function push(b, start, end, allDay) {
      if (!(end > range.start && start < range.end) && !(end === start && start >= range.start && start < range.end)) return;
      result.events.push(Object.assign({}, b, { key: b.id + '|' + start, start: start, end: end, allDay: allDay }));
    }
    // Durée d'un rendez-vous : DTEND, sinon DURATION, sinon un jour (journée entière) ou zéro.
    function span(ev, s) {
      var e = when(prop(ev, 'DTEND'));
      if (e) return { endMs: e.ms, days: s.time ? 0 : Math.round((Date.UTC(e.date[0], e.date[1] - 1, e.date[2]) - Date.UTC(s.date[0], s.date[1] - 1, s.date[2])) / DAY) };
      var d = duration((prop(ev, 'DURATION') || {}).value);
      if (d != null) return { endMs: s.ms + d, days: s.time ? 0 : Math.round(d / DAY) };
      return { endMs: s.time ? s.ms : null, days: s.time ? 0 : 1 };
    }
    // Occurrences déplacées ou annulées : RECURRENCE-ID d'un même UID.
    var moved = {};
    cal.vevents.forEach(function (ev) {
      var rid = when(prop(ev, 'RECURRENCE-ID'));
      if (rid) (moved[uid(ev)] = moved[uid(ev)] || {})[rid.ms] = true;
    });
    cal.vevents.forEach(function (ev) {
      var s = when(prop(ev, 'DTSTART'));
      if (!s || cancelled(ev)) return;
      var b = base(ev), sp = span(ev, s), allDay = !s.time;
      function endOf(startDate, startMs) { return allDay ? ms(addDays(startDate, sp.days), null, s.tz, false) : startMs + (sp.endMs - s.ms); }
      var ruleProp = !prop(ev, 'RECURRENCE-ID') && prop(ev, 'RRULE'), rule = ruleProp ? parseRule(ruleProp.value) : null;
      if (rule && rule.bad) warnings.push({ code: 'rule', uid: b.id, title: b.title });
      if (!rule || rule.bad) { push(b, s.ms, endOf(s.date, s.ms), allDay); return; }
      var until = rule.UNTIL ? dateValue(rule.UNTIL) : null, untilMs = null;
      if (until) untilMs = until.time ? ms(until.date, until.time, s.tz, until.utc) : ms(addDays(until.date, 1), null, s.tz, false) - 1;
      var ex = {};
      (ev.EXDATE || []).forEach(function (p) {
        String(p.value).split(',').forEach(function (v) { var dv = dateValue(v); if (dv) ex[ms(dv.date, dv.time, p.params.TZID || s.tz, dv.utc)] = true; });
      });
      // COUNT compte toutes les occurrences de la règle, y compris avant la période et celles retirées par EXDATE. Une date
      // bien avant la fenêtre (durée du rendez-vous comprise) est seulement comptée ; une date bien après arrête tout.
      var skip = moved[b.id] || {}, n = 0, before = winStart - Math.ceil((allDay ? sp.days * DAY : Math.max(0, sp.endMs - s.ms)) / DAY);
      var untilDay = untilMs != null ? Math.floor(untilMs / DAY) : null;
      var capped = eachDate(s.date, rule, function (d) {
        var dn = dayNum(d);
        if (rule.count != null && n >= rule.count) return false;
        if ((untilDay != null && dn > untilDay + 1) || dn > winEnd) return false;
        if (dn < before) { n += 1; return true; }
        var st = ms(d, s.time, s.tz, s.utc);
        if ((untilMs != null && st > untilMs) || st >= range.end) return false;
        n += 1;
        if (!ex[st] && !skip[st]) push(b, st, endOf(d, st), allDay);
        return true;
      }, range.end);
      if (capped) warnings.push({ code: 'long', uid: b.id, title: b.title });
    });
    return result;
  }
  // Lecture et développement en une fois (tests, fichier unique).
  function read(text, o) { return expand(parse(text, o.fileName), o); }
  return { read: read, parse: parse, expand: expand, zones: zones };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.ics;
