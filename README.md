# Secure Chat

A simple realtime chatroom using Node.js, Socket.IO and SQLite. All users share the same password (`Shayan`).

## Quick Start on Ubuntu

Run the setup script:

```bash
bash setup_chat.sh
```

The script installs Node.js, required npm packages, opens firewall port 8000 and starts the server.

Then open `http://<server-ip>:8000/login.html` in your browser.

## Manual Setup

1. Install Node.js and npm
   ```bash
   sudo apt update && sudo apt install -y nodejs npm ufw
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Open firewall port
   ```bash
   sudo ufw allow 8000
   ```
4. Start the server
   ```bash
   node server.js
   ```

## Usage

Open `http://<server-ip>:8000/login.html` and enter any name with password `Shayan`.
Chats are stored locally in `chat.db`.
