/**
 * Progressive Web App (PWA) Module
 * Handles service worker, offline functionality, and app installation
 */

class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isOnline = navigator.onLine;
        this.offlineQueue = [];
        
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.bindInstallPrompt();
        this.bindOfflineHandlers();
        this.setupOfflineIndicator();
        this.handleAppUpdates();
    }

    // ===== SERVICE WORKER =====
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                
                console.log('Service Worker registered:', registration);
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateAvailable();
                        }
                    });
                });
                
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    showUpdateAvailable() {
        const updateBanner = this.createUpdateBanner();
        document.body.appendChild(updateBanner);
        
        setTimeout(() => {
            updateBanner.classList.add('show');
        }, 100);
    }

    createUpdateBanner() {
        const banner = document.createElement('div');
        banner.className = 'update-banner';
        banner.innerHTML = `
            <div class="update-content">
                <div class="update-message">
                    <i class="fas fa-download"></i>
                    <span>Nova versão disponível!</span>
                </div>
                <div class="update-actions">
                    <button id="updateApp" class="btn btn-primary btn-sm">Atualizar</button>
                    <button id="dismissUpdate" class="btn btn-outline btn-sm">Depois</button>
                </div>
            </div>
        `;

        // Bind events
        banner.querySelector('#updateApp').addEventListener('click', () => {
            this.applyUpdate();
        });

        banner.querySelector('#dismissUpdate').addEventListener('click', () => {
            banner.remove();
        });

        return banner;
    }

    async applyUpdate() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            }
        }
    }

    // ===== APP INSTALLATION =====
    
    bindInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            console.log('App installed');
            this.hideInstallButton();
            window.quizApp?.showToast('App instalado com sucesso!');
        });
    }

    showInstallButton() {
        let installBtn = document.getElementById('installBtn');
        
        if (!installBtn) {
            installBtn = document.createElement('button');
            installBtn.id = 'installBtn';
            installBtn.className = 'btn btn-primary';
            installBtn.innerHTML = '<i class="fas fa-download"></i> Instalar App';
            installBtn.title = 'Instalar Quiz Pro como aplicativo';
            
            const headerControls = document.querySelector('.header-controls');
            if (headerControls) {
                headerControls.insertBefore(installBtn, headerControls.firstChild);
            }
        }

        installBtn.addEventListener('click', () => {
            this.promptInstall();
        });

        installBtn.style.display = 'inline-flex';
    }

    hideInstallButton() {
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }

    async promptInstall() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted install prompt');
            } else {
                console.log('User dismissed install prompt');
            }
            
            this.deferredPrompt = null;
        }
    }

    // ===== OFFLINE FUNCTIONALITY =====
    
    bindOfflineHandlers() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateOnlineStatus();
            this.processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateOnlineStatus();
        });
    }

    setupOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'offlineIndicator';
        indicator.className = 'offline-indicator';
        indicator.innerHTML = `
            <div class="offline-content">
                <i class="fas fa-wifi-slash"></i>
                <span>Modo Offline</span>
            </div>
        `;
        
        document.body.appendChild(indicator);
        this.updateOnlineStatus();
    }

    updateOnlineStatus() {
        const indicator = document.getElementById('offlineIndicator');
        const headerControls = document.querySelector('.header-controls');
        
        if (!this.isOnline) {
            indicator.classList.add('show');
            headerControls?.classList.add('offline-mode');
            window.quizApp?.showToast('Você está offline. Algumas funcionalidades podem estar limitadas.', 'warning');
        } else {
            indicator.classList.remove('show');
            headerControls?.classList.remove('offline-mode');
            
            if (this.offlineQueue.length > 0) {
                window.quizApp?.showToast('Conectado! Sincronizando dados...');
            }
        }
    }

    // ===== OFFLINE QUEUE =====
    
    addToOfflineQueue(action) {
        this.offlineQueue.push({
            ...action,
            timestamp: Date.now()
        });
        
        // Persist queue
        localStorage.setItem('pwa-offline-queue', JSON.stringify(this.offlineQueue));
    }

    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) return;

        const queue = [...this.offlineQueue];
        this.offlineQueue = [];

        for (const action of queue) {
            try {
                await this.processOfflineAction(action);
            } catch (error) {
                console.error('Failed to process offline action:', error);
                // Re-add to queue if failed
                this.offlineQueue.push(action);
            }
        }

        // Update persisted queue
        localStorage.setItem('pwa-offline-queue', JSON.stringify(this.offlineQueue));

        if (this.offlineQueue.length === 0) {
            window.quizApp?.showToast('Todos os dados foram sincronizados!');
        }
    }

    async processOfflineAction(action) {
        switch (action.type) {
            case 'save-question':
                // Process saved questions
                break;
            case 'save-result':
                // Process quiz results
                break;
            default:
                console.log('Unknown offline action:', action.type);
        }
    }

    loadOfflineQueue() {
        const stored = localStorage.getItem('pwa-offline-queue');
        if (stored) {
            try {
                this.offlineQueue = JSON.parse(stored);
            } catch (error) {
                console.error('Failed to load offline queue:', error);
                this.offlineQueue = [];
            }
        }
    }

    // ===== APP UPDATES =====
    
    handleAppUpdates() {
        // Check for updates periodically
        setInterval(() => {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
            }
        }, 30000); // Check every 30 seconds

        // Listen for update messages
        navigator.serviceWorker?.addEventListener('message', (event) => {
            if (event.data.type === 'UPDATE_AVAILABLE') {
                this.showUpdateAvailable();
            }
        });
    }

    // ===== STORAGE MANAGEMENT =====
    
    async estimateStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage,
                    quota: estimate.quota,
                    percentage: Math.round((estimate.usage / estimate.quota) * 100)
                };
            } catch (error) {
                console.error('Failed to estimate storage:', error);
            }
        }
        return null;
    }

    async requestPersistentStorage() {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            try {
                const persistent = await navigator.storage.persist();
                if (persistent) {
                    window.quizApp?.showToast('Armazenamento persistente ativado!');
                } else {
                    console.log('Persistent storage not granted');
                }
                return persistent;
            } catch (error) {
                console.error('Failed to request persistent storage:', error);
            }
        }
        return false;
    }

    // ===== SHARE FUNCTIONALITY =====
    
    async shareQuiz(quizData) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Quiz Pro - Quiz Compartilhado',
                    text: `Confira este quiz com ${quizData.questions.length} questões!`,
                    url: window.location.origin
                });
            } catch (error) {
                console.log('Share cancelled or failed:', error);
                this.fallbackShare(quizData);
            }
        } else {
            this.fallbackShare(quizData);
        }
    }

    fallbackShare(quizData) {
        // Create shareable link or copy to clipboard
        const shareData = {
            title: 'Quiz Compartilhado',
            questions: quizData.questions,
            createdAt: new Date().toISOString()
        };

        const shareText = `Confira este quiz: ${JSON.stringify(shareData)}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                window.quizApp?.showToast('Dados do quiz copiados para a área de transferência!');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            window.quizApp?.showToast('Dados do quiz copiados!');
        }
    }

    // ===== NOTIFICATION SUPPORT =====
    
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    showNotification(title, options = {}) {
        if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(title, {
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    ...options
                });
            });
        }
    }

    // ===== UTILITY METHODS =====
    
    isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    getInstallationStatus() {
        return {
            isInstalled: this.isInstalled(),
            canInstall: !!this.deferredPrompt,
            isOnline: this.isOnline,
            hasServiceWorker: 'serviceWorker' in navigator,
            hasNotifications: 'Notification' in window
        };
    }

    // ===== PERFORMANCE MONITORING =====
    
    trackPerformance() {
        if ('performance' in window) {
            // Track page load time
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const navigation = performance.getEntriesByType('navigation')[0];
                    const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
                    
                    console.log('Page load time:', loadTime + 'ms');
                    
                    // Store performance data
                    const perfData = {
                        timestamp: Date.now(),
                        loadTime: loadTime,
                        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
                        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
                    };
                    
                    this.storePerformanceData(perfData);
                }, 0);
            });
        }
    }

    storePerformanceData(data) {
        const stored = JSON.parse(localStorage.getItem('pwa-performance') || '[]');
        stored.push(data);
        
        // Keep only last 50 entries
        if (stored.length > 50) {
            stored.splice(0, stored.length - 50);
        }
        
        localStorage.setItem('pwa-performance', JSON.stringify(stored));
    }

    getPerformanceData() {
        return JSON.parse(localStorage.getItem('pwa-performance') || '[]');
    }
}

// Initialize PWA manager
document.addEventListener('DOMContentLoaded', () => {
    window.pwaManager = new PWAManager();
    window.pwaManager.trackPerformance();
});