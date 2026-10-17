// billing.js — arrondi, minimum facturé, taux et montant (cahier des charges § 5.5). Logique pure, centimes entiers.
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.billing = (function () {
  'use strict';
  var ROUNDINGS = [0, 5, 6, 10, 15, 30, 60], MINIMUMS = [0, 15, 30, 60];
  function dep(n) { return (typeof module !== 'undefined' && module.exports) ? require('./' + n + '.js') : AH[n]; }
  function billedMinutes(minutes, rounding, minimum) {
    if (!(minutes > 0)) return 0;
    var r = ROUNDINGS.indexOf(rounding) >= 0 ? rounding : 0;
    var m = MINIMUMS.indexOf(minimum) >= 0 ? minimum : 0;
    var b = r > 0 ? Math.ceil(minutes / r) * r : minutes;
    return Math.max(b, m);
  }
  // Valeur saisie → nombre ; null si vide ou non numérique (une valeur vide compte comme absente).
  function num(v) { if (v == null || v === '') return null; var n = Number(v); return isFinite(n) ? n : null; }
  function rateCents(client, project) {
    if (!client) return 0;
    var p = project && client.projectRates ? num(client.projectRates[project]) : null;
    if (p != null) return p;
    var c = num(client.rateCents);
    return c != null ? c : 0;
  }
  // Montant d'une ligne : au centime ; au yen pour une devise sans centimes (SPEC-6 § 4.5).
  function amountCents(billed, rate, cur) {
    var a = Math.round(billed * rate / 60);
    return cur && dep('i18n').wholeOnly(cur) ? Math.round(a / 100) * 100 : a;
  }
  // Nombre tapé (unités de la devise) → centimes ; arrondi à l'unité pour une devise sans centimes.
  function toCents(n, cur) { return cur && dep('i18n').wholeOnly(cur) ? Math.round(n) * 100 : Math.round(n * 100); }
  // Montant tapé dans le panneau → centimes, ou null s'il n'est pas un nombre positif sous le plafond : 100 000 unités,
  // 10 000 000 en yens (un objectif mensuel en yens dépasse 100 000).
  function typedCents(v, lang, cur) {
    var n = parseAmount(v, lang), max = cur && dep('i18n').wholeOnly(cur) ? 10000000 : 100000;
    return n == null || n < 0 || n > max ? null : toCents(n, cur);
  }
  // Espaces de saisie retirées (ordinaire, tabulation, retour, insécables, idéographique) et caractères pleine largeur d'un
  // clavier japonais (« ４，０００ ») ramenés à leur forme ordinaire, en un seul passage.
  var BLANKS = { 9: 1, 10: 1, 13: 1, 32: 1, 160: 1, 8239: 1, 12288: 1 };
  function cleanTyped(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (BLANKS[c]) continue;
      out += c >= 65281 && c <= 65374 ? String.fromCharCode(c - 65248) : s.charAt(i);
    }
    return out;
  }
  // Montant tapé par l'utilisateur, selon la langue du module (SPEC-6 § 4.6), d'après la table des nombres de i18n.js :
  // des groupes de trois chiffres séparés par le séparateur de milliers de la langue sont des milliers (« 1.500 » = 1 500
  // en allemand, « 4,000 » = 4 000 en anglais ; jamais devant un 0 : « 0.500 » = 0,5) ; la décimale de la langue devient
  // un point (« 1.234,50 », « 2,5 ») ; sinon une virgule est lue comme décimale (« 70,5 » en anglais). Chiffres seulement
  // (ni « 0x50 » ni « 1e3 ») ; null si ce n'est pas un nombre (revue finale du 2026-10-15).
  function parseAmount(v, lang) {
    if (v == null) return null;
    var f = dep('i18n').numberStyle(lang), s = cleanTyped(String(v));
    if (new RegExp('^-?[1-9][0-9]{0,2}([' + f.g + '][0-9]{3})+([' + f.d + '][0-9]+)?$').test(s)) s = s.split(f.g).join('');
    if (f.d !== '.' && s.indexOf(f.d) >= 0) s = s.split('.').join('').replace(f.d, '.');
    else s = s.replace(',', '.');
    return /^-?([0-9]+([.][0-9]*)?|[.][0-9]+)$/.test(s) ? num(s) : null;
  }
  // Nombre montré dans un champ du panneau, avec la décimale de la langue (« 80,5 » en allemand), pour être relu à
  // l'identique par parseAmount : un « 2.125 » affiché serait relu 2 125. Vide si absent ; inchangé là où la décimale est
  // un point.
  function typedText(n, lang) {
    var d = dep('i18n').numberStyle(lang).d;
    return n === '' || n == null || d === '.' ? (n == null ? '' : n) : String(n).replace('.', d);
  }
  return { ROUNDINGS: ROUNDINGS, MINIMUMS: MINIMUMS, num: num, parseAmount: parseAmount, billedMinutes: billedMinutes, rateCents: rateCents, amountCents: amountCents,
    toCents: toCents, typedCents: typedCents, typedText: typedText };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.billing;
