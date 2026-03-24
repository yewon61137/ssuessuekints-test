const CACHE_NAME = 'ssuessue-pwa-v4';

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/style.css',
                '/favicon.png'
            ]);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Firebase Storage, Firestore 등 외부 API 요청은 캐시에서 제외
    if (e.request.url.startsWith('https://firestore.googleapis.com') ||
        e.request.url.startsWith('https://firebasestorage.googleapis.com') ||
        e.request.method !== 'GET') {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request).then(response => {
                // 추가적으로 네트워크 결과를 캐싱하려면 아래 로직 활성화
                // return caches.open(CACHE_NAME).then(cache => {
                //     cache.put(e.request, response.clone());
                //     return response;
                // });
                return response;
            });
        }).catch(() => {
            // 오프라인이면서 캐시에도 없는 경우 빈 응답 반환 (앱 다운 방지)
            return new Response('오프라인 상태입니다.', { status: 503, statusText: 'Service Unavailable' });
        })
    );
});
