/**
 * iDeploy Live-Reload & Feedback Overlay
 * Handles auto-refresh and sticky note feedback.
 */

(function() {
  const CONFIG = {
    port: 3000,
    reloadInterval: 2000,
    endpoint: '/feedback'
  };

  // ── Live Reload ────────────────────────────────────────────────────────────
  class LiveReload {
    constructor() {
      this.ws = null;
      this.connect();
    }

    connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      
      console.log(`[iDeploy] Connecting to ${url}...`);
      
      this.ws = new WebSocket(url);
      
      this.ws.onmessage = (event) => {
        if (event.data === 'reload') {
          console.log('[iDeploy] Reload signal received.');
          window.location.reload();
        }
      };

      this.ws.onclose = () => {
        console.log('[iDeploy] Connection closed. Retrying in 2s...');
        setTimeout(() => this.connect(), 2000);
      };

      this.ws.onerror = () => {
        this.ws.close();
      };
    }
  }

  // ── Feedback Overlay ───────────────────────────────────────────────────────
  class FeedbackOverlay {
    constructor() {
      this.isActive = false;
      this.createStyles();
      this.createUI();
      this.bindEvents();
    }

    createStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .ideploy-feedback-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 50px;
          height: 50px;
          border-radius: 25px;
          background: #00ff88;
          color: #000;
          border: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-weight: bold;
          cursor: pointer;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: sans-serif;
        }

        .ideploy-feedback-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.2);
          z-index: 9998;
          display: none;
          cursor: crosshair;
        }
        .ideploy-feedback-overlay.active {
          display: block;
        }
        .ideploy-note {
          position: absolute;
          background: #fff8bc;
          border: 1px solid #e6db55;
          padding: 8px;
          border-radius: 4px;
          box-shadow: 2px 2px 8px rgba(0,0,0,0.2);
          min-width: 120px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: #333;
          z-index: 10000;
        }
        .ideploy-note textarea {
          width: 100%;
          border: none;
          background: transparent;
          resize: none;
          outline: none;
          font-family: inherit;
        }
        .ideploy-note-save {
          display: block;
          margin-top: 4px;
          font-size: 10px;
          color: #00ff88;
          cursor: pointer;
          text-align: right;
          font-weight: bold;
        }
      `;
      document.head.appendChild(style);
    }

    createUI() {
      this.btn = document.createElement('button');
      this.btn.className = 'ideploy-feedback-btn';
      this.btn.textContent = 'FEED';
      document.body.appendChild(this.btn);

      this.overlay = document.createElement('div');
      this.overlay.className = 'ideploy-feedback-overlay';
      document.body.appendChild(this.overlay);
    }

    bindEvents() {
      this.btn.addEventListener('click', () => {
        this.isActive = !this.isActive;
        this.overlay.classList.toggle('active', this.isActive);
        this.btn.style.background = this.isActive ? '#ff4444' : '#00ff88';
        this.btn.textContent = this.isActive ? 'EXIT' : 'FEED';
      });

      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.addNote(e.clientX, e.clientY);
        }
      });
    }

    getEnvironmentSnapshot() {
      return {
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };
    }

    addNote(x, y) {
      const note = document.createElement('div');
      note.className = 'ideploy-note';
      note.style.left = `${x}px`;
      note.style.top = `${y}px`;

      const textarea = document.createElement('textarea');
      textarea.placeholder = 'Type feedback...';
      note.appendChild(textarea);

      const save = document.createElement('span');
      save.className = 'ideploy-note-save';
      save.textContent = 'SAVE';
      save.onclick = () => {
        this.saveFeedback({
          text: textarea.value,
          x, y,
          url: window.location.href,
          snapshot: this.getEnvironmentSnapshot()
        });
        note.remove();
      };
      note.appendChild(save);

      document.body.appendChild(note);
      textarea.focus();
    }

    async saveFeedback(data) {
      console.log('[iDeploy] Saving feedback:', data);
      try {
        const response = await fetch(CONFIG.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          console.log('[iDeploy] Feedback saved successfully');
        }
      } catch (err) {
        console.error('[iDeploy] Failed to save feedback:', err);
      }
    }
  }

  // Initialize
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      new LiveReload();
      new FeedbackOverlay();
    });
  }
})();
