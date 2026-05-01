
(function() {
  const CONFIG = { port: 3000, endpoint: '/feedback' };
  class LiveReload {
    constructor() { this.connect(); }
    connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = protocol + '//' + window.location.host + '/ws';
      this.ws = new WebSocket(url);
      this.ws.onmessage = (e) => { if (e.data === 'reload') window.location.reload(); };
      this.ws.onclose = () => setTimeout(() => this.connect(), 2000);
    }
  }
  class FeedbackOverlay {
    constructor() {
      this.isActive = false; this.isRecording = false; this.chunks = [];
      this.createStyles(); this.createUI(); this.bindEvents();
    }
    createStyles() {
      const style = document.createElement('style');
      style.textContent = '.ideploy-feedback-btn { position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; border-radius: 25px; background: #00ff88; color: #000; border: none; font-weight: bold; cursor: pointer; z-index: 9999; } .ideploy-rec-btn { position: fixed; bottom: 20px; right: 80px; width: 50px; height: 50px; border-radius: 25px; background: #444; color: #fff; border: none; font-size: 10px; cursor: pointer; z-index: 9999; } .ideploy-rec-btn.recording { background: #ff4444; } .ideploy-feedback-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.2); z-index: 9998; display: none; cursor: crosshair; } .ideploy-feedback-overlay.active { display: block; } .ideploy-note { position: absolute; background: #fff8bc; border: 1px solid #e6db55; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #333; z-index: 10000; }';
      document.head.appendChild(style);
    }
    createUI() {
      this.btn = document.createElement('button'); this.btn.className = 'ideploy-feedback-btn'; this.btn.textContent = 'FEED'; document.body.appendChild(this.btn);
      this.recBtn = document.createElement('button'); this.recBtn.className = 'ideploy-rec-btn'; this.recBtn.textContent = 'REC'; document.body.appendChild(this.recBtn);
      this.overlay = document.createElement('div'); this.overlay.className = 'ideploy-feedback-overlay'; document.body.appendChild(this.overlay);
    }
    bindEvents() {
      this.btn.onclick = () => { this.isActive = !this.isActive; this.overlay.classList.toggle('active', this.isActive); this.btn.textContent = this.isActive ? 'EXIT' : 'FEED'; };
      this.recBtn.onclick = () => this.toggleRecording();
      this.overlay.onclick = (e) => { if (e.target === this.overlay) this.addNote(e.clientX, e.clientY); };
    }
    async toggleRecording() {
      if (this.isRecording) {
        this.mediaRecorder.stop(); this.isRecording = false; this.recBtn.classList.remove('recording'); this.recBtn.textContent = 'REC';
      } else {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          this.mediaRecorder = new MediaRecorder(stream); this.chunks = [];
          this.mediaRecorder.ondataavailable = (e) => this.chunks.push(e.data);
          this.mediaRecorder.onstop = () => this.saveVideo();
          this.mediaRecorder.start(); this.isRecording = true; this.recBtn.classList.add('recording'); this.recBtn.textContent = 'STOP';
        } catch (err) { console.error(err); }
      }
    }
    async saveVideo() {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('video', blob); formData.append('snapshot', JSON.stringify(this.getSnapshot()));
      fetch(CONFIG.endpoint, { method: 'POST', body: formData });
    }
    getSnapshot() { return { screen: window.screen.width + 'x' + window.screen.height, userAgent: navigator.userAgent, timestamp: new Date().toISOString() }; }
    addNote(x, y) {
      const note = document.createElement('div'); note.className = 'ideploy-note'; note.style.left = x + 'px'; note.style.top = y + 'px';
      const textarea = document.createElement('textarea'); note.appendChild(textarea);
      const save = document.createElement('button'); save.textContent = 'SAVE';
      save.onclick = () => {
        fetch(CONFIG.endpoint, { method: 'POST', body: JSON.stringify({ text: textarea.value, x, y, snapshot: this.getSnapshot() }) });
        note.remove();
      };
      note.appendChild(save); document.body.appendChild(note); textarea.focus();
    }
  }
  window.onload = () => { new LiveReload(); new FeedbackOverlay(); };
})();
