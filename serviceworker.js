/* Service worker LINTAS (Lingga Integrated Transport Administration System) -- HANYA untuk 2 tujuan:
   1) supaya browser (terutama Chrome/Android) menganggap situs ini "bisa diinstall" jadi ikon aplikasi;
   2) supaya halaman tetap bisa dibuka (shell dasar) walau sedang tidak ada koneksi internet.

   SENGAJA tidak menyimpan cache untuk data Firebase / apapun selain file statis situs ini sendiri --
   supaya pimpinan/siapapun yang pakai selalu melihat DATA TERBARU (bukan data lama yang "nyangkut"
   di cache). File index.html sendiri dicoba ambil dari INTERNET dulu tiap kali dibuka (supaya selalu
   dapat versi kode terbaru begitu diupload ulang); cache cuma dipakai sebagai cadangan kalau memang
   sedang offline. */
const CACHE_NAME = 'lintas-shell-v3';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon192.png',
  './icon512.png',
];

/* ================== NOTIFIKASI PUSH (FCM) -- Sesi keseratustujuhpuluhenam ==================
   Bagian ini KHUSUS menangani notifikasi push (PO Baru dkk) saat aplikasi LINTAS sedang TERTUTUP
   TOTAL atau di-minimize (background) -- supaya tetap muncul sebagai notifikasi SISTEM asli, persis
   seperti WhatsApp/aplikasi chat lain. Berbarengan dengan notifikasi WA yang sudah ada, bukan
   pengganti. Kalau app sedang TERBUKA (foreground), yang menampilkan toast dalam-app adalah kode di
   index.html sendiri (messaging.onMessage), BUKAN bagian ini.
   importScripts di sini SENGAJA dibungkus try/catch: kalau gagal dimuat (mis. sedang offline waktu
   file ini pertama diinstall), service worker & fitur cache/offline yang sudah ada di bawah TETAP
   jalan normal seperti biasa -- cuma fitur push yang tidak aktif. */
try{
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: "AIzaSyCb_tX42mot-cIgAAqJ0wpJX76632u34cM",
    authDomain: "ekspedisi-jaya.firebaseapp.com",
    databaseURL: "https://ekspedisi-jaya-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ekspedisi-jaya",
    storageBucket: "ekspedisi-jaya.firebasestorage.app",
    messagingSenderId: "438162300008",
    appId: "1:438162300008:web:de5c1b897df03e08c42fdd",
    measurementId: "G-F5ZMD8LJH5"
  });

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(function(payload){
    const n = (payload && payload.notification) || {};
    const title = n.title || 'LINTAS';
    self.registration.showNotification(title, {
      body: n.body || '',
      icon: './icon192.png',
      badge: './icon192.png',
      data: (payload && payload.fcmOptions && payload.fcmOptions.link) || './index.html'
    });
  });
}catch(e){
  // Firebase Messaging gagal dimuat di service worker ini -- fitur cache/offline di bawah tetap jalan normal.
}

// Klik notifikasi push -> buka/fokuskan tab aplikasi yang sudah ada, atau buka tab baru kalau belum ada.
self.addEventListener('notificationclick', function(event){
  event.notification.close();
  const target = (event.notification.data) || './index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList){
      for(let i = 0; i < clientList.length; i++){
        const c = clientList[i];
        if('focus' in c) return c.focus();
      }
      if(clients.openWindow) return clients.openWindow(target);
    })
  );
});

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
