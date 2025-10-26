/**
 * Quiz Statistics Module
 * Handles analytics and performance tracking
 */

class QuizStats {
    constructor() {
        this.storage = window.quizApp?.storage || new QuizStorage();
    }

    initialize() {
        this.renderStatistics();
        this.bindEvents();
    }

    bindEvents() {
        // Refresh button
        const refreshBtn = document.querySelector('#statsView .btn-primary');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.renderStatistics();
                window.quizApp.showToast('Estatísticas atualizadas');
            });
        }
    }

    renderStatistics() {
        const container = document.getElementById('statsContent');
        if (!container) return;

        const stats = this.generateStatistics();
        container.innerHTML = this.generateStatsHTML(stats);
        
        // Add interactive elements
        this.addChartPlaceholders(container);
        this.bindStatsEvents(container);
    }

    generateStatistics() {
        const history = this.storage.getQuizHistory();
        const questions = this.storage.getAllQuestions();
        
        return {
            overview: this.getOverviewStats(history, questions),
            performance: this.getPerformanceStats(history),
            trends: this.getTrendStats(history),
            categories: this.getCategoryStats(history, questions),
            time: this.getTimeStats(history),
            recent: this.getRecentActivity(history)
        };
    }

    getOverviewStats(history, questions) {
        const totalQuizzes = history.length;
        const totalQuestions = questions.length;
        const totalAnswered = history.reduce((sum, h) => sum + h.summary.totalQuestions, 0);
        
        let averageScore = 0;
        let bestScore = 0;
        let totalTime = 0;
        
        if (totalQuizzes > 0) {
            const scores = history.map(h => h.summary.percentage);
            averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
            bestScore = Math.max(...scores);
            totalTime = history.reduce((sum, h) => sum + (h.summary.totalTime || 0), 0);
        }

        return {
            totalQuizzes,
            totalQuestions,
            totalAnswered,
            averageScore,
            bestScore,
            totalTime: this.formatTime(totalTime),
            averageTime: totalQuizzes > 0 ? this.formatTime(totalTime / totalQuizzes) : '00:00'
        };
    }

    getPerformanceStats(history) {
        if (history.length === 0) {
            return {
                correctAnswers: 0,
                incorrectAnswers: 0,
                skippedAnswers: 0,
                accuracyRate: 0
            };
        }

        const totals = history.reduce((acc, result) => {
            acc.correct += result.summary.correctAnswers;
            acc.incorrect += result.summary.incorrectAnswers;
            acc.skipped += result.summary.skipped;
            return acc;
        }, { correct: 0, incorrect: 0, skipped: 0 });

        const totalAnswered = totals.correct + totals.incorrect;
        const accuracyRate = totalAnswered > 0 ? Math.round((totals.correct / totalAnswered) * 100) : 0;

        return {
            correctAnswers: totals.correct,
            incorrectAnswers: totals.incorrect,
            skippedAnswers: totals.skipped,
            accuracyRate
        };
    }

    getTrendStats(history) {
        if (history.length < 2) {
            return {
                scoreImprovement: 0,
                timeImprovement: 0,
                consistencyScore: 0,
                trend: 'stable'
            };
        }

        // Sort by date (most recent first)
        const sortedHistory = [...history].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        // Compare last 5 quizzes with previous 5
        const recent = sortedHistory.slice(0, 5);
        const previous = sortedHistory.slice(5, 10);

        if (previous.length === 0) {
            return {
                scoreImprovement: 0,
                timeImprovement: 0,
                consistencyScore: this.calculateConsistency(recent),
                trend: 'stable'
            };
        }

        const recentAvg = recent.reduce((sum, h) => sum + h.summary.percentage, 0) / recent.length;
        const previousAvg = previous.reduce((sum, h) => sum + h.summary.percentage, 0) / previous.length;
        
        const recentTimeAvg = recent.reduce((sum, h) => sum + (h.summary.totalTime || 0), 0) / recent.length;
        const previousTimeAvg = previous.reduce((sum, h) => sum + (h.summary.totalTime || 0), 0) / previous.length;

        const scoreImprovement = Math.round(recentAvg - previousAvg);
        const timeImprovement = Math.round(previousTimeAvg - recentTimeAvg); // Negative means faster
        const consistencyScore = this.calculateConsistency(recent);

        let trend = 'stable';
        if (scoreImprovement > 5) trend = 'improving';
        else if (scoreImprovement < -5) trend = 'declining';

        return {
            scoreImprovement,
            timeImprovement,
            consistencyScore,
            trend
        };
    }

    calculateConsistency(results) {
        if (results.length < 2) return 100;

        const scores = results.map(r => r.summary.percentage);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);

        // Convert to consistency score (0-100, higher is more consistent)
        return Math.max(0, Math.round(100 - (standardDeviation * 2)));
    }

    getCategoryStats(history, questions) {
        const categoryData = {};

        // Analyze questions by category
        questions.forEach(question => {
            const category = question.category || 'Sem categoria';
            if (!categoryData[category]) {
                categoryData[category] = {
                    totalQuestions: 0,
                    totalAnswered: 0,
                    correctAnswers: 0,
                    averageScore: 0
                };
            }
            categoryData[category].totalQuestions++;
        });

        // This would need more detailed tracking in quiz results
        // For now, we'll show question distribution by category
        const categories = Object.keys(categoryData).map(category => ({
            name: category,
            ...categoryData[category]
        })).sort((a, b) => b.totalQuestions - a.totalQuestions);

        return categories;
    }

    getTimeStats(history) {
        if (history.length === 0) {
            return {
                fastestQuiz: '00:00',
                slowestQuiz: '00:00',
                averageQuestionTime: '00:00',
                totalStudyTime: '00:00'
            };
        }

        const times = history
            .map(h => h.summary.totalTime || 0)
            .filter(time => time > 0);

        if (times.length === 0) {
            return {
                fastestQuiz: '00:00',
                slowestQuiz: '00:00',
                averageQuestionTime: '00:00',
                totalStudyTime: '00:00'
            };
        }

        const fastestQuiz = Math.min(...times);
        const slowestQuiz = Math.max(...times);
        const totalTime = times.reduce((sum, time) => sum + time, 0);
        const totalQuestions = history.reduce((sum, h) => sum + h.summary.totalQuestions, 0);
        const averageQuestionTime = totalQuestions > 0 ? totalTime / totalQuestions : 0;

        return {
            fastestQuiz: this.formatTime(fastestQuiz),
            slowestQuiz: this.formatTime(slowestQuiz),
            averageQuestionTime: this.formatTime(averageQuestionTime),
            totalStudyTime: this.formatTime(totalTime)
        };
    }

    getRecentActivity(history) {
        return history.slice(0, 10).map(result => ({
            date: this.formatDate(result.timestamp),
            score: result.summary.percentage,
            questions: result.summary.totalQuestions,
            time: this.formatTime(result.summary.totalTime || 0),
            id: result.id
        }));
    }

    generateStatsHTML(stats) {
        return `
            <div class="stats-dashboard">
                <!-- Overview Cards -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.overview.totalQuizzes}</div>
                            <div class="stat-label">Quizzes Realizados</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-question-circle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.overview.totalQuestions}</div>
                            <div class="stat-label">Questões Criadas</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.overview.averageScore}%</div>
                            <div class="stat-label">Pontuação Média</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-trophy"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.overview.bestScore}%</div>
                            <div class="stat-label">Melhor Pontuação</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.overview.totalTime}</div>
                            <div class="stat-label">Tempo Total</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-stopwatch"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.overview.averageTime}</div>
                            <div class="stat-label">Tempo Médio</div>
                        </div>
                    </div>
                </div>

                <!-- Performance Section -->
                <div class="stats-section">
                    <h3><i class="fas fa-chart-bar"></i> Performance</h3>
                    <div class="performance-grid">
                        <div class="performance-item correct">
                            <div class="performance-number">${stats.performance.correctAnswers}</div>
                            <div class="performance-label">Respostas Corretas</div>
                        </div>
                        <div class="performance-item incorrect">
                            <div class="performance-number">${stats.performance.incorrectAnswers}</div>
                            <div class="performance-label">Respostas Incorretas</div>
                        </div>
                        <div class="performance-item skipped">
                            <div class="performance-number">${stats.performance.skippedAnswers}</div>
                            <div class="performance-label">Questões Puladas</div>
                        </div>
                        <div class="performance-item accuracy">
                            <div class="performance-number">${stats.performance.accuracyRate}%</div>
                            <div class="performance-label">Taxa de Acerto</div>
                        </div>
                    </div>
                </div>

                <!-- Trends Section -->
                <div class="stats-section">
                    <h3><i class="fas fa-trending-up"></i> Tendências</h3>
                    <div class="trends-grid">
                        <div class="trend-item">
                            <div class="trend-icon ${this.getTrendClass(stats.trends.scoreImprovement)}">
                                <i class="fas ${this.getTrendIcon(stats.trends.scoreImprovement)}"></i>
                            </div>
                            <div class="trend-content">
                                <div class="trend-number">${stats.trends.scoreImprovement > 0 ? '+' : ''}${stats.trends.scoreImprovement}%</div>
                                <div class="trend-label">Melhoria na Pontuação</div>
                            </div>
                        </div>
                        
                        <div class="trend-item">
                            <div class="trend-icon ${this.getConsistencyClass(stats.trends.consistencyScore)}">
                                <i class="fas fa-bullseye"></i>
                            </div>
                            <div class="trend-content">
                                <div class="trend-number">${stats.trends.consistencyScore}%</div>
                                <div class="trend-label">Consistência</div>
                            </div>
                        </div>

                        <div class="trend-item">
                            <div class="trend-icon ${this.getTrendClass(-stats.trends.timeImprovement)}">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="trend-content">
                                <div class="trend-number">${this.formatTimeImprovement(stats.trends.timeImprovement)}</div>
                                <div class="trend-label">Melhoria no Tempo</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Time Statistics -->
                <div class="stats-section">
                    <h3><i class="fas fa-stopwatch"></i> Estatísticas de Tempo</h3>
                    <div class="time-stats-grid">
                        <div class="time-stat-item">
                            <div class="time-stat-label">Quiz Mais Rápido</div>
                            <div class="time-stat-value">${stats.time.fastestQuiz}</div>
                        </div>
                        <div class="time-stat-item">
                            <div class="time-stat-label">Quiz Mais Lento</div>
                            <div class="time-stat-value">${stats.time.slowestQuiz}</div>
                        </div>
                        <div class="time-stat-item">
                            <div class="time-stat-label">Tempo Médio por Questão</div>
                            <div class="time-stat-value">${stats.time.averageQuestionTime}</div>
                        </div>
                        <div class="time-stat-item">
                            <div class="time-stat-label">Tempo Total de Estudo</div>
                            <div class="time-stat-value">${stats.time.totalStudyTime}</div>
                        </div>
                    </div>
                </div>

                <!-- Categories Section -->
                ${stats.categories.length > 0 ? `
                <div class="stats-section">
                    <h3><i class="fas fa-folder"></i> Questões por Categoria</h3>
                    <div class="categories-list">
                        ${stats.categories.map(category => `
                            <div class="category-item">
                                <div class="category-name">${category.name}</div>
                                <div class="category-count">${category.totalQuestions} questões</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Recent Activity -->
                ${stats.recent.length > 0 ? `
                <div class="stats-section">
                    <h3><i class="fas fa-history"></i> Atividade Recente</h3>
                    <div class="recent-activity">
                        ${stats.recent.map(activity => `
                            <div class="activity-item">
                                <div class="activity-date">${activity.date}</div>
                                <div class="activity-details">
                                    <span class="activity-score ${this.getScoreClass(activity.score)}">${activity.score}%</span>
                                    <span class="activity-questions">${activity.questions} questões</span>
                                    <span class="activity-time">${activity.time}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Actions -->
                <div class="stats-actions">
                    <button class="btn btn-primary" onclick="window.quizApp.stats.renderStatistics()">
                        <i class="fas fa-sync"></i> Atualizar Estatísticas
                    </button>
                    <button class="btn btn-outline" onclick="window.quizApp.stats.exportStats()">
                        <i class="fas fa-download"></i> Exportar Dados
                    </button>
                    <button class="btn btn-outline" onclick="window.quizApp.stats.clearHistory()">
                        <i class="fas fa-trash"></i> Limpar Histórico
                    </button>
                </div>
            </div>
        `;
    }

    addChartPlaceholders(container) {
        // Add placeholders for future chart implementations
        const chartsSection = document.createElement('div');
        chartsSection.className = 'stats-section';
        chartsSection.innerHTML = `
            <h3><i class="fas fa-chart-area"></i> Gráficos de Progresso</h3>
            <div class="charts-placeholder">
                <div class="chart-item">
                    <div class="chart-placeholder-content">
                        <i class="fas fa-chart-line" style="font-size: 3rem; color: var(--text-muted);"></i>
                        <p>Gráfico de pontuação ao longo do tempo</p>
                        <p class="text-muted">Em desenvolvimento</p>
                    </div>
                </div>
                <div class="chart-item">
                    <div class="chart-placeholder-content">
                        <i class="fas fa-chart-pie" style="font-size: 3rem; color: var(--text-muted);"></i>
                        <p>Distribuição de acertos por categoria</p>
                        <p class="text-muted">Em desenvolvimento</p>
                    </div>
                </div>
            </div>
        `;

        // Insert before actions
        const actionsDiv = container.querySelector('.stats-actions');
        if (actionsDiv) {
            container.insertBefore(chartsSection, actionsDiv);
        }
    }

    bindStatsEvents(container) {
        // Add click handlers for recent activity items
        container.querySelectorAll('.activity-item').forEach(item => {
            item.addEventListener('click', () => {
                // Could show detailed quiz results
                window.quizApp.showToast('Funcionalidade de detalhes em desenvolvimento');
            });
        });
    }

    // Utility methods
    getTrendClass(value) {
        if (value > 0) return 'trend-positive';
        if (value < 0) return 'trend-negative';
        return 'trend-neutral';
    }

    getTrendIcon(value) {
        if (value > 0) return 'fa-arrow-up';
        if (value < 0) return 'fa-arrow-down';
        return 'fa-minus';
    }

    getConsistencyClass(score) {
        if (score >= 80) return 'trend-positive';
        if (score >= 60) return 'trend-neutral';
        return 'trend-negative';
    }

    getScoreClass(score) {
        if (score >= 80) return 'score-excellent';
        if (score >= 60) return 'score-good';
        if (score >= 40) return 'score-fair';
        return 'score-poor';
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    formatTimeImprovement(milliseconds) {
        if (milliseconds === 0) return '0s';
        
        const seconds = Math.abs(Math.floor(milliseconds / 1000));
        const sign = milliseconds > 0 ? '+' : '-';
        
        if (seconds < 60) {
            return `${sign}${seconds}s`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (remainingSeconds === 0) {
            return `${sign}${minutes}m`;
        }
        
        return `${sign}${minutes}m ${remainingSeconds}s`;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Hoje';
        } else if (diffDays === 1) {
            return 'Ontem';
        } else if (diffDays < 7) {
            return `${diffDays} dias atrás`;
        } else {
            return date.toLocaleDateString('pt-BR');
        }
    }

    // Action methods
    exportStats() {
        const stats = this.generateStatistics();
        const exportData = {
            timestamp: new Date().toISOString(),
            statistics: stats,
            rawData: {
                history: this.storage.getQuizHistory(),
                questions: this.storage.getAllQuestions()
            }
        };

        const filename = `quiz-statistics-${new Date().toISOString().split('T')[0]}.json`;
        this.storage.downloadJSON(exportData, filename);
        
        window.quizApp.showToast('Estatísticas exportadas!');
    }

    clearHistory() {
        const confirm = window.confirm(
            'Tem certeza que deseja limpar todo o histórico de quizzes? Esta ação não pode ser desfeita.'
        );
        
        if (confirm) {
            this.storage.deleteQuizHistory();
            this.renderStatistics();
            window.quizApp.showToast('Histórico limpo com sucesso');
        }
    }
}