/**
 * Question Creator Module
 * Handles the creation and editing of quiz questions
 */

class QuestionCreator {
    constructor() {
        this.currentQuestion = this.getEmptyQuestion();
        this.isEditing = false;
        this.editingIndex = -1;
    }

    initialize() {
        this.bindEvents();
        this.initializeForm();
    }

    bindEvents() {
        const form = document.getElementById('questionForm');
        if (!form) return;

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveQuestion();
        });

        // Question type change
        document.querySelectorAll('input[name="questionType"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.handleQuestionTypeChange();
            });
        });

        // Add option button
        document.getElementById('addOption').addEventListener('click', () => {
            this.addOption();
        });

        // Form reset
        form.addEventListener('reset', () => {
            setTimeout(() => this.initializeForm(), 50);
        });

        // Auto-save draft
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.saveDraft();
            });
        });

        // Load draft on initialization
        this.loadDraft();
    }

    initializeForm() {
        this.currentQuestion = this.getEmptyQuestion();
        this.isEditing = false;
        this.editingIndex = -1;
        
        this.handleQuestionTypeChange();
        this.updateFormTitle();
    }

    getEmptyQuestion() {
        return {
            text: '',
            type: 'multiple',
            options: ['', ''],
            correct: 0,
            explanation: '',
            difficulty: 'medium',
            category: '',
            tags: []
        };
    }

    handleQuestionTypeChange() {
        const selectedType = document.querySelector('input[name="questionType"]:checked').value;
        const optionsContainer = document.getElementById('optionsContainer');
        
        if (selectedType === 'open') {
            optionsContainer.style.display = 'none';
        } else {
            optionsContainer.style.display = 'block';
            this.generateOptions(selectedType);
        }
    }

    generateOptions(type) {
        const optionsList = document.getElementById('optionsList');
        optionsList.innerHTML = '';

        let optionsData;
        
        if (type === 'boolean') {
            optionsData = ['Verdadeiro', 'Falso'];
        } else {
            // Multiple choice - use existing options or create new ones
            optionsData = this.currentQuestion.options.length > 0 
                ? this.currentQuestion.options 
                : ['Opção A', 'Opção B'];
        }

        optionsData.forEach((option, index) => {
            this.createOptionElement(option, index, type !== 'boolean');
        });

        // Ensure at least 2 options for multiple choice
        if (type === 'multiple' && optionsData.length < 2) {
            this.addOption();
        }
    }

    createOptionElement(text = '', index = 0, editable = true) {
        const optionsList = document.getElementById('optionsList');
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-item';
        
        optionDiv.innerHTML = `
            <label class="radio-label">
                <input type="radio" name="correctOption" value="${index}" ${index === this.currentQuestion.correct ? 'checked' : ''}>
                <span>Correta</span>
            </label>
            <input type="text" 
                   class="option-input" 
                   value="${text}" 
                   placeholder="Digite a opção ${String.fromCharCode(65 + index)}"
                   ${!editable ? 'readonly' : ''}
                   required>
            ${editable && optionsList.children.length >= 2 ? `
                <button type="button" class="btn btn-outline remove-option" title="Remover opção">
                    <i class="fas fa-trash"></i>
                </button>
            ` : ''}
        `;

        if (editable) {
            // Remove option functionality
            const removeBtn = optionDiv.querySelector('.remove-option');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    this.removeOption(optionDiv);
                });
            }

            // Update radio values when options change
            const input = optionDiv.querySelector('.option-input');
            input.addEventListener('input', () => {
                this.updateRadioValues();
                this.saveDraft();
            });
        }

        optionsList.appendChild(optionDiv);
    }

    addOption() {
        const optionsList = document.getElementById('optionsList');
        const currentCount = optionsList.children.length;
        
        if (currentCount < 10) { // Limit to 10 options
            this.createOptionElement('', currentCount, true);
            this.updateRadioValues();
        } else {
            window.quizApp.showToast('Máximo de 10 opções permitido', 'warning');
        }
    }

    removeOption(optionElement) {
        const optionsList = document.getElementById('optionsList');
        
        if (optionsList.children.length <= 2) {
            window.quizApp.showToast('Mínimo de 2 opções necessário', 'warning');
            return;
        }

        optionElement.remove();
        this.updateRadioValues();
        this.saveDraft();
    }

    updateRadioValues() {
        const optionsList = document.getElementById('optionsList');
        const options = optionsList.querySelectorAll('.option-item');
        
        options.forEach((option, index) => {
            const radio = option.querySelector('input[type="radio"]');
            const placeholder = option.querySelector('.option-input');
            
            radio.value = index;
            placeholder.placeholder = `Digite a opção ${String.fromCharCode(65 + index)}`;
        });
    }

    saveQuestion() {
        const questionData = this.collectFormData();
        
        if (!this.validateQuestion(questionData)) {
            return;
        }

        if (this.isEditing) {
            this.updateExistingQuestion(questionData);
        } else {
            this.createNewQuestion(questionData);
        }

        this.resetForm();
        window.quizApp.showToast(
            this.isEditing ? 'Questão atualizada!' : 'Questão criada com sucesso!'
        );
    }

    collectFormData() {
        const form = document.getElementById('questionForm');
        const formData = new FormData(form);
        
        const questionType = formData.get('questionType');
        const options = [];
        let correctIndex = 0;

        if (questionType !== 'open') {
            const optionInputs = document.querySelectorAll('.option-input');
            const correctRadio = document.querySelector('input[name="correctOption"]:checked');
            
            optionInputs.forEach(input => {
                if (input.value.trim()) {
                    options.push(input.value.trim());
                }
            });
            
            correctIndex = correctRadio ? parseInt(correctRadio.value) : 0;
        }

        return {
            text: formData.get('questionText').trim(),
            type: questionType,
            options: options,
            correct: correctIndex,
            explanation: formData.get('explanation').trim(),
            difficulty: formData.get('difficulty'),
            category: formData.get('category').trim(),
            tags: this.parseTags(formData.get('category')),
            createdAt: new Date().toISOString(),
            id: this.isEditing ? this.currentQuestion.id : this.generateId()
        };
    }

    validateQuestion(questionData) {
        const errors = [];

        // Validate question text
        if (!questionData.text || questionData.text.length < 10) {
            errors.push('A pergunta deve ter pelo menos 10 caracteres');
        }

        // Validate options for non-open questions
        if (questionData.type !== 'open') {
            if (questionData.options.length < 2) {
                errors.push('São necessárias pelo menos 2 opções');
            }

            // Check for empty options
            const emptyOptions = questionData.options.filter(opt => !opt.trim());
            if (emptyOptions.length > 0) {
                errors.push('Todas as opções devem ser preenchidas');
            }

            // Check for duplicate options
            const uniqueOptions = new Set(questionData.options.map(opt => opt.toLowerCase()));
            if (uniqueOptions.size !== questionData.options.length) {
                errors.push('As opções não podem ser duplicadas');
            }

            // Validate correct answer index
            if (questionData.correct >= questionData.options.length) {
                errors.push('Resposta correta inválida');
            }
        }

        if (errors.length > 0) {
            window.quizApp.showToast(errors.join(', '), 'error');
            return false;
        }

        return true;
    }

    createNewQuestion(questionData) {
        // Save to localStorage
        const questions = this.getSavedQuestions();
        questions.push(questionData);
        this.saveQuestions(questions);

        // Add to current quiz if no questions loaded
        if (window.quizApp.quiz && window.quizApp.quiz.questions.length <= 1) {
            window.quizApp.quiz.questions.push(this.convertToQuizFormat(questionData));
        }
    }

    updateExistingQuestion(questionData) {
        const questions = this.getSavedQuestions();
        const index = questions.findIndex(q => q.id === this.currentQuestion.id);
        
        if (index !== -1) {
            questions[index] = questionData;
            this.saveQuestions(questions);
        }
    }

    convertToQuizFormat(questionData) {
        return {
            text: questionData.text,
            options: questionData.options,
            correct: questionData.correct,
            explanation: questionData.explanation || 'Sem explicação fornecida.'
        };
    }

    resetForm() {
        document.getElementById('questionForm').reset();
        this.initializeForm();
        this.clearDraft();
    }

    updateFormTitle() {
        const title = document.querySelector('#createView h2');
        if (title) {
            title.innerHTML = this.isEditing 
                ? '<i class="fas fa-edit"></i> Editar Questão'
                : '<i class="fas fa-plus"></i> Criar Nova Questão';
        }
    }

    // Draft functionality
    saveDraft() {
        const questionData = this.collectFormData();
        localStorage.setItem('quiz-question-draft', JSON.stringify(questionData));
    }

    loadDraft() {
        const draft = localStorage.getItem('quiz-question-draft');
        if (draft) {
            try {
                const questionData = JSON.parse(draft);
                this.loadQuestionIntoForm(questionData);
            } catch (e) {
                console.warn('Failed to load draft:', e);
            }
        }
    }

    clearDraft() {
        localStorage.removeItem('quiz-question-draft');
    }

    loadQuestionIntoForm(questionData) {
        // Fill basic fields
        document.getElementById('questionText').value = questionData.text || '';
        document.getElementById('explanation').value = questionData.explanation || '';
        document.getElementById('difficulty').value = questionData.difficulty || 'medium';
        document.getElementById('category').value = questionData.category || '';

        // Set question type
        const typeRadio = document.querySelector(`input[name="questionType"][value="${questionData.type || 'multiple'}"]`);
        if (typeRadio) {
            typeRadio.checked = true;
            this.handleQuestionTypeChange();
        }

        // Fill options
        if (questionData.options && questionData.options.length > 0) {
            setTimeout(() => {
                const optionInputs = document.querySelectorAll('.option-input');
                questionData.options.forEach((option, index) => {
                    if (optionInputs[index]) {
                        optionInputs[index].value = option;
                    }
                });

                // Set correct answer
                const correctRadio = document.querySelector(`input[name="correctOption"][value="${questionData.correct || 0}"]`);
                if (correctRadio) {
                    correctRadio.checked = true;
                }
            }, 100);
        }

        this.currentQuestion = questionData;
    }

    // Question management
    getSavedQuestions() {
        const saved = localStorage.getItem('quiz-created-questions');
        return saved ? JSON.parse(saved) : [];
    }

    saveQuestions(questions) {
        localStorage.setItem('quiz-created-questions', JSON.stringify(questions));
    }

    // Utility functions
    generateId() {
        return 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    parseTags(category) {
        if (!category) return [];
        return category.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Import from text methods
    importFromText(text) {
        const questions = this.parseMultipleQuestionsFromText(text);
        
        if (questions.length === 0) {
            window.quizApp.showToast('Nenhuma questão válida encontrada', 'error');
            return;
        }

        // Save all questions
        const existingQuestions = this.getSavedQuestions();
        const allQuestions = [...existingQuestions, ...questions];
        this.saveQuestions(allQuestions);

        window.quizApp.showToast(`${questions.length} questões importadas!`);
        return questions;
    }

    parseMultipleQuestionsFromText(text) {
        const questions = [];
        const blocks = text.split(/\n\s*\n/);
        
        blocks.forEach(block => {
            const question = this.parseSingleQuestionFromText(block);
            if (question) {
                questions.push({
                    ...question,
                    id: this.generateId(),
                    createdAt: new Date().toISOString(),
                    difficulty: 'medium',
                    category: 'Importada'
                });
            }
        });
        
        return questions;
    }

    parseSingleQuestionFromText(block) {
        const lines = block.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length < 3) return null;
        
        const questionText = lines[0];
        const options = [];
        let answerLine = '';
        let explanation = '';
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.match(/^[A-Za-z]\)/)) {
                options.push(line);
            } else if (line.toLowerCase().match(/^(answer|resposta):/)) {
                answerLine = line;
            } else if (line.toLowerCase().match(/^(explanation|explicação):/)) {
                explanation = line.substring(line.indexOf(':') + 1).trim();
            }
        }
        
        if (options.length < 2 || !answerLine) return null;
        
        const answerLetter = answerLine.match(/[A-Za-z]/)?.[0]?.toUpperCase();
        const correctIndex = answerLetter ? answerLetter.charCodeAt(0) - 65 : -1;
        
        if (correctIndex < 0 || correctIndex >= options.length) return null;
        
        return {
            text: questionText,
            type: 'multiple',
            options: options,
            correct: correctIndex,
            explanation: explanation || 'Sem explicação fornecida.'
        };
    }

    // Export methods
    exportQuestions() {
        const questions = this.getSavedQuestions();
        
        if (questions.length === 0) {
            window.quizApp.showToast('Nenhuma questão para exportar', 'error');
            return;
        }

        const data = {
            exportDate: new Date().toISOString(),
            totalQuestions: questions.length,
            questions: questions
        };

        this.downloadJSON(data, `quiz-questions-${new Date().getTime()}.json`);
        window.quizApp.showToast('Questões exportadas!');
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

    // Preview functionality
    previewQuestion() {
        const questionData = this.collectFormData();
        
        if (!this.validateQuestion(questionData)) {
            return;
        }

        // Create preview modal
        this.showPreviewModal(questionData);
    }

    showPreviewModal(questionData) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('previewModal');
        if (!modal) {
            modal = this.createPreviewModal();
        }

        // Populate preview content
        const content = modal.querySelector('.preview-content');
        content.innerHTML = this.generatePreviewHTML(questionData);

        // Show modal
        modal.classList.add('active');

        // Bind preview events
        this.bindPreviewEvents(modal, questionData);
    }

    createPreviewModal() {
        const modal = document.createElement('div');
        modal.id = 'previewModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-eye"></i> Prévia da Questão</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="preview-content"></div>
                    <div class="preview-actions">
                        <button id="testQuestion" class="btn btn-primary">
                            <i class="fas fa-play"></i> Testar Questão
                        </button>
                        <button id="closePreview" class="btn btn-outline">
                            <i class="fas fa-times"></i> Fechar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        return modal;
    }

    generatePreviewHTML(questionData) {
        let html = `
            <div class="preview-question">
                <h4>Pergunta:</h4>
                <p class="question-text">${questionData.text}</p>
            </div>
        `;

        if (questionData.type !== 'open') {
            html += `
                <div class="preview-options">
                    <h4>Opções:</h4>
                    <div class="options-list">
            `;

            questionData.options.forEach((option, index) => {
                const isCorrect = index === questionData.correct;
                html += `
                    <div class="preview-option ${isCorrect ? 'correct' : ''}">
                        <span class="option-letter">${String.fromCharCode(65 + index)})</span>
                        <span class="option-text">${option}</span>
                        ${isCorrect ? '<i class="fas fa-check-circle text-success"></i>' : ''}
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        if (questionData.explanation) {
            html += `
                <div class="preview-explanation">
                    <h4>Explicação:</h4>
                    <p>${questionData.explanation}</p>
                </div>
            `;
        }

        html += `
            <div class="preview-meta">
                <span class="meta-item">
                    <strong>Tipo:</strong> ${this.getTypeLabel(questionData.type)}
                </span>
                <span class="meta-item">
                    <strong>Dificuldade:</strong> ${this.getDifficultyLabel(questionData.difficulty)}
                </span>
                ${questionData.category ? `
                <span class="meta-item">
                    <strong>Categoria:</strong> ${questionData.category}
                </span>
                ` : ''}
            </div>
        `;

        return html;
    }

    bindPreviewEvents(modal, questionData) {
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.querySelector('#closePreview').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        // Test question
        modal.querySelector('#testQuestion').addEventListener('click', () => {
            this.testQuestion(questionData);
            modal.classList.remove('active');
        });
    }

    testQuestion(questionData) {
        // Switch to quiz view and load this single question
        const testQuiz = [this.convertToQuizFormat(questionData)];
        
        if (window.quizApp.quiz) {
            window.quizApp.quiz.questions = testQuiz;
            window.quizApp.switchView('quiz');
            window.quizApp.quiz.resetQuizState();
            window.quizApp.showToast('Questão carregada para teste!');
        }
    }

    getTypeLabel(type) {
        const labels = {
            'multiple': 'Múltipla Escolha',
            'boolean': 'Verdadeiro/Falso',
            'open': 'Resposta Aberta'
        };
        return labels[type] || type;
    }

    getDifficultyLabel(difficulty) {
        const labels = {
            'easy': 'Fácil',
            'medium': 'Médio',
            'hard': 'Difícil'
        };
        return labels[difficulty] || difficulty;
    }
}