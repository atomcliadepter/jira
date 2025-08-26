
# Q CLI Troubleshooting Guide

This guide helps resolve common issues when using the MCP Jira REST server with Amazon Q Developer CLI.

## Quick Diagnostics

### 1. Check Server Status

First, verify the server is loaded correctly:

```bash
q chat
```

Look for the success message:
```
✓ mcp-jira-rest loaded
```

### 2. Health Check

Ask Q CLI to check the server health:
```
Check the health status of the Jira MCP server
```

### 3. List Available Tools

Verify tools are available:
```
What Jira tools are available?
```

## Common Issues and Solutions

### Server Not Loading

#### Symptoms
- Server doesn't appear in Q CLI startup
- Error messages during Q CLI initialization
- Tools not available

#### Causes and Solutions

**1. Configuration File Issues**

Check your `~/.aws/amazonq/mcp.json` file:

```json
{
  "mcpServers": {
    "mcp-jira-rest": {
      "command": "node",
      "args": ["/correct/path/to/mcp-jira-rest/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

Common mistakes:
- Incorrect path to `index.js`
- Missing required environment variables
- Invalid JSON syntax

**2. Missing Dependencies**

Ensure the server is built:
```bash
cd /path/to/mcp-jira-rest
npm install
npm run build
```

**3. Node.js Version**

Verify Node.js version:
```bash
node --version  # Should be 18.0.0 or higher
```

**4. File Permissions**

Check file permissions:
```bash
ls -la /path/to/mcp-jira-rest/dist/index.js
```

### Authentication Errors

#### Symptoms
- "Authentication failed" errors
- 401 Unauthorized responses
- Tools fail with auth errors

#### Solutions

**1. Verify Credentials**

Test credentials manually:
```bash
curl -u "your-email@example.com:your-api-token" \
  "https://your-domain.atlassian.net/rest/api/3/myself"
```

**2. Check API Token**

- Ensure API token is not expired
- Verify it's copied correctly (no extra spaces)
- Generate a new token if needed

**3. Email Address**

- Use the exact email address associated with your Jira account
- Check for typos

**4. OAuth Configuration**

If using OAuth:
```json
{
  "env": {
    "JIRA_BASE_URL": "https://your-domain.atlassian.net",
    "JIRA_OAUTH_ACCESS_TOKEN": "your-oauth-token"
  }
}
```

### Connection Issues

#### Symptoms
- "Failed to connect to Jira instance" errors
- Timeout errors
- Network-related failures

#### Solutions

**1. Verify Jira URL**

Test the URL in a browser:
```
https://your-domain.atlassian.net
```

**2. Network Connectivity**

Test with curl:
```bash
curl -I "https://your-domain.atlassian.net"
```

**3. Firewall/Proxy Issues**

If behind a corporate firewall:
- Configure proxy settings
- Check allowed domains
- Contact IT support

**4. Increase Timeout**

Add timeout configuration:
```json
{
  "env": {
    "REQUEST_TIMEOUT": "60000",
    "MAX_RETRIES": "5",
    "RETRY_DELAY": "2000"
  }
}
```

### Tool Execution Failures

#### Symptoms
- Tools start but fail during execution
- Permission errors
- Invalid parameter errors

#### Solutions

**1. Check Jira Permissions**

Verify your Jira user has:
- Browse project permission
- Create/edit issue permission
- Add comment permission
- Appropriate project access

**2. Validate Parameters**

Common parameter issues:
- Invalid project keys
- Non-existent issue types
- Invalid user account IDs
- Malformed JQL queries

**3. Project Configuration**

Ensure projects are configured correctly:
- Issue types are available
- Required fields are configured
- Workflows allow transitions

### Performance Issues

#### Symptoms
- Slow tool responses
- Timeouts
- High memory usage

#### Solutions

**1. Optimize Queries**

- Use specific field selections
- Limit result sets
- Avoid complex JQL queries

**2. Increase Resources**

```json
{
  "env": {
    "REQUEST_TIMEOUT": "60000",
    "NODE_OPTIONS": "--max-old-space-size=2048"
  }
}
```

**3. Monitor Health**

Regular health checks:
```
Show me the current health status of the Jira server
```

### Logging and Debugging

#### Enable Debug Logging

```json
{
  "env": {
    "MCP_LOG_LEVEL": "debug",
    "Q_LOG_LEVEL": "debug"
  }
}
```

#### Log File Output

```json
{
  "env": {
    "MCP_LOG_FILE": "/tmp/mcp-jira-debug.log"
  }
}
```

#### View Logs

Q CLI logs are typically in:
- macOS: `~/Library/Logs/Amazon Q Developer CLI/`
- Linux: `~/.local/share/Amazon Q Developer CLI/logs/`
- Windows: `%APPDATA%\Amazon Q Developer CLI\logs\`

### Configuration Validation Errors

#### Symptoms
- "Configuration validation failed" errors
- Server fails to start
- Invalid configuration messages

#### Solutions

**1. Required Fields**

Ensure all required fields are present:
```json
{
  "env": {
    "JIRA_BASE_URL": "https://your-domain.atlassian.net"
  }
}
```

**2. URL Format**

Verify URL format:
- Must include protocol (https://)
- No trailing slashes
- Correct domain

**3. Numeric Values**

Ensure numeric values are strings:
```json
{
  "env": {
    "REQUEST_TIMEOUT": "30000",
    "MAX_RETRIES": "3"
  }
}
```

**4. Authentication Method**

Choose one authentication method:

Basic Auth:
```json
{
  "env": {
    "JIRA_EMAIL": "user@example.com",
    "JIRA_API_TOKEN": "token"
  }
}
```

OAuth:
```json
{
  "env": {
    "JIRA_OAUTH_ACCESS_TOKEN": "oauth-token"
  }
}
```

## Advanced Troubleshooting

### Memory Issues

#### Monitor Memory Usage

```
Check the memory usage of the Jira server
```

#### Increase Memory Limit

```json
{
  "env": {
    "NODE_OPTIONS": "--max-old-space-size=4096"
  }
}
```

### Rate Limiting

#### Symptoms
- "Rate limit exceeded" errors
- 429 HTTP responses
- Intermittent failures

#### Solutions

**1. Implement Delays**

```json
{
  "env": {
    "RETRY_DELAY": "5000",
    "MAX_RETRIES": "3"
  }
}
```

**2. Reduce Request Frequency**

- Batch operations when possible
- Cache results
- Use more specific queries

### SSL/TLS Issues

#### Symptoms
- Certificate errors
- SSL handshake failures
- HTTPS connection issues

#### Solutions

**1. Certificate Verification**

For development only:
```json
{
  "env": {
    "NODE_TLS_REJECT_UNAUTHORIZED": "0"
  }
}
```

**2. Custom CA Certificates**

```json
{
  "env": {
    "NODE_EXTRA_CA_CERTS": "/path/to/ca-certificates.pem"
  }
}
```

## Diagnostic Commands

### Test Configuration

```bash
# Test server startup
node /path/to/mcp-jira-rest/dist/index.js

# Test with debug logging
MCP_LOG_LEVEL=debug node /path/to/mcp-jira-rest/dist/index.js
```

### Test Jira Connectivity

```bash
# Test basic connectivity
curl -u "email:token" "https://domain.atlassian.net/rest/api/3/myself"

# Test specific endpoints
curl -u "email:token" "https://domain.atlassian.net/rest/api/3/project"
```

### Validate JSON Configuration

```bash
# Check JSON syntax
cat ~/.aws/amazonq/mcp.json | jq .

# Validate specific server config
cat ~/.aws/amazonq/mcp.json | jq '.mcpServers["mcp-jira-rest"]'
```

## Getting Help

### Information to Collect

When seeking help, provide:

1. **Environment Information**
   - Operating system
   - Node.js version
   - Q CLI version
   - MCP Jira server version

2. **Configuration**
   - Sanitized mcp.json (remove credentials)
   - Environment variables (remove sensitive data)

3. **Error Messages**
   - Complete error messages
   - Stack traces
   - Log entries

4. **Steps to Reproduce**
   - Exact commands used
   - Expected vs actual behavior
   - Timing of issues

### Log Collection

```bash
# Enable debug logging
export MCP_LOG_LEVEL=debug
export Q_LOG_LEVEL=debug

# Run problematic command
q chat

# Collect logs
tar -czf debug-logs.tar.gz ~/.local/share/Amazon\ Q\ Developer\ CLI/logs/
```

### Health Report

Generate a comprehensive health report:

```
Generate a detailed health report for the Jira MCP server including all checks and configuration status
```

## Prevention

### Regular Maintenance

1. **Monitor Health**
   - Regular health checks
   - Monitor log files
   - Check memory usage

2. **Update Dependencies**
   - Keep Node.js updated
   - Update MCP server regularly
   - Monitor security advisories

3. **Backup Configuration**
   - Save working configurations
   - Document custom settings
   - Version control configurations

4. **Test Changes**
   - Test configuration changes
   - Validate in development first
   - Have rollback plans

### Best Practices

1. **Security**
   - Rotate API tokens regularly
   - Use least privilege access
   - Monitor API usage

2. **Performance**
   - Use specific queries
   - Limit result sets
   - Monitor resource usage

3. **Reliability**
   - Implement proper error handling
   - Use health checks
   - Plan for failures

This troubleshooting guide should help resolve most common issues. For additional support, refer to the main documentation or contact support with the diagnostic information collected using this guide.
