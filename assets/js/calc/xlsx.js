// xlsx.js — classeur Excel (.xlsx) écrit dans le navigateur pour le convertisseur du site (2026-10-19) : une feuille, cellules
// typées (date, heure, durée, heures décimales, texte), ligne de total. Paquet zip sans compression (méthode 0) : aucun module
// externe, rien n'est envoyé. Formats d'Excel : date courte de la langue de l'ordinateur (14), heure h:mm (20), durée [h]:mm
// (164, déclaré dans styles.xml), deux décimales (2). Dates et heures en numéros de série d'Excel, calculés par l'appelant.
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.xlsx = (function () {
  'use strict';
  var MAX = 32767, TABLE = null;
  // Styles de cellule (ordre de cellXfs dans styles.xml).
  var STYLE = { text: 0, date: 1, time: 2, duration: 3, hours: 4, head: 5, totalDuration: 6, totalHours: 7, totalLabel: 8 };
  function crcTable() {
    if (TABLE) return TABLE;
    TABLE = [];
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; TABLE.push(c >>> 0); }
    return TABLE;
  }
  function crc32(u8) { var t = crcTable(), c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = t[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) { return new TextEncoder().encode(s); }
  // files : [{ name, bytes }] → .zip, fichiers stockés, noms en UTF-8 (bit 11), date fixe (1er janvier 2026) : même entrée,
  // même fichier, octet pour octet.
  function zip(files) {
    var chunks = [], central = [], off = 0, DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
    function h16(a, v) { a.push(v & 255, (v >>> 8) & 255); }
    function h32(a, v) { a.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); }
    files.forEach(function (f) {
      var name = utf8(f.name), data = f.bytes, crc = crc32(data), lh = [], ch = [];
      h32(lh, 0x04034b50); h16(lh, 20); h16(lh, 0x0800); h16(lh, 0); h16(lh, 0); h16(lh, DATE);
      h32(lh, crc); h32(lh, data.length); h32(lh, data.length); h16(lh, name.length); h16(lh, 0);
      h32(ch, 0x02014b50); h16(ch, 20); h16(ch, 20); h16(ch, 0x0800); h16(ch, 0); h16(ch, 0); h16(ch, DATE);
      h32(ch, crc); h32(ch, data.length); h32(ch, data.length); h16(ch, name.length); h16(ch, 0); h16(ch, 0); h16(ch, 0); h16(ch, 0);
      h32(ch, 0); h32(ch, off);
      chunks.push(new Uint8Array(lh), name, data); central.push(new Uint8Array(ch), name);
      off += lh.length + name.length + data.length;
    });
    var cdSize = central.reduce(function (n, c) { return n + c.length; }, 0), end = [];
    h32(end, 0x06054b50); h16(end, 0); h16(end, 0); h16(end, files.length); h16(end, files.length); h32(end, cdSize); h32(end, off); h16(end, 0);
    var all = chunks.concat(central, [new Uint8Array(end)]), out = new Uint8Array(all.reduce(function (n, c) { return n + c.length; }, 0)), p = 0;
    all.forEach(function (c) { out.set(c, p); p += c.length; });
    return out;
  }
  // Texte accepté par XML : caractères de contrôle (sauf tabulation et retours à la ligne) et demi-paires retirés.
  function clean(s) {
    var t = String(s), out = '';
    for (var i = 0; i < t.length; i++) {
      var c = t.charCodeAt(i);
      if ((c < 32 && c !== 9 && c !== 10 && c !== 13) || c === 0xFFFE || c === 0xFFFF || (c >= 0xDC00 && c <= 0xDFFF)) continue;
      if (c >= 0xD800 && c <= 0xDBFF) { var d = t.charCodeAt(i + 1); if (d >= 0xDC00 && d <= 0xDFFF) { out += t.charAt(i) + t.charAt(i + 1); i++; } continue; }
      out += t.charAt(i);
    }
    return out;
  }
  function esc(s) { return s.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;'); }
  // Une cellule Excel contient 32 767 caractères au plus ; la coupe ne sépare jamais une paire de substitution.
  function text(s) {
    var t = clean(s);
    if (t.length > MAX) { var c = t.charCodeAt(MAX - 1); t = t.slice(0, c >= 0xD800 && c <= 0xDBFF ? MAX - 1 : MAX); }
    return esc(t);
  }
  // Colonne n° i (0 = A) → lettres.
  function col(i) { var s = ''; for (var n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; }
  function cell(ref, v, s) {
    if (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) return '';
    var sa = s ? ' s="' + s + '"' : '';
    if (typeof v === 'number') return '<c r="' + ref + '"' + sa + '><v>' + v + '</v></c>';
    return '<c r="' + ref + '"' + sa + ' t="inlineStr"><is><t xml:space="preserve">' + text(v) + '</t></is></c>';
  }
  // Nom de feuille : 31 caractères au plus, sans [ ] : * ? / ni barre oblique inverse, ni apostrophe au bord.
  function sheetName(s) {
    var out = '';
    String(s || '').split('').forEach(function (c) { if ('[]:*?/'.indexOf(c) < 0 && c.charCodeAt(0) !== 92) out += c; });
    out = clean(out).trim();
    while (out.charAt(0) === "'") out = out.slice(1);
    out = out.slice(0, 31);
    while (out.slice(-1) === "'") out = out.slice(0, -1);
    return out.trim() || 'Sheet1';
  }
  var HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  var REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
  var CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.';
  function sheetXml(sh) {
    var cols = sh.columns, n = sh.rows.length, rows = [];
    rows.push('<row r="1">' + cols.map(function (c, i) { return cell(col(i) + '1', c.head, STYLE.head); }).join('') + '</row>');
    sh.rows.forEach(function (r, j) {
      var rn = j + 2;
      rows.push('<row r="' + rn + '">' + cols.map(function (c, i) { return cell(col(i) + rn, r[i], STYLE[c.style] || 0); }).join('') + '</row>');
    });
    // Total une ligne sous les données, après une ligne vide : la formule reste juste si on trie ou filtre les lignes.
    if (sh.total && n) {
      var tr = n + 3, cells = cell('A' + tr, sh.total.label, STYLE.totalLabel);
      sh.total.sum.forEach(function (i) {
        var L = col(i), sum = sh.rows.reduce(function (a, r) { return a + (typeof r[i] === 'number' && isFinite(r[i]) ? r[i] : 0); }, 0);
        cells += '<c r="' + L + tr + '" s="' + (cols[i].style === 'duration' ? STYLE.totalDuration : STYLE.totalHours) + '"><f>SUM(' + L + '2:' + L + (n + 1) + ')</f><v>' + sum + '</v></c>';
      });
      rows.push('<row r="' + tr + '">' + cells + '</row>');
    }
    return HEAD + '<worksheet xmlns="' + MAIN + '"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<cols>' + cols.map(function (c, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (c.width || 12) + '" customWidth="1"/>'; }).join('') + '</cols>' +
      '<sheetData>' + rows.join('') + '</sheetData></worksheet>';
  }
  function xf(fmt, font) { return '<xf numFmtId="' + fmt + '" fontId="' + font + '" fillId="0" borderId="0" xfId="0"' + (fmt ? ' applyNumberFormat="1"' : '') + (font ? ' applyFont="1"' : '') + '/>'; }
  var STYLES = HEAD + '<styleSheet xmlns="' + MAIN + '"><numFmts count="1"><numFmt numFmtId="164" formatCode="[h]:mm"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="9">' + xf(0, 0) + xf(14, 0) + xf(20, 0) + xf(164, 0) + xf(2, 0) + xf(0, 1) + xf(164, 1) + xf(2, 1) + xf(0, 1) + '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  // sh : { name, columns: [{ head, width, style }], rows: [[cellule…]], total: { label, sum: [n° de colonne…] } }.
  function build(sh) {
    var files = [
      ['[Content_Types].xml', HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="' + CT + 'sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="' + CT + 'worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="' + CT + 'styles+xml"/></Types>'],
      ['_rels/.rels', HEAD + '<Relationships xmlns="' + PKG + '"><Relationship Id="rId1" Type="' + REL + '/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', HEAD + '<workbook xmlns="' + MAIN + '" xmlns:r="' + REL + '"><sheets><sheet name="' + esc(sheetName(sh.name)) + '" sheetId="1" r:id="rId1"/></sheets>' +
        '<calcPr fullCalcOnLoad="1"/></workbook>'],
      ['xl/_rels/workbook.xml.rels', HEAD + '<Relationships xmlns="' + PKG + '"><Relationship Id="rId1" Type="' + REL + '/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="' + REL + '/styles" Target="styles.xml"/></Relationships>'],
      ['xl/worksheets/sheet1.xml', sheetXml(sh)],
      ['xl/styles.xml', STYLES]
    ];
    return zip(files.map(function (f) { return { name: f[0], bytes: utf8(f[1]) }; }));
  }
  return { crc32: crc32, zip: zip, build: build };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.xlsx;
