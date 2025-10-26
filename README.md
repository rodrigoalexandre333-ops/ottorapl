# Quiz Pro - Web App Interativo

Uma aplicação web moderna e completa para criação, gerenciamento e execução de quizzes educacionais. Desenvolvido como Progressive Web App (PWA) com funcionalidades offline e interface responsiva.

## ✨ Características Principais

### 🎯 Funcionalidades do Quiz
- **Quiz Interativo**: Sistema de quiz com cronômetro, feedback imediato e progresso visual
- **Múltiplos Tipos**: Suporte para questões de múltipla escolha, verdadeiro/falso e resposta aberta
- **Orientação Responsiva**: Adaptação automática para modo retrato/paisagem no mobile
- **Randomização**: Embaralhamento opcional de questões
- **Pausa/Retomar**: Controle completo sobre a execução do quiz

### 📝 Criador de Questões
- **Editor Avançado**: Interface intuitiva para criação de questões
- **Múltiplas Opções**: Suporte até 10 alternativas por questão
- **Categorização**: Sistema de tags e categorias para organização
- **Níveis de Dificuldade**: Classificação em fácil, médio e difícil
- **Preview em Tempo Real**: Visualização da questão antes de salvar
- **Auto-save**: Salvamento automático de rascunhos

### 📊 Estatísticas e Analytics
- **Dashboard Completo**: Visão geral de performance e progresso
- **Análise de Tendências**: Identificação de melhorias e consistência
- **Histórico Detalhado**: Registro completo de todos os quizzes realizados
- **Métricas de Tempo**: Análise de velocidade de resposta
- **Categorização de Performance**: Distribuição de acertos por categoria

### 💾 Gerenciamento de Dados
- **Importação Flexível**: Suporte para JSON e formato texto estruturado
- **Exportação Completa**: Download de questões e resultados
- **Backup Automático**: Sistema de backup e restauração
- **Armazenamento Local**: Todos os dados salvos localmente no navegador

### 📱 Progressive Web App (PWA)
- **Instalável**: Pode ser instalado como app nativo
- **Offline First**: Funciona completamente offline
- **Service Worker**: Cache inteligente e sincronização
- **Responsivo**: Interface adaptável para todos os dispositivos
- **Atalhos**: Shortcuts para ações rápidas

## 🚀 Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3 (Custom Properties), JavaScript (ES6+)
- **PWA**: Service Workers, Web App Manifest
- **Armazenamento**: LocalStorage, IndexedDB (via Service Worker)
- **Ícones**: Font Awesome 6.4.0
- **Design**: CSS Grid, Flexbox, Responsive Design
- **Acessibilidade**: ARIA labels, navegação por teclado

## 📦 Estrutura do Projeto

```
quiz-webapp/
├── index.html              # Página principal
├── styles.css              # Estilos globais e componentes
├── manifest.json           # Manifesto PWA
├── sw.js                   # Service Worker
├── js/
│   ├── app.js              # Controlador principal da aplicação
│   ├── quiz.js             # Módulo do sistema de quiz
│   ├── creator.js          # Módulo de criação de questões
│   ├── storage.js          # Gerenciamento de dados locais
│   ├── stats.js            # Sistema de estatísticas
│   └── pwa.js              # Funcionalidades PWA
└── README.md               # Documentação do projeto
```

## 🎮 Como Usar

### Executando o Quiz
1. **Iniciar**: Clique em "Iniciar Quiz" para começar
2. **Navegar**: Use o mouse/touch ou teclas numéricas (1-9) para selecionar respostas
3. **Pular**: Pressione espaço ou clique "Pular" para pular questões
4. **Pausar**: Use o botão "Pausar" para interromper temporariamente
5. **Resultados**: Veja resultados detalhados ao final

### Criando Questões
1. **Acesse** a aba "Criar Questões"
2. **Digite** a pergunta no campo principal
3. **Selecione** o tipo (múltipla escolha, verdadeiro/falso, aberta)
4. **Adicione** as opções de resposta
5. **Marque** a resposta correta
6. **Adicione** explicação (opcional)
7. **Salve** a questão

### Importando Questões

#### Formato JSON:
```json
[
  {
    "text": "Qual é a capital do Brasil?",
    "options": ["A) São Paulo", "B) Rio de Janeiro", "C) Brasília", "D) Salvador"],
    "correct": 2,
    "explanation": "Brasília é a capital federal do Brasil desde 1960."
  }
]
```

#### Formato Texto:
```
Qual é a capital do Brasil?
A) São Paulo
B) Rio de Janeiro 
C) Brasília
D) Salvador
Resposta: C
Explicação: Brasília é a capital federal do Brasil desde 1960.

Próxima questão aqui...
```

## ⚡ Funcionalidades Avançadas

### Atalhos de Teclado
- **Ctrl/Cmd + N**: Nova questão
- **Ctrl/Cmd + M**: Gerenciar questões
- **Ctrl/Cmd + S**: Estatísticas
- **Ctrl/Cmd + ,**: Configurações
- **F11**: Tela cheia
- **Esc**: Fechar modais
- **1-9**: Selecionar opções no quiz
- **Espaço**: Pular questão

### Configurações Disponíveis
- **Próxima Automática**: Avança automaticamente após responder
- **Mostrar Cronômetro**: Exibe/oculta o timer
- **Embaralhar Questões**: Randomiza ordem das questões
- **Tempo por Questão**: Define limite de tempo (10-300 segundos)

### Recursos de Acessibilidade
- **Navegação por Teclado**: Todos os elementos são acessíveis via teclado
- **Leitores de Tela**: ARIA labels e roles adequados
- **Alto Contraste**: Suporte a temas claro/escuro
- **Responsive**: Interface adaptável para diferentes necessidades

## 🔧 Personalização

### Temas
O app suporta temas claro e escuro através de CSS Custom Properties:

```css
:root {
    --bg-primary: #000000;
    --bg-secondary: #0b0b0b;
    --text-primary: #ffffff;
    --accent: #0a84ff;
}

[data-theme="light"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --text-personalizar: #212529;
}
```

### Adicionando Funcionalidades
O código é modular e permite fácil extensão:

```javascript
// Exemplo: Novo tipo de questão
class CustomQuestionType {
    render(question) {
        // Implementar renderização
    }
    
    validate(answer) {
        // Implementar validação
    }
}
```

## 📊 Métricas e Analytics

### Dados Coletados
- **Performance**: Tempo de resposta, acertos/erros
- **Uso**: Frequência de uso, questões mais difíceis
- **Progresso**: Evolução ao longo do tempo
- **Preferências**: Categorias mais utilizadas

### Exportação de Dados
Todos os dados podem ser exportados em formato JSON para:
- Backup e restauração
- Análise externa
- Migração entre dispositivos
- Relatórios personalizados

## 🔒 Privacidade e Segurança

- **Dados Locais**: Todas as informações ficam no dispositivo do usuário
- **Sem Rastreamento**: Não coleta dados pessoais ou de uso
- **Offline First**: Funciona sem conexão com internet
- **Criptografia**: Dados sensíveis podem ser criptografados localmente

## 🌟 Roadmap Futuro

### Funcionalidades Planejadas
- [ ] **Gráficos Interativos**: Visualizações avançadas de progresso
- [ ] **Multiplayer**: Quizzes colaborativos em tempo real
- [ ] **AI Integration**: Geração automática de questões
- [ ] **Gamificação**: Sistema de pontos, badges e rankings
- [ ] **Sincronização na Nuvem**: Backup automático opcional
- [ ] **Biblioteca Pública**: Compartilhamento de quizzes
- [ ] **Modo Competitivo**: Torneios e desafios

### Melhorias Técnicas
- [ ] **IndexedDB**: Migração completa para melhor performance
- [ ] **Web Workers**: Processamento em background
- [ ] **WebRTC**: Funcionalidades multiplayer P2P
- [ ] **Push Notifications**: Lembretes e notificações
- [ ] **Background Sync**: Sincronização automática

## 🤝 Contribuindo

Este é um projeto educacional de código aberto. Contribuições são bem-vindas:

1. **Fork** o projeto
2. **Crie** uma branch para sua feature
3. **Commit** suas mudanças
4. **Push** para a branch
5. **Abra** um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para dúvidas, sugestões ou reportar bugs:
- Abra uma **Issue** no repositório
- Entre em contato através do **e-mail de suporte**
- Consulte a **documentação** completa

---

**Quiz Pro** - Transformando aprendizado em experiência interativa! 🚀📚