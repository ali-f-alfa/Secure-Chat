# 🛡️ Secure Chatroom

A lightweight, secure real-time chatroom application with end-to-end encryption, modern UI, and easy deployment. Built with Node.js, Express, Socket.io, React, and SQLite.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)
![React](https://img.shields.io/badge/react-18+-blue.svg)
![Security](https://img.shields.io/badge/security-E2E%20encrypted-brightgreen.svg)

## ✨ Features

### 🔐 Security Features
- **End-to-End Encryption** for private chats using WebCrypto API
- **Server-to-Client Encryption** with TLS support
- **JWT Authentication** with secure token management
- **Rate Limiting** to prevent spam and abuse
- **Input Validation** and sanitization
- **CSRF Protection** and security headers
- **Firewall Configuration** during deployment

### 💬 Chat Features
- **Real-time Messaging** with Socket.io
- **Public Chat Rooms** for group discussions
- **Private Direct Messages** with E2E encryption
- **Typing Indicators** to show when users are typing
- **User Presence** indicators (online/offline)
- **Message History** with pagination
- **Room Management** (create, join, leave)
- **User Invitations** to private rooms

### 🎨 User Experience
- **Modern Dark Theme** UI with responsive design
- **Mobile-Friendly** interface
- **Real-time Notifications** for new messages
- **Emoji Support** in messages
- **Message Timestamps** and status indicators
- **User Avatar** system
- **Lightweight** and fast performance

### 🚀 Deployment & Management
- **One-Click Deployment** with automated setup script
- **CLI Management Tools** for configuration
- **PM2 Process Management** for production
- **Automatic Backups** and restore functionality
- **Health Monitoring** and logging
- **Environment Configuration** management

## 🛠️ Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **SQLite** - Lightweight database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware

### Frontend
- **React** - UI library
- **React Router** - Client-side routing
- **Lucide React** - Icon library
- **WebCrypto API** - Client-side encryption
- **Socket.io Client** - Real-time communication

### Security
- **RSA-OAEP** - Asymmetric encryption for key exchange
- **AES-GCM** - Symmetric encryption for messages
- **TLS/SSL** - Transport layer security
- **CORS** - Cross-origin resource sharing protection
- **Rate Limiting** - Request throttling

## 🚀 Quick Start

### One-Click Deployment (Ubuntu 20.04+)

```bash
# Download and run the deployment script
curl -sSL https://raw.githubusercontent.com/your-repo/secure-chatroom/main/deploy.sh | bash
```

Or clone and deploy manually:

```bash
# Clone the repository
git clone https://github.com/your-repo/secure-chatroom.git
cd secure-chatroom

# Run deployment script
chmod +x deploy.sh
./deploy.sh
```

### Manual Installation

1. **Prerequisites**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   ```

2. **Install Dependencies**
   ```bash
   # Install server dependencies
   npm install
   
   # Install client dependencies
   cd client && npm install && cd ..
   ```

3. **Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit configuration (set JWT_SECRET and ADMIN_PASSWORD)
   nano .env
   ```

4. **Build and Start**
   ```bash
   # Build client
   npm run build
   
   # Start in production mode
   npm run pm2:start
   ```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-super-secret-jwt-key-here
ADMIN_PASSWORD=your-admin-password

# Database
DB_PATH=./data/chatroom.db

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Chat Settings
MAX_MESSAGE_LENGTH=500
MAX_ROOM_NAME_LENGTH=50
MAX_USERNAME_LENGTH=30
```

### CLI Management

After deployment, use the `chatroom-cli` command for management:

```bash
# Application control
chatroom-cli start          # Start the application
chatroom-cli stop           # Stop the application
chatroom-cli restart        # Restart the application
chatroom-cli status         # Show status

# Monitoring
chatroom-cli logs           # View logs
chatroom-cli monitor        # Open PM2 monitoring

# Configuration
chatroom-cli settings       # View current settings
chatroom-cli update-settings <admin_password>  # Update settings

# Backup/Restore
chatroom-cli backup         # Create backup
chatroom-cli restore <file> # Restore from backup
```

## 🔐 Security Architecture

### End-to-End Encryption Flow

1. **Key Generation**: Each user generates an RSA key pair locally
2. **Key Exchange**: Public keys are exchanged through the server
3. **Message Encryption**: 
   - Generate random AES key for each message
   - Encrypt message with AES key
   - Encrypt AES key with recipient's RSA public key
   - Send encrypted message + encrypted key
4. **Message Decryption**:
   - Decrypt AES key with private RSA key
   - Decrypt message with AES key

### Server Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure authentication with expiration
- **Rate Limiting**: Configurable request throttling
- **Input Validation**: Comprehensive message and user input validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization and CSP headers

## 📱 Usage

### Getting Started

1. **Access the Application**
   - Open your browser and navigate to `http://your-server:3000`
   - Create an account or login with existing credentials

2. **Join a Room**
   - Browse available public rooms in the lobby
   - Click "Join" to enter a room
   - Start chatting with other users

3. **Private Messaging**
   - Click on a user's name to start a private chat
   - Messages are automatically encrypted end-to-end
   - Only you and the recipient can read the messages

4. **Create Rooms**
   - Click "Create Room" in the lobby
   - Choose between public or private rooms
   - Invite specific users to private rooms

### Admin Features

Administrators can:
- Update application settings via CLI
- Monitor user activity and logs
- Backup and restore chat data
- Configure rate limits and security settings

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │   React Client  │
│                 │    │                 │
│  ┌─────────────┐│    │ ┌─────────────┐ │
│  │ WebCrypto   ││    │ │ WebCrypto   │ │
│  │ E2E Encrypt ││    │ │ E2E Encrypt │ │
│  └─────────────┘│    │ └─────────────┘ │
└─────────┬───────┘    └───────┬─────────┘
          │                    │
          │ Socket.io + HTTPS  │
          └────────┬───────────┘
                   │
         ┌─────────┴───────────┐
         │   Node.js Server    │
         │                     │
         │ ┌─────────────────┐ │
         │ │ Express + Auth  │ │
         │ │ Socket.io       │ │
         │ │ Rate Limiting   │ │
         │ │ Input Validation│ │
         │ └─────────────────┘ │
         └─────────┬───────────┘
                   │
         ┌─────────┴───────────┐
         │   SQLite Database   │
         │                     │
         │ • Users             │
         │ • Rooms             │
         │ • Messages          │
         │ • Settings          │
         └─────────────────────┘
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📋 Development

### Development Setup

```bash
# Install dependencies
npm run setup

# Start development server (backend + frontend)
npm run dev

# Run backend only
npm run dev:server

# Run frontend only  
npm run dev:client
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🐛 Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   # Change port in .env file
   PORT=3001
   
   # Or kill existing process
   sudo kill -9 $(sudo lsof -t -i:3000)
   ```

2. **Permission denied errors**
   ```bash
   # Fix file permissions
   chmod 755 deploy.sh
   chmod 600 .env
   ```

3. **Database connection issues**
   ```bash
   # Check database file permissions
   ls -la data/chatroom.db
   
   # Recreate database
   rm data/chatroom.db
   chatroom-cli restart
   ```

4. **Socket connection failures**
   ```bash
   # Check firewall settings
   sudo ufw status
   
   # Ensure port is open
   sudo ufw allow 3000/tcp
   ```

### Log Files

```bash
# View application logs
chatroom-cli logs

# View PM2 logs
pm2 logs secure-chatroom

# View system logs
journalctl -u secure-chatroom
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Socket.io](https://socket.io/) for real-time communication
- [React](https://reactjs.org/) for the user interface
- [Express.js](https://expressjs.com/) for the web framework
- [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) for client-side encryption

## 📞 Support

- 📧 Email: support@secure-chatroom.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/secure-chatroom/issues)
- 📖 Documentation: [Wiki](https://github.com/your-repo/secure-chatroom/wiki)

---

**⚠️ Security Notice**: This application implements end-to-end encryption for private messages, but please review the code and conduct your own security audit before using in production environments handling sensitive data.
