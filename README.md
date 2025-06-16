# Secure Chatroom

This project provides a simple realtime chatroom where everyone uses a shared password. It runs both backend and frontend on the same server using Node.js and Socket.IO.

## Features

- Login with any username and a shared password (`secret` by default).
- Realtime chatting with message replies.
- Messages stored in a small JSON database.
- Timestamps displayed in Iran timezone.

## Quick Setup on Ubuntu 20.04+

```bash
# install node if you don't have it
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# clone and install
git clone <repo-url> secure-chat
cd secure-chat
npm install

# optional: open firewall for port 8000
sudo ufw allow 8000/tcp

# start the chatroom
npm start
```

Then open `http://your-server-ip:8000` in your browser.

## Usage

1. Visit the server in a browser.
2. Enter any username and the shared password `secret`.
3. Start chatting!

Messages include the sender name, timestamp (Iran time), message text and a reply option.
