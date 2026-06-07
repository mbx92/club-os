# Prometheus Monitoring Setup

This document provides instructions for setting up Prometheus monitoring for the Gym Membership API.

## What's Being Monitored

The Prometheus integration monitors the following metrics:

1. **User Authentication**
   - Total number of currently logged-in users (by tenant and role)
   - Login attempts (successful and failed)

2. **Server Activity**
   - HTTP request duration (by method, route, and status code)
   - Total HTTP requests (by method, route, and status code)
   - Number of active connections

3. **Database Performance**
   - Database query duration (by operation and table)
   - Total database queries (by operation and table)
   - Active database connections

4. **URL Access Patterns**
   - Access count for each URL (by method)
   - Top 5 most accessed URLs

## Prerequisites

- Node.js installed
- Prometheus server installed (see [Prometheus Installation](#prometheus-installation))

## Installation

### 1. Install Dependencies

The `prom-client` package has been added to `package.json`. Install it with:

```bash
npm install
```

### 2. Prometheus Installation

#### Download Prometheus

```bash
# For Linux
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0.linux-amd64

# For Windows
# Download from: https://prometheus.io/download/
# Choose the Windows version and extract it
```

#### For Docker Users

```bash
docker run -p 9090:9090 -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus
```

## Configuration

The `prometheus.yml` file has been created in the root directory with the following configuration:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'gym-membership-api'
    static_configs:
      - targets: ['localhost:3000']
        labels:
          environment: 'development'
```

### Configuration for Production

For production, update the `prometheus.yml` file:

```yaml
scrape_configs:
  - job_name: 'gym-membership-api'
    static_configs:
      - targets: ['your-production-host:port']
        labels:
          environment: 'production'
```

## Running the Application

1. Start the Gym Membership API:

```bash
npm start
```

2. Start Prometheus server:

```bash
# Linux
./prometheus --config.file=prometheus.yml

# Windows
prometheus.exe --config.file=prometheus.yml
```

3. Access Prometheus UI at: `http://localhost:9090`

## Accessing Metrics

### Application Metrics

The application exposes metrics at: `http://localhost:3000/metrics`

### Prometheus UI

Access the Prometheus web interface at: `http://localhost:9090`

#### Example Queries

1. **Total HTTP Requests:**
   ```
   sum(rate(app_http_requests_total[5m])) by (method, route, status_code)
   ```

2. **HTTP Request Duration (95th percentile):**
   ```
   histogram_quantile(0.95, sum(rate(app_http_request_duration_ms_bucket[5m])) by (le, method, route, status_code))
   ```

3. **Logged-in Users by Tenant:**
   ```
   app_logged_in_users_total
   ```

4. **Login Attempts:**
   ```
   sum(rate(app_login_attempts_total[5m])) by (status, tenant)
   ```

5. **Database Query Duration:**
   ```
   histogram_quantile(0.95, sum(rate(app_db_query_duration_ms_bucket[5m])) by (le, operation, table))
   ```

6. **Top URLs:**
   ```
   topk(5, sum(rate(app_url_access_total[5m])) by (url, method))
   ```

## Visualizing Metrics with Grafana (Optional)

For better visualization, you can use Grafana:

1. Install Grafana: https://grafana.com/docs/grafana/installation/

2. Add Prometheus as a data source in Grafana

3. Import or create dashboards for your metrics

## Troubleshooting

### Metrics Not Appearing

1. Check if the application is running: `http://localhost:3000/health`

2. Check if metrics are accessible: `http://localhost:3000/metrics`

3. Check Prometheus target status in the UI: `http://localhost:9090/targets`

### High Memory Usage

If you experience high memory usage, consider:

1. Adjusting the `scrape_interval` in `prometheus.yml`
2. Reducing the number of metrics collected
3. Setting up metric retention policies in Prometheus

## Security Considerations

1. **Protect the `/metrics` endpoint** in production by:
   - Using authentication middleware
   - Restricting access to specific IP addresses
   - Using a reverse proxy with access controls

2. **Secure Prometheus server** by:
   - Using firewall rules
   - Setting up authentication for Prometheus UI
   - Not exposing Prometheus to the public internet

## Advanced Configuration

For more advanced Prometheus configuration, refer to the official documentation:
https://prometheus.io/docs/prometheus/latest/configuration/configuration/