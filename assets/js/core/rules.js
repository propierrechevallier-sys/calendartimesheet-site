// rules.js — reconnaissance du client et du projet d'un rendez-vous (cahier des charges § 5.4). Logique pure.
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.rules = (function () {
  'use strict';
  var PUBLIC = ['gmail.com', 'googlemail.com', 'icloud.com', 'me.com', 'orange.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'web.de', 't-online.de'];
  var PUBLIC_PREFIX = ['outlook.', 'hotmail.', 'live.', 'yahoo.', 'gmx.'];
  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function domainOf(email) {
    var s = String(email || '').toLowerCase();
    var lt = s.lastIndexOf('<'); if (lt >= 0) s = s.slice(lt + 1);
    s = s.replace(/[>\s]/g, '');
    var at = s.lastIndexOf('@');
    return at >= 0 && at < s.length - 1 ? s.slice(at + 1) : '';
  }
  function isPublicDomain(d) {
    d = String(d || '').toLowerCase();
    return PUBLIC.indexOf(d) >= 0 || PUBLIC_PREFIX.some(function (p) { return d.indexOf(p) === 0; });
  }
  function prepare(rules) { return (rules || []).map(function (r) { return Object.assign({}, r, { _v: norm(r && r.value) }); }); }
  function context(ev) { return { title: norm(ev.title), domains: (ev.guests || []).map(domainOf) }; }
  function matches(rule, ev, ctx) {
    var v = rule && rule._v != null ? rule._v : norm(rule && rule.value);
    if (!v) return false;
    var c = ctx || context(ev);
    if (rule.type === 'title') return c.title.indexOf(v) >= 0;
    if (rule.type === 'domain') return c.domains.some(function (d) { return d === v || d.slice(-(v.length + 1)) === '.' + v; });
    if (rule.type === 'calendar') return ev.calendarId === rule.value;
    if (rule.type === 'color') return ev.color === rule.value;
    return false;
  }
  // Fiche client propre à l'objet : jamais un nom hérité (constructor, toString) ni __proto__.
  function has(o, k) { return !!o && k !== '__proto__' && Object.prototype.hasOwnProperty.call(o, k); }
  function classify(ev, rules, clients) {
    var list = rules || [], ctx = context(ev);
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!matches(r, ev, ctx)) continue;
      if (r.action === 'ignore') return { status: 'ignored', ruleId: r.id };
      if (!has(clients, r.client)) return { status: 'unmatched', reason: 'unknownClient', ruleId: r.id };
      return { status: 'client', client: r.client, project: r.project || '', ruleId: r.id };
    }
    return { status: 'unmatched', reason: 'noRule' };
  }
  return { norm: norm, domainOf: domainOf, isPublicDomain: isPublicDomain, prepare: prepare, context: context, matches: matches, classify: classify };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.rules;
