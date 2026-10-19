// page.js — mécanique commune aux deux outils du site qui lisent l'export de Google Agenda (calculatrice d'heures,
// convertisseur Excel ; revue du 2026-10-19) : langue de la page, fuseau, période proposée, dépôt et lecture des fichiers
// (le dernier dépôt gagne), période vérifiée, rendez-vous gardés tant qu'elle ne change pas, liste des fichiers lus, cases
// d'exclusion, erreurs. Chaque outil ne fournit que son calcul et son affichage (o.run). Les textes des fichiers sont
// affichés par textContent, jamais comme du HTML ; rien n'est envoyé ni gardé.
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.calcPage = (function () {
  'use strict';
  // o : { prefix ('calc' ou 'conv', début des identifiants de la page), run(pd, p, opts) (calcul et affichage, période
  // valide et au moins un agenda lu), reset (ce que l'outil efface quand il n'a plus de résultat), texts (groupe de textes
  // propre à l'outil dans src/calc/text.js : placeholder, invalidPeriod et msg y sont cherchés d'abord), inputs (champs
  // en plus de la période, relancés après une pause) }.
  function create(o) {
    function $(id) { return document.getElementById(id); }
    var pre = o.prefix + '-', L = AH.calcText.lang(document.documentElement.lang);
    function t(key, vars) { return AH.calcText.say(L, key, vars); }
    // Texte propre à l'outil s'il existe, sinon celui de la calculatrice.
    function own(key, vars) { return (o.texts && t(o.texts + '.' + key, vars)) || t(key, vars); }
    var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC', zoneFor = AH.ics.zones(), zone = zoneFor(tz) || zoneFor('UTC');
    // files : [{ name, cal }] lus une fois au dépôt ; expanded : rendez-vous de la période en cours, refaits si elle change.
    var files = [], expanded = null, timer = null, ticket = 0;
    // Période proposée : le mois dernier, celui qu'on facture.
    var last = AH.periods.previousMonth(Date.now(), zone);
    $(pre + 'from').value = AH.zone.dateKey(last.start, zone);
    $(pre + 'to').value = AH.zone.dateKey(last.end - 1, zone);
    var DAYFMT = new Intl.DateTimeFormat(L === 'en' ? 'en-GB' : L, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    var HOURS = new Intl.NumberFormat(L, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    function day(s) { var a = s.split('-').map(Number); return DAYFMT.format(new Date(Date.UTC(a[0], a[1] - 1, a[2]))); }
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function error(code) { var p = $(pre + 'error'); if (!code) { p.hidden = true; p.textContent = ''; return; } p.textContent = own('msg.' + code) || code; p.hidden = false; }
    function result(nodes) { var box = $(pre + 'result'); box.replaceChildren.apply(box, nodes.filter(Boolean)); }
    // Plus de résultat : l'outil efface ce qu'il gardait, puis le texte d'attente (ou la raison) s'affiche.
    function empty(note) { if (o.reset) o.reset(); result([el('p', 'muted', note || own('placeholder'))]); }
    function renderFiles(shown) {
      $(pre + 'files').replaceChildren.apply($(pre + 'files'), shown.map(function (f) {
        if (f.bad) return el('li', 'bad', t('notCalendar', { name: f.name }));
        return el('li', '', f.count == null ? f.calendar : f.calendar + ' · ' + t('inPeriod', { n: f.count }));
      }));
    }
    // Un nouveau dépôt efface aussitôt l'ancien (fichiers, liste, résultat, et ce que l'outil garde) : un changement de
    // période ou de case pendant la lecture ne recalcule plus sur les anciens fichiers. Seul le dernier dépôt compte.
    function take(list) {
      if (!list || !list.length) return;
      var mine = ++ticket;
      files = []; expanded = null; error(null); renderFiles([]);
      empty(t('reading'));
      Promise.all(Array.prototype.map.call(list, AH.calcFiles.read)).then(function (groups) {
        if (mine !== ticket) return;
        files = [].concat.apply([], groups).map(function (f) { return { name: f.name, cal: AH.ics.parse(f.text, f.name) }; });
        if (!files.length) { error('no-ics'); empty(); return; }
        compute();
      }, function (e) {
        if (mine !== ticket) return;
        // Erreur connue (no-inflate, zip-method…) : son message ; toute autre (archive abîmée) : « ce .zip n'a pas pu être ouvert ».
        var code = e && e.message;
        error(own('msg.' + code) ? code : 'not-zip'); empty();
      });
    }
    // Rendez-vous de la période, gardés tant qu'elle ne change pas : mots-clés et cases ne refont que le calcul.
    function expand(pd) {
      if (expanded && expanded.key === pd.from + '|' + pd.to) return expanded;
      var p = { key: pd.from + '|' + pd.to, events: [], warnings: [], order: [], shown: [] };
      files.forEach(function (f) {
        var res = AH.ics.expand(f.cal, { range: pd.range, zoneFor: zoneFor, defaultTz: tz });
        p.shown.push({ name: f.name, calendar: res.calendarName, bad: !!res.error, count: res.events.length });
        if (res.error) return;
        p.order.push(res.calendarId);
        res.events.forEach(function (e) { p.events.push(e); });
        res.warnings.forEach(function (w) { p.warnings.push(w); });
      });
      expanded = p;
      return p;
    }
    // Période des champs vérifiée, rendez-vous de la période, cases d'exclusion, puis le calcul de l'outil.
    function compute() {
      if (!files.length) return;
      var from = $(pre + 'from').value, to = $(pre + 'to').value, rg = AH.exporter.range(from, to, zone);
      if (!rg.ok) {
        error(rg.error.replace(/^err[.]/, ''));
        renderFiles(files.map(function (f) { return { name: f.name, calendar: f.cal.calendarName, bad: !!f.cal.error, count: null }; }));
        empty(own('invalidPeriod'));
        return;
      }
      error(null);
      var pd = { from: from, to: to, range: rg.range }, p = expand(pd);
      renderFiles(p.shown);
      if (!p.order.length) { error('no-ics'); empty(); return; }
      o.run(pd, p, { skipAllDay: $(pre + 'allday').checked, skipDeclined: $(pre + 'declined').checked, skipFree: $(pre + 'free').checked });
    }
    // Avertissement de lecture : nombre de rendez-vous concernés, puis leurs titres.
    function warn(list, key) {
      if (!list.length) return null;
      return el('p', 'calc-warn', t(key, { n: list.length, titles: list.map(function (w) { return w.title || t('noTitle'); }).join(', ') }));
    }
    function heading(pd) { return el('p', 'muted', t('heading', { from: day(pd.from), to: day(pd.to), zone: tz })); }
    // Valeur vidée après lecture : choisir de nouveau le même fichier (nouvel export du même nom) relance la lecture.
    $(pre + 'file').addEventListener('change', function (e) { take(e.target.files); e.target.value = ''; });
    var drop = $(pre + 'drop');
    ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function () { drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); take(e.dataTransfer && e.dataTransfer.files); });
    function later() { clearTimeout(timer); timer = setTimeout(compute, 250); }
    ['from', 'to'].concat(o.inputs || []).forEach(function (id) { $(pre + id).addEventListener('input', later); });
    ['allday', 'declined', 'free'].forEach(function (id) { $(pre + id).addEventListener('change', compute); });
    return { $: $, t: t, L: L, zone: zone, el: el, day: day, hours: HOURS, error: error, result: result, warn: warn, heading: heading };
  }
  return { create: create };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.calcPage;
