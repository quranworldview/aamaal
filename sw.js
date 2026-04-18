// Placeholder service worker - does nothing during development
// Full implementation added in Step 13 (PWA)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
