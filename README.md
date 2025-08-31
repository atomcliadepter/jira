
# Enhanced MCP Jira REST Server

A comprehensive, enterprise-grade Model Context Protocol (MCP) server for Jira and Confluence that provides advanced workflow management, analytics, automation, and custom field capabilities using official REST API endpoints.

## Features

### Core Functionality
- **Direct REST API Integration**: Uses official Jira Cloud REST API v3 and Confluence REST API
- **111 Professional Tools**: Complete enterprise solution for Jira and Confluence management
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

#### Issue Link Management (5 tools) ✨ NEW - Phase 1
- `issuelink.create` - Create links between issues with validation
- `issuelink.get` - Retrieve issue link details and metadata
- `issuelink.delete` - Remove issue links with proper cleanup
- `issuelink.types.list` - List all available issue link types
- `issuelink.remote.create` - Create remote issue links to external resources

#### Attachment Management (6 tools) ✨ NEW - Phase 1
- `attachment.upload` - Upload files to issues with size validation
- `attachment.get` - Retrieve attachment metadata and properties
- `attachment.download` - Download attachment content to local files
- `attachment.delete` - Remove attachments with proper cleanup
- `attachment.metadata.update` - Update attachment metadata (planned)
- `attachment.settings.get` - Get attachment configuration and limits

#### Watchers & Notifications (4 tools) ✨ NEW - Phase 2
- `watchers.add` - Add watchers to issues with user validation
- `watchers.remove` - Remove watchers from issues with proper cleanup
- `watchers.list` - List all watchers of an issue with details
- `notifications.send` - Send custom notifications with flexible recipient targeting

#### Version Management (7 tools) ✨ NEW - Phase 2
- `version.create` - Create new project versions with full configuration
- `version.update` - Update version properties and release status
- `version.delete` - Delete versions with issue migration options
- `version.get` - Retrieve version details with expansion options
- `version.list` - List all project versions with filtering
- `version.move` - Move issues between versions with validation
- `version.merge` - Merge versions with issue consolidation

#### Enhanced Analytics & Reporting (2 tools) ✨ NEW - Phase 3
- `advanced.jql.builder.new` - Interactive JQL query builder with syntax validation
- `advanced.export.data.new` - Export data in multiple formats (JSON, CSV) with custom templates

#### Custom Field Management (10 tools) ✨ NEW - Phase 4
- `customfield.create.new` - Create custom fields with advanced configuration options
- `customfield.update.new` - Update custom field properties and configurations
- `customfield.delete.new` - Delete custom fields with dependency checking
- `customfield.get.new` - Retrieve custom field details and configurations
- `customfield.search.new` - Search custom fields with filtering and sorting
- `customfield.context.create.new` - Create field contexts with project and issue type scoping
- `customfield.options.set.new` - Set field options for select lists and multi-select fields
- `customfield.cascading.set.new` - Configure cascading select field options
- `customfield.validate.new` - Validate field values against field configurations
- `customfield.calculate.new` - Calculate computed field values using expressions

#### Field Configuration Management (9 tools) ✨ NEW - Phase 5
- `fieldconfig.list.new` - List all field configurations with filtering
- `fieldconfig.create.new` - Create new field configurations
- `fieldconfig.update.new` - Update field configuration properties
- `fieldconfig.delete.new` - Delete field configurations with validation
- `fieldconfig.items.update.new` - Update field configuration items and behaviors
- `fieldconfig.scheme.create.new` - Create field configuration schemes
- `fieldconfig.scheme.assign.new` - Assign schemes to projects
- `fieldconfig.validate.new` - Validate field configuration integrity
- `fieldconfig.copy.new` - Copy field configurations between projects

#### Confluence Integration (9 tools) ✨ NEW - Phase 6
- `confluence.page.create` - Create Confluence pages with rich content
- `confluence.page.update` - Update existing pages with version control
- `confluence.page.get` - Retrieve page content and metadata
- `confluence.space.create` - Create new Confluence spaces with permissions
- `confluence.jira.link` - Link Jira issues to Confluence pages
- `confluence.documentation.create` - Auto-generate documentation from Jira data
- `confluence.pages.search` - Search pages across spaces with advanced filters
- `confluence.spaces.get` - List and filter Confluence spaces
- `confluence.space.permissions.get` - Retrieve space permissions and access controls

#### Automation Engine (8 tools) ✨ NEW - Phase 7
- `automation.rule.create` - Create automation rules with triggers and actions
- `automation.rule.update` - Update existing automation rules
- `automation.rule.delete` - Delete automation rules with dependency checking
- `automation.rule.get` - Retrieve automation rule details and configurations
- `automation.rules.list` - List all automation rules with filtering
- `automation.rule.execute` - Execute automation rules manually
- `automation.executions.get` - Get automation execution history and logs
- `automation.rule.validate` - Validate automation rule syntax and logic

#### Advanced Reporting & Analytics (5 tools) ✨ NEW - Phase 8
- `advanced.dashboard.metrics.enhanced` - Generate dashboard metrics with KPIs and trend analysis
- `advanced.burndown.chart.enhanced` - Create burndown charts with sprint analysis and forecasting
- `advanced.velocity.tracking.enhanced` - Track team velocity with trend analysis and predictions
- `advanced.jql.builder.enhanced` - Enhanced interactive JQL query builder with advanced validation
- `advanced.export.data.enhanced` - Export data in multiple formats with custom templates and filtering

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

### Advanced Features
- **Comprehensive Monitoring**: Real-time metrics collection with Prometheus export
- **Intelligent Error Handling**: Automatic error recovery with circuit breaker pattern
- **Multi-Level Caching**: Advanced caching with intelligent invalidation and warming
- **Performance Optimization**: Request timing, memory monitoring, and bottleneck detection
- **Health Monitoring**: Built-in health checks and system monitoring at `/health` and `/metrics` (port 9090)
- **Observability**: Detailed logging, metrics, and performance analytics

### Recent Updates (v1.8.0) ✨ Phase 8 Complete
- ✅ **Advanced Reporting & Analytics**: 5 new enhanced tools for comprehensive analytics
- ✅ **Dashboard Metrics**: Generate KPIs with trend analysis and priority breakdowns
- ✅ **Burndown Charts**: Create sprint burndown charts with forecasting capabilities
- ✅ **Velocity Tracking**: Track team velocity with trend analysis and predictions
- ✅ **Enhanced JQL Builder**: Advanced JQL query builder with syntax validation
- ✅ **Enhanced Data Export**: Export data in multiple formats with custom templates
- ✅ **Production Ready**: All Phase 8 tools tested and validated

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
MCP_SERVER_VERSION=1.0.1
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

## Advanced Features

### Monitoring & Observability

The Enhanced MCP Jira REST Server includes comprehensive monitoring capabilities:

#### Metrics Collection
- **Performance Metrics**: Request timing, throughput, and latency tracking
- **System Metrics**: Memory usage, CPU utilization, and event loop monitoring
- **Business Metrics**: Tool execution rates, success/failure ratios, and user activity
- **Custom Metrics**: Extensible metrics system for domain-specific monitoring

#### Health Monitoring
```bash
# Built-in health checks
- JIRA connection status
- Confluence connection status
- Memory usage monitoring
- Event loop lag detection
- Circuit breaker status
```

#### Prometheus Integration
```bash
# Export metrics in Prometheus format
GET /metrics

# Example metrics
mcp_tool_executions_total{tool="issue.create",success="true"} 150
mcp_tool_execution_duration_ms{tool="issue.create"} 245.5
mcp_cache_hits_total 1250
mcp_cache_misses_total 85
```

### Error Handling & Recovery

Advanced error management with automatic recovery:

#### Error Categories
- **Network Errors**: Automatic retry with exponential backoff
- **Authentication Errors**: Token refresh and re-authentication
- **Rate Limiting**: Intelligent backoff and request queuing
- **Validation Errors**: Input sanitization and correction
- **System Errors**: Graceful degradation and failover

#### Circuit Breaker Pattern
```typescript
// Automatic circuit breaking for failing operations
- Failure threshold: 5 consecutive failures
- Recovery timeout: 60 seconds
- Half-open state testing
- Automatic recovery on success
```

#### Recovery Strategies
- **Network Retry**: Exponential backoff for transient failures
- **Rate Limit Backoff**: Intelligent waiting for rate limit reset
- **Authentication Refresh**: Automatic token renewal
- **Data Sanitization**: Input validation and correction

### Intelligent Caching

Multi-level caching system with advanced features:

#### Cache Features
- **TTL-based Expiration**: Configurable time-to-live for entries
- **Tag-based Invalidation**: Bulk invalidation by tags
- **LRU Eviction**: Least Recently Used eviction policy
- **Compression**: Automatic compression for large entries
- **Cache Warming**: Proactive cache population
- **Statistics**: Detailed hit/miss ratios and performance metrics

#### Cache Usage
```typescript
// Cache with tags for easy invalidation
await cacheManager.set('user:123', userData, {
  ttl: 300000, // 5 minutes
  tags: ['user', 'profile'],
  compress: true
});

// Invalidate all user-related cache entries
cacheManager.invalidateByTags(['user']);

// Get-or-set pattern
const userData = await cacheManager.getOrSet(
  'user:123',
  async () => fetchUserFromAPI(),
  { ttl: 300000, tags: ['user'] }
);
```

### Performance Optimization

#### Request Optimization
- **Connection Pooling**: Efficient HTTP connection management
- **Request Batching**: Combine multiple operations
- **Parallel Processing**: Concurrent request execution
- **Response Streaming**: Memory-efficient large data handling

#### Memory Management
- **Garbage Collection Monitoring**: Track memory usage patterns
- **Memory Leak Detection**: Automatic leak detection and reporting
- **Resource Cleanup**: Proper cleanup of connections and handles
- **Memory Pressure Handling**: Adaptive behavior under memory constraints

#### Performance Benchmarks
- **Tool Registration**: < 100ms for 111 tools
- **Tool Lookup**: < 10ms for 1000 operations
- **Memory Usage**: < 50MB increase under load
- **Concurrent Operations**: 50 operations < 100ms
- **Cache Access**: < 1ms average access time
- **Error Recovery**: < 5s average recovery time

### Security Enhancements

#### Input Validation
- **XSS Prevention**: HTML sanitization and encoding
- **SQL Injection Protection**: Parameterized queries and validation
- **Path Traversal Prevention**: File path sanitization
- **Data Size Limits**: Protection against large payload attacks

#### Authentication Security
- **Token Validation**: Format and expiration checking
- **Rate Limiting**: Per-user and per-operation limits
- **Audit Logging**: Security event tracking
- **Error Information Disclosure**: Sanitized error messages

#### Configuration Security
- **HTTPS Enforcement**: Secure communication requirements
- **Secure Defaults**: Security-first default configurations
- **Environment Validation**: Runtime security checks
- **Secrets Management**: Secure handling of sensitive data

## Production Deployment

The Enhanced MCP Jira REST Server is production-ready with enterprise-grade features:

### Deployment Options

#### Docker Deployment
```bash
# Build and run with Docker
docker build -f deployment/docker/Dockerfile -t mcp-jira-server:1.0.0 .
docker run -d --name mcp-jira-server --env-file .env -p 3000:3000 mcp-jira-server:1.0.0

# Or use Docker Compose
cd deployment/docker && docker-compose up -d
```

#### Kubernetes Deployment
```bash
# Deploy to Kubernetes
kubectl create namespace mcp-system
kubectl apply -f deployment/k8s/deployment.yaml

# With monitoring stack
kubectl apply -f deployment/k8s/
```

### Production Features

#### Enterprise Monitoring
- **Prometheus Metrics**: Industry-standard metrics collection
- **Health Endpoints**: `/health`, `/ready`, `/live`, `/metrics`
- **Performance Analytics**: Real-time performance tracking
- **Alert Rules**: Comprehensive alerting for production issues
- **Grafana Dashboards**: Pre-built visualization dashboards

#### High Availability
- **Horizontal Scaling**: Auto-scaling based on CPU/memory
- **Load Balancing**: Built-in support for load balancers
- **Circuit Breakers**: Automatic failure protection
- **Graceful Shutdown**: Proper cleanup on termination
- **Rolling Updates**: Zero-downtime deployments

#### Security & Compliance
- **Non-root Containers**: Security-hardened container images
- **Read-only Filesystem**: Immutable container filesystem
- **Secret Management**: Kubernetes secrets integration
- **TLS Termination**: HTTPS-only communication
- **Rate Limiting**: DoS protection and throttling

#### Performance Optimization
- **Multi-level Caching**: Intelligent caching with compression
- **Connection Pooling**: Efficient HTTP connection management
- **Memory Management**: Automatic garbage collection optimization
- **Resource Limits**: Configurable CPU and memory limits
- **Load Testing**: Comprehensive performance validation

### Monitoring & Observability

#### Real-time Metrics
- Tool execution rates and success ratios
- Response time percentiles (P50, P95, P99)
- Error rates by category and severity
- Cache hit/miss ratios and performance
- Memory usage and garbage collection
- Circuit breaker states and recovery

#### Health Monitoring
- Application health status
- JIRA/Confluence connectivity
- System resource utilization
- Event loop lag monitoring
- Error recovery statistics

#### Alerting
- Service availability alerts
- Performance degradation alerts
- Error rate threshold alerts
- Resource utilization alerts
- Security incident alerts

### Load Testing & Performance

#### Benchmarked Performance
- **Throughput**: 100+ requests/second sustained
- **Response Time**: < 500ms (95th percentile)
- **Concurrent Users**: 200+ simultaneous connections
- **Memory Efficiency**: < 512MB under normal load
- **Error Rate**: < 1% under stress conditions

#### Load Testing Suite
```bash
# Run comprehensive load tests
npm run test:load
npm run test:stress
npm run test:performance
```

### Configuration Management

#### Environment Variables
```bash
# Production configuration
NODE_ENV=production
LOG_LEVEL=info
METRICS_ENABLED=true
CACHE_MAX_SIZE=104857600
RATE_LIMIT_MAX=100
```

#### Kubernetes Configuration
- ConfigMaps for application settings
- Secrets for sensitive credentials
- Resource quotas and limits
- Network policies and security contexts
- Ingress controllers and TLS certificates

### Deployment Guide

For detailed production deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md):

- Prerequisites and system requirements
- Environment configuration and secrets
- Docker and Kubernetes deployment steps
- Monitoring and alerting setup
- Security configuration and hardening
- Performance tuning and optimization
- Troubleshooting and maintenance

### Production Checklist

- [ ] Environment variables configured
- [ ] Secrets properly managed
- [ ] Health checks responding
- [ ] Metrics being collected
- [ ] Alerts configured and tested
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Backup and recovery tested
- [ ] Documentation updated
- [ ] Team training completed

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

### Tool Examples

#### Create an Issue Link
```json
{
  "name": "issuelink.create",
  "arguments": {
    "type": { "name": "Relates" },
    "inwardIssue": { "key": "PROJ-123" },
    "outwardIssue": { "key": "PROJ-456" }
  }
}
```

#### Upload an Attachment
```json
{
  "name": "attachment.upload",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "filePath": "/path/to/file.pdf",
    "filename": "requirements.pdf"
  }
}
```

#### Create a Remote Issue Link
```json
{
  "name": "issuelink.remote.create",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "object": {
      "url": "https://github.com/user/repo/pull/42",
      "title": "Pull Request #42"
    }
  }
}
```

#### Create a Project Version
```json
{
  "name": "version.create",
  "arguments": {
    "name": "v2.0.0",
    "projectId": "10001",
    "description": "Major release version",
    "releaseDate": "2024-12-31"
  }
}
```

#### Add Issue Watcher
```json
{
  "name": "watchers.add",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "accountId": "user-account-id"
  }
}
```

#### Send Custom Notification
```json
{
  "name": "notifications.send",
  "arguments": {
    "issueIdOrKey": "PROJ-123",
    "subject": "Issue Update Notification",
    "textBody": "The issue has been updated with new information",
    "to": {
      "users": [{"accountId": "user-account-id"}],
      "watchers": true
    }
  }
}
```

#### Build JQL Query
```json
{
  "name": "advanced.jql.builder.new",
  "arguments": {
    "project": "PROJ",
    "issueType": "Task",
    "status": "In Progress",
    "priority": "High",
    "createdAfter": "2024-01-01"
  }
}
```

#### Export Data to CSV
```json
{
  "name": "advanced.export.data.new",
  "arguments": {
    "jql": "project = PROJ AND resolved >= -30d",
    "format": "csv",
    "outputPath": "./reports/monthly-report.csv",
    "maxResults": 1000
  }
}
```

#### Create Custom Field
```json
{
  "name": "customfield.create.new",
  "arguments": {
    "name": "Story Points",
    "type": "com.atlassian.jira.plugin.system.customfieldtypes:float",
    "description": "Estimation field for story points"
  }
}
```

#### Search Custom Fields
```json
{
  "name": "customfield.search.new",
  "arguments": {
    "query": "story",
    "maxResults": 10,
    "startAt": 0
  }
}
```

#### Validate Custom Field Value
```json
{
  "name": "customfield.validate.new",
  "arguments": {
    "fieldId": "customfield_10016",
    "value": 5,
    "issueId": "PROJ-123"
  }
}
```

#### List Field Configurations
```json
{
  "name": "fieldconfig.list.new",
  "arguments": {
    "maxResults": 10,
    "startAt": 0
  }
}
```

#### Create Field Configuration
```json
{
  "name": "fieldconfig.create.new",
  "arguments": {
    "name": "Development Configuration",
    "description": "Field configuration for development projects"
  }
}
```

#### Validate Field Configuration
```json
{
  "name": "fieldconfig.validate.new",
  "arguments": {
    "id": 10000
  }
}
```

#### Copy Field Configuration
```json
{
  "name": "fieldconfig.copy.new",
  "arguments": {
    "sourceId": 10000,
    "name": "Copied Configuration",
    "description": "Copy of existing configuration"
  }
}
```

#### Create Confluence Page
```json
{
  "name": "confluence.page.create",
  "arguments": {
    "spaceKey": "DEV",
    "title": "API Documentation",
    "body": "<h1>API Documentation</h1><p>This page contains API documentation.</p>"
  }
}
```

#### Link Jira Issue to Confluence
```json
{
  "name": "confluence.jira.link",
  "arguments": {
    "issueKey": "PROJ-123",
    "pageId": "123456789"
  }
}
```

#### Auto-Generate Documentation
```json
{
  "name": "confluence.documentation.create",
  "arguments": {
    "spaceKey": "DOC",
    "projectKey": "PROJ",
    "title": "Project Documentation",
    "includeIssues": true
  }
}
```

#### Search Confluence Pages
```json
{
  "name": "confluence.pages.search",
  "arguments": {
    "cql": "space = DEV AND type = page",
    "limit": 25
  }
}
```

#### Create Automation Rule
```json
{
  "name": "automation.rule.create",
  "arguments": {
    "name": "Auto-assign Task",
    "description": "Automatically assign tasks to team lead",
    "trigger": {
      "component": "TRIGGER",
      "type": "jira.issue.event.trigger"
    },
    "actions": [
      {
        "component": "ACTION",
        "type": "jira.issue.assign"
      }
    ]
  }
}
```

#### Execute Automation Rule
```json
{
  "name": "automation.rule.execute",
  "arguments": {
    "ruleId": "12345",
    "issueKey": "PROJ-123"
  }
}
```

#### List Automation Rules
```json
{
  "name": "automation.rules.list",
  "arguments": {
    "maxResults": 25,
    "projectKey": "PROJ"
  }
}
```

#### Validate Automation Rule
```json
{
  "name": "automation.rule.validate",
  "arguments": {
    "ruleId": "12345"
  }
}
```

#### Generate Dashboard Metrics
```json
{
  "name": "advanced.dashboard.metrics.enhanced",
  "arguments": {
    "projectKeys": ["PROJ1", "PROJ2"],
    "timeRange": "30d",
    "metrics": ["resolution_rate", "velocity", "burndown"]
  }
}
```

#### Create Burndown Chart
```json
{
  "name": "advanced.burndown.chart.enhanced",
  "arguments": {
    "projectKey": "PROJ",
    "sprintId": "123",
    "startDate": "2024-01-01",
    "endDate": "2024-01-14"
  }
}
```

#### Track Team Velocity
```json
{
  "name": "advanced.velocity.tracking.enhanced",
  "arguments": {
    "projectKey": "PROJ",
    "sprintCount": 6,
    "teamId": "team-123"
  }
}
```

#### Enhanced JQL Builder
```json
{
  "name": "advanced.jql.builder.enhanced",
  "arguments": {
    "project": "PROJ",
    "issueType": "Story",
    "status": "In Progress",
    "labels": ["frontend", "urgent"],
    "createdAfter": "2024-01-01",
    "validate": true
  }
}
```

#### Enhanced Data Export
```json
{
  "name": "advanced.export.data.enhanced",
  "arguments": {
    "jql": "project = PROJ AND resolved >= -30d",
    "format": "csv",
    "outputPath": "./reports/monthly-report.csv",
    "fields": ["key", "summary", "status", "assignee"],
    "maxResults": 1000
  }
}
```

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
2. **Comprehensive Tool Set**: 111 tools instead of basic functionality
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

## Development & Testing

### Building
```bash
npm run build
```

### Comprehensive Testing Suite

The Enhanced MCP Jira REST Server includes a comprehensive test suite with multiple testing strategies:

#### Test Categories

**Unit Tests**
```bash
npm run test:unit
```
- Individual component testing
- Mock-based isolation
- Fast execution
- High coverage requirements

**Integration Tests**  
```bash
npm run test:integration
```
- Component interaction testing
- Real API simulation
- End-to-end workflows
- Error handling validation

**End-to-End Tests**
```bash
npm run test:e2e-new
```
- Complete system testing
- MCP protocol validation
- Tool registration verification
- Performance benchmarking

**Security Tests**
```bash
npm run test:security
```
- Input validation testing
- Authentication security
- XSS/injection prevention
- Data sanitization

**Performance Tests**
```bash
npm run test:performance
```
- Load testing
- Memory usage validation
- Concurrent operation testing
- Resource cleanup verification

**Automation Tests**
```bash
npm run test:automation
```
- Automation tool validation
- Rule execution testing
- Trigger/action verification
- Metrics collection testing

**CLI Tests**
```bash
npm run test:cli
```
- CLI executable validation
- Command-line interface testing
- Help/version verification
- Error handling testing

#### Running Tests

**All Tests with Coverage**
```bash
npm run test:all
npm run test:coverage
```

**Continuous Integration**
```bash
npm run test:ci
```

**Watch Mode (Development)**
```bash
npm run test:watch
```

**Debug Mode**
```bash
npm run test:debug
```

#### Test Results

Test results are generated in multiple formats:
- **Console Output**: Real-time test execution
- **JUnit XML**: `test-results/junit.xml` (CI integration)
- **HTML Report**: `test-results/test-report.html` (detailed view)
- **Coverage Report**: `coverage/` directory (lcov, html)
- **JSON Summary**: `test-results/test-summary.json`

#### Coverage Requirements

- **Lines**: 80% minimum
- **Functions**: 80% minimum  
- **Branches**: 80% minimum
- **Statements**: 80% minimum

### Linting & Type Checking

```bash
npm run lint:check      # Check for linting issues
npm run lint            # Fix linting issues automatically
npm run type-check      # TypeScript type checking
npm run validate        # Run all validation (lint + type + test)
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
