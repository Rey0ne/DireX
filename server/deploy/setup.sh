#!/bin/bash
# DireX Server — Oracle Cloud One-Click Setup
# Run as root or with sudo

set -e

APP_DIR="/opt/direx"
NODE_VERSION="22"

echo "=== DireX Server Setup ==="

# 1. Install Node.js 22
if ! command -v node &>/dev/null; then
  echo ">>> Installing Node.js $NODE_VERSION..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js: $(node -v)"

# 2. Install Caddy (HTTPS + auto Let's Encrypt)
if ! command -v caddy &>/dev/null; then
  echo ">>> Installing Caddy..."
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

# 3. Clone repo
if [ ! -d "$APP_DIR" ]; then
  echo ">>> Cloning DireX..."
  git clone --depth 1 --branch fix/infinite-canvas-refactor https://github.com/Rey0ne/DireX.git "$APP_DIR"
else
  echo ">>> Updating DireX..."
  cd "$APP_DIR" && git pull
fi

# 4. Install server dependencies + build
cd "$APP_DIR/server"
npm install
npm run build

# 5. Create .env if not exists
if [ ! -f .env ]; then
  echo ">>> Creating .env — EDIT THIS FILE with your API keys!"
  cp .env.example .env
fi

# 6. Ensure data directories
mkdir -p data/output data/models data/bvh data/projects data/backups

# 7. Install systemd service
cp deploy/direx-server.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable direx-server
systemctl restart direx-server

# 8. Setup Caddy
cp deploy/Caddyfile /etc/caddy/
systemctl enable caddy
systemctl restart caddy

# 9. Open firewall (if ufw is active)
if command -v ufw &>/dev/null && ufw status | grep -q active; then
  ufw allow 80/tcp
  ufw allow 443/tcp
fi

echo ""
echo "=== Setup Complete ==="
echo "Edit API keys:  nano $APP_DIR/server/.env"
echo "Check status:   systemctl status direx-server"
echo "View logs:      journalctl -u direx-server -f"
