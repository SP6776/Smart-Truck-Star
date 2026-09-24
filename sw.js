// SMART TRUCK STAR — Service Worker
// เพิ่มเลข version ตรงนี้ทุกครั้งที่อยากบังคับให้เครื่องผู้ใช้โหลดไฟล์ใหม่
const CACHE_NAME = "sts-cache-v1";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // หน้าเว็บหลัก: โหลดจากเน็ตก่อนเสมอ (ข้อมูลดาว/แรงค์ต้องใหม่ล่าสุด) ถ้าออฟไลน์ค่อย fallback ไป cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // ไฟล์ในโดเมนเดียวกัน (manifest, ไอคอน): cache-first แล้วอัปเดตเงียบๆ เบื้องหลัง
  let sameOrigin = false;
  try {
    sameOrigin = new URL(req.url).origin === self.location.origin;
  } catch (e) {}

  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
