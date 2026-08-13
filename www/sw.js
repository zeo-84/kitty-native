const CACHE = "kitty-cache-v4";
const CORE = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/strings.js",
  "js/persian-date.js",
  "js/storage.js",
  "js/icons.js",
  "js/workout.js",
  "js/notes.js",
  "js/reminders.js",
  "js/game.js",
  "js/quotes.js",
  "js/app.js",
  "images/kitty_logo.webp",
  "images/kitty_home.webp",
  "images/kitty_workout.webp",
  "images/kitty_notes.webp",
  "images/kitty_reminder.webp",
  "images/kitty_game.webp",
  "images/kitty_rest.webp",
  "fonts/Vazirmatn-Regular.woff2",
  "fonts/Vazirmatn-Medium.woff2",
  "fonts/Vazirmatn-Bold.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request)
          .then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return resp;
          })
          .catch(() => caches.match("index.html"))
    )
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((cs) => {
        if (cs.length) return cs[0].focus();
        return clients.openWindow("./");
      })
  );
});
