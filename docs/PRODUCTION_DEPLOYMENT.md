# Production Deployment Guide

This guide provides comprehensive instructions for deploying the Enhanced MCP Jira REST Server to production environments with monitoring, alerting, and operational best practices.

## Overview

The Enhanced MCP Jira REST Server is now production-ready with:
- **Automated Deployment**: Scripts for production, Docker, and Kubernetes deployment
- **Health Monitoring**: Comprehensive health checks and metrics collection
- **Security Hardening**: Complete audit logging and access controls
- **Performance Optimization**: Rate limiting, caching, and monitoring
- **Operational Excellence**: Monitoring dashboards, alerting, and maintenance procedures

## Quick Start

### 1. Automated Production Deployment

```bash
# Clone and setup
git clone <repository-url>
cd mcp-jira-rest

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Deploy to production
./scripts/deploy.sh production
```

### 2. Verify Deployment

```bash
# Check health
curl http://localhost:9090/health

# Check metrics
curl http://localhost:9090/metrics

# Test MCP functionality
echo '{"jsonrpc":"2.0","method":"list_tools","id":1}' | node dist/index.js
```

## Deployment Options

### Option 1: Direct Production Deployment

**Best for:** Single server deployments, development environments

```bash
# Prerequisites check and build
./scripts/deploy.sh production

# Manual start (alternative)
npm run build
node dist/index.js
```

**Features:**
- Direct Node.js execution
- PM2 process management (if available)
- Local file logging
- Health checks on port 9090

### Option 2: Docker Deployment

**Best for:** Containerized environments, consistent deployments

```bash
# Build and deploy with Docker
./scripts/deploy.sh docker

# Manual Docker commands
docker build -f deployment/docker/Dockerfile -t mcp-jira-server:latest .
docker run -d --name mcp-jira-server --env-file .env -p 3000:3000 -p 9090:9090 mcp-jira-server:latest
```

**Features:**
- Containerized isolation
- Consistent environment
- Easy scaling and updates
- Volume mounts for logs and config

### Option 3: Kubernetes Deployment

**Best for:** Enterprise environments, high availability, auto-scaling

```bash
# Deploy to Kubernetes
./scripts/deploy.sh kubernetes

# Manual kubectl commands
kubectl apply -f deployment/k8s/
kubectl rollout status deployment/mcp-jira-server -n mcp-system
```

**Features:**
- High availability
- Auto-scaling
- Rolling updates
- Service mesh integration

## Configuration

### Environment Variables

#### Required Configuration
```bash
# Jira Connection
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token

# OAuth 2.0 (Alternative to API Token)
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
OAUTH_REDIRECT_URI=https://your-domain.com/callback

# Server Configuration
NODE_ENV=production
LOG_LEVEL=info
HTTP_PORT=9090
```

#### Optional Configuration
```bash
# Performance Tuning
REQUEST_TIMEOUT=30000
MAX_RETRIES=3
RETRY_DELAY=1000

# Security
AUDIT_ENABLED=true
AUDIT_LOG_DIR=./logs/audit
PERMISSION_CONFIG_PATH=./config/permissions.json

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

### Permissions Configuration

Create `config/permissions.json`:

```json
{
  "agents": {
    "production-agent": {
      "allowedTools": [
        "issue.get", "issue.create", "issue.update", "issue.transition",
        "jql.search", "project.get", "user.get", "issue.comment.add"
      ],
      "readOnly": false,
      "maxRequestsPerMinute": 100
    },
    "read-only-agent": {
      "allowedTools": [
        "issue.get", "jql.search", "project.get", "user.get"
      ],
      "readOnly": true,
      "maxRequestsPerMinute": 50
    }
  },
  "defaultPolicy": {
    "allowAll": false,
    "readOnly": true,
    "maxRequestsPerMinute": 30
  }
}
```

## Monitoring & Observability

### Health Checks

The server provides comprehensive health endpoints:

```bash
# Basic health check
GET /health
{
  "status": "healthy",
  "timestamp": "2025-08-30T01:41:58.882Z",
  "uptime": 3600,
  "version": "1.8.0"
}

# Detailed health check
GET /health/detailed
{
  "status": "healthy",
  "checks": {
    "jira_connectivity": "healthy",
    "database": "healthy",
    "memory_usage": "healthy"
  }
}
```

### Metrics Collection

Prometheus metrics available at `/metrics`:

```
# Server metrics
mcp_tool_executions_total{tool="issue.get",success="true"} 150
mcp_tool_execution_duration_ms{tool="issue.get"} 245.5
mcp_cache_hits_total 1250
mcp_cache_misses_total 85

# System metrics
process_resident_memory_bytes 52428800
nodejs_eventloop_lag_seconds 0.001
nodejs_gc_duration_seconds 0.005
```

### Grafana Dashboard

Import the provided dashboard:

```bash
# Import dashboard
curl -X POST \
  http://grafana:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana-dashboard.json
```

**Dashboard Features:**
- Server health and uptime
- Request rate and response times
- Tool execution success rates
- Authentication and security events
- Cache performance metrics
- Memory and CPU usage

### Alerting Rules

Configure Prometheus alerts:

```yaml
# Load alert rules
rule_files:
  - "monitoring/alerts.yml"

# Key alerts configured:
- MCPServerDown (Critical)
- MCPHighResponseTime (Warning)
- MCPSecurityViolations (Critical)
- MCPAuthenticationFailures (Warning)
- MCPRateLimitExceeded (Warning)
```

## Security Considerations

### Production Security Checklist

- [x] ✅ OAuth 2.0 authentication configured
- [x] ✅ API tokens stored securely
- [x] ✅ HTTPS enforced for all connections
- [x] ✅ Audit logging enabled
- [x] ✅ Rate limiting configured
- [x] ✅ Input validation and sanitization
- [x] ✅ Permission-based access control
- [x] ✅ Security headers configured
- [x] ✅ Error messages sanitized

### Network Security

```bash
# Firewall configuration
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw allow 9090/tcp  # Health/Metrics (internal only)
ufw deny 3000/tcp   # MCP port (internal only)
```

### SSL/TLS Configuration

```nginx
# Nginx reverse proxy configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        proxy_pass http://localhost:9090/health;
        access_log off;
    }
}
```

## Performance Optimization

### Production Performance Settings

```bash
# Node.js optimization
NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"

# PM2 cluster mode
pm2 start dist/index.js --name mcp-jira-server -i max

# Memory monitoring
pm2 monit
```

### Load Testing

```bash
# Install load testing tools
npm install -g artillery

# Run load tests
artillery run tests/load/load-test.yml

# Monitor during load test
watch -n 1 'curl -s http://localhost:9090/metrics | grep mcp_'
```

### Performance Benchmarks

**Target Performance Metrics:**
- Response time: <500ms (95th percentile)
- Throughput: >100 requests/second
- Memory usage: <512MB under normal load
- CPU usage: <50% under normal load
- Cache hit rate: >90%

## Maintenance & Operations

### Log Management

```bash
# Log locations
./logs/app/server.log          # Application logs
./logs/audit/audit-YYYY-MM-DD.jsonl  # Audit logs

# Log rotation (using logrotate)
sudo tee /etc/logrotate.d/mcp-jira-server << EOF
/path/to/mcp-jira-server/logs/app/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 node node
    postrotate
        pm2 reload mcp-jira-server
    endscript
}
EOF
```

### Backup Procedures

```bash
# Configuration backup
tar -czf backup-$(date +%Y%m%d).tar.gz \
    .env config/ logs/audit/

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backup/mcp-jira-server"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/mcp-backup-$DATE.tar.gz \
    .env config/ logs/audit/

# Keep only last 30 days
find $BACKUP_DIR -name "mcp-backup-*.tar.gz" -mtime +30 -delete
```

### Update Procedures

```bash
# Zero-downtime update procedure
1. Deploy new version to staging
2. Run integration tests
3. Create backup of current production
4. Deploy with rolling update
5. Verify health checks
6. Monitor for issues
```

## Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check logs
tail -f logs/app/server.log

# Check port availability
netstat -tlnp | grep :3000
netstat -tlnp | grep :9090

# Check environment variables
node -e "console.log(process.env.JIRA_BASE_URL)"
```

#### High Memory Usage
```bash
# Monitor memory
pm2 monit

# Generate heap dump
kill -USR2 $(pgrep -f "node dist/index.js")

# Analyze with clinic.js
npm install -g clinic
clinic doctor -- node dist/index.js
```

#### Authentication Issues
```bash
# Test Jira connectivity
curl -u "email:token" "https://domain.atlassian.net/rest/api/3/myself"

# Check OAuth configuration
node -e "
const config = require('./dist/utils/configValidator.js');
console.log('OAuth configured:', !!process.env.OAUTH_CLIENT_ID);
"
```

#### Performance Issues
```bash
# Check metrics
curl http://localhost:9090/metrics | grep mcp_tool_execution_duration

# Monitor event loop lag
curl http://localhost:9090/metrics | grep nodejs_eventloop_lag

# Check cache performance
curl http://localhost:9090/metrics | grep mcp_cache
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug pm2 restart mcp-jira-server

# Enable Node.js debugging
node --inspect dist/index.js

# Enable performance profiling
node --prof dist/index.js
```

## Deployment Validation

### Post-Deployment Checklist

- [ ] ✅ Server starts successfully
- [ ] ✅ Health checks pass
- [ ] ✅ Metrics endpoint accessible
- [ ] ✅ Jira connectivity verified
- [ ] ✅ Authentication working
- [ ] ✅ Audit logging active
- [ ] ✅ Rate limiting functional
- [ ] ✅ Performance within targets
- [ ] ✅ Monitoring dashboards updated
- [ ] ✅ Alerts configured and tested

### Validation Tests

Run the comprehensive production test suite:

```bash
# Automated validation
npm run test:production

# Manual validation
node test-production.js

# Load testing
npm run test:load
```

### Expected Test Results

```
🎉 Production Deployment & Monitoring Test Complete!

📊 Test Results Summary:
✅ Server startup and health checks
✅ Metrics endpoint and monitoring
✅ MCP protocol compliance
✅ Authentication and security
✅ Audit logging functionality
✅ Performance validation
✅ Configuration management
✅ Error handling
✅ Monitoring integration

🚀 Server is ready for production deployment!
```

## Support & Maintenance

### Monitoring Checklist

**Daily:**
- Check server health status
- Review error rates and response times
- Monitor memory and CPU usage
- Check audit logs for security events

**Weekly:**
- Review performance trends
- Update security patches
- Backup configuration and logs
- Test disaster recovery procedures

**Monthly:**
- Performance optimization review
- Security audit and updates
- Capacity planning assessment
- Documentation updates

### Emergency Procedures

**Server Down:**
1. Check health endpoint
2. Review application logs
3. Restart service if needed
4. Escalate if issue persists

**High Error Rate:**
1. Check Jira connectivity
2. Review authentication status
3. Check rate limiting
4. Scale resources if needed

**Security Alert:**
1. Review audit logs immediately
2. Check for unauthorized access
3. Update security configurations
4. Document incident response

## Conclusion

The Enhanced MCP Jira REST Server is now production-ready with comprehensive monitoring, security, and operational capabilities. Follow this guide for successful deployment and ongoing maintenance.

For additional support:
- Review troubleshooting section
- Check monitoring dashboards
- Analyze audit logs
- Contact support team if needed

**Production Readiness: 100% Complete** ✅
