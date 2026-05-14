const CACHE_NAME = 'ssuessue-pwa-v17';

// Pre-cache the core shell used by the offline fallback.
const PRE_CACHE_ASSETS = [
    '/',
    '/index.html',
    '/toolkit.html',
    '/style.css?v=13',
    '/favicon.png',
    '/js/header.js?v=11',
    '/js/auth.js',
    '/js/i18n.js',
    '/js/home.js?v=13',
    '/js/row-counter.js?v=10',
    '/js/toolkit.js',
    '/js/cookie-consent.js',
    '/fonts/GmarketSansTTFBold.woff2',
    '/fonts/GmarketSansTTFMedium.woff2',
    '/fonts/GmarketSansTTFLight.woff2',
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE_ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keyList =>
            Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] 오래된 캐시 삭제:', key);
                    return caches.delete(key);
                }
            }))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // 외부 서비스 및 비-GET 요청 제외
    const url = e.request.url;
    if (
        url.includes('google') ||
        url.includes('firebase') ||
        url.includes('clarity.ms') ||
        url.includes('pagead') ||
        url.includes('/api/') ||
        url.includes('/__/auth/') ||
        url.includes('identitytoolkit') ||
        url.includes('securetoken') ||
        e.request.method !== 'GET'
    ) {
        return;
    }

    // HTML 네비게이션 요청: Network-First (최신 콘텐츠 우선, 오프라인 시 캐시 폴백)
    // 주의: 오프라인 폴백으로 /index.html을 반환하면 Firebase Auth 리다이렉트 세션이 깨질 수 있으므로
    // 동일 경로 캐시만 반환하고, 없으면 네트워크 에러를 그대로 전파
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                    }
                    return response;
                })
                .catch(() =>
                    caches.match(e.request)
                )
        );
        return;
    }

    // 정적 자원(CSS, JS, 폰트, 이미지): Cache-First (버전 쿼리로 캐시 무효화)
    e.respondWith(
        caches.match(e.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;

            return fetch(e.request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            }).catch(() =>
                new Response('오프라인 상태이거나 네트워크 오류가 발생했습니다.', {
                    status: 503,
                    statusText: 'Service Unavailable',
                })
            );
        })
    );
});
