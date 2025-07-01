const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.dbPath = process.env.DB_PATH || './data/chatroom.db';
    this.ensureDataDirectory();
    this.db = new sqlite3.Database(this.dbPath);
    this.init();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  init() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Users table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_admin BOOLEAN DEFAULT FALSE
          )
        `);

        // Rooms table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            creator_id TEXT NOT NULL,
            is_private BOOLEAN DEFAULT FALSE,
            max_users INTEGER DEFAULT 50,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (creator_id) REFERENCES users (id)
          )
        `);

        // Messages table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            is_encrypted BOOLEAN DEFAULT FALSE,
            message_type TEXT DEFAULT 'text',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (room_id) REFERENCES rooms (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // Room members table for private rooms
        this.db.run(`
          CREATE TABLE IF NOT EXISTS room_members (
            room_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            role TEXT DEFAULT 'member',
            PRIMARY KEY (room_id, user_id),
            FOREIGN KEY (room_id) REFERENCES rooms (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // Settings table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Private chat keys table for E2E encryption
        this.db.run(`
          CREATE TABLE IF NOT EXISTS private_keys (
            user1_id TEXT NOT NULL,
            user2_id TEXT NOT NULL,
            public_key TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user1_id, user2_id),
            FOREIGN KEY (user1_id) REFERENCES users (id),
            FOREIGN KEY (user2_id) REFERENCES users (id)
          )
        `);

        // Create default settings
        this.initializeDefaultSettings();

        console.log('✅ Database initialized successfully');
        resolve();
      });
    });
  }

  initializeDefaultSettings() {
    const defaultSettings = [
      { key: 'max_message_length', value: '500' },
      { key: 'max_room_name_length', value: '50' },
      { key: 'max_username_length', value: '30' },
      { key: 'allow_registration', value: 'true' },
      { key: 'require_room_approval', value: 'false' }
    ];

    defaultSettings.forEach(setting => {
      this.db.run(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        [setting.key, setting.value]
      );
    });
  }

  async createUser(username, password) {
    return new Promise((resolve, reject) => {
      const userId = uuidv4();
      const saltRounds = 12;
      
      bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) return reject(err);

        this.db.run(
          'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
          [userId, username, hash],
          function(error) {
            if (error) {
              if (error.code === 'SQLITE_CONSTRAINT') {
                reject(new Error('Username already exists'));
              } else {
                reject(error);
              }
            } else {
              const token = jwt.sign(
                { userId, username },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
              );
              resolve({ userId, token });
            }
          }
        );
      });
    });
  }

  async authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id, username, password_hash FROM users WHERE username = ?',
        [username],
        (err, user) => {
          if (err) return reject(err);
          if (!user) return reject(new Error('Invalid credentials'));

          bcrypt.compare(password, user.password_hash, (err, result) => {
            if (err) return reject(err);
            if (!result) return reject(new Error('Invalid credentials'));

            // Update last active
            this.db.run(
              'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
              [user.id]
            );

            const token = jwt.sign(
              { userId: user.id, username: user.username },
              process.env.JWT_SECRET,
              { expiresIn: '7d' }
            );

            resolve({
              token,
              user: {
                id: user.id,
                username: user.username
              }
            });
          });
        }
      );
    });
  }

  async createRoom(name, creatorId, isPrivate = false) {
    return new Promise((resolve, reject) => {
      const roomId = uuidv4();
      
      this.db.run(
        'INSERT INTO rooms (id, name, creator_id, is_private) VALUES (?, ?, ?, ?)',
        [roomId, name, creatorId, isPrivate],
        function(error) {
          if (error) {
            if (error.code === 'SQLITE_CONSTRAINT') {
              reject(new Error('Room name already exists'));
            } else {
              reject(error);
            }
          } else {
            // Add creator as room member
            this.db.run(
              'INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)',
              [roomId, creatorId, 'admin']
            );
            
            resolve({
              id: roomId,
              name,
              creator_id: creatorId,
              is_private: isPrivate,
              created_at: new Date().toISOString()
            });
          }
        }
      );
    });
  }

  async getRooms() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT r.*, u.username as creator_username, 
         COUNT(rm.user_id) as member_count
         FROM rooms r 
         LEFT JOIN users u ON r.creator_id = u.id
         LEFT JOIN room_members rm ON r.id = rm.room_id
         WHERE r.is_private = FALSE
         GROUP BY r.id
         ORDER BY r.created_at DESC`,
        (err, rooms) => {
          if (err) return reject(err);
          resolve(rooms);
        }
      );
    });
  }

  async getUserRooms(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT r.*, u.username as creator_username, rm.role
         FROM rooms r 
         LEFT JOIN users u ON r.creator_id = u.id
         JOIN room_members rm ON r.id = rm.room_id
         WHERE rm.user_id = ?
         ORDER BY r.created_at DESC`,
        [userId],
        (err, rooms) => {
          if (err) return reject(err);
          resolve(rooms);
        }
      );
    });
  }

  async saveMessage(roomId, userId, username, content, isEncrypted = false, messageType = 'text') {
    return new Promise((resolve, reject) => {
      const messageId = uuidv4();
      
      this.db.run(
        `INSERT INTO messages (id, room_id, user_id, username, content, is_encrypted, message_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [messageId, roomId, userId, username, content, isEncrypted, messageType],
        function(error) {
          if (error) return reject(error);
          
          resolve({
            id: messageId,
            room_id: roomId,
            user_id: userId,
            username,
            content,
            is_encrypted: isEncrypted,
            message_type: messageType,
            created_at: new Date().toISOString()
          });
        }
      );
    });
  }

  async getMessages(roomId, page = 1, limit = 50) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      
      this.db.all(
        `SELECT * FROM messages 
         WHERE room_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [roomId, limit, offset],
        (err, messages) => {
          if (err) return reject(err);
          resolve(messages.reverse()); // Return in chronological order
        }
      );
    });
  }

  async addUserToRoom(roomId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)',
        [roomId, userId],
        function(error) {
          if (error) return reject(error);
          resolve(this.changes > 0);
        }
      );
    });
  }

  async removeUserFromRoom(roomId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM room_members WHERE room_id = ? AND user_id = ?',
        [roomId, userId],
        function(error) {
          if (error) return reject(error);
          resolve(this.changes > 0);
        }
      );
    });
  }

  async getRoomMembers(roomId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT u.id, u.username, rm.role, rm.joined_at
         FROM room_members rm
         JOIN users u ON rm.user_id = u.id
         WHERE rm.room_id = ?
         ORDER BY rm.joined_at`,
        [roomId],
        (err, members) => {
          if (err) return reject(err);
          resolve(members);
        }
      );
    });
  }

  async isUserInRoom(roomId, userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?',
        [roomId, userId],
        (err, row) => {
          if (err) return reject(err);
          resolve(!!row);
        }
      );
    });
  }

  async updateSettings(settings) {
    return new Promise((resolve, reject) => {
      const updates = Object.entries(settings);
      let completed = 0;

      updates.forEach(([key, value]) => {
        this.db.run(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [key, value.toString()],
          (error) => {
            if (error) return reject(error);
            completed++;
            if (completed === updates.length) {
              resolve();
            }
          }
        );
      });

      if (updates.length === 0) resolve();
    });
  }

  async getSettings() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT key, value FROM settings',
        (err, rows) => {
          if (err) return reject(err);
          
          const settings = {};
          rows.forEach(row => {
            settings[row.key] = row.value;
          });
          resolve(settings);
        }
      );
    });
  }

  async getUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id, username, created_at, last_active FROM users WHERE id = ?',
        [userId],
        (err, user) => {
          if (err) return reject(err);
          resolve(user);
        }
      );
    });
  }

  async close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('✅ Database connection closed');
        }
        resolve();
      });
    });
  }
}

module.exports = Database;