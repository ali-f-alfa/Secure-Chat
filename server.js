const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 8000;

// Set up database
const db = new sqlite3.Database('chat.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    reply_to INTEGER
  )`);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Endpoint to fetch messages
app.get('/messages', (req, res) => {
  db.all('SELECT * FROM messages ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

io.on('connection', (socket) => {
  socket.on('new-message', (msg) => {
    const stmt = db.prepare('INSERT INTO messages(name, text, timestamp, reply_to) VALUES(?, ?, ?, ?)');
    stmt.run(msg.name, msg.text, msg.timestamp, msg.reply_to || null, function(err) {
      if (err) return console.error(err);
      const storedMsg = { id: this.lastID, ...msg };
      io.emit('broadcast-message', storedMsg);
    });
    stmt.finalize();
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
