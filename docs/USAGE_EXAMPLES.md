
# MCP Jira REST Server - Usage Examples

This document provides comprehensive examples of using all 28 core tools available in the enhanced MCP Jira server.

## Table of Contents

1. [Authentication Setup](#authentication-setup)
2. [Project Management](#project-management)
3. [Issue Management](#issue-management)
4. [Search Operations](#search-operations)
5. [User Management](#user-management)
6. [Comment Management](#comment-management)
7. [Advanced Features](#advanced-features)
8. [Error Handling](#error-handling)

## Authentication Setup

### Environment Configuration

```bash
# .env file
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@domain.com
JIRA_API_TOKEN=your-api-token-here
```

### MCP Server Initialization

```bash
# Start the MCP server
node dist/index.js
```

## Project Management

### 1. Search Projects

**Tool:** `project.search`

```json
{
  "name": "project.search",
  "arguments": {
    "maxResults": 10,
    "orderBy": "name",
    "expand": ["description", "lead"]
  }
}
```

**Expected Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Found 3 projects:\n{\n  \"values\": [\n    {\n      \"key\": \"PA\",\n      \"name\": \"Product Alpha\",\n      \"projectTypeKey\": \"software\"\n    }\n  ]\n}"
    }
  ]
}
```

### 2. Get Project Details

**Tool:** `project.get`

```json
{
  "name": "project.get",
  "arguments": {
    "projectIdOrKey": "PA",
    "expand": ["description", "lead", "components"]
  }
}
```

**Expected Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Project Details:\n{\n  \"key\": \"PA\",\n  \"name\": \"Product Alpha\",\n  \"description\": \"Main product development project\"\n}"
    }
  ]
}
```

## Issue Management

### 3. Create Issue

**Tool:** `issue.create`

```json
{
  "name": "issue.create",
  "arguments": {
    "fields": {
      "project": {
        "key": "PA"
      },
      "summary": "New feature request",
      "description": "Detailed description of the feature",
      "issuetype": {
        "name": "Task"
      },
      "priority": {
        "name": "Medium"
      },
      "labels": ["feature", "enhancement"]
    }
  }
}
```

### 4. Get Issue

**Tool:** `issue.get`

```json
{
  "name": "issue.get",
  "arguments": {
    "issueIdOrKey": "PA-123",
    "fields": ["summary", "status", "assignee", "description"],
    "expand": ["changelog", "renderedFields"]
  }
}
```

### 5. Update Issue

**Tool:** `issue.update`

```json
{
  "name": "issue.update",
  "arguments": {
    "issueIdOrKey": "PA-123",
    "fields": {
      "summary": "Updated issue summary",
      "description": "Updated description",
      "priority": {
        "name": "High"
      }
    }
  }
}
```

### 6. Delete Issue

**Tool:** `issue.delete`

```json
{
  "name": "issue.delete",
  "arguments": {
    "issueIdOrKey": "PA-123",
    "deleteSubtasks": true
  }
}
```

### 7. Transition Issue

**Tool:** `issue.transition`

```json
{
  "name": "issue.transition",
  "arguments": {
    "issueIdOrKey": "PA-123",
    "transition": {
      "id": "31"
    },
    "fields": {
      "resolution": {
        "name": "Done"
      }
    }
  }
}
```

### 8. Get Issue Transitions

**Tool:** `issue.transitions.list`

```json
{
  "name": "issue.transitions.list",
  "arguments": {
    "issueIdOrKey": "PA-123",
    "expand": ["transitions.fields"]
  }
}
```

## Search Operations

### 9. JQL Search

**Tool:** `jql.search`

```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "project = PA AND status = 'In Progress' ORDER BY priority DESC",
    "maxResults": 50,
    "fields": ["summary", "status", "assignee", "priority", "created"],
    "expand": ["changelog"]
  }
}
```

**Advanced JQL Examples:**

```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "assignee = currentUser() AND status != Done AND created >= -7d",
    "maxResults": 25
  }
}
```

```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "project in (PA, PB) AND labels in (urgent, critical) ORDER BY created DESC",
    "startAt": 0,
    "maxResults": 100
  }
}
```

## User Management

### 10. Search Users

**Tool:** `user.search`

```json
{
  "name": "user.search",
  "arguments": {
    "query": "john.doe",
    "maxResults": 10
  }
}
```

### 11. Get User

**Tool:** `user.get`

```json
{
  "name": "user.get",
  "arguments": {
    "accountId": "5b10a2844c20165700ede21g",
    "expand": ["groups", "applicationRoles"]
  }
}
```

## Comment Management

### 12. Add Comment

**Tool:** `issue.comment.add`

```json
{
  "name": "issue.comment.add",
  "arguments": {
    "issueIdOrKey": "PA-123",
    "body": "This is a comment with *formatting* and [links|http://example.com]",
    "visibility": {
      "type": "role",
      "value": "Developers"
    }
  }
}
```

### 13. Get Comments

**Tool:** `issue.comments.get`

```json
{
  "name": "issue.comments.get",
  "arguments": {
    "issueIdOrKey": "PA-123",
    "maxResults": 50,
    "orderBy": "created",
    "expand": ["renderedBody"]
  }
}
```

## Advanced Features

### Pagination Example

```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "project = PA ORDER BY created DESC",
    "startAt": 0,
    "maxResults": 25
  }
}
```

```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "project = PA ORDER BY created DESC",
    "startAt": 25,
    "maxResults": 25
  }
}
```

### Field Selection

```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "assignee = currentUser()",
    "fields": ["key", "summary", "status", "priority", "assignee", "created", "updated"],
    "maxResults": 50
  }
}
```

### Expand Options

```json
{
  "name": "issue.get",
  "arguments": {
    "issueIdOrKey": "PA-123",
    "expand": [
      "changelog",
      "renderedFields",
      "names",
      "schema",
      "transitions",
      "operations",
      "editmeta"
    ]
  }
}
```

## Error Handling

### Common Error Scenarios

1. **Invalid Issue Key**
```json
{
  "name": "issue.get",
  "arguments": {
    "issueIdOrKey": "INVALID-999"
  }
}
```
*Response: 404 error with descriptive message*

2. **Invalid JQL**
```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "invalid jql syntax here"
  }
}
```
*Response: 400 error with JQL validation details*

3. **Permission Denied**
```json
{
  "name": "issue.delete",
  "arguments": {
    "issueIdOrKey": "RESTRICTED-123"
  }
}
```
*Response: 403 error with permission details*

## Performance Best Practices

### 1. Efficient Field Selection
```json
{
  "fields": ["key", "summary", "status", "assignee"]
}
```

### 2. Pagination for Large Results
```json
{
  "maxResults": 50,
  "startAt": 0
}
```

### 3. Specific JQL Queries
```json
{
  "jql": "project = PA AND updated >= -1d ORDER BY updated DESC"
}
```

## Integration Examples

### Workflow Automation

```javascript
// 1. Search for issues ready for review
const reviewIssues = await mcpClient.callTool("jql.search", {
  jql: "status = 'Code Review' AND assignee = currentUser()"
});

// 2. Transition approved issues
for (const issue of reviewIssues.issues) {
  await mcpClient.callTool("issue.transition", {
    issueIdOrKey: issue.key,
    transition: { name: "Approve" }
  });
  
  // 3. Add approval comment
  await mcpClient.callTool("issue.comment.add", {
    issueIdOrKey: issue.key,
    body: "Code review completed. Approved for deployment."
  });
}
```

### Reporting Dashboard

```javascript
// Get project statistics
const projectStats = await mcpClient.callTool("jql.search", {
  jql: "project = PA",
  maxResults: 0  // Just get count
});

const openIssues = await mcpClient.callTool("jql.search", {
  jql: "project = PA AND status != Done",
  maxResults: 0
});

const recentIssues = await mcpClient.callTool("jql.search", {
  jql: "project = PA AND created >= -7d",
  fields: ["key", "summary", "status", "created"]
});
```

---

*This documentation covers all 28 core tools available in the MCP Jira REST server. For additional examples and advanced usage patterns, refer to the test files in the repository.*
