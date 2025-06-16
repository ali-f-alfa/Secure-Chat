const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Low, JSONFile } = require('lowdb');
const dayjs = require('dayjs');
const utc = require('dayjs-plugin-utc');
const timezone = require('dayjs-plugin-timezone');

// Setup dayjs for Iran timezone
dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'Asia/Tehran';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Lowdb setup
const adapter = new JSONFile('db.json');
const db = new Low(adapter, { messages: [] });

async function initDb() {
  await db.read();
  db.data = db.data || { messages: [] };
  await db.write();
}

initDb();

app.use(express.static('public'));

io.on('connection', socket => {
  socket.on('join', async username => {
    socket.username = username;
    // send existing messages
    await db.read();
    socket.emit('init', db.data.messages);
  });

  socket.on('message', async msg => {
    const message = {
      id: Date.now(),
      user: socket.username,
      text: msg.text,
      replyTo: msg.replyTo || null,
      time: dayjs().tz(TZ).format('YYYY-MM-DD HH:mm:ss')
    };
    await db.read();
    db.data.messages.push(message);
    await db.write();
    io.emit('message', message);
  });
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
