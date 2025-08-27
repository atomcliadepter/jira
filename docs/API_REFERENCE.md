# API Reference

This document provides a comprehensive reference for all 65+ tools available in the Enhanced MCP Jira REST Server.

## Issue Management Tools

### issue.create
Create new issues with full field support and validation.

**Parameters:**
- `fields` (object): Issue fields including project, summary, description, issuetype, etc.
- `properties` (array, optional): Issue properties
- `historyMetadata` (object, optional): History metadata

**Example:**
```json
{
  "name": "issue.create",
  "arguments": {
    "fields": {
      "project": { "key": "PROJ" },
      "summary": "New feature request",
      "description": "Detailed description",
      "issuetype": { "name": "Task" },
      "assignee": { "accountId": "user-account-id" },
      "priority": { "name": "High" }
    }
  }
}
```

### issue.get
Retrieve issue details with customizable fields and expansion.

**Parameters:**
- `issueIdOrKey` (string): Issue ID or key
- `fields` (array, optional): Fields to retrieve
- `expand` (array, optional): Additional data to expand
- `properties` (array, optional): Properties to retrieve

### issue.update
Update existing issues with field validation.

**Parameters:**
- `issueIdOrKey` (string): Issue ID or key
- `fields` (object): Fields to update
- `properties` (array, optional): Properties to update
- `historyMetadata` (object, optional): History metadata

### issue.delete
Delete issues with subtask handling and cascade options.

**Parameters:**
- `issueIdOrKey` (string): Issue ID or key
- `deleteSubtasks` (boolean, optional): Whether to delete subtasks

### issue.transition
Transition issues through workflow states with validation.

**Parameters:**
- `issueIdOrKey` (string): Issue ID or key
- `transition` (object): Transition details with ID
- `fields` (object, optional): Fields to update during transition

### issue.transitions.list
Get available transitions for an issue with conditions.

**Parameters:**
- `issueIdOrKey` (string): Issue ID or key
- `expand` (array, optional): Additional data to expand

### issue.comment.add
Add comments to issues with rich formatting support.

**Parameters:**
- `issueIdOrKey` (string): Issue ID or key
- `body` (string): Comment body (supports ADF)
- `visibility` (object, optional): Comment visibility settings

### issue.comments.get
Retrieve issue comments with pagination and filtering.

**Parameters:**
- `issueIdOrKey` (string): Issue ID or key
- `startAt` (number, optional): Starting index
- `maxResults` (number, optional): Maximum results
- `orderBy` (string, optional): Sort order

## Search & JQL Tools

### jql.search
Advanced JQL-based issue searching with pagination and field expansion.

**Parameters:**
- `jql` (string): JQL query string
- `startAt` (number, optional): Starting index
- `maxResults` (number, optional): Maximum results (default: 50)
- `fields` (array, optional): Fields to retrieve
- `expand` (array, optional): Additional data to expand
- `properties` (array, optional): Properties to retrieve

## Project Operations

### project.get
Get detailed project information including permissions and configurations.

**Parameters:**
- `projectIdOrKey` (string): Project ID or key
- `expand` (array, optional): Additional data to expand

### project.search
Search and filter projects with advanced criteria.

**Parameters:**
- `startAt` (number, optional): Starting index
- `maxResults` (number, optional): Maximum results
- `orderBy` (string, optional): Sort order
- `query` (string, optional): Search query
- `typeKey` (string, optional): Project type key
- `categoryId` (number, optional): Project category ID

## User Management

### user.get
Get user details, permissions, and group memberships.

**Parameters:**
- `accountId` (string): User account ID
- `expand` (array, optional): Additional data to expand

### user.search
Search for users across the organization with filtering.

**Parameters:**
- `query` (string, optional): Search query
- `username` (string, optional): Username to search
- `accountId` (string, optional): Account ID to search
- `startAt` (number, optional): Starting index
- `maxResults` (number, optional): Maximum results

## Advanced Workflow Management

### workflow.bulk_transition
Perform bulk transitions with conditions and validation.

**Parameters:**
- `jql` (string): JQL query to select issues
- `transitionId` (string): Transition ID to apply
- `fields` (object, optional): Fields to update during transition
- `conditions` (array, optional): Additional conditions

### workflow.conditional_transition
Execute conditional transitions based on complex rules.

**Parameters:**
- `issueIdOrKey` (string): Issue ID or key
- `conditions` (array): Conditions to evaluate
- `transitionMapping` (object): Mapping of conditions to transitions

### workflow.validate
Validate workflow configurations and transition rules.

**Parameters:**
- `projectKey` (string): Project key
- `workflowName` (string, optional): Specific workflow to validate

## Analytics & Reporting

### workflow.analytics
Generate comprehensive workflow analytics with statistical insights.

**Parameters:**
- `jql` (string): JQL query to select issues
- `groupBy` (string, optional): Field to group by
- `startDate` (string, optional): Start date for analysis
- `endDate` (string, optional): End date for analysis
- `includeSubtasks` (boolean, optional): Include subtasks in analysis

### workflow.cycle_time
Calculate cycle time metrics with percentiles and trend analysis.

**Parameters:**
- `jql` (string): JQL query to select issues
- `startStatus` (string): Starting status for cycle time calculation
- `endStatus` (string): Ending status for cycle time calculation
- `percentiles` (array, optional): Percentiles to calculate

### workflow.lead_time
Measure lead time from creation to completion with bottleneck analysis.

**Parameters:**
- `jql` (string): JQL query to select issues
- `completionStatus` (string, optional): Status considered as completion
- `includeWeekends` (boolean, optional): Include weekends in calculation

### workflow.throughput
Analyze delivery rate and trends with forecasting.

**Parameters:**
- `jql` (string): JQL query to select issues
- `period` (string): Time period for analysis (daily, weekly, monthly)
- `forecastPeriods` (number, optional): Number of periods to forecast

### workflow.report
Generate reports in multiple formats (JSON, CSV, Markdown, HTML, PDF).

**Parameters:**
- `jql` (string): JQL query to select issues
- `format` (string): Output format (json, csv, markdown, html, pdf)
- `outputPath` (string, optional): File path for output
- `includeCharts` (boolean, optional): Include charts in report
- `includeRecommendations` (boolean, optional): Include recommendations

### workflow.dashboard
Create interactive dashboards for multiple projects with real-time updates.

**Parameters:**
- `projects` (array): List of project keys
- `timeRange` (string): Time range for dashboard data
- `outputPath` (string, optional): Directory for dashboard files
- `refreshInterval` (number, optional): Auto-refresh interval in minutes

### workflow.export_issues
Export issues with detailed analytics data and custom formatting.

**Parameters:**
- `jql` (string): JQL query to select issues
- `format` (string): Export format (csv, excel, json)
- `includeHistory` (boolean, optional): Include issue history
- `includeComments` (boolean, optional): Include comments
- `customFields` (array, optional): Custom fields to include

## Custom Field Management

### customfield.create
Create custom fields with advanced configuration options.

**Parameters:**
- `name` (string): Field name
- `type` (string): Field type
- `description` (string, optional): Field description
- `searcherKey` (string, optional): Searcher key
- `projectIds` (array, optional): Project IDs to scope field

### customfield.update
Update custom field properties and configurations.

**Parameters:**
- `fieldId` (string): Custom field ID
- `name` (string, optional): New field name
- `description` (string, optional): New field description

### customfield.delete
Delete custom fields with dependency checking.

**Parameters:**
- `fieldId` (string): Custom field ID
- `force` (boolean, optional): Force deletion even with dependencies

### customfield.get
Retrieve custom field details and configurations.

**Parameters:**
- `fieldId` (string): Custom field ID

### customfield.search
Search custom fields with filtering and sorting.

**Parameters:**
- `query` (string, optional): Search query
- `type` (string, optional): Field type filter
- `projectKey` (string, optional): Project key filter

### customfield.context.create
Create field contexts with project and issue type scoping.

**Parameters:**
- `fieldId` (string): Custom field ID
- `name` (string): Context name
- `description` (string, optional): Context description
- `projectIds` (array, optional): Project IDs
- `issueTypeIds` (array, optional): Issue type IDs

### customfield.options.set
Set field options for select lists and multi-select fields.

**Parameters:**
- `fieldId` (string): Custom field ID
- `contextId` (string): Context ID
- `options` (array): Array of option objects

### customfield.cascading.set
Configure cascading select field options.

**Parameters:**
- `fieldId` (string): Custom field ID
- `contextId` (string): Context ID
- `cascadingOptions` (object): Cascading options configuration

### customfield.validate
Validate field values against field configurations.

**Parameters:**
- `fieldId` (string): Custom field ID
- `value` (any): Value to validate
- `issueType` (string, optional): Issue type context

### customfield.calculate
Calculate computed field values using expressions.

**Parameters:**
- `fieldId` (string): Custom field ID
- `expression` (string): Calculation expression
- `issueIdOrKey` (string): Issue to calculate for

## Field Configuration Management

### fieldconfig.list
List all field configurations with filtering.

**Parameters:**
- `startAt` (number, optional): Starting index
- `maxResults` (number, optional): Maximum results
- `query` (string, optional): Search query

### fieldconfig.create
Create new field configurations.

**Parameters:**
- `name` (string): Configuration name
- `description` (string, optional): Configuration description

### fieldconfig.update
Update field configuration properties.

**Parameters:**
- `id` (string): Configuration ID
- `name` (string, optional): New name
- `description` (string, optional): New description

### fieldconfig.delete
Delete field configurations with validation.

**Parameters:**
- `id` (string): Configuration ID

### fieldconfig.items.update
Update field configuration items and behaviors.

**Parameters:**
- `id` (string): Configuration ID
- `fieldConfigurationItems` (array): Array of field configuration items

### fieldconfig.scheme.create
Create field configuration schemes.

**Parameters:**
- `name` (string): Scheme name
- `description` (string, optional): Scheme description

### fieldconfig.scheme.assign
Assign schemes to projects.

**Parameters:**
- `schemeId` (string): Scheme ID
- `projectId` (string): Project ID

### fieldconfig.validate
Validate field configuration integrity.

**Parameters:**
- `id` (string): Configuration ID

### fieldconfig.copy
Copy field configurations between projects.

**Parameters:**
- `sourceId` (string): Source configuration ID
- `targetName` (string): Target configuration name
- `targetDescription` (string, optional): Target description

## Advanced Reporting & Analytics

### advanced.jql.builder
Interactive JQL query builder with syntax validation.

**Parameters:**
- `fields` (array, optional): Available fields for building
- `operators` (array, optional): Available operators
- `functions` (array, optional): Available JQL functions

### advanced.dashboard.metrics
Generate dashboard metrics with KPIs.

**Parameters:**
- `projects` (array): Project keys
- `timeRange` (string): Time range for metrics
- `metrics` (array): Specific metrics to calculate

### advanced.burndown.chart
Create burndown charts with sprint analysis.

**Parameters:**
- `sprintId` (string): Sprint ID
- `boardId` (string, optional): Board ID
- `includeSubtasks` (boolean, optional): Include subtasks

### advanced.velocity.tracking
Track team velocity with trend analysis.

**Parameters:**
- `boardId` (string): Board ID
- `numberOfSprints` (number, optional): Number of sprints to analyze
- `includeSubtasks` (boolean, optional): Include subtasks

### advanced.export.data
Export data in multiple formats with custom templates.

**Parameters:**
- `jql` (string): JQL query
- `format` (string): Export format
- `template` (string, optional): Custom template
- `outputPath` (string, optional): Output file path

## Confluence Integration

### confluence.page.create
Create Confluence pages with rich content.

**Parameters:**
- `spaceKey` (string): Space key
- `title` (string): Page title
- `body` (object): Page body content
- `parentId` (string, optional): Parent page ID

### confluence.page.update
Update existing pages with version control.

**Parameters:**
- `pageId` (string): Page ID
- `title` (string, optional): New title
- `body` (object, optional): New body content
- `version` (number): Current version number

### confluence.page.get
Retrieve page content and metadata.

**Parameters:**
- `pageId` (string): Page ID
- `expand` (array, optional): Additional data to expand

### confluence.space.create
Create new Confluence spaces with permissions.

**Parameters:**
- `key` (string): Space key
- `name` (string): Space name
- `description` (string, optional): Space description
- `permissions` (array, optional): Space permissions

### confluence.jira.link
Link Jira issues to Confluence pages.

**Parameters:**
- `pageId` (string): Confluence page ID
- `issueKey` (string): Jira issue key
- `linkType` (string, optional): Type of link

### confluence.documentation.create
Auto-generate documentation from Jira data.

**Parameters:**
- `projectKey` (string): Jira project key
- `spaceKey` (string): Confluence space key
- `template` (string, optional): Documentation template

### confluence.pages.search
Search pages across spaces with advanced filters.

**Parameters:**
- `cql` (string): Confluence Query Language string
- `start` (number, optional): Starting index
- `limit` (number, optional): Maximum results

### confluence.spaces.get
List and filter Confluence spaces.

**Parameters:**
- `spaceKeys` (array, optional): Specific space keys
- `type` (string, optional): Space type filter
- `status` (string, optional): Space status filter

### confluence.space.permissions.get
Retrieve space permissions and access controls.

**Parameters:**
- `spaceKey` (string): Space key

## Automation Engine

### automation.rule.create
Create automation rules with triggers and actions.

**Parameters:**
- `name` (string): Rule name
- `trigger` (object): Trigger configuration
- `actions` (array): Array of actions
- `conditions` (array, optional): Rule conditions

### automation.rule.update
Update existing automation rules.

**Parameters:**
- `ruleId` (string): Rule ID
- `name` (string, optional): New rule name
- `trigger` (object, optional): New trigger configuration
- `actions` (array, optional): New actions

### automation.rule.delete
Delete automation rules with dependency checking.

**Parameters:**
- `ruleId` (string): Rule ID
- `force` (boolean, optional): Force deletion

### automation.rule.get
Retrieve automation rule details and configurations.

**Parameters:**
- `ruleId` (string): Rule ID

### automation.rules.list
List all automation rules with filtering.

**Parameters:**
- `projectKey` (string, optional): Project key filter
- `enabled` (boolean, optional): Enabled status filter
- `startAt` (number, optional): Starting index

### automation.rule.execute
Execute automation rules manually.

**Parameters:**
- `ruleId` (string): Rule ID
- `issueIdOrKey` (string, optional): Issue to execute on
- `context` (object, optional): Execution context

### automation.executions.get
Get automation execution history and logs.

**Parameters:**
- `ruleId` (string): Rule ID
- `startAt` (number, optional): Starting index
- `maxResults` (number, optional): Maximum results

### automation.rule.validate
Validate automation rule syntax and logic.

**Parameters:**
- `rule` (object): Rule configuration to validate
- `projectKey` (string, optional): Project context for validation

## Error Handling

All tools return standardized error responses with the following structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "requestId": "unique-request-id",
      "timestamp": "2024-01-01T00:00:00Z",
      "context": {}
    }
  }
}
```

Common error codes:
- `AUTHENTICATION_ERROR`: Invalid credentials or expired tokens
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid input parameters
- `NOT_FOUND_ERROR`: Resource not found
- `RATE_LIMIT_ERROR`: API rate limit exceeded
- `NETWORK_ERROR`: Network connectivity issues
- `INTERNAL_ERROR`: Server-side errors

## Rate Limiting

The server implements intelligent rate limiting with:
- Automatic retry with exponential backoff
- Request queuing during high load
- Per-endpoint rate limit tracking
- Graceful degradation when limits are reached

## Caching

Built-in caching for improved performance:
- User and project metadata caching
- JQL query result caching
- Custom field configuration caching
- Configurable TTL per cache type
