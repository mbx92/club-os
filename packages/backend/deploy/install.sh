#!/bin/bash

# ==============================================
# Gym Membership Backend - Ubuntu Installation Script
# ==============================================

set -e

APP_NAME="gym-api"
APP_DIR="/var/www/gym-membership-backend"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Gym Membership Backend Installation ===${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# 1. Install Node.js (if not installed)
echo -e "${YELLOW}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
node --version

# 2. Install PM2 (alternative to systemd, optional)
echo -e "${YELLOW}Installing PM2...${NC}"
npm install -g pm2

# 3. Create application directory
echo -e "${YELLOW}Setting up application directory...${NC}"
mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/logs
mkdir -p ${APP_DIR}/uploads

# 4. Copy application files (assuming you're in the source directory)
# Uncomment if deploying from this script
# cp -r . ${APP_DIR}/
# cd ${APP_DIR}
# npm install --production

# 5. Set permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}
chmod 600 ${APP_DIR}/.env.production 2>/dev/null || true

# 6. Install systemd service
echo -e "${YELLOW}Installing systemd service...${NC}"
cp ./gym-api.service ${SERVICE_FILE}

# Reload systemd
systemctl daemon-reload

# Enable service to start on boot
systemctl enable ${APP_NAME}

echo -e "${GREEN}=== Installation Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Copy your application files to ${APP_DIR}"
echo "2. Create .env.production file in ${APP_DIR}"
echo "3. Run: cd ${APP_DIR} && npm install --production"
echo "4. Run database migrations: NODE_ENV=production npx sequelize-cli db:migrate"
echo "5. Start service: sudo systemctl start ${APP_NAME}"
echo "6. Check status: sudo systemctl status ${APP_NAME}"
echo "7. View logs: sudo journalctl -u ${APP_NAME} -f"
echo ""
echo "Optional: Use PM2 instead of systemd:"
echo "  pm2 start src/server.js --name ${APP_NAME}"
echo "  pm2 save"
echo "  pm2 startup"
