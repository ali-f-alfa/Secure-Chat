#!/usr/bin/env bash
set -e

# 1. Install system packages
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv ufw

# 2. Open firewall port
sudo ufw allow 8000

# 3. Create and activate virtualenv
python3 -m venv venv
source venv/bin/activate

# 4. Install Python dependencies
pip install flask flask-socketio eventlet pytz

# 5. Launch the server
echo "Starting chatroom on http://$(hostname -I | awk '{print $1}'):8000 …"
python3 server.py
