// billui.js — page « Billable hours calculator » (2026-10-17) : durées tapées, arrondi, minimum, taux, résultat. Tout reste
// dans le navigateur ; les saisies sont affichées par textContent. Textes et nombres dans la langue de la page (text.js).
(function () {
  'use strict';
  if (typeof document === 'undefined' || !document.getElementById('bill')) return;
  function $(id) { return document.getElementById(id); }
  var L = AH.calcText.lang(document.documentElement.lang), timer = null;
  function t(key, vars) { return AH.calcText.say(L, 'bill.' + key, vars); }
  var DEC = new Intl.NumberFormat(L, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), hm = AH.hours.hm;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function dec(min) { return DEC.format(min / 60); }
  // Montant sans devise : deux décimales, aucune en japonais (le yen n'a pas de centimes, comme dans le module).
  var MONEY = L === 'ja' ? new Intl.NumberFormat(L, { maximumFractionDigits: 0 }) : DEC;
  function money(cents) { return MONEY.format(cents / 100); }
  function row(cells, tag) { var tr = el('tr'); cells.forEach(function (c) { tr.appendChild(el(tag || 'td', null, c)); }); return tr; }
  function compute() {
    var rate = $('bh-rate').value === '' ? null : Number($('bh-rate').value);
    var r = AH.billable.compute($('bh-lines').value.split(String.fromCharCode(10)), {
      rounding: Number($('bh-round').value), minimum: Number($('bh-min').value), rateCents: rate != null && isFinite(rate) && rate >= 0 ? Math.round(rate * 100) : null });
    var box = $('bh-result'), parts = [], withAmount = r.total.amountCents != null;
    if (!r.rows.length) parts.push(el('p', 'muted', t('placeholder')));
    else {
      parts.push(el('p', 'calc-big', hm(r.total.billed)));
      parts.push(el('p', 'calc-sub', withAmount ? t('subAmount', { hours: dec(r.total.billed), real: hm(r.total.minutes), amount: money(r.total.amountCents) })
        : t('sub', { hours: dec(r.total.billed), real: hm(r.total.minutes) })));
      var tb = el('table', 'calc-table'), th = el('thead'), body = el('tbody');
      th.appendChild(row([t('colEntry'), t('colTime'), t('colDecimal'), t('colBilled')].concat(withAmount ? [t('colAmount')] : []), 'th'));
      r.rows.forEach(function (x) { body.appendChild(row([x.input, hm(x.minutes), dec(x.minutes), hm(x.billed)].concat(withAmount ? [money(x.amountCents)] : []))); });
      var tot = row([t('total'), hm(r.total.minutes), dec(r.total.minutes), hm(r.total.billed)].concat(withAmount ? [money(r.total.amountCents)] : []));
      tot.className = 'tot';
      body.appendChild(tot);
      // Tableau à 5 colonnes : il défile dans sa zone sur téléphone, la page ne déborde jamais.
      var wrap = el('div', 'calc-scroll');
      tb.appendChild(th); tb.appendChild(body); wrap.appendChild(tb); parts.push(wrap);
      if (r.once && r.once.billed !== r.total.billed) parts.push(el('p', 'muted', withAmount ? t('onceAmount', { billed: hm(r.once.billed), hours: dec(r.once.billed), amount: money(r.once.amountCents) })
        : t('once', { billed: hm(r.once.billed), hours: dec(r.once.billed) })));
    }
    if (r.invalid.length) parts.push(el('p', 'calc-warn', t('invalid', { n: r.invalid.length, list: r.invalid.join(', ') })));
    box.replaceChildren.apply(box, parts);
  }
  function later() { clearTimeout(timer); timer = setTimeout(compute, 200); }
  ['bh-lines', 'bh-rate'].forEach(function (id) { $(id).addEventListener('input', later); });
  ['bh-round', 'bh-min'].forEach(function (id) { $(id).addEventListener('change', compute); });
  compute();
})();
