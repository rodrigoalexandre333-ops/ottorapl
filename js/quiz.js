/**
 * Quiz Module - Handles quiz functionality
 * Based on the original quiz logic but enhanced with modern features
 */

class QuizModule {
    constructor() {
        this.defaultQuestions = [
            {
                "text": "Os papéis de trabalho, que são a documentação da auditoria, devem ser elaborados exclusivamente em meio eletrônico.",
                "options": ["A) Sim", "B) Não"],
                "correct": 1,
                "explanation": "Os papéis de trabalho podem ser elaborados tanto em meio físico quanto em meio eletrônico."
            }
        ];
        
        this.questions = [...this.defaultQuestions];
        this.currentIndex = 0;
        this.results = [];
        this.timerId = null;
        this.totalTime = 0;
        this.questionStartTime = 0;
        this.isActive = false;
        this.isPaused = false;
        
        this.init();
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.resetQuiz();
        
        // Handle orientation change for mobile
        this.handleOrientationChange();
    }

    bindElements() {
        this.elements = {
            quiz: document.getElementById('quiz'),
            status: document.getElementById('status'),
            progressFill: document.getElementById('progressFill'),
            currentQuestion: document.getElementById('currentQuestion'),
            totalQuestions: document.getElementById('totalQuestions'),
            timer: document.getElementById('timer'),
            playBtn: document.getElementById('playBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            resetBtn: document.getElementById('resetBtn'),
            skipBtn: document.getElementById('skipBtn'),
            importToggle: document.getElementById('importToggle'),
            importSection: document.getElementById('importSection'),
            importBox: document.getElementById('importBox'),
            importConfirm: document.getElementById('importConfirm'),
            importCancel: document.getElementById('importCancel'),
            exportResults: document.getElementById('exportResults'),
            resultsSummary: document.getElementById('resultsSummary'),
            feedbackOverlay: document.getElementById('feedbackOverlay'),
            feedbackMessage: document.getElementById('feedbackMessage'),
            feedbackClose: document.getElementById('feedbackClose')
        };
    }

    bindEvents() {
        // Control buttons
        this.elements.playBtn.addEventListener('click', () => this.startQuiz());
        this.elements.pauseBtn.addEventListener('click', () => this.pauseQuiz());
        this.elements.resetBtn.addEventListener('click', () => this.resetQuiz());
        this.elements.skipBtn.addEventListener('click', () => this.skipQuestion());

        // Import functionality
        this.elements.importToggle.addEventListener('click', () => this.toggleImport());
        this.elements.importConfirm.addEventListener('click', () => this.confirmImport());
        this.elements.importCancel.addEventListener('click', () => this.cancelImport());

        // Export functionality
        this.elements.exportResults.addEventListener('click', () => this.exportResults());

        // Feedback overlay
        this.elements.feedbackClose.addEventListener('click', () => this.closeFeedback());
        this.elements.feedbackOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.feedbackOverlay) {
                this.closeFeedback();
            }
        });

        // Keyboard shortcuts for quiz
        document.addEventListener('keydown', (e) => {
            if (this.isActive && !this.isPaused) {
                this.handleKeyboardShortcuts(e);
            }
        });
    }

    handleKeyboardShortcuts(e) {
        // Number keys for selecting options (1-9)
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
            const optionIndex = num - 1;
            const buttons = this.elements.quiz.querySelectorAll('.options button');
            if (buttons[optionIndex]) {
                buttons[optionIndex].click();
            }
        }

        // Space bar to skip
        if (e.code === 'Space') {
            e.preventDefault();
            this.skipQuestion();
        }

        // Enter to close feedback
        if (e.key === 'Enter' && this.elements.feedbackOverlay.style.display === 'flex') {
            this.closeFeedback();
        }
    }

    startQuiz() {
        if (this.questions.length === 0) {
            window.quizApp.showToast('Nenhuma questão disponível!', 'error');
            return;
        }

        this.isActive = true;
        this.isPaused = false;
        this.currentIndex = 0;
        this.results = Array(this.questions.length).fill(null);
        this.totalTime = 0;

        // Randomize questions if setting is enabled
        if (window.quizApp.settings.randomize) {
            this.questions = this.shuffleArray([...this.questions]);
        }

        this.updateControlButtons();
        this.hideImportSection();
        this.startTimer();
        this.renderQuestion();
        
        window.quizApp.showToast('Quiz iniciado!');
    }

    pauseQuiz() {
        if (this.isActive) {
            this.isPaused = !this.isPaused;
            
            if (this.isPaused) {
                this.stopTimer();
                this.elements.pauseBtn.innerHTML = '<i class="fas fa-play"></i> Retomar';
                this.elements.status.textContent = 'Quiz pausado - Clique em "Retomar" para continuar';
                window.quizApp.showToast('Quiz pausado');
            } else {
                this.startTimer();
                this.elements.pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
                this.renderQuestion();
                window.quizApp.showToast('Quiz retomado');
            }
        }
    }

    resetQuiz() {
        this.stopTimer();
        this.isActive = false;
        this.isPaused = false;
        this.currentIndex = 0;
        this.results = [];
        this.totalTime = 0;
        
        this.questions = [...this.defaultQuestions];
        this.updateControlButtons();
        this.updateProgress();
        this.clearQuizContent();
        this.clearResults();
        this.closeFeedback();
        
        this.elements.status.textContent = 'Clique em "Iniciar Quiz" para começar';
        this.elements.timer.textContent = '00:00';
        
        window.quizApp.showToast('Quiz reiniciado');
    }

    skipQuestion() {
        if (!this.isActive || this.isPaused) return;
        
        this.results[this.currentIndex] = 'skipped';
        this.nextQuestion();
    }

    renderQuestion() {
        if (this.isPaused) return;

        // Handle orientation change on mobile
        if (this.isMobilePortrait()) {
            this.showResults();
            return;
        }

        if (this.currentIndex >= this.questions.length) {
            this.finishQuiz();
            return;
        }

        const question = this.questions[this.currentIndex];
        this.questionStartTime = Date.now();
        
        // Update progress
        this.updateProgress();
        
        // Clear previous content
        this.elements.quiz.innerHTML = '';
        
        // Create question element
        const questionEl = document.createElement('div');
        questionEl.className = 'question';
        questionEl.textContent = this.formatText(question.text);
        this.elements.quiz.appendChild(questionEl);
        
        // Create options
        const optionsEl = document.createElement('div');
        optionsEl.className = 'options';
        
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = this.formatText(option);
            button.addEventListener('click', () => this.selectAnswer(index));
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectAnswer(index);
                }
            });
            optionsEl.appendChild(button);
        });
        
        this.elements.quiz.appendChild(optionsEl);
        
        // Clear status
        this.elements.status.textContent = '';
        
        // Focus on first option for accessibility
        setTimeout(() => {
            const firstOption = optionsEl.querySelector('button');
            if (firstOption) firstOption.focus();
        }, 100);
    }

    selectAnswer(selectedIndex) {
        if (!this.isActive || this.isPaused || this.timerId) return;
        
        const question = this.questions[this.currentIndex];
        const isCorrect = selectedIndex === question.correct;
        const timeSpent = Date.now() - this.questionStartTime;
        
        // Record result
        this.results[this.currentIndex] = {
            selected: selectedIndex,
            correct: isCorrect,
            timeSpent: timeSpent
        };
        
        // Show feedback
        this.showFeedback(isCorrect, question.explanation);
        
        // Auto-advance or wait for user
        const delay = window.quizApp.settings.autoNext ? 3000 : 5000;
        this.timerId = setTimeout(() => {
            this.timerId = null;
            this.nextQuestion();
        }, delay);
    }

    nextQuestion() {
        this.currentIndex++;
        if (this.currentIndex >= this.questions.length) {
            this.finishQuiz();
        } else {
            this.renderQuestion();
        }
    }

    showFeedback(isCorrect, explanation) {
        const message = isCorrect 
            ? `✓ Correto!<br><br>${this.formatText(explanation)}`
            : `✗ Incorreto!<br><br>${this.formatText(explanation)}`;
            
        this.elements.feedbackMessage.innerHTML = message;
        this.elements.feedbackMessage.className = isCorrect ? 'feedback-correct' : 'feedback-incorrect';
        this.elements.feedbackOverlay.style.display = 'flex';
    }

    closeFeedback() {
        this.elements.feedbackOverlay.style.display = 'none';
    }

    finishQuiz() {
        this.stopTimer();
        this.isActive = false;
        this.showResults();
        this.updateControlButtons();
        
        // Save quiz results
        this.saveQuizResults();
        
        window.quizApp.showToast('Quiz finalizado!');
    }

    showResults() {
        const correctCount = this.results.filter(r => r && r.correct).length;
        const incorrectCount = this.results.filter(r => r && !r.correct && r.selected !== undefined).length;
        const skippedCount = this.results.filter(r => r === 'skipped').length;
        const totalTime = this.formatTime(this.totalTime);
        
        const percentage = Math.round((correctCount / this.questions.length) * 100);
        
        let resultsHTML = `
            <div class="results-header">
                <h3><i class="fas fa-chart-bar"></i> Resultado do Quiz</h3>
                <div class="results-stats">
                    <div class="stat-item">
                        <span class="stat-number text-success">${correctCount}</span>
                        <span class="stat-label">Corretas</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number text-error">${incorrectCount}</span>
                        <span class="stat-label">Incorretas</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number text-muted">${skippedCount}</span>
                        <span class="stat-label">Puladas</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${percentage}%</span>
                        <span class="stat-label">Aproveitamento</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${totalTime}</span>
                        <span class="stat-label">Tempo Total</span>
                    </div>
                </div>
            </div>
            <div class="results-list">
        `;
        
        this.questions.forEach((question, index) => {
            const result = this.results[index];
            let statusClass = 'result-skipped';
            let statusIcon = '○';
            let statusText = 'Não respondida';
            
            if (result && result.selected !== undefined) {
                if (result.correct) {
                    statusClass = 'result-correct';
                    statusIcon = '✓';
                    statusText = 'Correta';
                } else {
                    statusClass = 'result-incorrect';
                    statusIcon = '✗';
                    statusText = 'Incorreta';
                }
            } else if (result === 'skipped') {
                statusText = 'Pulada';
                statusIcon = '→';
            }
            
            const timeSpent = result && result.timeSpent ? 
                this.formatTime(result.timeSpent) : '--';
            
            resultsHTML += `
                <div class="result-item ${statusClass}">
                    <div class="result-status">
                        <span class="result-icon">${statusIcon}</span>
                        <span class="result-number">${index + 1}.</span>
                    </div>
                    <div class="result-content">
                        <div class="result-question">${this.formatText(question.text)}</div>
                        <div class="result-meta">
                            <span class="result-status-text">${statusText}</span>
                            <span class="result-time">Tempo: ${timeSpent}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        resultsHTML += '</div>';
        
        this.elements.quiz.innerHTML = resultsHTML;
        this.elements.resultsSummary.innerHTML = '';
        
        // Update progress to 100%
        this.elements.progressFill.style.width = '100%';
        this.elements.status.textContent = 'Quiz finalizado! Confira seus resultados abaixo.';
    }

    updateProgress() {
        const total = this.questions.length || 1;
        const current = Math.min(this.currentIndex + 1, total);
        const percentage = Math.round((this.currentIndex / total) * 100);
        
        this.elements.progressFill.style.width = percentage + '%';
        this.elements.currentQuestion.textContent = current;
        this.elements.totalQuestions.textContent = total;
    }

    updateControlButtons() {
        const showPlay = !this.isActive;
        const showPause = this.isActive && !this.isPaused;
        const showSkip = this.isActive && !this.isPaused;
        
        this.elements.playBtn.style.display = showPlay ? 'inline-flex' : 'none';
        this.elements.pauseBtn.style.display = showPause ? 'inline-flex' : 'none';
        this.elements.skipBtn.style.display = showSkip ? 'inline-flex' : 'none';
        
        if (this.isPaused) {
            this.elements.pauseBtn.style.display = 'inline-flex';
            this.elements.pauseBtn.innerHTML = '<i class="fas fa-play"></i> Retomar';
        }
    }

    // Timer functionality
    startTimer() {
        this.timerStartTime = Date.now() - this.totalTime;
        this.timerInterval = setInterval(() => {
            this.totalTime = Date.now() - this.timerStartTime;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        if (window.quizApp.settings.showTimer) {
            this.elements.timer.textContent = this.formatTime(this.totalTime);
        }
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    formatText(text) {
        // Smart text wrapping for better readability
        return text.replace(/(.{1,80})(\s|$)/g, '$1\n').trim();
    }

    // Import functionality
    toggleImport() {
        const isVisible = this.elements.importSection.style.display === 'block';
        this.elements.importSection.style.display = isVisible ? 'none' : 'block';
    }

    hideImportSection() {
        this.elements.importSection.style.display = 'none';
    }

    confirmImport() {
        const content = this.elements.importBox.value.trim();
        if (!content) {
            window.quizApp.showToast('Por favor, cole o conteúdo a ser importado', 'error');
            return;
        }

        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && this.validateQuestions(parsed)) {
                this.questions = parsed;
                this.resetQuizState();
                window.quizApp.showToast('Questões importadas com sucesso!');
                this.hideImportSection();
                this.elements.importBox.value = '';
                return;
            }
        } catch (e) {
            // If JSON parsing fails, try text format
            const questions = this.parseTextFormat(content);
            if (questions.length > 0) {
                this.questions = questions;
                this.resetQuizState();
                window.quizApp.showToast(`${questions.length} questões importadas!`);
                this.hideImportSection();
                this.elements.importBox.value = '';
                return;
            }
        }

        window.quizApp.showToast('Formato inválido. Verifique o conteúdo.', 'error');
    }

    cancelImport() {
        this.hideImportSection();
        this.elements.importBox.value = '';
    }

    validateQuestions(questions) {
        return questions.every(q => 
            q.text && 
            Array.isArray(q.options) && 
            q.options.length >= 2 &&
            typeof q.correct === 'number' &&
            q.correct >= 0 &&
            q.correct < q.options.length
        );
    }

    parseTextFormat(content) {
        // Simple text format parser
        // Expected format: Question\nA) Option 1\nB) Option 2\nAnswer: B\nExplanation: ...\n\n
        const questions = [];
        const blocks = content.split(/\n\s*\n/);
        
        blocks.forEach(block => {
            const lines = block.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length < 3) return;
            
            const questionText = lines[0];
            const options = [];
            let answerLine = '';
            let explanation = '';
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (line.match(/^[A-Z]\)/)) {
                    options.push(line);
                } else if (line.toLowerCase().startsWith('answer:') || line.toLowerCase().startsWith('resposta:')) {
                    answerLine = line;
                } else if (line.toLowerCase().startsWith('explanation:') || line.toLowerCase().startsWith('explicação:')) {
                    explanation = line.substring(line.indexOf(':') + 1).trim();
                }
            }
            
            if (options.length >= 2 && answerLine) {
                const answerLetter = answerLine.match(/[A-Z]/)?.[0];
                const correctIndex = answerLetter ? answerLetter.charCodeAt(0) - 65 : -1;
                
                if (correctIndex >= 0 && correctIndex < options.length) {
                    questions.push({
                        text: questionText,
                        options: options,
                        correct: correctIndex,
                        explanation: explanation || 'Sem explicação fornecida.'
                    });
                }
            }
        });
        
        return questions;
    }

    resetQuizState() {
        this.currentIndex = 0;
        this.results = [];
        this.updateProgress();
        this.clearQuizContent();
        this.clearResults();
    }

    clearQuizContent() {
        this.elements.quiz.innerHTML = '<p class="text-center text-muted">Pronto para iniciar o quiz!</p>';
    }

    clearResults() {
        this.elements.resultsSummary.innerHTML = '';
    }

    // Export functionality
    exportResults() {
        if (this.results.length === 0) {
            window.quizApp.showToast('Nenhum resultado para exportar', 'error');
            return;
        }

        const data = this.generateExportData();
        this.downloadJSON(data, `quiz-results-${new Date().getTime()}.json`);
        window.quizApp.showToast('Resultados exportados!');
    }

    generateExportData() {
        const correctCount = this.results.filter(r => r && r.correct).length;
        const totalQuestions = this.questions.length;
        const percentage = Math.round((correctCount / totalQuestions) * 100);
        
        return {
            timestamp: new Date().toISOString(),
            summary: {
                totalQuestions,
                correctAnswers: correctCount,
                incorrectAnswers: this.results.filter(r => r && !r.correct && r.selected !== undefined).length,
                skipped: this.results.filter(r => r === 'skipped').length,
                percentage,
                totalTime: this.totalTime
            },
            questions: this.questions.map((question, index) => ({
                question: question.text,
                options: question.options,
                correctAnswer: question.options[question.correct],
                userAnswer: this.results[index] && this.results[index].selected !== undefined 
                    ? question.options[this.results[index].selected] 
                    : 'Não respondida',
                isCorrect: this.results[index] ? this.results[index].correct : false,
                timeSpent: this.results[index] && this.results[index].timeSpent 
                    ? this.results[index].timeSpent 
                    : null,
                explanation: question.explanation
            }))
        };
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Utility functions
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    isMobilePortrait() {
        return window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
    }

    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                if (this.isMobilePortrait() && this.isActive) {
                    this.showResults();
                } else if (this.isActive && !this.isPaused && this.currentIndex < this.questions.length) {
                    this.renderQuestion();
                }
            }, 100);
        });
    }

    saveQuizResults() {
        // Save to localStorage for statistics
        const results = JSON.parse(localStorage.getItem('quiz-history') || '[]');
        results.push(this.generateExportData());
        
        // Keep only last 50 results
        if (results.length > 50) {
            results.splice(0, results.length - 50);
        }
        
        localStorage.setItem('quiz-history', JSON.stringify(results));
    }
}