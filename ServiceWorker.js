const cacheName = "Stemtitute-Stemtitute Primary App-1.0.8";
const contentToCache = [
    "Build/PrimaryWeb1124.loader.js",
    "Build/PrimaryWeb1124.framework.js.unityweb",
    "Build/PrimaryWeb1124.data.unityweb",
    "Build/PrimaryWeb1124.wasm.unityweb",
    "TemplateData/style.css"
];

// ==========================================
// 1. 安裝階段 (Install)
// ==========================================
self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    e.waitUntil((async function () {
        try {
            const cache = await caches.open(cacheName);
            for (let url of contentToCache) {
                try {
                    await cache.add(url);
                } catch (err) {
                    console.warn(`[Service Worker] Failed to cache: ${url}`, err);
                }
            }
        } catch (err) {
            console.error('[Service Worker] Cache open failed', err);
        }
    })());
    self.skipWaiting();
});

// ==========================================
// 2. 激活階段 (Activate)
// ==========================================
self.addEventListener('activate', function (e) {
    console.log('[Service Worker] Activate');
    e.waitUntil(self.clients.claim());
});

// ==========================================
// 3. 網路請求攔截 (Fetch)
// ==========================================
self.addEventListener('fetch', function (e) {
    // 🛑 S3 請求直接放行
    if (e.request.url.includes('amazonaws.com')) {
        return; 
    }

    // 主網頁直接走網路
    if (e.request.mode === 'navigate') {
        return;
    }

    // 針對同源資源
    e.respondWith((async function () {
        // 1. 先找快取 (POST 請求不會在快取裡，所以會直接跳過)
        let response = await caches.match(e.request);
        if (response) { 
            return response; 
        }

        // 2. 去網路抓
        try {
            response = await fetch(e.request);
            
            // 🌟 關鍵修正：加上 e.request.method === 'GET' 判斷
            if (response && response.status === 200 && e.request.method === 'GET') {
                const cache = await caches.open(cacheName);
                cache.put(e.request, response.clone());
            }
            return response;
        } catch (error) {
            console.warn('[Service Worker] Fetch failed, network might be down:', error);
            
            let cacheResponse = await caches.match(e.request);
            if (cacheResponse) return cacheResponse;
            
            return; 
        }
    })());
});