// 예전 주소(minhyuk94.github.io/…)에서 옮겨 온 저장(localStorage·Godot 저장 파일)을 받아 넣는다.
// 예전 주소의 안내 페이지가 #carry=… 로 보내 준다. 이미 여기 있는 저장은 덮어쓰지 않는다.
(function () {
  var m = /^#carry=([zj])\.(.*)$/.exec(location.hash);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  function b64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function unpack() {
    if (m[1] === 'j') return Promise.resolve(decodeURIComponent(m[2]));
    var ds = new DecompressionStream('deflate-raw');
    return new Response(new Blob([b64(m[2])]).stream().pipeThrough(ds)).text();
  }
  function done(d) { if (d.r) location.hash = d.r; location.reload(); }
  unpack().then(function (txt) {
    var d = JSON.parse(txt), ls = d.ls || {};
    for (var k in ls) { try { if (localStorage.getItem(k) === null) localStorage.setItem(k, ls[k]); } catch (e) { /* 공간 없음 */ } }
    var files = d.idb || [];
    if (!files.length) return done(d);
    // Godot 웹 저장(Emscripten IDBFS: DB '/userfs', 저장소 'FILE_DATA')
    var req = indexedDB.open('/userfs', 21);
    req.onupgradeneeded = function () { var db = req.result; if (!db.objectStoreNames.contains('FILE_DATA')) db.createObjectStore('FILE_DATA').createIndex('timestamp', 'timestamp', { unique: false }); };
    req.onerror = function () { done(d); };
    req.onsuccess = function () {
      var db = req.result, tx = db.transaction('FILE_DATA', 'readwrite'), st = tx.objectStore('FILE_DATA');
      files.forEach(function (f) {
        var v = { timestamp: new Date(f.t), mode: f.m };
        if (f.c != null) v.contents = b64(f.c);
        var g = st.get(f.k); g.onsuccess = function () { if (!g.result) st.put(v, f.k); };
      });
      tx.oncomplete = tx.onerror = function () { db.close(); done(d); };
    };
  }).catch(function () { /* 못 읽으면 그냥 새로 시작 */ });
})();
