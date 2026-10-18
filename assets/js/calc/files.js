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
  function decode(u8) { return new TextDecoder('utf-8').decode(u8); }
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
  return { read: read };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.calcFiles;
