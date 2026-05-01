const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const FEEDBACK_DIR = path.join(process.cwd(), 'feedback');

if (!fs.existsSync(FEEDBACK_DIR)) {
  fs.mkdirSync(FEEDBACK_DIR);
}

const server = http.createServer((req, res) => {
  
  if (req.method === 'GET' && req.url === '/feedback-list') {
    fs.readdir(FEEDBACK_DIR, (err, files) => {
      if (err) { res.writeHead(500); res.end('Error'); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(files.filter(f => !f.startsWith('.'))));
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/feedback') {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      const boundary = contentType.split('boundary=')[1];
      let body = Buffer.alloc(0);
      req.on('data', chunk => { body = Buffer.concat([body, chunk]); });
      req.on('end', () => {
        const parts = body.toString('binary').split('--' + boundary);
        const timestamp = Date.now();
        parts.forEach(part => {
          if (part.includes('name="video"')) {
            const fileData = part.split('\r\n\r\n')[1].split('\r\n--')[0];
            fs.writeFileSync(path.join(FEEDBACK_DIR, 'session-' + timestamp + '.webm'), Buffer.from(fileData, 'binary'));
          }
          if (part.includes('name="snapshot"')) {
            const jsonStr = part.split('\r\n\r\n')[1].split('\r\n--')[0];
            fs.writeFileSync(path.join(FEEDBACK_DIR, 'snapshot-' + timestamp + '.json'), jsonStr);
          }
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', id: timestamp }));
      });
    } else {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const filename = 'feedback-' + Date.now() + '.json';
          fs.writeFileSync(path.join(FEEDBACK_DIR, filename), JSON.stringify(data, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        } catch (e) {
          res.writeHead(400);
          res.end('Invalid JSON');
        }
      });
    }
    return;
  }
  
  let filePath = req.url === '/' ? './iDeploy.html' : '.' + req.url;
  if (req.url.startsWith('/feedback/')) {
    filePath = req.url.substring(1);
  }

  const extname = path.extname(filePath);
  let contentType = 'text/html';
  switch (extname) {
    case '.js': contentType = 'text/javascript'; break;
    case '.css': contentType = 'text/css'; break;
    case '.json': contentType = 'application/json'; break;
    case '.png': contentType = 'image/png'; break;
    case '.jpg': contentType = 'image/jpg'; break;
    case '.icns': contentType = 'image/x-icon'; break;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code == 'ENOENT' ? 404 : 500);
      res.end('Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const wss = {
  clients: new Set(),
  broadcast(data) {
    this.clients.forEach(client => { if (client.readyState === 1) client.send(data); });
  }
};

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    const key = request.headers['sec-websocket-key'];
    const acceptKey = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', 'Sec-WebSocket-Accept: ' + acceptKey, '', ''].join('\r\n'));
    const client = { socket, readyState: 1, send(data) {
      const payload = Buffer.from(data);
      const frame = Buffer.alloc(2 + payload.length);
      frame[0] = 0x81; frame[1] = payload.length;
      payload.copy(frame, 2);
      socket.write(frame);
    }};
    wss.clients.add(client);
    socket.on('end', () => wss.clients.delete(client));
  }
});

server.on('request', (req, res) => {
  if (req.url === '/_reload' && req.method === 'POST') {
    wss.broadcast('reload');
    res.writeHead(200); res.end('ok');
  }
});

server.listen(PORT, () => console.log('[iDeploy] Hub running at http://localhost:' + PORT));
