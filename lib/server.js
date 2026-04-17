const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws'); // Note: I might need to implement basic WS if ws is not available

const PORT = process.env.PORT || 3000;
const FEEDBACK_DIR = path.join(process.cwd(), 'feedback');

if (!fs.existsSync(FEEDBACK_DIR)) {
  fs.mkdirSync(FEEDBACK_DIR);
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/feedback') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const filename = `feedback-${Date.now()}.json`;
        fs.writeFileSync(path.join(FEEDBACK_DIR, filename), JSON.stringify(data, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  // Static file serving
  let filePath = req.url === '/' ? './iDeploy.html' : '.' + req.url;
  const extname = path.extname(filePath);
  let contentType = 'text/html';

  switch (extname) {
    case '.js': contentType = 'text/javascript'; break;
    case '.css': contentType = 'text/css'; break;
    case '.json': contentType = 'application/json'; break;
    case '.png': contentType = 'image/png'; break;
    case '.jpg': contentType = 'image/jpg'; break;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code == 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Basic WebSocket implementation using native modules to avoid dependencies
const wss = {
  clients: new Set(),
  broadcast(data) {
    this.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(data);
      }
    });
  }
};

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    // This is a very minimal WS handshake. 
    // For a real production app, use 'ws' library.
    const key = request.headers['sec-websocket-key'];
    const acceptKey = require('crypto')
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`
    ];

    socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

    const client = {
      socket,
      readyState: 1,
      send(data) {
        // Minimal WebSocket frame (text)
        const payload = Buffer.from(data);
        const length = payload.length;
        let frame;
        if (length <= 125) {
          frame = Buffer.alloc(2 + length);
          frame[0] = 0x81; // FIN + text frame
          frame[1] = length;
          payload.copy(frame, 2);
        } else {
          // Simplified: not handling very large payloads in this helper
          frame = Buffer.alloc(4 + length);
          frame[0] = 0x81;
          frame[1] = 126;
          frame.writeUInt16BE(length, 2);
          payload.copy(frame, 4);
        }
        socket.write(frame);
      }
    };

    wss.clients.add(client);

    socket.on('end', () => wss.clients.delete(client));
    socket.on('error', () => wss.clients.delete(client));
  }
});

// Trigger reload from an external signal (e.g., a file change)
// We can use a simple IPC or just a special endpoint
server.on('request', (req, res) => {
  if (req.url === '/_reload' && req.method === 'POST') {
    console.log('[Server] Broadcasting reload signal...');
    wss.broadcast('reload');
    res.writeHead(200);
    res.end('ok');
  }
});

server.listen(PORT, () => {
  console.log(`[iDeploy] Hub running at http://localhost:${PORT}`);
});
