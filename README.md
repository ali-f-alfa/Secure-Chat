# Real-Time Chatroom

A lightweight chatroom (Flask + SocketIO + SQLite) you can deploy on any Ubuntu server with one command.

## Features

- Single-server front-end (port 8000) + back-end
- One global password (`Shayan`) — users pick any display name
- Real-time messaging with replies
- Timestamps in Iran time
- Messages stored in local SQLite database
- Firewall port opened automatically

## Quickstart

```bash
# 1. Clone this repo:
git clone https://github.com/yourusername/chatroom.git
cd chatroom

# 2. Run the installer + server:
bash setup.sh

# 3. Point your browser at:
http://<your-server-ip>:8000
