
# Enhanced MCP Jira REST Server

A modern, TypeScript-based Model Context Protocol (MCP) server for Jira that uses official REST API endpoints directly, without external library dependencies like jira.js.

## Features

### Core Functionality
- **Direct REST API Integration**: Uses official Jira Cloud REST API v3 endpoints
- **28 Essential Tools**: Focused on core software development and project management needs
- **TypeScript & Zod Validation**: Full type safety with runtime validation
- **Modern MCP Patterns**: Built with latest MCP SDK patterns and best practices

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

#### Workflow Management (3 tools)
- `workflow.bulk_transition` - Perform bulk transitions with conditions
- `workflow.conditional_transition` - Execute conditional transitions based on rules
- `workflow.validate` - Validate workflow configurations and transitions

#### Analytics & Reporting (7 tools)
- `workflow.analytics` - Generate comprehensive workflow analytics
- `workflow.cycle_time` - Calculate cycle time metrics with percentiles
- `workflow.lead_time` - Measure lead time from creation to completion
- `workflow.throughput` - Analyze delivery rate and trends
- `workflow.report` - Generate reports in multiple formats (JSON, CSV, Markdown, HTML)
- `workflow.dashboard` - Create interactive dashboards for multiple projects
- `workflow.export_issues` - Export issues with detailed analytics data

### Technical Features
- **Robust Error Handling**: Comprehensive error types and recovery strategies
- **Authentication Support**: API tokens, OAuth 2.0, and Basic auth
- **Performance Optimized**: Request retry logic, timeout handling, and efficient pagination
- **ADF Support**: Automatic conversion between plain text and Atlassian Document Format
- **Comprehensive Logging**: Request/response logging for debugging

## Installation

### Prerequisites
- Node.js 18+ 
- TypeScript 5+
- Jira Cloud instance with API access

### Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd mcp-jira-rest
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Jira configuration
```

3. **Build the project:**
```bash
npm run build
```

4. **Run tests:**
```bash
npm test
```

## Configuration

### Environment Variables

#### Required Jira Settings
```bash
# Jira instance URL
JIRA_BASE_URL=https://your-domain.atlassian.net

# Authentication (choose one method)
# Method 1: API Token (recommended)
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token

# Method 2: OAuth 2.0
# JIRA_OAUTH_ACCESS_TOKEN=your-oauth-access-token
```

#### Optional Settings
```bash
# Performance tuning
REQUEST_TIMEOUT=30000
MAX_RETRIES=3
RETRY_DELAY=1000

# Logging
LOG_LEVEL=info

# MCP Server
MCP_SERVER_NAME=jira-rest
MCP_SERVER_VERSION=1.0.0
```

### Authentication Methods

#### API Token (Recommended)
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create a new API token
3. Set `JIRA_EMAIL` and `JIRA_API_TOKEN` in your `.env` file

#### OAuth 2.0
1. Create an OAuth app in [Atlassian Developer Console](https://developer.atlassian.com/console)
2. Configure scopes: `read:jira-user`, `read:jira-work`, `write:jira-work`
3. Set `JIRA_OAUTH_ACCESS_TOKEN` in your `.env` file

## Usage

### Running the Server

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

### Tool Examples

#### Create an Issue
```json
{
  "name": "issue.create",
  "arguments": {
    "fields": {
      "project": { "key": "PROJ" },
      "summary": "New feature request",
      "description": "Detailed description of the feature",
      "issuetype": { "name": "Task" },
      "assignee": { "accountId": "user-account-id" },
      "priority": { "name": "High" },
      "labels": ["feature", "urgent"]
    }
  }
}
```

#### Search Issues with JQL
```json
{
  "name": "jql.search",
  "arguments": {
    "jql": "project = PROJ AND status = 'In Progress' AND assignee = currentUser()",
    "maxResults": 25,
    "fields": ["summary", "status", "assignee", "priority"]
  }
}
```

#### Transition an Issue
```json
{
  "name": "issue.transition",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "transition": { "id": "31" },
    "fields": {
      "resolution": { "name": "Done" }
    }
  }
}
```

#### Add a Comment
```json
{
  "name": "issue.comment.add",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "body": "This issue has been reviewed and approved for development."
  }
}
```

#### Generate Workflow Analytics
```json
{
  "name": "workflow.analytics",
  "arguments": {
    "jql": "project = PROJ AND resolved >= -30d",
    "groupBy": "assignee",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

#### Create Workflow Report
```json
{
  "name": "workflow.report",
  "arguments": {
    "jql": "project = PROJ AND resolved >= -90d",
    "format": "html",
    "outputPath": "./reports/quarterly-report.html",
    "includeRecommendations": true
  }
}
```

### CLI Usage

The system includes a powerful CLI for workflow management and analytics:

#### Analytics Commands
```bash
# Generate comprehensive analytics
jira-workflow analytics -j "project = MYPROJ AND resolved >= -30d" -g assignee

# Calculate cycle time metrics
jira-workflow cycle-time -j "project = MYPROJ" -s "In Progress" -e "Done"

# Generate HTML report
jira-workflow report -j "project = MYPROJ" -f html -o "./reports/report.html"

# Create multi-project dashboard
jira-workflow dashboard -p "PROJ1,PROJ2" -t 30d -o "./dashboards"

# Export issues with analytics
jira-workflow export -j "project = MYPROJ" -f csv --include-history
```

#### Workflow Management Commands
```bash
# Bulk transition issues
jira-workflow bulk-transition -j "project = MYPROJ AND status = 'To Do'" -t 21

# Validate workflow configuration
jira-workflow validate -p MYPROJ

# Check JIRA connection
jira-workflow health
```

## Architecture

### Directory Structure
```
src/
├── http/
│   └── JiraRestClient.ts     # Core HTTP client with auth & error handling
├── types/
│   └── index.ts              # TypeScript types and Zod schemas
├── tools/
│   ├── createIssue.ts        # Issue creation tool
│   ├── getIssue.ts          # Issue retrieval tool
│   ├── updateIssue.ts       # Issue update tool
│   ├── deleteIssue.ts       # Issue deletion tool
│   ├── transitionIssue.ts   # Issue transition tool
│   ├── getIssueTransitions.ts # Get available transitions
│   ├── searchIssues.ts      # JQL search tool
│   ├── addComment.ts        # Add comment tool
│   ├── getComments.ts       # Get comments tool
│   ├── getProject.ts        # Project retrieval tool
│   ├── searchProjects.ts    # Project search tool
│   ├── getUser.ts           # User retrieval tool
│   ├── searchUsers.ts       # User search tool
│   ├── workflowTransitionManager.ts # Advanced workflow management
│   ├── workflowAnalytics.ts # Workflow analytics engine
│   └── workflowReporting.ts # Report generation and export
├── cli/
│   └── workflow-cli.ts      # Command-line interface
└── index.ts                 # Main server entry point
```

### Key Components

#### JiraRestClient
- Direct HTTP client for Jira REST API
- Handles authentication, retries, and error mapping
- Provides convenience methods for common operations
- Built-in support for pagination and field expansion

#### Type System
- Comprehensive Zod schemas for validation
- TypeScript types for all Jira entities
- Input validation for all tool arguments
- Runtime type checking and error reporting

#### Error Handling
- Specific error types for different scenarios
- Automatic retry logic for transient failures
- Detailed error messages with context
- Graceful degradation for partial failures

## Migration from jira.js

If you're migrating from the original MCP Jira SDK that used jira.js:

### Key Differences
1. **Direct REST API**: No more jira.js dependency
2. **Focused Tool Set**: 28 core tools instead of 110+
3. **Modern Architecture**: Simplified registration and error handling
4. **Enhanced Performance**: Optimized HTTP client with better retry logic

### Tool Mapping
| Original Tool | New Tool | Notes |
|---------------|----------|-------|
| `issue.get` | `issue.get` | Same interface, enhanced performance |
| `issue.create` | `issue.create` | Improved ADF handling |
| `issue.update` | `issue.update` | Better field validation |
| `issue.delete` | `issue.delete` | Added subtask handling |
| `issue.transition` | `issue.transition` | Enhanced transition support |
| `jql.search` | `jql.search` | Improved pagination |
| `project.get` | `project.get` | More comprehensive data |
| `user.search` | `user.search` | Better search capabilities |

### Configuration Changes
- Replace `JIRA_HOST` with `JIRA_BASE_URL`
- API token authentication remains the same
- OAuth configuration simplified

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npx tsc --noEmit
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure all tests pass
5. Submit a pull request

### Code Style
- Use TypeScript strict mode
- Follow ESLint configuration
- Add Zod schemas for new types
- Include comprehensive error handling
- Write tests for new functionality

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the [troubleshooting guide](#troubleshooting)
2. Review [Jira REST API documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
3. Open an issue on GitHub

## Troubleshooting

### Common Issues

#### Authentication Errors
- Verify your API token is valid and not expired
- Check that your email matches the token owner
- Ensure your Jira instance URL is correct

#### Permission Errors
- Verify you have appropriate Jira permissions
- Check project-level permissions for project operations
- Ensure user has "Browse Projects" permission

#### Network Issues
- Check firewall settings for outbound HTTPS
- Verify DNS resolution for your Jira instance
- Consider proxy configuration if needed

#### Tool Execution Errors
- Validate input arguments match the schema
- Check Jira field configurations for custom fields
- Verify issue types and workflows exist in your instance

### Debug Mode
Set `LOG_LEVEL=debug` in your environment to enable detailed logging:
```bash
LOG_LEVEL=debug npm run dev
```

This will show:
- HTTP request/response details
- Authentication information
- Error stack traces
- Performance metrics
