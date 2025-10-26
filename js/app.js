/**
 * Quiz Pro Web App - Main Application Controller
 * Manages overall app state, navigation, and user interactions
 */

class QuizApp {
    constructor() {
        this.currentView = 'quiz';
        this.theme = localStorage.getItem('quiz-theme') || 'dark';
        this.settings = this.loadSettings();
        
        this.init();
    }

    init() {
        this.initializeTheme();
        this.bindEvents();
        this.initializeViews();
        this.loadAppState();
        
        // Initialize modules
        this.quiz = new QuizModule();
        this.creator = new QuestionCreator();
        this.storage = new QuizStorage();
        this.stats = new QuizStats();
        
        console.log('Quiz Pro Web App initialized');
    }

    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const themeBtn = document.getElementById('themeToggle');
        const icon = themeBtn.querySelector('i');
        icon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        themeBtn.title = this.theme === 'dark' ? 'Modo claro' : 'Modo escuro';
    }

    bindEvents() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Fullscreen toggle
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                this.switchView(view);
            });
        });

        // Modal close events
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });

        // Settings form
        this.bindSettingsEvents();

        // Responsive sidebar
        this.bindResponsiveEvents();

        // PWA events
        this.bindPWAEvents();

        // Keyboard shortcuts
        this.bindKeyboardShortcuts();
    }

    bindSettingsEvents() {
        const settingsInputs = document.querySelectorAll('#settingsModal input, #settingsModal select');
        settingsInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateSettings();
            });
        });
    }

    bindResponsiveEvents() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.handleResize();
            }, 250);
        });

        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
    }

    bindPWAEvents() {
        // Service worker registration
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('SW registered: ', registration);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }

        // Install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallButton();
        });
    }

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.switchView('create');
                        break;
                    case 'm':
                        e.preventDefault();
                        this.switchView('manage');
                        break;
                    case 's':
                        e.preventDefault();
                        this.switchView('stats');
                        break;
                    case ',':
                        e.preventDefault();
                        this.openSettings();
                        break;
                }
            }

            // Escape key
            if (e.key === 'Escape') {
                this.closeAllModals();
            }

            // F11 for fullscreen
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
        });
    }

    initializeViews() {
        this.views = {
            quiz: document.getElementById('quizView'),
            create: document.getElementById('createView'),
            manage: document.getElementById('manageView'),
            stats: document.getElementById('statsView'),
            export: document.getElementById('exportView')
        };
    }

    switchView(viewName) {
        if (!this.views[viewName]) return;

        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // Show/hide views
        Object.keys(this.views).forEach(key => {
            this.views[key].classList.remove('active');
        });
        this.views[viewName].classList.add('active');

        this.currentView = viewName;
        this.saveAppState();

        // Trigger view-specific initialization
        this.initializeCurrentView();
    }

    initializeCurrentView() {
        switch (this.currentView) {
            case 'create':
                this.creator.initialize();
                break;
            case 'manage':
                this.initializeManageView();
                break;
            case 'stats':
                this.stats.initialize();
                break;
            case 'export':
                this.initializeExportView();
                break;
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('quiz-theme', this.theme);
        this.updateThemeIcon();
        
        this.showToast(`Tema alterado para ${this.theme === 'dark' ? 'escuro' : 'claro'}`);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                this.showToast('Erro ao entrar em tela cheia', 'error');
            });
        } else {
            document.exitFullscreen();
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('collapsed');
        
        const icon = document.querySelector('#sidebarToggle i');
        icon.className = sidebar.classList.contains('collapsed') ? 
            'fas fa-chevron-right' : 'fas fa-chevron-left';
    }

    openSettings() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('active');
        
        // Load current settings into form
        this.loadSettingsIntoForm();
    }

    loadSettingsIntoForm() {
        document.getElementById('autoNextQuestion').checked = this.settings.autoNext;
        document.getElementById('showTimer').checked = this.settings.showTimer;
        document.getElementById('randomizeQuestions').checked = this.settings.randomize;
        document.getElementById('questionTime').value = this.settings.questionTime;
    }

    updateSettings() {
        this.settings = {
            autoNext: document.getElementById('autoNextQuestion').checked,
            showTimer: document.getElementById('showTimer').checked,
            randomize: document.getElementById('randomizeQuestions').checked,
            questionTime: parseInt(document.getElementById('questionTime').value)
        };
        
        this.saveSettings();
        this.showToast('Configurações salvas');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    handleResize() {
        const isMobile = window.innerWidth <= 768;
        const sidebar = document.querySelector('.sidebar');
        
        if (isMobile) {
            sidebar.classList.remove('active');
        }
    }

    handleOrientationChange() {
        const isPortrait = window.innerHeight > window.innerWidth;
        const mobileControls = document.getElementById('mobileControls');
        
        if (isPortrait && window.innerWidth <= 768) {
            mobileControls.style.display = 'flex';
            if (this.quiz && this.quiz.isActive) {
                this.quiz.showResults();
            }
        } else {
            mobileControls.style.display = 'none';
        }
    }

    showInstallButton() {
        // Create install button if it doesn't exist
        let installBtn = document.getElementById('installBtn');
        if (!installBtn) {
            installBtn = document.createElement('button');
            installBtn.id = 'installBtn';
            installBtn.className = 'btn btn-primary';
            installBtn.innerHTML = '<i class="fas fa-download"></i> Instalar App';
            
            const headerControls = document.querySelector('.header-controls');
            headerControls.insertBefore(installBtn, headerControls.firstChild);
            
            installBtn.addEventListener('click', () => {
                this.installApp();
            });
        }
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                this.showToast('App instalado com sucesso!');
            }
            
            this.deferredPrompt = null;
            document.getElementById('installBtn')?.remove();
        }
    }

    showToast(message, type = 'info') {
        // Create toast if it doesn't exist
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.className = `toast toast-${type} active`;

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }

    showLoading(show = true) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.style.display = show ? 'flex' : 'none';
    }

    loadSettings() {
        const defaultSettings = {
            autoNext: false,
            showTimer: true,
            randomize: false,
            questionTime: 30
        };

        const saved = localStorage.getItem('quiz-settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    saveSettings() {
        localStorage.setItem('quiz-settings', JSON.stringify(this.settings));
    }

    loadAppState() {
        const saved = localStorage.getItem('quiz-app-state');
        if (saved) {
            const state = JSON.parse(saved);
            this.currentView = state.currentView || 'quiz';
            this.switchView(this.currentView);
        }
    }

    saveAppState() {
        const state = {
            currentView: this.currentView,
            timestamp: Date.now()
        };
        localStorage.setItem('quiz-app-state', JSON.stringify(state));
    }

    // Placeholder methods for other views
    initializeManageView() {
        const container = document.getElementById('questionsList');
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-folder-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p>Funcionalidade de gerenciamento em desenvolvimento.</p>
                <p class="text-muted">Aqui você poderá editar, organizar e categorizar suas questões.</p>
            </div>
        `;
    }

    initializeExportView() {
        const container = document.getElementById('exportContent');
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-file-export" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p>Funcionalidade de exportação em desenvolvimento.</p>
                <p class="text-muted">Aqui você poderá exportar seus quizzes em diferentes formatos (PDF, Excel, etc.).</p>
            </div>
        `;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new QuizApp();
});