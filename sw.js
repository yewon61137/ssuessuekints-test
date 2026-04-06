const CACHE_NAME = 'ssuessue-pwa-v10';
const PRE_CACHE_ASSETS = [
    '/',
    '/index.html',
    '/style.css?v=10',
    '/favicon.png',
    '/js/header.js?v=10',
    '/js/auth.js?v=10',
    '/js/home.js?v=10'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRE_CACHE_ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Deleting old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Firebase API, Google Ads 등 외부 요청 및 POST 등 비-GET 요청 제외
    if (e.request.url.includes('google') || 
        e.request.url.includes('firebase') || 
        e.request.url.includes('clarity.ms') ||
        e.request.method !== 'GET') {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            // 캐시에 없으면서 네트워크 요청에 실패한 경우에만 에러 페이지 처리
            return fetch(e.request).catch(err => {
                console.error('[SW] Fetch failed:', e.request.url, err);
                return new Response('오프라인 상태이거나 네트워크 오류가 발생했습니다.', { 
                    status: 503, 
                    statusText: 'Service Unavailable' 
                });
            });
        })
    );
});
