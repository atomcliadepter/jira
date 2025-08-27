
# Enhanced MCP Jira REST Server

A comprehensive, enterprise-grade Model Context Protocol (MCP) server for Jira and Confluence that provides advanced workflow management, analytics, automation, and custom field capabilities using official REST API endpoints.

## Features

### Core Functionality
- **Direct REST API Integration**: Uses official Jira Cloud REST API v3 and Confluence REST API
- **65+ Professional Tools**: Complete enterprise solution for Jira and Confluence management
- **TypeScript & Zod Validation**: Full type safety with runtime validation
- **Modern MCP Patterns**: Built with latest MCP SDK patterns and best practices
- **Advanced Analytics Engine**: Comprehensive reporting and dashboard capabilities
- **Automation Framework**: Rule-based automation with smart value processing
- **Custom Field Management**: Advanced custom field configuration and validation
- **Confluence Integration**: Full Confluence workspace management and documentation automation

### Tool Categories

#### Issue Management (8 tools)
- `issue.create` - Create new issues with full field support and validation
- `issue.get` - Retrieve issue details with customizable fields and expansion
- `issue.update` - Update existing issues with field validation
- `issue.delete` - Delete issues with subtask handling and cascade options
- `issue.transition` - Transition issues through workflow states with validation
- `issue.transitions.list` - Get available transitions for an issue with conditions
- `issue.comment.add` - Add comments to issues with rich formatting support
- `issue.comments.get` - Retrieve issue comments with pagination and filtering

#### Search & JQL (1 tool)
- `jql.search` - Advanced JQL-based issue searching with pagination, field expansion, and result optimization

#### Project Operations (2 tools)
- `project.get` - Get detailed project information including permissions and configurations
- `project.search` - Search and filter projects with advanced criteria

#### User Management (2 tools)
- `user.get` - Get user details, permissions, and group memberships
- `user.search` - Search for users across the organization with filtering

#### Advanced Workflow Management (3 tools)
- `workflow.bulk_transition` - Perform bulk transitions with conditions and validation
- `workflow.conditional_transition` - Execute conditional transitions based on complex rules
- `workflow.validate` - Validate workflow configurations and transition rules

#### Analytics & Reporting (7 tools)
- `workflow.analytics` - Generate comprehensive workflow analytics with statistical insights
- `workflow.cycle_time` - Calculate cycle time metrics with percentiles and trend analysis
- `workflow.lead_time` - Measure lead time from creation to completion with bottleneck analysis
- `workflow.throughput` - Analyze delivery rate and trends with forecasting
- `workflow.report` - Generate reports in multiple formats (JSON, CSV, Markdown, HTML, PDF)
- `workflow.dashboard` - Create interactive dashboards for multiple projects with real-time updates
- `workflow.export_issues` - Export issues with detailed analytics data and custom formatting

#### Custom Field Management (10 tools)
- `customfield.create` - Create custom fields with advanced configuration options
- `customfield.update` - Update custom field properties and configurations
- `customfield.delete` - Delete custom fields with dependency checking
- `customfield.get` - Retrieve custom field details and configurations
- `customfield.search` - Search custom fields with filtering and sorting
- `customfield.context.create` - Create field contexts with project and issue type scoping
- `customfield.options.set` - Set field options for select lists and multi-select fields
- `customfield.cascading.set` - Configure cascading select field options
- `customfield.validate` - Validate field values against field configurations
- `customfield.calculate` - Calculate computed field values using expressions

#### Field Configuration Management (9 tools)
- `fieldconfig.list` - List all field configurations with filtering
- `fieldconfig.create` - Create new field configurations
- `fieldconfig.update` - Update field configuration properties
- `fieldconfig.delete` - Delete field configurations with validation
- `fieldconfig.items.update` - Update field configuration items and behaviors
- `fieldconfig.scheme.create` - Create field configuration schemes
- `fieldconfig.scheme.assign` - Assign schemes to projects
- `fieldconfig.validate` - Validate field configuration integrity
- `fieldconfig.copy` - Copy field configurations between projects

#### Advanced Reporting & Analytics (5 tools)
- `advanced.jql.builder` - Interactive JQL query builder with syntax validation
- `advanced.dashboard.metrics` - Generate dashboard metrics with KPIs
- `advanced.burndown.chart` - Create burndown charts with sprint analysis
- `advanced.velocity.tracking` - Track team velocity with trend analysis
- `advanced.export.data` - Export data in multiple formats with custom templates

#### Confluence Integration (9 tools)
- `confluence.page.create` - Create Confluence pages with rich content
- `confluence.page.update` - Update existing pages with version control
- `confluence.page.get` - Retrieve page content and metadata
- `confluence.space.create` - Create new Confluence spaces with permissions
- `confluence.jira.link` - Link Jira issues to Confluence pages
- `confluence.documentation.create` - Auto-generate documentation from Jira data
- `confluence.pages.search` - Search pages across spaces with advanced filters
- `confluence.spaces.get` - List and filter Confluence spaces
- `confluence.space.permissions.get` - Retrieve space permissions and access controls

#### Automation Engine (8 tools)
- `automation.rule.create` - Create automation rules with triggers and actions
- `automation.rule.update` - Update existing automation rules
- `automation.rule.delete` - Delete automation rules with dependency checking
- `automation.rule.get` - Retrieve automation rule details and configurations
- `automation.rules.list` - List all automation rules with filtering
- `automation.rule.execute` - Execute automation rules manually
- `automation.executions.get` - Get automation execution history and logs
- `automation.rule.validate` - Validate automation rule syntax and logic

### Technical Features
- **Robust Error Handling**: Comprehensive error types and recovery strategies
- **Authentication Support**: API tokens, OAuth 2.0, and Basic auth
- **Performance Optimized**: Request retry logic, timeout handling, and efficient pagination
- **ADF Support**: Automatic conversion between plain text and Atlassian Document Format
- **Comprehensive Logging**: Request/response logging for debugging
- **Health Monitoring**: Built-in health checks and system monitoring
- **Configuration Validation**: Runtime configuration validation with detailed error reporting
- **Scheduled Operations**: Cron-based scheduling for automated tasks
- **Webhook Support**: Real-time event processing and notifications
- **Multi-format Export**: Support for CSV, Excel, PDF, JSON, and HTML exports
- **Advanced Caching**: Intelligent caching for improved performance
- **Notification System**: Email, Slack, and webhook notifications

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

The system includes powerful CLIs for comprehensive management:

#### Workflow Analytics Commands
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

#### Confluence Management Commands
```bash
# Create documentation from Jira data
jira-confluence create-docs -p MYPROJ -s "Documentation Space"

# Link Jira issues to pages
jira-confluence link-issues -j "project = MYPROJ" -p "page-id"

# Search across spaces
jira-confluence search -q "API documentation" -s "DEV,QA"
```

#### Custom Field Management Commands
```bash
# Create custom field
jira-customfield create -n "Story Points" -t number -p MYPROJ

# Update field configuration
jira-customfield config -f "customfield_10001" -r required

# Validate field values
jira-customfield validate -f "customfield_10001" -v "5"
```

#### Automation Commands
```bash
# Create automation rule
jira-automation create -n "Auto-assign" -t "issue.created" -a "assign.user"

# Execute rule manually
jira-automation execute -r "rule-id" -i "PROJ-123"

# View execution history
jira-automation history -r "rule-id" --days 7
```

## Architecture

### Directory Structure
```
src/
├── http/
│   ├── JiraRestClient.ts         # Core HTTP client with auth & error handling
│   └── ConfluenceRestClient.ts   # Confluence API client
├── types/
│   ├── index.ts                  # TypeScript types and Zod schemas
│   └── confluence.ts             # Confluence-specific types
├── tools/
│   ├── createIssue.ts           # Issue creation tool
│   ├── getIssue.ts              # Issue retrieval tool
│   ├── updateIssue.ts           # Issue update tool
│   ├── deleteIssue.ts           # Issue deletion tool
│   ├── transitionIssue.ts       # Issue transition tool
│   ├── getIssueTransitions.ts   # Get available transitions
│   ├── searchIssues.ts          # JQL search tool
│   ├── addComment.ts            # Add comment tool
│   ├── getComments.ts           # Get comments tool
│   ├── getProject.ts            # Project retrieval tool
│   ├── searchProjects.ts        # Project search tool
│   ├── getUser.ts               # User retrieval tool
│   ├── searchUsers.ts           # User search tool
│   ├── workflowTransitionManager.ts # Advanced workflow management
│   ├── workflowAnalytics.ts     # Workflow analytics engine
│   ├── workflowReporting.ts     # Report generation and export
│   ├── customFieldManager.ts    # Custom field management
│   ├── customFieldConfiguration.ts # Field configuration management
│   ├── automationTools.ts       # Automation engine tools
│   └── confluenceTools.ts       # Confluence integration tools
├── services/
│   └── ConfluenceService.ts     # Confluence service layer
├── automation/
│   ├── AutomationEngine.ts      # Core automation engine
│   ├── RuleValidator.ts         # Rule validation logic
│   ├── ActionExecutor.ts        # Action execution engine
│   ├── TriggerManager.ts        # Trigger management
│   ├── SmartValueProcessor.ts   # Smart value processing
│   ├── WebhookManager.ts        # Webhook handling
│   ├── NotificationManager.ts   # Notification system
│   └── ConfluenceAutomation.ts  # Confluence automation
├── analytics/
│   ├── advancedReporting.ts     # Advanced reporting tools
│   └── scheduledReporting.ts    # Scheduled report generation
├── cli/
│   ├── workflow-cli.ts          # Workflow command-line interface
│   ├── confluence-cli.ts        # Confluence CLI
│   ├── automation-cli.ts        # Automation CLI
│   └── customfield-cli.ts       # Custom field CLI
├── utils/
│   ├── logger.ts                # Logging utilities
│   ├── errorCodes.ts            # Error handling and mapping
│   ├── configValidator.ts       # Configuration validation
│   └── healthCheck.ts           # Health monitoring
└── index.ts                     # Main server entry point
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
2. **Comprehensive Tool Set**: 65+ tools instead of basic functionality
3. **Modern Architecture**: Advanced automation, analytics, and reporting capabilities
4. **Enhanced Performance**: Optimized HTTP client with better retry logic
5. **Enterprise Features**: Custom fields, field configurations, and Confluence integration

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
| N/A | `workflow.*` | New advanced workflow tools |
| N/A | `customfield.*` | New custom field management |
| N/A | `confluence.*` | New Confluence integration |
| N/A | `automation.*` | New automation engine |

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
