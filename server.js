const WebSocket = require('ws');
const http = require('http');

// HTTP istekleri için normal web sayfası yanıtı
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('C3 Signalling Server is running!\n');
});

// WebSocket sunucusunu HTTP sunucusundan bağımsız olarak "upgrade" mekanizmasıyla başlatıyoruz
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

const rooms = {};

wss.on('connection', (ws) => {
  ws.room = null;

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (e) {
      return;
    }

    if (data.type === 'join') {
      const roomName = data.room;
      ws.room = roomName;
      if (!rooms[roomName]) {
        rooms[roomName] = [];
      }
      rooms[roomName].push(ws);
    } else {
      if (ws.room && rooms[ws.room]) {
        rooms[ws.room].forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    }
  });

  ws.on('close', () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room] = rooms[ws.room].filter(client => client !== ws);
      if (rooms[ws.room].length === 0) {
        delete rooms[ws.room];
      }
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Signalling server is listening on port ${PORT}`);
});
