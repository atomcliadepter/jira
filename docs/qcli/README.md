
# Q CLI Compatibility Guide

This document provides comprehensive information about using the MCP Jira REST server with Amazon Q Developer CLI.

## Overview

The MCP Jira REST server is fully compatible with Amazon Q Developer CLI (Q CLI) and provides enhanced capabilities for Jira integration. This server implements the Model Context Protocol (MCP) specification with Q CLI-specific optimizations.

## Features

### Q CLI Compatibility Features

- **Full MCP Protocol Support**: Implements MCP 2024-11-05 specification
- **Structured Error Handling**: Q CLI-compatible error codes and messages
- **Enhanced Logging**: Structured JSON logging with request tracing
- **Health Monitoring**: Built-in health checks and status reporting
- **Configuration Validation**: Comprehensive configuration validation with clear error messages
- **Graceful Shutdown**: Proper cleanup and shutdown handling
- **Request Tracing**: Unique request IDs for debugging and monitoring

### Jira Integration Capabilities

- **Issue Management**: Create, read, update, delete Jira issues
- **Project Operations**: Access project information and search projects
- **User Management**: User lookup and search functionality
- **JQL Search**: Advanced Jira Query Language support
- **Comment System**: Add and retrieve issue comments
- **Workflow Operations**: Issue transitions and status management

## Installation and Setup

### Prerequisites

- Node.js 18.0.0 or higher
- Access to a Jira instance (Cloud or Server)
- Jira API credentials (API token or OAuth)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mcp-jira-rest
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

### Configuration

#### Environment Variables

Create a `.env` file with the following required variables:

```env
# Required
JIRA_BASE_URL=https://your-domain.atlassian.net

# Authentication (choose one method)
# Method 1: Basic Authentication
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token

# Method 2: OAuth
JIRA_OAUTH_ACCESS_TOKEN=your-oauth-token

# Optional Configuration
REQUEST_TIMEOUT=30000
MAX_RETRIES=3
RETRY_DELAY=1000
MCP_SERVER_NAME=mcp-jira-rest
MCP_SERVER_VERSION=1.0.0
MCP_LOG_LEVEL=info
```

#### Q CLI Configuration

Add the server to your Q CLI configuration file (`~/.aws/amazonq/mcp.json`):

```json
{
  "mcpServers": {
    "mcp-jira-rest": {
      "command": "node",
      "args": ["/path/to/mcp-jira-rest/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token",
        "MCP_LOG_LEVEL": "info"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Usage with Q CLI

### Starting Q CLI

Once configured, start Q CLI and the MCP Jira server will be automatically loaded:

```bash
q chat
```

You should see a message indicating the server has loaded successfully:
```
✓ mcp-jira-rest loaded
```

### Available Tools

The server provides the following tools for Q CLI:

#### Issue Management
- `issue.create` - Create new Jira issues
- `issue.get` - Retrieve issue details
- `issue.update` - Update existing issues
- `issue.delete` - Delete issues
- `issue.transition` - Change issue status
- `issue.transitions.list` - Get available transitions

#### Search and Query
- `jql.search` - Search issues using JQL

#### Comments
- `issue.comment.add` - Add comments to issues
- `issue.comments.get` - Retrieve issue comments

#### Project Management
- `project.get` - Get project information
- `project.search` - Search projects

#### User Management
- `user.get` - Get user information
- `user.search` - Search users

### Example Q CLI Interactions

#### Creating an Issue
```
Create a new bug issue in project DEMO with summary "Login page not loading" and assign it to john.doe@example.com
```

#### Searching Issues
```
Find all high priority issues in project DEMO that are currently in progress
```

#### Getting Project Information
```
Show me details about the DEMO project including its components and versions
```

#### Updating Issue Status
```
Move issue DEMO-123 to "In Review" status
```

## Health Monitoring

### Health Check Endpoint

The server provides health monitoring through MCP resources:

- **URI**: `health://status`
- **Description**: Current health status of the server
- **Format**: JSON

### Health Status Response

```json
{
  "status": "healthy",
  "timestamp": "2025-08-15T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600000,
  "checks": {
    "jira_connection": {
      "status": "pass",
      "message": "Successfully connected to Jira API",
      "duration": 150
    },
    "configuration": {
      "status": "pass",
      "message": "Configuration is valid"
    },
    "memory": {
      "status": "pass",
      "message": "Memory usage: 45MB / 128MB (35%)",
      "details": {
        "heapUsed": 45,
        "heapTotal": 128,
        "heapUsagePercent": 35
      }
    }
  },
  "metadata": {
    "nodeVersion": "v18.17.0",
    "mcpVersion": "2024-11-05",
    "buildDate": "2025-08-15"
  }
}
```

### Accessing Health Status in Q CLI

```
Show me the health status of the Jira MCP server
```

## Error Handling

### Structured Error Codes

The server provides structured error codes for better debugging:

| Category | Code | Description |
|----------|------|-------------|
| Authentication | JIRA_AUTH_001 | Authentication failed |
| Connection | JIRA_CONN_001 | Connection failed |
| Validation | JIRA_VAL_001 | Request validation failed |
| Not Found | JIRA_404_001 | Resource not found |
| Permission | JIRA_PERM_001 | Insufficient permissions |
| Rate Limit | JIRA_RATE_001 | Rate limit exceeded |
| Execution | TOOL_EXEC_001 | Tool execution failed |
| Configuration | CONFIG_VAL_001 | Configuration validation failed |

### Error Response Format

```json
{
  "code": "JIRA_AUTH_001",
  "message": "Authentication failed with Jira API",
  "category": "authentication",
  "details": {
    "status": 401,
    "data": {...}
  },
  "timestamp": "2025-08-15T10:30:00.000Z",
  "requestId": "req_1692097800000_abc123def"
}
```

## Logging

### Log Levels

- `trace` - Detailed execution traces
- `debug` - Debug information
- `info` - General information (default)
- `warn` - Warning messages
- `error` - Error messages
- `fatal` - Fatal errors

### Log Configuration

Set the log level using environment variables:

```env
MCP_LOG_LEVEL=debug
Q_LOG_LEVEL=debug  # Alternative Q CLI format
```

### Log Format

All logs are output as structured JSON to stderr:

```json
{
  "timestamp": "2025-08-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Tool execution completed",
  "context": "MCP-Jira-Server",
  "requestId": "req_1692097800000_abc123def",
  "data": {
    "tool": "issue.create",
    "duration": 250,
    "success": true
  }
}
```

## Troubleshooting

### Common Issues

#### Server Not Loading
- Check that all required environment variables are set
- Verify Jira credentials are correct
- Check the Q CLI logs for error messages

#### Authentication Errors
- Verify JIRA_BASE_URL is correct
- Check API token is valid and not expired
- Ensure email address matches the API token

#### Connection Issues
- Test Jira connectivity outside of Q CLI
- Check firewall and network settings
- Verify Jira instance is accessible

#### Tool Execution Failures
- Check tool parameters are correct
- Verify user has necessary Jira permissions
- Review error messages for specific issues

### Debug Mode

Enable debug logging for detailed troubleshooting:

```env
MCP_LOG_LEVEL=debug
```

### Health Check

Use the health check to diagnose issues:

```
Check the health status of the Jira server
```

## Advanced Configuration

### Custom Timeouts

```env
REQUEST_TIMEOUT=60000  # 60 seconds
MAX_RETRIES=5
RETRY_DELAY=2000      # 2 seconds
```

### Auto-Approval

Configure tools for automatic approval in Q CLI:

```json
{
  "mcpServers": {
    "mcp-jira-rest": {
      "autoApprove": [
        "issue.get",
        "project.get",
        "user.get",
        "jql.search"
      ]
    }
  }
}
```

### Log File Output

Enable log file output:

```env
MCP_LOG_FILE=/path/to/logfile.json
```

## Security Considerations

### API Token Security
- Store API tokens securely
- Use environment variables, not hardcoded values
- Rotate tokens regularly
- Use OAuth when possible

### Permission Management
- Grant minimal required permissions
- Review Jira user permissions regularly
- Monitor API usage

### Network Security
- Use HTTPS for Jira connections
- Consider IP restrictions
- Monitor for unusual activity

## Performance Optimization

### Connection Pooling
The server automatically manages HTTP connections for optimal performance.

### Request Caching
Consider implementing caching for frequently accessed data.

### Rate Limiting
The server respects Jira rate limits and implements retry logic.

## Support and Contributing

### Getting Help
- Check the troubleshooting section
- Review server logs
- Test with health check endpoint

### Contributing
- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Follow semantic versioning

## Version Compatibility

| MCP Jira Server | Q CLI Version | MCP Protocol |
|----------------|---------------|--------------|
| 1.0.0          | Latest        | 2024-11-05   |

## License

MIT License - see LICENSE file for details.
