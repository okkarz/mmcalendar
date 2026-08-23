// ─── Myanmar Calendar PWA — Service Worker ───────────────────────────────────
//
//  Two-cache offline strategy:
//
//  SHELL_CACHE  →  App shell (HTML, CSS, JS, icons)
//                  Strategy: Cache-first + silent background revalidation.
//                  These files change only on deliberate releases.
//
//  DATA_CACHE   →  holidays.json
//                  Strategy: Network-first (3 s timeout), cache fallback.
//                  This file may be updated on the server independently of
//                  the app shell.  When the network returns newer data the
//                  cache is updated and the app is notified via postMessage.
//
// ─────────────────────────────────────────────────────────────────────────────

const SHELL_CACHE = 'mmcal-shell-v49';
const DATA_CACHE  = 'mmcal-data-v1';

const SHELL_URLS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/mmcal.js',
    '/holidays.js',
    '/icon.png',
    '/manifest.json'
];

// ── Install ───────────────────────────────────────────────────────────────────
// Pre-cache the app shell.  Also attempt to seed the holidays data cache;
// this is best-effort — failure here does NOT abort SW installation.
self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            // Shell files — must succeed
            caches.open(SHELL_CACHE).then(cache =>
                cache.addAll(SHELL_URLS.map(url => new Request(url, { cache: 'reload' })))
            ),
            // Seed holidays data cache — best-effort
            caches.open(DATA_CACHE).then(async cache => {
                try {
                    const req = new Request('/holidays.json', { cache: 'reload' });
                    const res = await fetch(req);
                    if (res && res.status === 200) await cache.put('/holidays.json', res);
                } catch { /* offline during install — no holidays cache yet, that's OK */ }
            })
        ]).then(() => self.skipWaiting())
    );
});

// ── Message: allow the page to trigger skipWaiting for instant updates ────────
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
// Remove old shell caches.  DATA_CACHE is preserved across shell updates so
// holidays data isn't thrown away every time the app shell is updated.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== SHELL_CACHE && k !== DATA_CACHE)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    if (url.pathname.endsWith('/holidays.json')) {
        event.respondWith(holidaysStrategy(event.request));
    } else {
        event.respondWith(shellStrategy(event.request));
    }
});

// ── Cache-first + background revalidation (shell files) ───────────────────────
async function shellStrategy(request) {
    const cache  = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);

    // Revalidate silently in the background regardless
    const networkPromise = fetch(request).then(res => {
        if (res && res.status === 200) cache.put(request, res.clone());
        return res;
    }).catch(() => null);

    return cached || networkPromise;
}

// ── Network-first (3 s timeout) + cache fallback (holidays.json) ──────────────
async function holidaysStrategy(request) {
    const cache = await caches.open(DATA_CACHE);

    try {
        // Abort the network fetch if it takes longer than 3 seconds
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);

        const networkRes = await fetch(request, { signal: controller.signal });
        clearTimeout(timer);

        if (networkRes && networkRes.status === 200) {
            const newText = await networkRes.clone().text();

            // Compare with what's currently cached
            const cachedRes = await cache.match(request);
            const oldText   = cachedRes ? await cachedRes.text() : null;

            if (oldText !== null && oldText !== newText) {
                // Data genuinely changed — update the cache and notify clients
                await cache.put(request,
                    new Response(newText, { headers: { 'Content-Type': 'application/json' } })
                );
                const clients = await self.clients.matchAll({ includeUncontrolled: true });
                clients.forEach(c => c.postMessage({ type: 'HOLIDAYS_UPDATED' }));
            } else if (oldText === null) {
                // First time storing — just cache it, no notification needed
                await cache.put(request,
                    new Response(newText, { headers: { 'Content-Type': 'application/json' } })
                );
            }

            return new Response(newText, { headers: { 'Content-Type': 'application/json' } });
        }
    } catch { /* network unavailable or timed out — fall through to cache */ }

    // Serve from cache
    const cached = await cache.match(request);
    if (cached) return cached;

    // Last resort: empty valid JSON so the app doesn't crash
    return new Response('{"fixed":[],"byYear":{}}',
        { headers: { 'Content-Type': 'application/json' } }
    );
}
