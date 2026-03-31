/**
 * sw.js — Service Worker
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Caches the app shell and static assets for offline resilience.
 * Strategy: Cache First for static assets, Network First for API calls.
 */

const CACHE_NAME    = 'aamaal-v1';
const CACHE_ASSETS  = [
  './',
  './index.html',
  './css/design.css',
  './css/components.css',
  './js/app.js',
  './js/core/firebase.js',
  './js/core/auth.js',
  './js/core/i18n.js',
  './js/core/ArabicText.js',
  './js/core/theme.js',
  './js/services/calendar.js',
  './js/services/progress.js',
  './js/services/api.js',
  './js/pages/home.js',
  './js/pages/reflect.js',
  './js/pages/archive.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network first for Firebase and external APIs
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('aladhan.com') ||
    url.hostname.includes('api.quran.com') ||
    url.hostname.includes('anthropic.com')
  ) {
    return; // Let browser handle — no caching for API calls
  }

  // Cache first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Only cache successful same-origin responses
        if (
          response.ok &&
          response.type === 'basic' &&
          event.request.method === 'GET'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
