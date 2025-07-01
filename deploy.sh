#!/bin/bash

# Secure Chatroom - One-Click Deployment Script
# This script deploys the secure chatroom application on Ubuntu 20.04+

set -e  # Exit on any error

echo "🚀 Starting Secure Chatroom Deployment..."
echo "================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
fi

# Check OS compatibility
if [[ ! -f /etc/os-release ]]; then
    error "Cannot determine OS. This script is designed for Ubuntu 20.04+"
fi

source /etc/os-release
if [[ "$ID" != "ubuntu" ]] || [[ $(echo "$VERSION_ID >= 20.04" | bc -l) -ne 1 ]]; then
    warn "This script is optimized for Ubuntu 20.04+. Proceeding anyway..."
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Node.js via NodeSource
install_nodejs() {
    log "Installing Node.js 18.x..."
    
    # Remove any existing Node.js installations
    sudo apt-get remove -y nodejs npm 2>/dev/null || true
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Verify installation
    node --version
    npm --version
}

# Function to install PM2
install_pm2() {
    log "Installing PM2 process manager..."
    sudo npm install -g pm2
    
    # Setup PM2 startup script
    sudo pm2 startup systemd -u $USER --hp $HOME
}

# Update system packages
log "Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install essential packages
log "Installing essential packages..."
sudo apt-get install -y curl wget git build-essential python3 sqlite3 ufw

# Install Node.js if not present or wrong version
if ! command_exists node || [[ $(node --version | cut -d'v' -f2 | cut -d'.' -f1) -lt 16 ]]; then
    install_nodejs
else
    log "Node.js $(node --version) is already installed"
fi

# Install PM2 if not present
if ! command_exists pm2; then
    install_pm2
else
    log "PM2 is already installed"
fi

# Create application directory
APP_DIR="$HOME/secure-chatroom"
if [[ -d "$APP_DIR" ]]; then
    warn "Application directory already exists. Backing up..."
    mv "$APP_DIR" "$APP_DIR.backup.$(date +%s)"
fi

log "Creating application directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Copy application files (assumes script is run from project root)
log "Copying application files..."
cp -r "$(dirname "$0")"/* "$APP_DIR"/
cp -r "$(dirname "$0")"/.[^.]* "$APP_DIR"/ 2>/dev/null || true

# Create necessary directories
mkdir -p data logs

# Create environment file
log "Creating environment configuration..."
if [[ ! -f .env ]]; then
    cp .env.example .env
    
    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/your-super-secret-jwt-key-here/$JWT_SECRET/" .env
    
    # Generate admin password
    ADMIN_PASSWORD=$(openssl rand -base64 16)
    sed -i "s/admin123/$ADMIN_PASSWORD/" .env
    
    log "Generated secure JWT secret and admin password"
    log "Admin password: $ADMIN_PASSWORD (save this!)"
fi

# Set proper permissions
chmod 600 .env
chmod 755 deploy.sh

# Install server dependencies
log "Installing server dependencies..."
npm install

# Install client dependencies and build
log "Installing client dependencies and building..."
cd client
npm install
npm run build
cd ..

# Setup firewall
log "Configuring firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000/tcp  # Application port

# Create systemd service file for auto-start
log "Creating systemd service..."
sudo tee /etc/systemd/system/secure-chatroom.service > /dev/null <<EOF
[Unit]
Description=Secure Chatroom Application
Documentation=https://github.com/your-repo/secure-chatroom
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=$HOME/.npm-global/bin/pm2 start ecosystem.config.js --env production
ExecReload=$HOME/.npm-global/bin/pm2 reload all
ExecStop=$HOME/.npm-global/bin/pm2 kill
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable secure-chatroom

# Start the application
log "Starting Secure Chatroom application..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Create CLI management script
log "Creating management CLI..."
cat > chatroom-cli << 'EOF'
#!/bin/bash

# Secure Chatroom CLI Management Tool

case "$1" in
    start)
        echo "Starting Secure Chatroom..."
        pm2 start secure-chatroom
        ;;
    stop)
        echo "Stopping Secure Chatroom..."
        pm2 stop secure-chatroom
        ;;
    restart)
        echo "Restarting Secure Chatroom..."
        pm2 restart secure-chatroom
        ;;
    status)
        echo "Secure Chatroom Status:"
        pm2 show secure-chatroom
        ;;
    logs)
        echo "Showing logs (Ctrl+C to exit):"
        pm2 logs secure-chatroom
        ;;
    settings)
        echo "Current settings:"
        cat .env | grep -v JWT_SECRET | grep -v ADMIN_PASSWORD
        echo ""
        echo "To modify settings, edit the .env file and restart the application."
        ;;
    update-settings)
        if [ -z "$2" ]; then
            echo "Usage: $0 update-settings <admin_password>"
            echo "Available settings:"
            echo "  MAX_MESSAGE_LENGTH"
            echo "  MAX_ROOM_NAME_LENGTH" 
            echo "  MAX_USERNAME_LENGTH"
            echo "  RATE_LIMIT_MAX_REQUESTS"
            echo "  RATE_LIMIT_WINDOW_MS"
            exit 1
        fi
        
        read -p "Setting key: " key
        read -p "Setting value: " value
        
        # Update via API
        curl -X POST http://localhost:3000/api/admin/settings \
          -H "Content-Type: application/json" \
          -d "{\"adminPassword\": \"$2\", \"settings\": {\"$key\": \"$value\"}}"
        echo ""
        echo "Setting updated. Restart may be required for some changes."
        ;;
    backup)
        backup_file="chatroom-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
        echo "Creating backup: $backup_file"
        tar -czf "$backup_file" data/ .env ecosystem.config.js
        echo "Backup created successfully"
        ;;
    restore)
        if [ -z "$2" ]; then
            echo "Usage: $0 restore <backup_file>"
            exit 1
        fi
        echo "Restoring from backup: $2"
        pm2 stop secure-chatroom
        tar -xzf "$2"
        pm2 start secure-chatroom
        echo "Restore completed"
        ;;
    monitor)
        echo "Opening PM2 monitoring interface..."
        pm2 monit
        ;;
    *)
        echo "Secure Chatroom CLI Management Tool"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|settings|update-settings|backup|restore|monitor}"
        echo ""
        echo "Commands:"
        echo "  start              Start the application"
        echo "  stop               Stop the application"
        echo "  restart            Restart the application"
        echo "  status             Show application status"
        echo "  logs               Show application logs"
        echo "  settings           Display current settings"
        echo "  update-settings    Update application settings"
        echo "  backup             Create a backup"
        echo "  restore <file>     Restore from backup"
        echo "  monitor            Open PM2 monitoring interface"
        exit 1
        ;;
esac
EOF

chmod +x chatroom-cli
sudo ln -sf "$APP_DIR/chatroom-cli" /usr/local/bin/chatroom-cli

# Final setup and information
log "Final setup..."

# Get server IP
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "localhost")

# Display success message
echo ""
echo "================================================"
echo -e "${GREEN}🎉 Secure Chatroom deployed successfully!${NC}"
echo "================================================"
echo ""
echo -e "${BLUE}Application Details:${NC}"
echo "📍 Location: $APP_DIR"
echo "🌐 URL: http://$SERVER_IP:3000"
echo "🔧 Management: chatroom-cli"
echo ""
echo -e "${BLUE}Admin Credentials:${NC}"
echo "🔑 Admin Password: $ADMIN_PASSWORD"
echo ""
echo -e "${BLUE}Management Commands:${NC}"
echo "🚀 Start:    chatroom-cli start"
echo "🛑 Stop:     chatroom-cli stop"
echo "🔄 Restart:  chatroom-cli restart"
echo "📊 Status:   chatroom-cli status"
echo "📝 Logs:     chatroom-cli logs"
echo "⚙️  Settings: chatroom-cli settings"
echo "💾 Backup:   chatroom-cli backup"
echo ""
echo -e "${YELLOW}Security Notes:${NC}"
echo "🔒 Firewall configured (only SSH and port 3000 open)"
echo "🔐 Generated secure JWT secret and admin password"
echo "📁 Environment variables stored in .env file"
echo "🛡️  Application runs as non-root user"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Save the admin password shown above"
echo "2. Visit http://$SERVER_IP:3000 to access the chatroom"
echo "3. Create user accounts and start chatting"
echo "4. Use 'chatroom-cli settings' to view/modify configuration"
echo ""
echo -e "${GREEN}Deployment completed successfully! 🚀${NC}"