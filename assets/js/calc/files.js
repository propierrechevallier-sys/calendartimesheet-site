// files.js — lecture des fichiers déposés sur les outils du site (calculatrice, convertisseur Excel ; 2026-10-19) : les .ics
// d'un .zip d'export de Google Agenda, ou le fichier lui-même. Décompression par le navigateur (DecompressionStream), rien
// n'est envoyé. Une erreur garde son code (no-inflate, zip-method, not-zip) pour le message de la page.
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.calcFiles = (function () {
  'use strict';
  function inflateRaw(u8) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('no-inflate'));
    return new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  // Lignes repliées de l'iCalendar (RFC 5545 § 3.1 : fin de ligne suivie d'une espace ou d'une tabulation) dépliées sur les
  // octets, avant le décodage : un écrivain qui replie au milieu d'un caractère multioctet ne l'abîme plus (revue du 2026-10-19).
  function unfold(u8) {
    // Rien de replié : le fichier tel quel, sans copie.
    var any = false;
    for (var k = u8.indexOf(10); k >= 0 && !any; k = u8.indexOf(10, k + 1)) any = u8[k + 1] === 32 || u8[k + 1] === 9;
    if (!any) return u8;
    var out = new Uint8Array(u8.length), n = 0;
    for (var i = 0; i < u8.length; i++) {
      var b = u8[i];
      if (b === 13 && u8[i + 1] === 10 && (u8[i + 2] === 32 || u8[i + 2] === 9)) { i += 2; continue; }
      if (b === 10 && (u8[i + 1] === 32 || u8[i + 1] === 9)) { i += 1; continue; }
      out[n++] = b;
    }
    return out.subarray(0, n);
  }
  function decode(u8) { return new TextDecoder('utf-8').decode(unfold(u8)); }
  // Un fichier déposé → [{ name, text }] : les .ics d'un .zip, ou le fichier lui-même.
  function read(f) {
    return f.arrayBuffer().then(function (buf) {
      var u8 = new Uint8Array(buf);
      if (AH.zip.isZip(u8)) {
        return AH.zip.read(u8, inflateRaw).then(function (list) {
          return list.filter(function (e) { return /[.]ics$/i.test(e.name); }).map(function (e) { return { name: e.name.split('/').pop(), text: decode(e.bytes) }; });
        });
      }
      return [{ name: f.name, text: decode(u8) }];
    });
  }
  return { read: read, text: decode };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.calcFiles;
