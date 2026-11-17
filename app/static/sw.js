// TransportPro service worker: offline support + push notifications.
const CACHE = "transportpro-v{{V}}";
const SHELL = ["/", "/static/app.css?v={{V}}", "/static/app.js?v={{V}}", "/static/icon.svg", "/static/manifest.json"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api") ||
      url.pathname.startsWith("/docs") || url.pathname.startsWith("/openapi")) return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("/"))));
});

// ---- Push from server (works even when the app is closed) ----
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const visible = list.find((c) => c.visibilityState === "visible" && c.focused !== false);
    if (visible) { visible.postMessage({ refresh: true }); return; }   // app on screen -> in-app pop-up shows it
    return self.registration.showNotification(d.title || "TransportPro", {
      body: d.body || "", icon: "/static/icon.svg", badge: "/static/icon.svg",
      tag: d.tag || undefined, renotify: !!d.tag, vibrate: [200, 100, 200], requireInteraction: true,
      data: { link: d.link || "" },
    });
  }));
});

// ---- Tap on notification -> open the app on the right page ----
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const c = list[0];
    if (c) { c.postMessage({ go: link }); return c.focus(); }
    return self.clients.openWindow("/" + link);
  }));
});
