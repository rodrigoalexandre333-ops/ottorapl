/**
 * Quiz Storage Module
 * Handles data persistence and local storage management
 */

class QuizStorage {
    constructor() {
        this.storageKeys = {
            questions: 'quiz-created-questions',
            history: 'quiz-history',
            settings: 'quiz-settings',
            draft: 'quiz-question-draft',
            theme: 'quiz-theme',
            appState: 'quiz-app-state',
            collections: 'quiz-collections',
            imports: 'quiz-imports'
        };
        
        this.init();
    }

    init() {
        this.migrateOldData();
        this.cleanupOldEntries();
    }

    // ===== QUESTIONS MANAGEMENT =====
    
    saveQuestion(question) {
        const questions = this.getAllQuestions();
        
        if (question.id) {
            // Update existing question
            const index = questions.findIndex(q => q.id === question.id);
            if (index !== -1) {
                questions[index] = { ...question, updatedAt: new Date().toISOString() };
            } else {
                questions.push({ ...question, createdAt: new Date().toISOString() });
            }
        } else {
            // New question
            question.id = this.generateId();
            question.createdAt = new Date().toISOString();
            questions.push(question);
        }
        
        this.setItem(this.storageKeys.questions, questions);
        return question.id;
    }

    getAllQuestions() {
        return this.getItem(this.storageKeys.questions, []);
    }

    getQuestionById(id) {
        const questions = this.getAllQuestions();
        return questions.find(q => q.id === id);
    }

    deleteQuestion(id) {
        const questions = this.getAllQuestions();
        const filtered = questions.filter(q => q.id !== id);
        this.setItem(this.storageKeys.questions, filtered);
        return filtered.length < questions.length;
    }

    searchQuestions(query, filters = {}) {
        const questions = this.getAllQuestions();
        
        return questions.filter(question => {
            // Text search
            if (query) {
                const searchText = query.toLowerCase();
                const inText = question.text.toLowerCase().includes(searchText);
                const inCategory = question.category?.toLowerCase().includes(searchText);
                const inTags = question.tags?.some(tag => tag.toLowerCase().includes(searchText));
                
                if (!inText && !inCategory && !inTags) {
                    return false;
                }
            }
            
            // Filters
            if (filters.difficulty && question.difficulty !== filters.difficulty) {
                return false;
            }
            
            if (filters.type && question.type !== filters.type) {
                return false;
            }
            
            if (filters.category && question.category !== filters.category) {
                return false;
            }
            
            return true;
        });
    }

    // ===== QUIZ HISTORY =====
    
    saveQuizResult(result) {
        const history = this.getQuizHistory();
        
        // Add result with metadata
        const resultWithMeta = {
            ...result,
            id: this.generateId(),
            timestamp: new Date().toISOString()
        };
        
        history.unshift(resultWithMeta);
        
        // Keep only last 100 results
        if (history.length > 100) {
            history.splice(100);
        }
        
        this.setItem(this.storageKeys.history, history);
        return resultWithMeta.id;
    }

    getQuizHistory(limit = 50) {
        const history = this.getItem(this.storageKeys.history, []);
        return limit ? history.slice(0, limit) : history;
    }

    getQuizStatistics() {
        const history = this.getQuizHistory();
        
        if (history.length === 0) {
            return {
                totalQuizzes: 0,
                totalQuestions: 0,
                averageScore: 0,
                bestScore: 0,
                totalTime: 0,
                averageTime: 0
            };
        }

        const stats = history.reduce((acc, result) => {
            acc.totalQuizzes++;
            acc.totalQuestions += result.summary.totalQuestions;
            acc.totalScore += result.summary.percentage;
            acc.totalTime += result.summary.totalTime || 0;
            
            if (result.summary.percentage > acc.bestScore) {
                acc.bestScore = result.summary.percentage;
            }
            
            return acc;
        }, {
            totalQuizzes: 0,
            totalQuestions: 0,
            totalScore: 0,
            bestScore: 0,
            totalTime: 0
        });

        return {
            totalQuizzes: stats.totalQuizzes,
            totalQuestions: stats.totalQuestions,
            averageScore: Math.round(stats.totalScore / stats.totalQuizzes),
            bestScore: stats.bestScore,
            totalTime: stats.totalTime,
            averageTime: stats.totalQuizzes > 0 ? Math.round(stats.totalTime / stats.totalQuizzes) : 0
        };
    }

    deleteQuizHistory() {
        this.setItem(this.storageKeys.history, []);
    }

    // ===== COLLECTIONS MANAGEMENT =====
    
    saveCollection(collection) {
        const collections = this.getAllCollections();
        
        if (collection.id) {
            // Update existing
            const index = collections.findIndex(c => c.id === collection.id);
            if (index !== -1) {
                collections[index] = { ...collection, updatedAt: new Date().toISOString() };
            }
        } else {
            // New collection
            collection.id = this.generateId();
            collection.createdAt = new Date().toISOString();
            collections.push(collection);
        }
        
        this.setItem(this.storageKeys.collections, collections);
        return collection.id;
    }

    getAllCollections() {
        return this.getItem(this.storageKeys.collections, []);
    }

    getCollectionById(id) {
        const collections = this.getAllCollections();
        return collections.find(c => c.id === id);
    }

    deleteCollection(id) {
        const collections = this.getAllCollections();
        const filtered = collections.filter(c => c.id !== id);
        this.setItem(this.storageKeys.collections, filtered);
        return filtered.length < collections.length;
    }

    // ===== IMPORT/EXPORT =====
    
    exportData(includeHistory = true) {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            questions: this.getAllQuestions(),
            collections: this.getAllCollections(),
            settings: this.getItem(this.storageKeys.settings, {})
        };
        
        if (includeHistory) {
            data.history = this.getQuizHistory();
        }
        
        return data;
    }

    importData(data, options = {}) {
        const { 
            mergeQuestions = true, 
            mergeCollections = true, 
            mergeHistory = false,
            overwriteSettings = false 
        } = options;
        
        let importedCount = 0;
        
        try {
            // Import questions
            if (data.questions && Array.isArray(data.questions)) {
                if (mergeQuestions) {
                    const existingQuestions = this.getAllQuestions();
                    const existingIds = new Set(existingQuestions.map(q => q.id));
                    
                    const newQuestions = data.questions.filter(q => !existingIds.has(q.id));
                    newQuestions.forEach(q => {
                        if (!q.id) q.id = this.generateId();
                        q.importedAt = new Date().toISOString();
                    });
                    
                    const allQuestions = [...existingQuestions, ...newQuestions];
                    this.setItem(this.storageKeys.questions, allQuestions);
                    importedCount += newQuestions.length;
                } else {
                    data.questions.forEach(q => {
                        if (!q.id) q.id = this.generateId();
                        q.importedAt = new Date().toISOString();
                    });
                    
                    this.setItem(this.storageKeys.questions, data.questions);
                    importedCount = data.questions.length;
                }
            }
            
            // Import collections
            if (data.collections && Array.isArray(data.collections) && mergeCollections) {
                const existingCollections = this.getAllCollections();
                const existingIds = new Set(existingCollections.map(c => c.id));
                
                const newCollections = data.collections.filter(c => !existingIds.has(c.id));
                newCollections.forEach(c => {
                    if (!c.id) c.id = this.generateId();
                    c.importedAt = new Date().toISOString();
                });
                
                const allCollections = [...existingCollections, ...newCollections];
                this.setItem(this.storageKeys.collections, allCollections);
            }
            
            // Import history
            if (data.history && Array.isArray(data.history) && mergeHistory) {
                const existingHistory = this.getQuizHistory();
                const allHistory = [...existingHistory, ...data.history];
                
                // Remove duplicates and sort by timestamp
                const uniqueHistory = allHistory.filter((item, index, arr) => 
                    index === arr.findIndex(t => t.id === item.id)
                ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                this.setItem(this.storageKeys.history, uniqueHistory.slice(0, 100));
            }
            
            // Import settings
            if (data.settings && overwriteSettings) {
                this.setItem(this.storageKeys.settings, data.settings);
            }
            
            // Log import
            this.logImport(data, importedCount);
            
            return {
                success: true,
                importedQuestions: importedCount,
                message: `${importedCount} questões importadas com sucesso`
            };
            
        } catch (error) {
            console.error('Import error:', error);
            return {
                success: false,
                error: error.message,
                message: 'Erro ao importar dados'
            };
        }
    }

    logImport(data, importedCount) {
        const imports = this.getItem(this.storageKeys.imports, []);
        
        imports.unshift({
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            questionsImported: importedCount,
            sourceVersion: data.version,
            sourceDate: data.exportDate
        });
        
        // Keep only last 20 import logs
        if (imports.length > 20) {
            imports.splice(20);
        }
        
        this.setItem(this.storageKeys.imports, imports);
    }

    // ===== UTILITY METHODS =====
    
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn(`Failed to get item ${key}:`, error);
            return defaultValue;
        }
    }

    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Failed to set item ${key}:`, error);
            
            if (error.name === 'QuotaExceededError') {
                this.handleStorageFull();
            }
            
            return false;
        }
    }

    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn(`Failed to remove item ${key}:`, error);
            return false;
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // ===== STORAGE MANAGEMENT =====
    
    getStorageInfo() {
        const info = {
            questionsCount: this.getAllQuestions().length,
            historyCount: this.getQuizHistory().length,
            collectionsCount: this.getAllCollections().length,
            storageUsed: 0,
            storageLimit: 0
        };
        
        // Calculate storage usage
        let totalSize = 0;
        Object.keys(this.storageKeys).forEach(key => {
            const item = localStorage.getItem(this.storageKeys[key]);
            if (item) {
                totalSize += item.length;
            }
        });
        
        info.storageUsed = totalSize;
        
        // Estimate storage limit (5MB for most browsers)
        info.storageLimit = 5 * 1024 * 1024;
        info.storagePercentage = Math.round((totalSize / info.storageLimit) * 100);
        
        return info;
    }

    handleStorageFull() {
        window.quizApp?.showToast(
            'Armazenamento local cheio. Limpando dados antigos...', 
            'warning'
        );
        
        // Clean old history entries
        const history = this.getQuizHistory();
        if (history.length > 20) {
            this.setItem(this.storageKeys.history, history.slice(0, 20));
        }
        
        // Clean old imports
        this.setItem(this.storageKeys.imports, []);
        
        window.quizApp?.showToast('Dados antigos removidos', 'info');
    }

    migrateOldData() {
        // Migrate from old storage keys if they exist
        const oldKeys = [
            'quiz-created-questions',
            'quiz-history',
            'quiz-settings'
        ];
        
        oldKeys.forEach(oldKey => {
            const data = localStorage.getItem(oldKey);
            if (data && !localStorage.getItem(this.storageKeys[oldKey.split('-')[1]])) {
                localStorage.setItem(this.storageKeys[oldKey.split('-')[1]], data);
            }
        });
    }

    cleanupOldEntries() {
        // Remove entries older than 6 months from history
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const history = this.getQuizHistory();
        const recentHistory = history.filter(item => 
            new Date(item.timestamp) > sixMonthsAgo
        );
        
        if (recentHistory.length < history.length) {
            this.setItem(this.storageKeys.history, recentHistory);
        }
    }

    clearAllData() {
        const confirm = window.confirm(
            'Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita.'
        );
        
        if (confirm) {
            Object.values(this.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });
            
            window.quizApp?.showToast('Todos os dados foram removidos', 'info');
            
            // Reload page to reset app state
            window.location.reload();
        }
    }

    // ===== BACKUP & RESTORE =====
    
    createBackup() {
        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: this.exportData(true),
            storageInfo: this.getStorageInfo()
        };
        
        const filename = `quiz-backup-${new Date().toISOString().split('T')[0]}.json`;
        this.downloadJSON(backup, filename);
        
        return backup;
    }

    restoreBackup(backupData) {
        if (!backupData || !backupData.data) {
            throw new Error('Dados de backup inválidos');
        }
        
        const result = this.importData(backupData.data, {
            mergeQuestions: false,
            mergeCollections: false,
            mergeHistory: true,
            overwriteSettings: true
        });
        
        if (result.success) {
            window.quizApp?.showToast('Backup restaurado com sucesso!');
        }
        
        return result;
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}