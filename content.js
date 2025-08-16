// Contextual Whisper - Content Script
class ContextualWhisper {
  constructor() {
    this.metrics = {
      pageLoadTime: Date.now(),
      timeSpent: 0,
      scrollBacks: 0,
      deadClicks: 0,
      currentScrollPos: 0,
      maxScrollReached: 0,
      textSelections: 0,
      searchAttempts: 0
    };
    
    this.confusionThreshold = 0.6;
    this.helpShown = false;
    this.pageText = '';
    this.init();
  }

  init() {
    this.injectStyles();
    this.extractPageContent();
    this.setupEventListeners();
    this.startTimeTracking();
    
    // Check for confusion every 10 seconds
    setInterval(() => this.analyzeConfusion(), 10000);
  }

  injectStyles() {
    if (document.getElementById('contextual-whisper-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'contextual-whisper-styles';
    style.textContent = `
      .cw-widget {
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        width: 320px !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
        z-index: 10000 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        color: white !important;
        animation: slideInRight 0.3s ease-out !important;
      }

      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      .cw-content { padding: 16px !important; }

      .cw-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin-bottom: 12px !important;
      }

      .cw-icon { font-size: 20px !important; margin-right: 8px !important; }
      .cw-title { font-weight: 600 !important; font-size: 14px !important; flex: 1 !important; }

      .cw-close {
        background: none !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.8) !important;
        font-size: 20px !important;
        cursor: pointer !important;
        padding: 0 !important;
        width: 24px !important;
        height: 24px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.2s !important;
      }

      .cw-close:hover {
        background: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
      }

      .cw-message {
        font-size: 14px !important;
        line-height: 1.4 !important;
        margin-bottom: 16px !important;
        opacity: 0.95 !important;
      }

      .cw-actions {
        display: flex !important;
        gap: 8px !important;
        margin-bottom: 8px !important;
      }

      .cw-btn {
        border: none !important;
        border-radius: 6px !important;
        padding: 8px 12px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: all 0.2s !important;
        flex: 1 !important;
      }

      .cw-btn-primary {
        background: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
      }

      .cw-btn-primary:hover {
        background: rgba(255, 255, 255, 0.3) !important;
        transform: translateY(-1px) !important;
      }

      .cw-btn-secondary {
        background: transparent !important;
        color: rgba(255, 255, 255, 0.8) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
      }

      .cw-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        color: white !important;
      }

      .cw-debug {
        font-size: 10px !important;
        opacity: 0.6 !important;
        text-align: center !important;
        margin-top: 8px !important;
        font-family: monospace !important;
      }

      .cw-modal {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.5) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 10001 !important;
        animation: fadeIn 0.2s ease-out !important;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .cw-modal-content {
        background: white !important;
        border-radius: 12px !important;
        width: 90% !important;
        max-width: 500px !important;
        max-height: 70vh !important;
        overflow-y: auto !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
        animation: slideInUp 0.3s ease-out !important;
      }

      @keyframes slideInUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .cw-modal-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 20px !important;
        border-bottom: 1px solid #eee !important;
      }

      .cw-modal-header h3 {
        margin: 0 !important;
        color: #333 !important;
        font-size: 18px !important;
        font-weight: 600 !important;
      }

      .cw-modal-body {
        padding: 20px !important;
        color: #333 !important;
        line-height: 1.6 !important;
        font-size: 14px !important;
      }

      .cw-modal-body strong {
        color: #667eea !important;
        font-weight: 600 !important;
      }

      .cw-modal-footer {
        padding: 20px !important;
        border-top: 1px solid #eee !important;
        text-align: right !important;
      }

      @media (max-width: 480px) {
        .cw-widget {
          right: 10px !important;
          left: 10px !important;
          width: auto !important;
        }
        .cw-modal-content { width: 95% !important; margin: 20px !important; }
        .cw-actions { flex-direction: column !important; }
      }
    `;
    
    document.head.appendChild(style);
  }

  extractPageContent() {
    // Extract main text content for analysis
    const contentSelectors = ['article', 'main', '.content', '#content', 'p'];
    let content = '';
    
    for (const selector of contentSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        content = Array.from(elements).map(el => el.textContent).join(' ');
        break;
      }
    }
    
    this.pageText = content || document.body.textContent || '';
    this.estimatedReadTime = Math.max(1, Math.ceil(this.pageText.split(' ').length / 200)); // ~200 words per minute
  }

  setupEventListeners() {
    // Track scrolling patterns
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const currentPos = window.pageYOffset;
        
        if (currentPos < this.currentScrollPos - 100) {
          this.metrics.scrollBacks++;
        }
        
        this.currentScrollPos = currentPos;
        this.maxScrollReached = Math.max(this.maxScrollReached, currentPos);
      }, 100);
    });

    // Track clicks on non-interactive elements
    document.addEventListener('click', (e) => {
      const target = e.target;
      const isInteractive = target.matches('a, button, input, select, textarea, [onclick], [role="button"]') ||
                           target.closest('a, button, input, select, textarea, [onclick], [role="button"]');
      
      if (!isInteractive && target.textContent && target.textContent.length > 5) {
        this.metrics.deadClicks++;
      }
    });

    // Track text selections (sign of confusion/note-taking)
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      if (selection.toString().length > 10) {
        this.metrics.textSelections++;
      }
    });

    // Track copy actions (research behavior)
    document.addEventListener('copy', () => {
      this.metrics.searchAttempts++;
    });

    // Track page visibility for accurate time tracking
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseTimeTracking();
      } else {
        this.resumeTimeTracking();
      }
    });
  }

  startTimeTracking() {
    this.timeTrackingStart = Date.now();
    this.timeTrackingInterval = setInterval(() => {
      if (!document.hidden) {
        this.metrics.timeSpent = (Date.now() - this.timeTrackingStart) / 1000 / 60; // minutes
      }
    }, 1000);
  }

  pauseTimeTracking() {
    if (this.timeTrackingInterval) {
      clearInterval(this.timeTrackingInterval);
    }
  }

  resumeTimeTracking() {
    this.timeTrackingStart = Date.now() - (this.metrics.timeSpent * 60 * 1000);
    this.startTimeTracking();
  }

  calculateConfusionScore() {
    const timeRatio = Math.min(this.metrics.timeSpent / this.estimatedReadTime, 3); // Cap at 3x
    const scrollBackRatio = Math.min(this.metrics.scrollBacks / 10, 1); // Normalize
    const deadClickRatio = Math.min(this.metrics.deadClicks / 5, 1);
    const selectionRatio = Math.min(this.metrics.textSelections / 3, 1);
    
    // Weighted confusion score
    const score = (
      timeRatio * 0.35 +
      scrollBackRatio * 0.25 +
      deadClickRatio * 0.20 +
      selectionRatio * 0.20
    );
    
    return Math.min(score, 1); // Cap at 1.0
  }

  async analyzeConfusion() {
    if (this.helpShown || this.metrics.timeSpent < 0.5) return; // Wait at least 30s
    
    const confusionScore = this.calculateConfusionScore();
    
    console.log('Confusion Analysis:', {
      score: confusionScore.toFixed(2),
      timeSpent: this.metrics.timeSpent.toFixed(1),
      estimatedReadTime: this.estimatedReadTime,
      metrics: this.metrics
    });
    
    if (confusionScore > this.confusionThreshold) {
      await this.showContextualHelp(confusionScore);
    }
  }

  async showContextualHelp(score) {
    this.helpShown = true;
    
    // Create help suggestion based on detected behavior
    let helpType = 'general';
    let message = 'Posso ajudar-te com algo?';
    
    if (this.metrics.scrollBacks > 3) {
      helpType = 'navigation';
      message = 'Parece que estás a voltar atrás no texto. Quer um resumo desta página?';
    } else if (this.metrics.deadClicks > 2) {
      helpType = 'interaction';
      message = 'Vejo que estás a tentar interagir com o texto. Posso explicar termos complexos?';
    } else if (this.metrics.textSelections > 2) {
      helpType = 'research';
      message = 'Estás a seleccionar muito texto. Queres ajuda a organizar esta informação?';
    } else if (this.metrics.timeSpent > this.estimatedReadTime * 2) {
      helpType = 'comprehension';
      message = 'Esta página parece estar a demorar a ler. Quer uma explicação simplificada?';
    }

    this.createHelpWidget(message, helpType, score);
  }

  createHelpWidget(message, type, score) {
    // Remove any existing widget
    const existing = document.getElementById('contextual-whisper-widget');
    if (existing) existing.remove();

    // Create help widget
    const widget = document.createElement('div');
    widget.id = 'contextual-whisper-widget';
    widget.className = 'cw-widget';
    
    widget.innerHTML = `
      <div class="cw-content">
        <div class="cw-header">
          <span class="cw-icon">🤔</span>
          <span class="cw-title">Contextual Whisper</span>
          <button class="cw-close">&times;</button>
        </div>
        <div class="cw-message">${message}</div>
        <div class="cw-actions">
          <button class="cw-btn cw-btn-primary" data-action="help">Sim, ajuda-me</button>
          <button class="cw-btn cw-btn-secondary" data-action="dismiss">Não, obrigado</button>
        </div>
        <div class="cw-debug">Confusion Score: ${(score * 100).toFixed(0)}%</div>
      </div>
    `;

    // Add event listeners
    widget.querySelector('.cw-close').addEventListener('click', () => widget.remove());
    widget.querySelector('[data-action="dismiss"]').addEventListener('click', () => widget.remove());
    widget.querySelector('[data-action="help"]').addEventListener('click', () => {
      this.provideHelp(type);
      widget.remove();
    });

    document.body.appendChild(widget);
    
    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (document.getElementById('contextual-whisper-widget')) {
        widget.remove();
      }
    }, 15000);
  }

  async provideHelp(type) {
    let helpContent = '';
    
    switch (type) {
      case 'navigation':
        helpContent = await this.generateSummary();
        break;
      case 'interaction':
        helpContent = await this.explainComplexTerms();
        break;
      case 'research':
        helpContent = await this.organizeInformation();
        break;
      case 'comprehension':
        helpContent = await this.simplifyContent();
        break;
      default:
        helpContent = 'Como posso ajudar-te melhor com esta página?';
    }
    
    this.showHelpModal(helpContent, type);
  }

  async generateSummary() {
    // Simple extractive summary - take first sentence of each paragraph
    const paragraphs = this.pageText.split('\n\n').filter(p => p.trim().length > 100);
    const summary = paragraphs.slice(0, 3).map(p => {
      const sentences = p.split('.').filter(s => s.trim().length > 20);
      return sentences[0] + '.';
    }).join(' ');
    
    return `**Resumo da página:**\n\n${summary}`;
  }

  async explainComplexTerms() {
    // Find potential complex terms (long words, technical terms)
    const words = this.pageText.match(/\b[A-Za-z]{8,}\b/g) || [];
    const complexTerms = [...new Set(words)].slice(0, 5);
    
    return `**Termos que podem ser complexos nesta página:**\n\n${complexTerms.map(term => `• ${term}`).join('\n')}`;
  }

  async organizeInformation() {
    // Extract key points based on common patterns
    const sentences = this.pageText.split('.').filter(s => s.trim().length > 30);
    const keyPoints = sentences.filter(s => 
      s.includes('importante') || s.includes('crucial') || s.includes('principais') || 
      s.match(/\d+\.|\•|primeiro|segundo|terceiro/i)
    ).slice(0, 4);
    
    return `**Pontos principais identificados:**\n\n${keyPoints.map(point => `• ${point.trim()}.`).join('\n')}`;
  }

  async simplifyContent() {
    const wordCount = this.pageText.split(' ').length;
    const avgWordsPerSentence = wordCount / (this.pageText.split('.').length || 1);
    
    return `**Análise de complexidade:**\n\n• Palavras: ${wordCount}\n• Tempo de leitura estimado: ${this.estimatedReadTime} minutos\n• Palavras por frase: ${avgWordsPerSentence.toFixed(1)}\n\nEsta página tem ${avgWordsPerSentence > 20 ? 'frases longas' : 'frases normais'}. ${wordCount > 1000 ? 'É um texto longo.' : 'É um texto curto.'}`;
  }

  showHelpModal(content, type) {
    const modal = document.createElement('div');
    modal.id = 'contextual-whisper-modal';
    modal.className = 'cw-modal';
    
    modal.innerHTML = `
      <div class="cw-modal-content">
        <div class="cw-modal-header">
          <h3>Contextual Whisper - Ajuda</h3>
          <button class="cw-close">&times;</button>
        </div>
        <div class="cw-modal-body">
          ${content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
        </div>
        <div class="cw-modal-footer">
          <button class="cw-btn cw-btn-primary" data-action="close">Obrigado!</button>
        </div>
      </div>
    `;
    
    modal.querySelector('.cw-close').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-action="close"]').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ContextualWhisper());
} else {
  new ContextualWhisper();
}