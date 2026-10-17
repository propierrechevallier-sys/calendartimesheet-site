// zip.js — ouverture d'un .zip (export de Google Agenda) pour la calculatrice du site (seo/ESSAI-B.md). Lit le répertoire
// central ; fichiers stockés (méthode 0) ou compressés (méthode 8). inflateRaw(Uint8Array) → Promise<Uint8Array> est fourni :
// DecompressionStream('deflate-raw') dans le navigateur, zlib sous Node. Aucun envoi réseau.
var AH = (typeof AH !== 'undefined') ? AH : {};
AH.zip = (function () {
  'use strict';
  function u16(b, i) { return b[i] | (b[i + 1] << 8); }
  function u32(b, i) { return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)) + b[i + 3] * 16777216; }
  function isZip(b) { return !!b && b.length >= 22 && u32(b, 0) === 0x04034b50; }
  // Fichiers du .zip, dans l'ordre du répertoire central, dossiers exclus : [{ name, bytes }].
  function read(b, inflateRaw) {
    if (!isZip(b)) return Promise.reject(new Error('not-zip'));
    var end = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { end = i; break; }
    if (end < 0) return Promise.reject(new Error('not-zip'));
    var n = u16(b, end + 10), off = u32(b, end + 16), list = [];
    var utf8 = new TextDecoder('utf-8');
    for (var k = 0; k < n; k++) {
      if (u32(b, off) !== 0x02014b50) return Promise.reject(new Error('not-zip'));
      var method = u16(b, off + 10), size = u32(b, off + 20), nlen = u16(b, off + 28), xlen = u16(b, off + 30), clen = u16(b, off + 32), local = u32(b, off + 42);
      var name = utf8.decode(b.subarray(off + 46, off + 46 + nlen));
      var start = local + 30 + u16(b, local + 26) + u16(b, local + 28);
      if (name.slice(-1) !== '/') list.push({ name: name, method: method, data: b.subarray(start, start + size) });
      off += 46 + nlen + xlen + clen;
    }
    return Promise.all(list.map(function (f) {
      if (f.method === 0) return Promise.resolve({ name: f.name, bytes: f.data });
      if (f.method === 8) return inflateRaw(f.data).then(function (out) { return { name: f.name, bytes: out }; });
      return Promise.reject(new Error('zip-method'));
    }));
  }
  return { isZip: isZip, read: read };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AH.zip;
