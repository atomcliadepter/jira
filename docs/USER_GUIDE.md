# Enhanced MCP Jira REST Server - Comprehensive User Guide

A complete guide to installing, configuring, and using the Enhanced MCP Jira REST Server with all 13 tools for seamless Jira integration.

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Quick Start](#quick-start)
5. [Tool Reference](#tool-reference)
6. [Real-World Usage Scenarios](#real-world-usage-scenarios)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [Performance Tips](#performance-tips)
10. [API Reference](#api-reference)

## Introduction

The Enhanced MCP Jira REST Server is a modern, TypeScript-based Model Context Protocol (MCP) server that provides direct integration with Jira Cloud using official REST API v3 endpoints. It offers 13 essential tools covering all core Jira operations without external library dependencies.

### Key Features

- **Direct REST API Integration**: Uses official Jira Cloud REST API v3 endpoints
- **13 Essential Tools**: Comprehensive coverage of issue, project, and user management
- **TypeScript & Zod Validation**: Full type safety with runtime validation
- **Modern MCP Patterns**: Built with latest MCP SDK patterns and best practices
- **Robust Error Handling**: Comprehensive error types and recovery strategies
- **Performance Optimized**: Request retry logic, timeout handling, and efficient pagination
- **ADF Support**: Automatic conversion between plain text and Atlassian Document Format

### Tool Categories

#### Issue Management (8 tools)
- `issue.create` - Create new issues with full field support
- `issue.get` - Retrieve issue details with customizable fields
- `issue.update` - Update existing issues
- `issue.delete` - Delete issues with subtask handling
- `issue.transition` - Transition issues through workflow states
- `issue.transitions.list` - Get available transitions for an issue
- `issue.comment.add` - Add comments to issues
- `issue.comments.get` - Retrieve issue comments

#### Search & JQL (1 tool)
- `jql.search` - Advanced JQL-based issue searching with pagination

#### Project Operations (2 tools)
- `project.get` - Get detailed project information
- `project.search` - Search and filter projects

#### User Management (2 tools)
- `user.get` - Get user details and permissions
- `user.search` - Search for users across the organization

## Installation

### Prerequisites

Before installing the Enhanced MCP Jira REST Server, ensure you have:

- **Node.js 18+** - Required for running the server
- **TypeScript 5+** - For development and compilation
- **Jira Cloud instance** - With API access enabled
- **Valid Jira credentials** - API token or OAuth 2.0 access

### Step-by-Step Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/your-org/mcp-jira-rest.git
cd mcp-jira-rest
```

#### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- `@modelcontextprotocol/sdk` - MCP SDK for server implementation
- `axios` - HTTP client for API requests
- `zod` - Runtime type validation
- `typescript` - TypeScript compiler
- Development dependencies for testing and building

#### 3. Build the Project

```bash
npm run build
```

This compiles TypeScript source files to JavaScript in the `dist/` directory.

#### 4. Verify Installation

```bash
npm test
```

Run the comprehensive test suite to ensure everything is working correctly.

## Configuration

### Environment Variables

Create a `.env` file in the project root with your Jira configuration:

#### Required Settings

```bash
# Jira instance URL (required)
JIRA_BASE_URL=https://your-domain.atlassian.net

# Authentication Method 1: API Token (recommended)
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token-here

# Authentication Method 2: OAuth 2.0 (alternative)
# JIRA_OAUTH_ACCESS_TOKEN=your-oauth-access-token
```

#### Optional Performance Settings

```bash
# HTTP request timeout in milliseconds (default: 30000)
REQUEST_TIMEOUT=30000

# Maximum number of retry attempts (default: 3)
MAX_RETRIES=3

# Delay between retries in milliseconds (default: 1000)
RETRY_DELAY=1000

# Logging level (default: info)
LOG_LEVEL=info

# MCP Server configuration
MCP_SERVER_NAME=jira-rest
MCP_SERVER_VERSION=1.0.0
```

### Authentication Setup

#### Method 1: API Token (Recommended)

API tokens provide secure, long-lived authentication for automated systems.

**Steps to create an API token:**

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Enter a label for your token (e.g., "MCP Jira Server")
4. Copy the generated token
5. Set `JIRA_EMAIL` and `JIRA_API_TOKEN` in your `.env` file

**Example configuration:**
```bash
JIRA_BASE_URL=https://mycompany.atlassian.net
JIRA_EMAIL=john.doe@mycompany.com
JIRA_API_TOKEN=ATATT3xFfGF0T4JNjdvOLKxyz123456789abcdef
```

#### Method 2: OAuth 2.0

OAuth 2.0 provides more granular permissions and is suitable for applications requiring user consent.

**Steps to set up OAuth 2.0:**

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console)
2. Create a new app or select an existing one
3. Configure OAuth 2.0 settings
4. Add required scopes:
   - `read:jira-user` - Read user information
   - `read:jira-work` - Read issues, projects, and other work items
   - `write:jira-work` - Create and update issues, comments, etc.
5. Complete the OAuth flow to get an access token
6. Set `JIRA_OAUTH_ACCESS_TOKEN` in your `.env` file

**Example configuration:**
```bash
JIRA_BASE_URL=https://mycompany.atlassian.net
JIRA_OAUTH_ACCESS_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Permissions Required

Ensure your Jira user account has the following permissions:

- **Browse Projects** - View project details and issues
- **Create Issues** - Create new issues
- **Edit Issues** - Update existing issues
- **Delete Issues** - Remove issues (if using delete functionality)
- **Add Comments** - Add comments to issues
- **Transition Issues** - Move issues through workflow states
- **Administer Projects** - For advanced project operations (optional)

## Quick Start

### Starting the Server

#### Development Mode
```bash
npm run dev
```

This starts the server with hot reloading for development.

#### Production Mode
```bash
npm start
```

This runs the compiled server from the `dist/` directory.

### Basic Usage Example

Once the server is running, you can interact with it using any MCP-compatible client. Here's a basic example of creating an issue:

```json
{
  "name": "issue.create",
  "arguments": {
    "fields": {
      "project": { "key": "PROJ" },
      "summary": "My first issue via MCP",
      "description": "This issue was created using the MCP Jira server",
      "issuetype": { "name": "Task" },
      "priority": { "name": "Medium" }
    }
  }
}
```

### Verifying Connection

Test your connection by searching for projects:

```json
{
  "name": "project.search",
  "arguments": {
    "maxResults": 5
  }
}
```

## Tool Reference

### Issue Management Tools

#### 1. issue.create

Creates a new Jira issue with comprehensive field support.

**Parameters:**
- `fields` (required): Issue field values
  - `project` (required): `{ "key": "PROJECT_KEY" }`
  - `summary` (required): Issue title/summary
  - `description` (optional): Issue description (ADF or plain text)
  - `issuetype` (required): `{ "name": "Task|Bug|Story|..." }`
  - `assignee` (optional): `{ "accountId": "user-account-id" }`
  - `priority` (optional): `{ "name": "High|Medium|Low|..." }`
  - `labels` (optional): Array of label strings
  - `components` (optional): Array of `{ "name": "component-name" }`
  - `fixVersions` (optional): Array of `{ "name": "version-name" }`
  - `parent` (optional): `{ "key": "PARENT-123" }` (for subtasks)
- `update` (optional): Update operations for advanced field manipulation

**Example:**
```json
{
  "name": "issue.create",
  "arguments": {
    "fields": {
      "project": { "key": "PROJ" },
      "summary": "Implement user authentication",
      "description": "Add OAuth 2.0 authentication to the application",
      "issuetype": { "name": "Story" },
      "assignee": { "accountId": "5b10a2844c20165700ede21g" },
      "priority": { "name": "High" },
      "labels": ["authentication", "security"],
      "components": [{ "name": "Backend" }]
    }
  }
}
```

#### 2. issue.get

Retrieves detailed information about a specific issue.

**Parameters:**
- `issueIdOrKey` (required): Issue ID or key (e.g., "PROJ-123" or "10001")
- `fields` (optional): Specific fields to retrieve
- `expand` (optional): Additional data to expand
- `properties` (optional): Issue properties to retrieve

**Example:**
```json
{
  "name": "issue.get",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "fields": ["summary", "status", "assignee", "description"],
    "expand": ["changelog", "renderedFields"]
  }
}
```

#### 3. issue.update

Updates an existing issue with new field values.

**Parameters:**
- `issueIdOrKey` (required): Issue ID or key
- `fields` (optional): Fields to update with new values
- `update` (optional): Update operations for complex field manipulation
- `historyMetadata` (optional): Additional metadata for the update
- `properties` (optional): Issue properties to set

**Example:**
```json
{
  "name": "issue.update",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "fields": {
      "summary": "Updated issue summary",
      "priority": { "name": "Critical" },
      "assignee": { "accountId": "5b10a2844c20165700ede21g" }
    }
  }
}
```

#### 4. issue.delete

Deletes an issue and optionally its subtasks.

**Parameters:**
- `issueIdOrKey` (required): Issue ID or key
- `deleteSubtasks` (optional): Whether to delete subtasks (default: false)

**Example:**
```json
{
  "name": "issue.delete",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "deleteSubtasks": true
  }
}
```

#### 5. issue.transition

Transitions an issue to a different status through the workflow.

**Parameters:**
- `issueIdOrKey` (required): Issue ID or key
- `transition` (required): `{ "id": "transition-id" }`
- `fields` (optional): Fields to update during transition
- `update` (optional): Update operations during transition
- `historyMetadata` (optional): Additional metadata
- `properties` (optional): Issue properties to set

**Example:**
```json
{
  "name": "issue.transition",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "transition": { "id": "31" },
    "fields": {
      "resolution": { "name": "Fixed" }
    }
  }
}
```

#### 6. issue.transitions.list

Gets available transitions for an issue.

**Parameters:**
- `issueIdOrKey` (required): Issue ID or key
- `expand` (optional): Additional data to expand

**Example:**
```json
{
  "name": "issue.transitions.list",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "expand": ["transitions.fields"]
  }
}
```

#### 7. issue.comment.add

Adds a comment to an issue.

**Parameters:**
- `issueIdOrKey` (required): Issue ID or key
- `body` (required): Comment body (ADF or plain text)
- `visibility` (optional): Comment visibility restrictions
- `properties` (optional): Comment properties

**Example:**
```json
{
  "name": "issue.comment.add",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "body": "This issue has been reviewed and approved for development.",
    "visibility": {
      "type": "role",
      "value": "Developers"
    }
  }
}
```

#### 8. issue.comments.get

Retrieves comments for an issue.

**Parameters:**
- `issueIdOrKey` (required): Issue ID or key
- `startAt` (optional): Starting index for pagination
- `maxResults` (optional): Maximum results to return
- `orderBy` (optional): Sort order for comments
- `expand` (optional): Additional data to expand

**Example:**
```json
{
  "name": "issue.comments.get",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "maxResults": 50,
    "orderBy": "created",
    "expand": ["renderedBody"]
  }
}
```

### Search Tool

#### 9. jql.search

Searches for issues using JQL (Jira Query Language).

**Parameters:**
- `jql` (required): JQL query string
- `startAt` (optional): Starting index for pagination
- `maxResults` (optional): Maximum results to return (max 100)
- `fields` (optional): Specific fields to retrieve
- `expand` (optional): Additional data to expand
- `properties` (optional): Issue properties to retrieve
- `fieldsByKeys` (optional): Return fields by keys instead of IDs

**Example:**
```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "project = PROJ AND status = 'In Progress' AND assignee = currentUser()",
    "maxResults": 25,
    "fields": ["summary", "status", "assignee", "priority"],
    "expand": ["changelog"]
  }
}
```

### Project Management Tools

#### 10. project.get

Retrieves detailed information about a specific project.

**Parameters:**
- `projectIdOrKey` (required): Project ID or key
- `expand` (optional): Additional data to expand
- `properties` (optional): Project properties to retrieve

**Example:**
```json
{
  "name": "project.get",
  "arguments": {
    "projectIdOrKey": "PROJ",
    "expand": ["description", "lead", "issueTypes", "versions"],
    "properties": ["*"]
  }
}
```

#### 11. project.search

Searches for projects with filtering and pagination.

**Parameters:**
- `startAt` (optional): Starting index for pagination
- `maxResults` (optional): Maximum results to return
- `orderBy` (optional): Sort order
- `query` (optional): Text query for project names/keys
- `typeKey` (optional): Project type filter
- `categoryId` (optional): Project category filter
- `action` (optional): Action-based filtering
- `expand` (optional): Additional data to expand

**Example:**
```json
{
  "name": "project.search",
  "arguments": {
    "query": "development",
    "typeKey": "software",
    "maxResults": 20,
    "orderBy": "name",
    "expand": ["description", "lead"]
  }
}
```

### User Management Tools

#### 12. user.get

Retrieves detailed information about a specific user.

**Parameters:**
- `accountId` (required): User account ID
- `expand` (optional): Additional data to expand

**Example:**
```json
{
  "name": "user.get",
  "arguments": {
    "accountId": "5b10a2844c20165700ede21g",
    "expand": ["groups", "applicationRoles"]
  }
}
```

#### 13. user.search

Searches for users across the organization.

**Parameters:**
- `query` (required): Search query (name, email, etc.)
- `startAt` (optional): Starting index for pagination
- `maxResults` (optional): Maximum results to return
- `property` (optional): Property to search by

**Example:**
```json
{
  "name": "user.search",
  "arguments": {
    "query": "john.doe",
    "maxResults": 10,
    "property": "displayName"
  }
}
```

## Real-World Usage Scenarios

### Scenario 1: Automated Issue Creation from Support Tickets

Create issues automatically when support tickets are received:

```json
{
  "name": "issue.create",
  "arguments": {
    "fields": {
      "project": { "key": "SUPPORT" },
      "summary": "Customer Issue: Login Problems",
      "description": "Customer reports unable to login after password reset. Ticket ID: #12345",
      "issuetype": { "name": "Bug" },
      "priority": { "name": "High" },
      "labels": ["customer-support", "login", "urgent"],
      "components": [{ "name": "Authentication" }]
    }
  }
}
```

### Scenario 2: Sprint Planning and Issue Assignment

Search for unassigned issues and assign them to team members:

```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "project = DEV AND status = 'To Do' AND assignee is EMPTY AND sprint is EMPTY",
    "maxResults": 50,
    "fields": ["summary", "priority", "components", "labels"]
  }
}
```

Then assign issues:

```json
{
  "name": "issue.update",
  "arguments": {
    "issueIdOrKey": "DEV-456",
    "fields": {
      "assignee": { "accountId": "5b10a2844c20165700ede21g" }
    }
  }
}
```

### Scenario 3: Release Management

Transition all issues in a release to "Done" status:

```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "fixVersion = '2.1.0' AND status != Done",
    "maxResults": 100,
    "fields": ["key", "status"]
  }
}
```

Then transition each issue:

```json
{
  "name": "issue.transition",
  "arguments": {
    "issueIdOrKey": "PROJ-789",
    "transition": { "id": "31" },
    "fields": {
      "resolution": { "name": "Fixed" }
    }
  }
}
```

### Scenario 4: Team Performance Reporting

Generate reports on team performance:

```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "assignee = 'john.doe@company.com' AND resolved >= -30d",
    "maxResults": 100,
    "fields": ["summary", "status", "resolution", "resolutiondate"],
    "expand": ["changelog"]
  }
}
```

### Scenario 5: Automated Code Review Workflow

Create issues for code review and add comments:

```json
{
  "name": "issue.create",
  "arguments": {
    "fields": {
      "project": { "key": "CODE" },
      "summary": "Code Review: Feature XYZ",
      "description": "Review pull request #123 for feature XYZ implementation",
      "issuetype": { "name": "Task" },
      "assignee": { "accountId": "reviewer-account-id" },
      "labels": ["code-review", "feature-xyz"]
    }
  }
}
```

Add review comments:

```json
{
  "name": "issue.comment.add",
  "arguments": {
    "issueIdOrKey": "CODE-101",
    "body": "Code review completed. Found 3 minor issues that need to be addressed before merge.",
    "visibility": {
      "type": "role",
      "value": "Developers"
    }
  }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Errors

**Error:** `401 Unauthorized`

**Causes and Solutions:**
- **Invalid API token**: Regenerate your API token in Atlassian Account Settings
- **Incorrect email**: Ensure `JIRA_EMAIL` matches the account that created the API token
- **Expired OAuth token**: Refresh your OAuth 2.0 access token
- **Wrong base URL**: Verify `JIRA_BASE_URL` points to your correct Jira instance

**Debugging steps:**
```bash
# Test authentication manually
curl -u "your-email@domain.com:your-api-token" \
  -H "Accept: application/json" \
  "https://your-domain.atlassian.net/rest/api/3/myself"
```

#### 2. Permission Errors

**Error:** `403 Forbidden`

**Causes and Solutions:**
- **Insufficient permissions**: Contact your Jira administrator to grant required permissions
- **Project access**: Ensure you have access to the specific project
- **Issue security**: Check if issues have security levels that restrict access

**Required permissions checklist:**
- Browse Projects
- Create Issues
- Edit Issues
- Add Comments
- Transition Issues

#### 3. Field Validation Errors

**Error:** `400 Bad Request - Field validation failed`

**Common causes:**
- **Required fields missing**: Check project configuration for required fields
- **Invalid field values**: Ensure field values match allowed options
- **Field type mismatch**: Verify data types match field requirements
- **Custom field issues**: Check custom field IDs and allowed values

**Debugging approach:**
```json
{
  "name": "project.get",
  "arguments": {
    "projectIdOrKey": "PROJ",
    "expand": ["issueTypes"]
  }
}
```

#### 4. Rate Limiting

**Error:** `429 Too Many Requests`

**Solutions:**
- Implement exponential backoff in your client
- Reduce request frequency
- Use pagination to avoid large requests
- Consider caching frequently accessed data

**Server configuration:**
```bash
# Increase retry delays
RETRY_DELAY=2000
MAX_RETRIES=5
```

#### 5. Network and Timeout Issues

**Error:** `ECONNRESET`, `ETIMEDOUT`

**Solutions:**
- Increase request timeout: `REQUEST_TIMEOUT=60000`
- Check network connectivity to Atlassian servers
- Verify firewall settings allow HTTPS traffic
- Consider using a proxy if required by your network

#### 6. JQL Query Errors

**Error:** `400 Bad Request - Invalid JQL`

**Common JQL mistakes:**
- Incorrect field names: Use `project` not `Project`
- Missing quotes: Use `status = "In Progress"` not `status = In Progress`
- Invalid operators: Use `=` for exact match, `~` for text search
- Date format issues: Use `created >= -7d` for relative dates

**JQL validation:**
```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "project = PROJ",
    "maxResults": 1
  }
}
```

### Debugging Tools

#### Enable Debug Logging

```bash
LOG_LEVEL=debug
```

This provides detailed request/response logging for troubleshooting.

#### Test Individual Tools

Use the comprehensive test suite to verify specific functionality:

```bash
# Test specific tool
npm test -- --grep "issue.create"

# Test all issue management tools
npm test -- --grep "issue"
```

#### Manual API Testing

Test Jira API endpoints directly:

```bash
# Get current user info
curl -u "email:token" \
  -H "Accept: application/json" \
  "https://domain.atlassian.net/rest/api/3/myself"

# Search for projects
curl -u "email:token" \
  -H "Accept: application/json" \
  "https://domain.atlassian.net/rest/api/3/project/search"
```

## Best Practices

### 1. Authentication Security

- **Use API tokens** instead of passwords for automated systems
- **Rotate tokens regularly** (every 90 days recommended)
- **Store credentials securely** using environment variables or secret management
- **Use least privilege principle** - only grant necessary permissions
- **Monitor token usage** through Atlassian's audit logs

### 2. Error Handling

- **Implement retry logic** for transient failures
- **Handle rate limiting** with exponential backoff
- **Validate input data** before making API calls
- **Log errors appropriately** without exposing sensitive information
- **Provide meaningful error messages** to users

**Example retry implementation:**
```javascript
const maxRetries = 3;
const baseDelay = 1000;

for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    const result = await makeApiCall();
    return result;
  } catch (error) {
    if (attempt === maxRetries - 1) throw error;
    if (error.status === 429) {
      await sleep(baseDelay * Math.pow(2, attempt));
    }
  }
}
```

### 3. Performance Optimization

- **Use pagination** for large result sets
- **Request only needed fields** to reduce response size
- **Cache frequently accessed data** (projects, users, etc.)
- **Batch operations** when possible
- **Monitor API usage** to stay within rate limits

**Efficient field selection:**
```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "project = PROJ",
    "fields": ["key", "summary", "status"],
    "maxResults": 50
  }
}
```

### 4. Data Consistency

- **Use transactions** for related operations
- **Validate data integrity** before and after operations
- **Handle concurrent modifications** gracefully
- **Implement idempotent operations** where possible
- **Use optimistic locking** for updates

### 5. Monitoring and Logging

- **Log all API interactions** for audit trails
- **Monitor response times** and error rates
- **Set up alerts** for critical failures
- **Track usage patterns** to optimize performance
- **Implement health checks** for service monitoring

### 6. Testing Strategies

- **Unit test** individual tool functions
- **Integration test** with real Jira instances
- **Mock external dependencies** for reliable testing
- **Test error scenarios** and edge cases
- **Validate data transformations** and formatting

## Performance Tips

### 1. Request Optimization

#### Minimize Data Transfer
```json
// Good: Request only needed fields
{
  "name": "jql.search",
  "arguments": {
    "jql": "project = PROJ",
    "fields": ["key", "summary", "status"],
    "maxResults": 25
  }
}

// Avoid: Requesting all fields
{
  "name": "jql.search",
  "arguments": {
    "jql": "project = PROJ",
    "maxResults": 25
  }
}
```

#### Use Efficient Pagination
```json
// Process large datasets in chunks
{
  "name": "jql.search",
  "arguments": {
    "jql": "project = PROJ",
    "startAt": 0,
    "maxResults": 50,
    "fields": ["key", "summary"]
  }
}
```

### 2. Caching Strategies

#### Cache Static Data
- Project information
- User details
- Issue types and priorities
- Custom field definitions

#### Cache Implementation Example
```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedProject(projectKey) {
  const cacheKey = `project:${projectKey}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const project = await getProject(projectKey);
  cache.set(cacheKey, {
    data: project,
    timestamp: Date.now()
  });
  
  return project;
}
```

### 3. Batch Operations

#### Group Related Operations
```javascript
// Instead of multiple individual updates
const issues = ['PROJ-1', 'PROJ-2', 'PROJ-3'];
for (const issue of issues) {
  await updateIssue(issue, { priority: 'High' });
}

// Use bulk operations or parallel processing
const updates = issues.map(issue => 
  updateIssue(issue, { priority: 'High' })
);
await Promise.all(updates);
```

### 4. Connection Management

#### Configure Timeouts Appropriately
```bash
# For fast operations
REQUEST_TIMEOUT=10000

# For complex searches or bulk operations
REQUEST_TIMEOUT=60000
```

#### Implement Connection Pooling
```javascript
const axiosConfig = {
  timeout: 30000,
  maxRedirects: 3,
  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 10
  })
};
```

### 5. Memory Management

#### Stream Large Responses
```javascript
// For large result sets, process in chunks
async function processAllIssues(jql) {
  let startAt = 0;
  const maxResults = 50;
  
  while (true) {
    const response = await searchIssues({
      jql,
      startAt,
      maxResults,
      fields: ['key', 'summary']
    });
    
    if (response.issues.length === 0) break;
    
    // Process chunk
    await processIssueChunk(response.issues);
    
    startAt += maxResults;
  }
}
```

## API Reference

### HTTP Status Codes

The server returns standard HTTP status codes:

- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **204 No Content** - Request successful, no content returned
- **400 Bad Request** - Invalid request parameters
- **401 Unauthorized** - Authentication failed
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Server error

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid API token provided",
    "details": {
      "statusCode": 401,
      "timestamp": "2024-08-15T10:30:00Z",
      "requestId": "req-123456"
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_FAILED` - Invalid credentials
- `PERMISSION_DENIED` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid input parameters
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `NETWORK_ERROR` - Connection or timeout issues
- `SERVER_ERROR` - Internal server error

### Rate Limiting

Jira Cloud enforces rate limits:

- **Standard**: 10 requests per second per IP
- **Premium**: 20 requests per second per IP
- **Enterprise**: Custom limits

The server implements automatic retry with exponential backoff for rate-limited requests.

### Data Formats

#### Dates
All dates use ISO 8601 format: `2024-08-15T10:30:00.000Z`

#### Atlassian Document Format (ADF)
Rich text content uses ADF:

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "This is formatted text with "
        },
        {
          "type": "text",
          "text": "bold",
          "marks": [{"type": "strong"}]
        },
        {
          "type": "text",
          "text": " formatting."
        }
      ]
    }
  ]
}
```

#### Plain Text Conversion
The server automatically converts plain text to ADF when needed:

```javascript
// Input: "This is plain text"
// Output: ADF document with paragraph containing the text
```

### Field Types and Validation

#### Common Field Types
- **String**: Text values (summary, description)
- **Number**: Numeric values (story points, time estimates)
- **Date**: ISO 8601 formatted dates
- **User**: `{ "accountId": "user-id" }`
- **Option**: `{ "name": "option-name" }` or `{ "id": "option-id" }`
- **Array**: Collections of values

#### Custom Fields
Custom fields use their field ID:

```json
{
  "customfield_10001": "Custom field value",
  "customfield_10002": { "name": "Option value" }
}
```

### Pagination

All list endpoints support pagination:

```json
{
  "startAt": 0,
  "maxResults": 50,
  "total": 150,
  "isLast": false,
  "values": [...]
}
```

### Expansion

Use the `expand` parameter to include additional data:

```json
{
  "expand": ["changelog", "renderedFields", "transitions"]
}
```

Available expansions vary by endpoint - refer to individual tool documentation.

---

## Conclusion

The Enhanced MCP Jira REST Server provides a comprehensive, performant, and reliable way to integrate with Jira Cloud. By following this guide, you can:

- Set up and configure the server correctly
- Use all 13 tools effectively
- Implement best practices for security and performance
- Troubleshoot common issues
- Build robust integrations with proper error handling

For additional support, refer to the test files and documentation in the `docs/` directory, or consult the official Jira REST API documentation for advanced use cases.

### Additional Resources

- [Jira REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [JQL Reference](https://support.atlassian.com/jira-service-management-cloud/docs/use-advanced-search-with-jira-query-language-jql/)
- [Atlassian Document Format](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)

### Version Information

- **Server Version**: 1.0.0
- **API Version**: Jira REST API v3
- **MCP Protocol**: 2024-11-05
- **Last Updated**: August 15, 2025
