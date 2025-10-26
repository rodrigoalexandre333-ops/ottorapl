/**
 * Service Worker for Quiz Pro Web App
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = 'quiz-pro-v1.0.0';
const STATIC_CACHE_NAME = 'quiz-pro-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'quiz-pro-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/styles.css',
    '/js/app.js',
    '/js/quiz.js',
    '/js/creator.js',
    '/js/storage.js',
    '/js/stats.js',
    '/js/pwa.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Dynamic files to cache on request
const DYNAMIC_FILES = [
    '/api/',
    '/data/',
    '/assets/'
];

// Files that should always be fetched from network
const NETWORK_ONLY = [
    '/api/sync',
    '/api/update'
];

// ===== INSTALL EVENT =====
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE_NAME).then((cache) => {
                console.log('Caching static files...');
                return cache.addAll(STATIC_FILES.map(url => new Request(url, { cache: 'reload' })));
            }),
            
            // Skip waiting to activate immediately
            self.skipWaiting()
        ])
    );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName.startsWith('quiz-pro-')) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Take control of all clients
            self.clients.claim()
        ])
    );
});

// ===== FETCH EVENT =====
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Network only files
    if (NETWORK_ONLY.some(pattern => url.pathname.startsWith(pattern))) {
        event.respondWith(fetch(request));
        return;
    }
    
    // Static files - Cache First strategy
    if (STATIC_FILES.some(file => url.pathname === file || url.pathname.endsWith(file))) {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // Dynamic content - Network First strategy
    if (DYNAMIC_FILES.some(pattern => url.pathname.startsWith(pattern))) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // Default strategy - Cache First with Network Fallback
    event.respondWith(cacheFirstWithRefresh(request));
});

// ===== CACHING STRATEGIES =====

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Network failed, no cache available:', error);
        return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache...');
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

async function cacheFirstWithRefresh(request) {
    const cachedResponse = await caches.match(request);
    
    // Return cached version immediately if available
    if (cachedResponse) {
        // Refresh in background
        fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
                const cache = caches.open(DYNAMIC_CACHE_NAME);
                cache.then(c => c.put(request, networkResponse));
            }
        }).catch(() => {
            // Ignore network errors in background refresh
        });
        
        return cachedResponse;
    }
    
    // No cache, try network
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/');
        }
        
        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    switch (event.tag) {
        case 'quiz-data-sync':
            event.waitUntil(syncQuizData());
            break;
        case 'quiz-results-sync':
            event.waitUntil(syncQuizResults());
            break;
        default:
            console.log('Unknown sync tag:', event.tag);
    }
});

async function syncQuizData() {
    try {
        console.log('Syncing quiz data...');
        
        // Get pending data from IndexedDB or localStorage
        const pendingData = await getPendingSync('quiz-data');
        
        if (pendingData.length > 0) {
            for (const data of pendingData) {
                await fetch('/api/sync/quiz-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            }
            
            // Clear synced data
            await clearPendingSync('quiz-data');
            console.log('Quiz data synced successfully');
        }
    } catch (error) {
        console.error('Failed to sync quiz data:', error);
        throw error; // Retry sync
    }
}

async function syncQuizResults() {
    try {
        console.log('Syncing quiz results...');
        
        const pendingResults = await getPendingSync('quiz-results');
        
        if (pendingResults.length > 0) {
            for (const result of pendingResults) {
                await fetch('/api/sync/quiz-results', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(result)
                });
            }
            
            await clearPendingSync('quiz-results');
            console.log('Quiz results synced successfully');
        }
    } catch (error) {
        console.error('Failed to sync quiz results:', error);
        throw error;
    }
}

// ===== MESSAGE HANDLING =====
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CHECK_UPDATE':
            checkForUpdate();
            break;
            
        case 'CACHE_QUIZ_DATA':
            cacheQuizData(data);
            break;
            
        case 'SCHEDULE_SYNC':
            scheduleBackgroundSync(data.tag);
            break;
            
        default:
            console.log('Unknown message type:', type);
    }
});

async function checkForUpdate() {
    try {
        const response = await fetch('/api/version');
        const { version } = await response.json();
        
        if (version !== '1.0.0') { // Current version
            // Notify about update
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'UPDATE_AVAILABLE',
                    version: version
                });
            });
        }
    } catch (error) {
        console.log('Failed to check for updates:', error);
    }
}

async function cacheQuizData(data) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const response = new Response(JSON.stringify(data));
        await cache.put('/offline-quiz-data', response);
        console.log('Quiz data cached for offline use');
    } catch (error) {
        console.error('Failed to cache quiz data:', error);
    }
}

function scheduleBackgroundSync(tag) {
    self.registration.sync.register(tag).then(() => {
        console.log('Background sync scheduled:', tag);
    }).catch(error => {
        console.error('Failed to schedule sync:', error);
    });
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
    console.log('Push message received');
    
    const options = {
        body: event.data ? event.data.text() : 'Nova notificação do Quiz Pro',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'Abrir App',
                icon: '/icon-192.png'
            },
            {
                action: 'close',
                title: 'Fechar'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Quiz Pro', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// ===== UTILITY FUNCTIONS =====

async function getPendingSync(type) {
    // This would typically use IndexedDB
    // For simplicity, using a mock implementation
    return [];
}

async function clearPendingSync(type) {
    // Clear synced data from storage
    console.log('Clearing pending sync data for:', type);
}

// ===== PERFORMANCE MONITORING =====
self.addEventListener('fetch', (event) => {
    // Track fetch performance
    const startTime = performance.now();
    
    event.respondWith(
        handleFetch(event.request).then(response => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Log slow requests
            if (duration > 1000) {
                console.warn('Slow request:', event.request.url, duration + 'ms');
            }
            
            return response;
        })
    );
});

async function handleFetch(request) {
    // This is where we'd normally handle the fetch
    // For now, just use the default behavior
    return fetch(request);
}

// ===== ERROR HANDLING =====
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Quiz Pro Service Worker loaded');