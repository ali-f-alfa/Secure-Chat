#!/bin/bash
set -e

# Install Node.js, npm and ufw if not present
sudo apt update
sudo apt install -y nodejs npm ufw

# Install npm dependencies
npm install

# Open firewall port 8000
sudo ufw allow 8000 || true

# Start server
node server.js
