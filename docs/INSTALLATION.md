# Installation Guide

This guide provides comprehensive instructions for installing and setting up the Enhanced MCP Jira REST Server.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **TypeScript**: Version 5.0.0 or higher
- **Operating System**: Linux, macOS, or Windows

### Jira Requirements
- **Jira Cloud**: Active Jira Cloud instance
- **API Access**: API token or OAuth 2.0 credentials
- **Permissions**: Appropriate permissions for the operations you plan to perform

### Confluence Requirements (Optional)
- **Confluence Cloud**: Active Confluence Cloud instance (if using Confluence features)
- **API Access**: Same credentials as Jira (if on the same Atlassian site)

## Installation Methods

### Method 1: Clone from Repository (Recommended)

1. **Clone the repository:**
```bash
git clone <repository-url>
cd mcp-jira-rest
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the project:**
```bash
npm run build
```

### Method 2: NPM Package (When Available)

```bash
npm install -g mcp-jira-rest
```

## Configuration

### 1. Environment Setup

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

### 2. Required Configuration

Edit the `.env` file with your Jira configuration:

```bash
# Jira instance URL (required)
JIRA_BASE_URL=https://your-domain.atlassian.net

# Authentication Method 1: API Token (recommended)
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token

# Authentication Method 2: OAuth 2.0 (alternative)
# JIRA_OAUTH_ACCESS_TOKEN=your-oauth-access-token

# Confluence Configuration (optional)
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your-confluence-api-token
```

### 3. Optional Configuration

Add these optional settings to your `.env` file:

```bash
# Performance Settings
REQUEST_TIMEOUT=30000
MAX_RETRIES=3
RETRY_DELAY=1000
RATE_LIMIT_REQUESTS_PER_SECOND=10

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_PATH=./logs/mcp-jira.log

# MCP Server Settings
MCP_SERVER_NAME=jira-rest
MCP_SERVER_VERSION=1.0.0
MCP_SERVER_PORT=3000

# Cache Settings
CACHE_TTL_SECONDS=300
CACHE_MAX_SIZE=1000

# Health Check Settings
HEALTH_CHECK_INTERVAL=60000
HEALTH_CHECK_TIMEOUT=5000

# HTTP Server Settings (for health and metrics endpoints)
HTTP_PORT=9090

# Analytics Settings
ANALYTICS_BATCH_SIZE=100
ANALYTICS_MAX_HISTORY_DAYS=365

# Automation Settings
AUTOMATION_MAX_RULES=100
AUTOMATION_EXECUTION_TIMEOUT=30000

# Webhook Settings
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_PORT=3001

# Notification Settings
NOTIFICATION_EMAIL_ENABLED=false
NOTIFICATION_SLACK_ENABLED=false
NOTIFICATION_WEBHOOK_ENABLED=false
```

## Authentication Setup

### Method 1: API Token (Recommended)

1. **Generate API Token:**
   - Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Click "Create API token"
   - Enter a label (e.g., "MCP Jira Server")
   - Copy the generated token

2. **Configure Environment:**
```bash
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-generated-token
```

### Method 2: OAuth 2.0

1. **Create OAuth App:**
   - Go to [Atlassian Developer Console](https://developer.atlassian.com/console)
   - Create a new app
   - Configure OAuth 2.0 settings
   - Add required scopes:
     - `read:jira-user`
     - `read:jira-work`
     - `write:jira-work`
     - `read:confluence-content.summary` (if using Confluence)
     - `write:confluence-content` (if using Confluence)

2. **Configure Environment:**
```bash
JIRA_OAUTH_ACCESS_TOKEN=your-oauth-access-token
```

## Verification

### 1. Configuration Validation

Validate your configuration:

```bash
npm run validate-config
```

### 2. Connection Test

Test your Jira connection:

```bash
npm run test:connection
```

### 3. Health Check

Check system health:

```bash
npm run health
```

### 4. Run Tests

Execute the test suite:

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
# Build and start
npm run build
npm start

# Or use the combined command
npm run start:dev
```

### Using PM2 (Production Deployment)

1. **Install PM2:**
```bash
npm install -g pm2
```

2. **Create PM2 configuration:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'mcp-jira-rest',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

3. **Start with PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## CLI Tools Installation

### Global Installation

Install CLI tools globally:

```bash
npm install -g .
```

### Verify CLI Installation

```bash
jira-workflow --version
jira-confluence --version
jira-automation --version
jira-customfield --version
```

## Docker Installation (Optional)

### Using Docker

1. **Create Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY .env ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

2. **Build and run:**
```bash
docker build -t mcp-jira-rest .
docker run -p 3000:3000 --env-file .env mcp-jira-rest
```

### Using Docker Compose

1. **Create docker-compose.yml:**
```yaml
version: '3.8'

services:
  mcp-jira-rest:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
      - ./reports:/app/reports
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9090/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

2. **Start services:**
```bash
docker-compose up -d
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

**Error:** `401 Unauthorized`

**Solutions:**
- Verify your API token is correct and not expired
- Check that your email matches the token owner
- Ensure your Jira instance URL is correct
- Test credentials with a simple curl request:

```bash
curl -u your-email@example.com:your-api-token \
  https://your-domain.atlassian.net/rest/api/3/myself
```

#### 2. Permission Errors

**Error:** `403 Forbidden`

**Solutions:**
- Verify you have appropriate Jira permissions
- Check project-level permissions for project operations
- Ensure user has "Browse Projects" permission
- Contact your Jira administrator for permission review

#### 3. Network Issues

**Error:** `ECONNREFUSED` or timeout errors

**Solutions:**
- Check firewall settings for outbound HTTPS (port 443)
- Verify DNS resolution for your Jira instance
- Test network connectivity:

```bash
ping your-domain.atlassian.net
curl -I https://your-domain.atlassian.net
```

- Configure proxy settings if needed:

```bash
# In .env file
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
```

#### 4. Tool Execution Errors

**Error:** Tool validation or execution failures

**Solutions:**
- Validate input arguments match the schema
- Check Jira field configurations for custom fields
- Verify issue types and workflows exist in your instance
- Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

#### 5. Performance Issues

**Symptoms:** Slow response times or timeouts

**Solutions:**
- Increase timeout values in configuration
- Enable caching for frequently accessed data
- Optimize JQL queries for better performance
- Monitor Jira instance performance
- Consider rate limiting adjustments

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
LOG_LEVEL=debug npm run dev
```

This will show:
- HTTP request/response details
- Authentication information
- Error stack traces
- Performance metrics
- Cache hit/miss statistics

### Log Analysis

Check log files for detailed information:

```bash
# View recent logs
tail -f logs/mcp-jira.log

# Search for errors
grep -i error logs/mcp-jira.log

# Analyze performance
grep -i "response_time" logs/mcp-jira.log
```

## Performance Optimization

### 1. Caching Configuration

Enable and configure caching:

```bash
# In .env file
CACHE_TTL_SECONDS=300
CACHE_MAX_SIZE=1000
CACHE_ENABLED=true
```

### 2. Connection Pooling

Configure HTTP client for better performance:

```bash
# In .env file
HTTP_KEEP_ALIVE=true
HTTP_MAX_SOCKETS=50
HTTP_TIMEOUT=30000
```

### 3. Rate Limiting

Optimize rate limiting for your Jira instance:

```bash
# In .env file
RATE_LIMIT_REQUESTS_PER_SECOND=10
RATE_LIMIT_BURST_SIZE=20
```

### 4. Memory Management

Configure memory settings for large operations:

```bash
# Node.js memory settings
NODE_OPTIONS="--max-old-space-size=4096"
```

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files to version control
- Use secure methods to distribute environment variables in production
- Rotate API tokens regularly
- Use least-privilege principle for permissions

### 2. Network Security

- Use HTTPS for all communications
- Configure firewalls to restrict access
- Consider VPN or private networks for sensitive environments
- Enable webhook signature validation

### 3. Monitoring

- Set up log monitoring and alerting
- Monitor for unusual API usage patterns
- Track authentication failures
- Set up health check monitoring

## Maintenance

### Regular Tasks

1. **Update Dependencies:**
```bash
npm audit
npm update
```

2. **Rotate Credentials:**
- Generate new API tokens periodically
- Update environment variables
- Test connectivity after rotation

3. **Monitor Performance:**
- Review log files regularly
- Monitor response times
- Check error rates
- Analyze usage patterns

4. **Backup Configuration:**
- Backup environment files
- Document custom configurations
- Maintain deployment procedures

### Monitoring Setup

Set up monitoring for production deployments:

```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## Support

### Getting Help

1. **Documentation:** Check the comprehensive documentation in the `docs/` directory
2. **API Reference:** Review `docs/API_REFERENCE.md` for detailed tool information
3. **Examples:** See `docs/USAGE_EXAMPLES.md` for practical examples
4. **Issues:** Report issues on the project repository
5. **Community:** Join community discussions and forums

### Reporting Issues

When reporting issues, include:

1. **Environment Information:**
   - Node.js version
   - Operating system
   - Jira Cloud instance details

2. **Configuration:**
   - Relevant environment variables (without sensitive data)
   - Tool configurations

3. **Error Details:**
   - Complete error messages
   - Stack traces
   - Request/response logs (if applicable)

4. **Reproduction Steps:**
   - Minimal steps to reproduce the issue
   - Expected vs actual behavior
   - Sample data or configurations

This comprehensive installation guide should help you get the Enhanced MCP Jira REST Server up and running successfully in any environment.
