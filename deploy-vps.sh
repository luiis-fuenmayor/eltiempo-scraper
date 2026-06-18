#!/bin/bash

# ============================================================
# ELTIEMPO EDICTOS SCRAPER - VPS DEPLOYMENT SCRIPT
# ============================================================

set -e

echo "════════════════════════════════════════════════════════════"
echo "  DEPLOYMENT: El Tiempo Edictos Scraper"
echo "════════════════════════════════════════════════════════════"

# Configuration
REPO_URL="${1:-https://github.com/user/eltiempo-scraper.git}"
DEPLOY_DIR="/opt/eltiempo-scraper"
NODE_VERSION="20"

echo ""
echo "📦 Step 1: Install Node.js 20+"
command -v node > /dev/null 2>&1 || {
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt-get install -y nodejs
}
echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"

echo ""
echo "📦 Step 2: Clone repository"
if [ ! -d "$DEPLOY_DIR" ]; then
  sudo mkdir -p "$DEPLOY_DIR"
  sudo chown $USER:$USER "$DEPLOY_DIR"
fi

if [ ! -d "$DEPLOY_DIR/.git" ]; then
  git clone "$REPO_URL" "$DEPLOY_DIR" || {
    echo "❌ Failed to clone repo from $REPO_URL"
    echo "Make sure:"
    echo "  1. Repo URL is correct"
    echo "  2. You have SSH key configured for GitHub"
    exit 1
  }
else
  cd "$DEPLOY_DIR"
  git pull origin main
fi

cd "$DEPLOY_DIR"
echo "✅ Repository cloned/updated at $DEPLOY_DIR"

echo ""
echo "📦 Step 3: Install dependencies"
npm install
echo "✅ Dependencies installed"

echo ""
echo "📦 Step 4: Build TypeScript"
npm run build
echo "✅ Build complete"

echo ""
echo "📦 Step 5: Configure environment"
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  echo "Creating .env file..."
  cat > "$DEPLOY_DIR/.env" << EOF
# Supabase configuration
SUPABASE_URL=${SUPABASE_URL:-https://YOUR_PROJECT.supabase.co}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-YOUR_SERVICE_ROLE_KEY}

# Logging
LOG_LEVEL=info
EOF
  echo "⚠️  .env created with placeholder values"
  echo "   Edit $DEPLOY_DIR/.env and update:"
  echo "   - SUPABASE_URL"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
else
  echo "✅ .env file exists (using current config)"
fi

echo ""
echo "📦 Step 6: Install PM2 globally"
sudo npm install -g pm2 > /dev/null 2>&1
echo "✅ PM2 installed: $(pm2 --version)"

echo ""
echo "📦 Step 7: Stop existing PM2 processes"
pm2 stop edictos-cron 2>/dev/null || true
pm2 delete edictos-cron 2>/dev/null || true

echo ""
echo "📦 Step 8: Create logs directory"
mkdir -p "$DEPLOY_DIR/logs"
chmod 755 "$DEPLOY_DIR/logs"

echo ""
echo "📦 Step 9: Start with PM2"
cd "$DEPLOY_DIR"
pm2 start ecosystem.config.js
pm2 save
echo "✅ PM2 started"

echo ""
echo "📦 Step 10: Configure PM2 to restart on reboot"
pm2 startup systemd -u $USER --hp /home/$USER > /dev/null
echo "✅ PM2 startup configured"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ DEPLOYMENT COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Quick verification:"
echo ""
echo "  pm2 status"
echo "  pm2 logs edictos-cron"
echo ""
echo "Database check (after first run):"
echo ""
echo "  # Check Supabase table 'edictos'"
echo ""
echo "Manual backfill (optional):"
echo ""
echo "  cd $DEPLOY_DIR"
echo "  npm run backfill"
echo ""
