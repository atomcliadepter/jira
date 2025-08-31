# OAuth 2.0 (3LO) Authentication Setup

This guide explains how to set up OAuth 2.0 authentication for the Enhanced MCP Jira REST Server, addressing the critical authentication gap identified in the gap analysis.

## Overview

The server now supports both API Token and OAuth 2.0 (3LO) authentication methods:
- **API Token**: Legacy method, suitable for development
- **OAuth 2.0 (3LO)**: Recommended for production, supports multi-site access

## Prerequisites

1. Atlassian Developer Account
2. Jira Cloud instance
3. Node.js 18+ environment

## Step 1: Create Atlassian OAuth App

### 1.1 Access Developer Console
1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console)
2. Click "Create" → "OAuth 2.0 (3LO) app"

### 1.2 Configure App Settings
```
App Name: MCP Jira Server
App Description: Enhanced MCP server for Jira integration
App URL: https://your-domain.com (or http://localhost:3000 for development)
```

### 1.3 Set Permissions (Scopes)
**Classic Scopes (Recommended for simplicity):**
```
- Jira platform REST API
- Confluence platform REST API (if using Confluence features)
```

**Granular Scopes (For fine-grained control):**
```
- read:jira-user
- read:jira-work  
- write:jira-work
- read:confluence-content.summary (if using Confluence)
- write:confluence-content (if using Confluence)
```

### 1.4 Configure Authorization
```
Callback URL: http://localhost:3000/callback
```

### 1.5 Get Credentials
After creating the app, note down:
- **Client ID**: `ari:cloud:ecosystem::app/xxx`
- **Client Secret**: `xxx-xxx-xxx`

## Step 2: Environment Configuration

### 2.1 Update .env File
```bash
# Jira Configuration (keep existing for fallback)
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token

# OAuth 2.0 Configuration (NEW)
OAUTH_CLIENT_ID=ari:cloud:ecosystem::app/your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback
OAUTH_SCOPES=read:jira-user,read:jira-work,write:jira-work

# Multi-site support (optional)
JIRA_SITE_ID=your-site-id

# Permission Configuration
PERMISSION_CONFIG_PATH=./config/permissions.json
```

### 2.2 Configure Permissions
Edit `config/permissions.json`:
```json
{
  "agents": {
    "q-cli-agent": {
      "allowedTools": [
        "issue.get",
        "issue.create", 
        "issue.update",
        "jql.search"
      ],
      "readOnly": false,
      "maxRequestsPerMinute": 100
    },
    "read-only-agent": {
      "allowedTools": ["issue.get", "jql.search"],
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

## Step 3: OAuth Flow Implementation

### 3.1 Authorization Flow
```typescript
import { EnhancedJiraRestClient } from './src/http/EnhancedJiraRestClient.js';

// Initialize client with OAuth
const jiraClient = new EnhancedJiraRestClient({
  baseUrl: process.env.JIRA_BASE_URL,
  oauthClientId: process.env.OAUTH_CLIENT_ID,
  oauthClientSecret: process.env.OAUTH_CLIENT_SECRET,
  oauthRedirectUri: process.env.OAUTH_REDIRECT_URI,
});

// Step 1: Get authorization URL
const authUrl = jiraClient.startOAuthFlow('your-state-parameter');
console.log('Visit this URL to authorize:', authUrl);

// Step 2: Exchange code for tokens (after user authorization)
const tokenSet = await jiraClient.completeOAuthFlow(authorizationCode);

// Step 3: Use the client (tokens are automatically managed)
const userInfo = await jiraClient.get('/rest/api/3/myself');
```

### 3.2 Token Management
```typescript
// Check if using OAuth
if (jiraClient.isUsingOAuth()) {
  console.log('Using OAuth authentication');
  
  // Get current access token
  const token = jiraClient.getAccessToken();
  
  // Tokens are automatically refreshed when needed
}
```

## Step 4: Multi-Site Support

### 4.1 Get Accessible Resources
```typescript
// After OAuth flow completion
const resources = await jiraClient.getAccessibleResources();
console.log('Available sites:', resources);

// Example output:
// [
//   {
//     id: "site-id-1",
//     name: "My Jira Site",
//     url: "https://mycompany.atlassian.net",
//     scopes: ["read:jira-user", "read:jira-work"]
//   }
// ]
```

### 4.2 Configure Site-Specific Access
```bash
# Set specific site ID in .env
JIRA_SITE_ID=site-id-1
```

## Step 5: Testing OAuth Implementation

### 5.1 Run Test Script
```bash
cd /path/to/mcp-jira-server
node test-oauth.js
```

Expected output:
```
🔐 Testing OAuth Implementation...

1. Testing OAuth Manager initialization...
✅ OAuth Manager initialized successfully
✅ Authorization URL generated

2. Testing Enhanced Jira Client with real credentials...
✅ Enhanced Jira Client initialized
✅ Successfully connected to Jira
   - User: Your Name
   - Email: your-email@example.com

3. Testing OAuth-enabled client configuration...
✅ OAuth-enabled client initialized
   - Using OAuth: true
✅ OAuth flow can be started

4. Testing Permission Manager...
✅ Permission Manager initialized
✅ Permission checks working

🎉 OAuth Implementation Test Complete!
```

### 5.2 Integration Tests
```bash
# Run OAuth integration tests
npm run test:integration

# Run permission tests  
npm run test:unit
```

## Step 6: Production Deployment

### 6.1 Security Considerations
- Use HTTPS for redirect URIs in production
- Store client secrets securely (environment variables, secrets manager)
- Implement proper token storage (encrypted, secure)
- Set up token refresh monitoring

### 6.2 Production Configuration
```bash
# Production .env
OAUTH_REDIRECT_URI=https://your-production-domain.com/oauth/callback
OAUTH_SCOPES=read:jira-user,read:jira-work,write:jira-work

# Enable security features
PERMISSION_CONFIG_PATH=./config/production-permissions.json
LOG_LEVEL=info
```

## Troubleshooting

### Common Issues

#### 1. Invalid Client Credentials
```
Error: OAuth code exchange failed: invalid_client
```
**Solution**: Verify `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` are correct.

#### 2. Redirect URI Mismatch
```
Error: redirect_uri_mismatch
```
**Solution**: Ensure `OAUTH_REDIRECT_URI` matches exactly what's configured in Atlassian Developer Console.

#### 3. Insufficient Scopes
```
Error: insufficient_scope
```
**Solution**: Add required scopes in Atlassian Developer Console and update `OAUTH_SCOPES`.

#### 4. Site Access Issues
```
Error: Site not found in accessible resources
```
**Solution**: Ensure the app is installed on the correct Atlassian site.

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm start
```

## Migration from API Token

### Gradual Migration
1. Keep existing API token configuration
2. Add OAuth configuration alongside
3. Test OAuth flow in development
4. Switch to OAuth in production
5. Remove API token configuration

### Fallback Strategy
The enhanced client automatically falls back to API token if OAuth is not configured:

```typescript
// This will use API token if OAuth not configured
const client = new EnhancedJiraRestClient({
  baseUrl: process.env.JIRA_BASE_URL,
  email: process.env.JIRA_EMAIL,
  apiToken: process.env.JIRA_API_TOKEN,
  // OAuth config optional
  oauthClientId: process.env.OAUTH_CLIENT_ID,
  oauthClientSecret: process.env.OAUTH_CLIENT_SECRET,
});
```

## Security Best Practices

1. **Token Storage**: Store tokens securely, never in plain text
2. **Scope Minimization**: Request only necessary scopes
3. **Token Rotation**: Implement proper token refresh
4. **Audit Logging**: Log all authentication events
5. **Rate Limiting**: Implement per-agent rate limits
6. **Input Validation**: Validate all OAuth parameters

## Support Resources

- [Atlassian OAuth 2.0 Guide](https://developer.atlassian.com/cloud/jira/software/oauth-2-3lo-apps/)
- [Jira REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)

## Gap Analysis Status

✅ **RESOLVED**: Authentication Architecture Gap
- OAuth 2.0 (3LO) implementation complete
- Multi-site support implemented  
- Token refresh mechanism working
- Fallback to API token maintained
- Production-ready security features

The critical authentication gap identified in the gap analysis has been successfully addressed with a comprehensive OAuth 2.0 implementation.
