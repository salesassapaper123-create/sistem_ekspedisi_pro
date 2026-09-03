/* Service worker LINTAS (Lingga Integrated Transport Administration System) -- HANYA untuk 2 tujuan:
   1) supaya browser (terutama Chrome/Android) menganggap situs ini "bisa diinstall" jadi ikon aplikasi;
   2) supaya halaman tetap bisa dibuka (shell dasar) walau sedang tidak ada koneksi internet.

   SENGAJA tidak menyimpan cache untuk data Firebase / apapun selain file statis situs ini sendiri --
   supaya pimpinan/siapapun yang pakai selalu melihat DATA TERBARU (bukan data lama yang "nyangkut"
   di cache). File index.html sendiri dicoba ambil dari INTERNET dulu tiap kali dibuka (supaya selalu
   dapat versi kode terbaru begitu diupload ulang); cache cuma dipakai sebagai cadangan kalau memang
   sedang offline. */
const CACHE_NAME = 'lintas-shell-v2';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Hanya tangani file shell situs INI SENDIRI (same-origin, metode GET). Semua yang lain (Firebase,
  // Google Fonts, dsb) dibiarkan lewat apa adanya -- tidak dicache, tidak diintersep sama sekali,
  // supaya data & fitur online tetap selalu real-time seperti biasa.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!SHELL_FILES.some((f) => url.pathname.endsWith(f.replace('./', '/')) || url.pathname.endsWith(f.replace('./', '')))) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
