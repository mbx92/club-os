# Deployment Guide - Ubuntu Server

## Quick Start

### 1. Transfer Files to Server

```bash
# Using rsync
rsync -avz --exclude node_modules --exclude .git ./ user@server:/var/www/gym-membership-backend/

# Or using scp
scp -r . user@server:/var/www/gym-membership-backend/
```

### 2. Install Dependencies on Server

```bash
ssh user@server

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Navigate to app directory
cd /var/www/gym-membership-backend

# Install dependencies
npm install --production
```

### 3. Setup Database

```bash
# Create PostgreSQL user and database
sudo -u postgres psql

CREATE USER gym_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE gym_production OWNER gym_user;
GRANT ALL PRIVILEGES ON DATABASE gym_production TO gym_user;
\q

# Run migrations
NODE_ENV=production npx sequelize-cli db:migrate
```

### 4. Configure Environment

```bash
# Create production environment file
cp .env.example .env.production
nano .env.production

# Update these values:
# NODE_ENV=production
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=gym_production
# DB_USER=gym_user
# DB_PASSWORD=your_secure_password
# JWT_SECRET=your_very_long_random_secret_key
# PORT=3000
```

### 5. Install Systemd Service

```bash
# Copy service file
sudo cp deploy/gym-api.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable gym-api

# Start service
sudo systemctl start gym-api

# Check status
sudo systemctl status gym-api
```

### 6. Setup Nginx (Optional but Recommended)

```bash
# Install Nginx
sudo apt-get install -y nginx

# Copy config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/gym-api

# Edit domain name
sudo nano /etc/nginx/sites-available/gym-api

# Enable site
sudo ln -s /etc/nginx/sites-available/gym-api /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 7. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
```

## Service Management

```bash
# Start service
sudo systemctl start gym-api

# Stop service
sudo systemctl stop gym-api

# Restart service
sudo systemctl restart gym-api

# View status
sudo systemctl status gym-api

# View logs
sudo journalctl -u gym-api -f

# View last 100 lines
sudo journalctl -u gym-api -n 100
```

## Alternative: PM2 (Process Manager)

If you prefer PM2 over systemd:

```bash
# Install PM2
sudo npm install -g pm2

# Start application
cd /var/www/gym-membership-backend
pm2 start src/server.js --name gym-api

# Configure startup
pm2 startup
pm2 save

# Useful commands
pm2 status
pm2 logs gym-api
pm2 restart gym-api
pm2 stop gym-api
```

## PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'gym-api',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    time: true
  }]
};
```

Then run:
```bash
pm2 start ecosystem.config.js --env production
```

## Monitoring

### Application Logs
```bash
# Systemd logs
sudo journalctl -u gym-api -f

# Application logs
tail -f /var/www/gym-membership-backend/logs/combined.log
tail -f /var/www/gym-membership-backend/logs/error.log
```

### Prometheus Metrics
Access metrics at: `http://your-server:3000/metrics`

### Health Check
```bash
curl http://localhost:3000/health
```

## Firewall Setup

```bash
# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw enable
```

## Backup Database

```bash
# Manual backup
pg_dump -U gym_user gym_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql -U gym_user gym_production < backup_file.sql
```

## Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u gym-api -n 50 --no-pager

# Check if port is in use
sudo lsof -i :3000

# Check permissions
ls -la /var/www/gym-membership-backend
```

### Database connection issues
```bash
# Test PostgreSQL connection
psql -h localhost -U gym_user -d gym_production

# Check PostgreSQL status
sudo systemctl status postgresql
```

### Permission denied errors
```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/gym-membership-backend

# Fix permissions
sudo chmod -R 755 /var/www/gym-membership-backend
sudo chmod 600 /var/www/gym-membership-backend/.env.production
```
