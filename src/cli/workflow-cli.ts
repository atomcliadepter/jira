
import { Command } from 'commander';
import { config } from 'dotenv';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { WorkflowTransitionManager } from '../tools/workflowTransitionManager.js';
import { WorkflowAnalytics } from '../tools/workflowAnalytics.js';
import { WorkflowReporting } from '../tools/workflowReporting.js';
import { logger } from '../utils/logger.js';
import { configValidator } from '../utils/configValidator.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import customFieldCommand from './customfield-cli.js';
import { createReportCommand } from './commands/report.js';

// Load environment variables
config();

const program = new Command();

program
  .name('jira-workflow')
  .description('Advanced JIRA Workflow Management CLI')
  .version('1.0.0');

// Initialize Jira client
function createJiraClient(): JiraRestClient {
  try {
    const validatedConfig = configValidator.validateEnvironment();
    return new JiraRestClient({
      baseUrl: validatedConfig.JIRA_BASE_URL,
      email: validatedConfig.JIRA_EMAIL,
      apiToken: validatedConfig.JIRA_API_TOKEN,
      oauthAccessToken: validatedConfig.JIRA_OAUTH_ACCESS_TOKEN,
      timeout: Number(validatedConfig.REQUEST_TIMEOUT) || 30000,
      maxRetries: Number(validatedConfig.MAX_RETRIES) || 3,
      retryDelay: Number(validatedConfig.RETRY_DELAY) || 1000,
    });
  } catch (error: any) {
    logger.error('Failed to initialize Jira client', { error: error.message });
    console.error('❌ Configuration error:', error.message);
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
}

// Bulk transition command
program
  .command('bulk-transition')
  .description('Perform bulk transitions on multiple issues')
  .requiredOption('-j, --jql <jql>', 'JQL query to find issues')
  .requiredOption('-t, --transition <id>', 'Transition ID to perform')
  .option('-c, --conditions <file>', 'JSON file containing conditions')
  .option('-f, --fields <json>', 'Fields to update (JSON string)')
  .option('--dry-run', 'Simulate transitions without executing')
  .option('-m, --max-issues <number>', 'Maximum issues to process', '50')
  .option('--comment <text>', 'Comment to add during transition')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const manager = new WorkflowTransitionManager(client);

      let conditions = [];
      if (options.conditions) {
        if (existsSync(options.conditions)) {
          const conditionsData = readFileSync(options.conditions, 'utf8');
          conditions = JSON.parse(conditionsData);
        } else {
          console.error('❌ Conditions file not found:', options.conditions);
          process.exit(1);
        }
      }

      let fields = {};
      if (options.fields) {
        try {
          fields = JSON.parse(options.fields);
        } catch (error) {
          console.error('❌ Invalid JSON in fields option');
          process.exit(1);
        }
      }

      console.log('🚀 Starting bulk transition...');
      console.log(`📋 JQL: ${options.jql}`);
      console.log(`🔄 Transition ID: ${options.transition}`);
      console.log(`🧪 Dry run: ${options.dryRun ? 'Yes' : 'No'}`);

      const result = await manager.bulkTransition({
        jql: options.jql,
        transitionId: options.transition,
        conditions: conditions.length > 0 ? conditions : undefined,
        fields: Object.keys(fields).length > 0 ? fields : undefined,
        dryRun: options.dryRun || false,
        maxIssues: parseInt(options.maxIssues),
        comment: options.comment
      });

      console.log('\n✅ Bulk transition completed!');
      console.log(`📊 Total issues: ${result.total}`);
      console.log(`✅ Successful: ${result.successful}`);
      console.log(`❌ Failed: ${result.failed}`);

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach((error: any) => {
          console.log(`  - ${error.issueKey}: ${error.error}`);
        });
      }

      if (result.transitions.length > 0) {
        console.log('\n🔄 Transitions performed:');
        result.transitions.forEach((transition: any) => {
          console.log(`  - ${transition.issueKey}: ${transition.fromStatus} → ${transition.toStatus}`);
        });
      }

    } catch (error: any) {
      console.error('❌ Bulk transition failed:', error.message);
      logger.error('Bulk transition CLI error', { error: error.message });
      process.exit(1);
    }
  });

// Conditional transition command
program
  .command('conditional-transition')
  .description('Perform conditional transition on a single issue')
  .requiredOption('-i, --issue <key>', 'Issue key or ID')
  .requiredOption('-c, --conditions <file>', 'JSON file containing conditions')
  .requiredOption('-m, --mapping <json>', 'Transition mapping (JSON string)')
  .option('-d, --default <id>', 'Default transition ID')
  .option('-f, --fields <json>', 'Fields to update (JSON string)')
  .option('--comment <text>', 'Comment to add during transition')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const manager = new WorkflowTransitionManager(client);

      // Load conditions
      if (!existsSync(options.conditions)) {
        console.error('❌ Conditions file not found:', options.conditions);
        process.exit(1);
      }
      const conditionsData = readFileSync(options.conditions, 'utf8');
      const conditions = JSON.parse(conditionsData);

      // Parse mapping
      let transitionMapping = {};
      try {
        transitionMapping = JSON.parse(options.mapping);
      } catch (error) {
        console.error('❌ Invalid JSON in mapping option');
        process.exit(1);
      }

      // Parse fields
      let fields = {};
      if (options.fields) {
        try {
          fields = JSON.parse(options.fields);
        } catch (error) {
          console.error('❌ Invalid JSON in fields option');
          process.exit(1);
        }
      }

      console.log('🚀 Starting conditional transition...');
      console.log(`🎫 Issue: ${options.issue}`);

      const result = await manager.conditionalTransition({
        issueIdOrKey: options.issue,
        conditions,
        transitionMapping,
        defaultTransition: options.default,
        fields: Object.keys(fields).length > 0 ? fields : undefined,
        comment: options.comment
      });

      console.log('\n✅ Conditional transition completed!');
      console.log(`🎫 Issue: ${result.issueKey}`);
      console.log(`✅ Conditions met: ${result.conditionsMet ? 'Yes' : 'No'}`);
      console.log(`🔄 Transition: ${result.selectedTransition.name}`);
      console.log(`📊 Status: ${result.selectedTransition.from} → ${result.selectedTransition.to}`);

    } catch (error: any) {
      console.error('❌ Conditional transition failed:', error.message);
      logger.error('Conditional transition CLI error', { error: error.message });
      process.exit(1);
    }
  });

// Workflow validation command
program
  .command('validate')
  .description('Validate workflow configuration for a project')
  .requiredOption('-p, --project <key>', 'Project key')
  .option('-w, --workflow <name>', 'Specific workflow name')
  .option('-t, --issue-types <types>', 'Comma-separated issue types')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const manager = new WorkflowTransitionManager(client);

      const issueTypes = options.issueTypes ? options.issueTypes.split(',') : undefined;

      console.log('🚀 Starting workflow validation...');
      console.log(`📋 Project: ${options.project}`);

      const result = await manager.validateWorkflow({
        projectKey: options.project,
        workflowName: options.workflow,
        issueTypes
      });

      console.log('\n📊 Workflow Validation Results:');
      console.log(`✅ Valid: ${result.valid ? 'Yes' : 'No'}`);
      console.log(`📋 Project: ${result.projectKey}`);
      console.log(`🔄 Workflows found: ${result.workflows.length}`);

      if (result.errors.length > 0) {
        console.log('\n❌ Validation Errors:');
        result.errors.forEach((error: string) => {
          console.log(`  - ${error}`);
        });
      }

      console.log('\n🔄 Workflow Details:');
      result.workflows.forEach((workflow: any) => {
        console.log(`\n  📝 Issue Type: ${workflow.issueType}`);
        console.log(`  📊 Statuses: ${workflow.statuses.length}`);
        workflow.statuses.forEach((status: any) => {
          const transitionCount = status.availableTransitions?.length || 0;
          console.log(`    - ${status.name} (${status.category}) - ${transitionCount} transitions`);
        });
      });

    } catch (error: any) {
      console.error('❌ Workflow validation failed:', error.message);
      logger.error('Workflow validation CLI error', { error: error.message });
      process.exit(1);
    }
  });

// Analytics commands
program
  .command('analytics')
  .description('Generate comprehensive workflow analytics')
  .requiredOption('-j, --jql <jql>', 'JQL query to filter issues')
  .option('-s, --start-date <date>', 'Start date for analysis (YYYY-MM-DD)')
  .option('-e, --end-date <date>', 'End date for analysis (YYYY-MM-DD)')
  .option('-g, --group-by <field>', 'Group metrics by field (assignee, issueType, priority, component)')
  .option('--include-subtasks', 'Include subtasks in analysis')
  .option('--max-results <number>', 'Maximum issues to analyze', '1000')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const analytics = new WorkflowAnalytics(client);

      console.log('📊 Generating workflow analytics...');
      console.log(`📋 JQL: ${options.jql}`);
      if (options.startDate) console.log(`📅 Start Date: ${options.startDate}`);
      if (options.endDate) console.log(`📅 End Date: ${options.endDate}`);

      const result = await analytics.generateWorkflowAnalytics({
        jql: options.jql,
        startDate: options.startDate,
        endDate: options.endDate,
        groupBy: options.groupBy,
        includeSubtasks: options.includeSubtasks || false,
        maxResults: parseInt(options.maxResults)
      });

      console.log('\n📊 Workflow Analytics Summary:');
      console.log('\n🔄 Cycle Time:');
      console.log(`  Median: ${result.summary.cycleTime.median} days`);
      console.log(`  Average: ${result.summary.cycleTime.average} days`);
      console.log(`  85th Percentile: ${result.summary.cycleTime.percentile85} days`);
      console.log(`  Count: ${result.summary.cycleTime.count} issues`);

      console.log('\n⏱️ Lead Time:');
      console.log(`  Median: ${result.summary.leadTime.median} days`);
      console.log(`  Average: ${result.summary.leadTime.average} days`);
      console.log(`  85th Percentile: ${result.summary.leadTime.percentile85} days`);
      console.log(`  Count: ${result.summary.leadTime.count} issues`);

      console.log('\n📈 Throughput:');
      console.log(`  Total Issues: ${result.summary.throughput.total}`);
      console.log(`  Average per Period: ${result.summary.throughput.average.toFixed(1)}`);
      console.log(`  Trend: ${result.summary.throughput.trend}`);

      console.log('\n🔧 Additional Metrics:');
      console.log(`  Work in Progress: ${result.summary.workInProgress.current}`);
      console.log(`  Flow Efficiency: ${result.summary.flowEfficiency}%`);
      console.log(`  Defect Rate: ${result.summary.defectRate}%`);

      console.log('\n💡 Recommendations:');
      result.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });

    } catch (error: any) {
      console.error('❌ Analytics generation failed:', error.message);
      logger.error('Analytics CLI error', { error: error.message });
      process.exit(1);
    }
  });

program
  .command('cycle-time')
  .description('Calculate cycle time metrics')
  .requiredOption('-j, --jql <jql>', 'JQL query to filter issues')
  .option('-s, --start-status <status>', 'Status that marks start of cycle time', 'In Progress')
  .option('-e, --end-status <status>', 'Status that marks end of cycle time', 'Done')
  .option('--start-date <date>', 'Start date for analysis (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date for analysis (YYYY-MM-DD)')
  .option('-g, --group-by <field>', 'Group metrics by field')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const analytics = new WorkflowAnalytics(client);

      console.log('⏱️ Calculating cycle time...');
      console.log(`📋 JQL: ${options.jql}`);
      console.log(`🚀 Start Status: ${options.startStatus}`);
      console.log(`🏁 End Status: ${options.endStatus}`);

      const result = await analytics.calculateCycleTime({
        jql: options.jql,
        startStatus: options.startStatus,
        endStatus: options.endStatus,
        startDate: options.startDate,
        endDate: options.endDate,
        groupBy: options.groupBy
      });

      console.log('\n📊 Cycle Time Metrics:');
      console.log(`  Median: ${result.metrics.median} days`);
      console.log(`  Average: ${result.metrics.average} days`);
      console.log(`  85th Percentile: ${result.metrics.percentile85} days`);
      console.log(`  95th Percentile: ${result.metrics.percentile95} days`);
      console.log(`  Min: ${result.metrics.min} days`);
      console.log(`  Max: ${result.metrics.max} days`);
      console.log(`  Count: ${result.metrics.count} issues`);

      if (result.groupedMetrics) {
        console.log('\n📊 Grouped Metrics:');
        Object.entries(result.groupedMetrics).forEach(([group, metrics]) => {
          console.log(`\n  ${group}:`);
          console.log(`    Median: ${metrics.median} days`);
          console.log(`    Average: ${metrics.average} days`);
          console.log(`    Count: ${metrics.count} issues`);
        });
      }

    } catch (error: any) {
      console.error('❌ Cycle time calculation failed:', error.message);
      logger.error('Cycle time CLI error', { error: error.message });
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Generate workflow reports in various formats')
  .requiredOption('-j, --jql <jql>', 'JQL query to filter issues')
  .option('-f, --format <format>', 'Output format (json, csv, markdown, html)', 'json')
  .option('-o, --output <path>', 'Output file path')
  .option('-s, --start-date <date>', 'Start date for analysis (YYYY-MM-DD)')
  .option('-e, --end-date <date>', 'End date for analysis (YYYY-MM-DD)')
  .option('-g, --group-by <field>', 'Group metrics by field')
  .option('--no-recommendations', 'Exclude recommendations from report')
  .option('--template <name>', 'Template name for custom formatting')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const reporting = new WorkflowReporting(client);

      console.log('📄 Generating workflow report...');
      console.log(`📋 JQL: ${options.jql}`);
      console.log(`📊 Format: ${options.format}`);
      if (options.output) console.log(`💾 Output: ${options.output}`);

      const result = await reporting.generateReport({
        jql: options.jql,
        format: options.format,
        outputPath: options.output,
        startDate: options.startDate,
        endDate: options.endDate,
        groupBy: options.groupBy,
        includeCharts: false,
        includeRecommendations: options.recommendations !== false,
        templateName: options.template
      });

      console.log('\n✅ Report generated successfully!');
      if (result.reportPath) {
        console.log(`📄 Report saved to: ${result.reportPath}`);
      }
      console.log(`📊 Total issues analyzed: ${result.data.metadata.totalIssues}`);
      console.log(`📅 Date range: ${result.data.metadata.dateRange.start || 'All time'} to ${result.data.metadata.dateRange.end || 'Present'}`);

    } catch (error: any) {
      console.error('❌ Report generation failed:', error.message);
      logger.error('Report CLI error', { error: error.message });
      process.exit(1);
    }
  });

program
  .command('dashboard')
  .description('Generate workflow analytics dashboard')
  .requiredOption('-p, --projects <projects>', 'Comma-separated list of project keys')
  .option('-t, --time-range <range>', 'Time range (7d, 30d, 90d, 180d, 1y)', '30d')
  .option('-m, --metrics <metrics>', 'Comma-separated metrics to include', 'cycleTime,leadTime,throughput')
  .option('-g, --group-by <field>', 'Group metrics by field')
  .option('-o, --output <path>', 'Output directory path', './reports')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const reporting = new WorkflowReporting(client);

      const projects = options.projects.split(',').map((p: string) => p.trim());
      const metrics = options.metrics.split(',').map((m: string) => m.trim());

      console.log('📊 Generating workflow dashboard...');
      console.log(`📋 Projects: ${projects.join(', ')}`);
      console.log(`📅 Time Range: ${options.timeRange}`);
      console.log(`📊 Metrics: ${metrics.join(', ')}`);

      const result = await reporting.generateDashboard({
        projects,
        timeRange: options.timeRange,
        metrics,
        groupBy: options.groupBy,
        outputPath: options.output
      });

      console.log('\n✅ Dashboard generated successfully!');
      if (result.dashboardPath) {
        console.log(`📊 Dashboard saved to: ${result.dashboardPath}`);
      }

      console.log('\n📊 Project Summary:');
      Object.entries(result.data).forEach(([project, data]) => {
        console.log(`\n  ${project}:`);
        console.log(`    Total Issues: ${data.metadata.totalIssues}`);
        console.log(`    Cycle Time (median): ${data.summary.cycleTime.median} days`);
        console.log(`    Lead Time (median): ${data.summary.leadTime.median} days`);
        console.log(`    Throughput: ${data.summary.throughput.total} issues`);
      });

    } catch (error: any) {
      console.error('❌ Dashboard generation failed:', error.message);
      logger.error('Dashboard CLI error', { error: error.message });
      process.exit(1);
    }
  });

program
  .command('export')
  .description('Export issues with analytics data')
  .requiredOption('-j, --jql <jql>', 'JQL query to filter issues')
  .option('-f, --format <format>', 'Export format (csv, json)', 'csv')
  .option('-o, --output <path>', 'Output file path')
  .option('--include-history', 'Include detailed status history')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const reporting = new WorkflowReporting(client);

      console.log('📤 Exporting issues with analytics...');
      console.log(`📋 JQL: ${options.jql}`);
      console.log(`📊 Format: ${options.format}`);

      const result = await reporting.exportIssuesWithAnalytics({
        jql: options.jql,
        format: options.format,
        outputPath: options.output,
        includeStatusHistory: options.includeHistory || false
      });

      console.log('\n✅ Export completed successfully!');
      if (result.exportPath) {
        console.log(`📄 Export saved to: ${result.exportPath}`);
      }
      console.log(`📊 Total issues exported: ${result.data.length}`);

    } catch (error: any) {
      console.error('❌ Export failed:', error.message);
      logger.error('Export CLI error', { error: error.message });
      process.exit(1);
    }
  });

// Add custom field management commands
program.addCommand(customFieldCommand);

// Health check command
program
  .command('health')
  .description('Check JIRA connection and authentication')
  .action(async () => {
    try {
      const client = createJiraClient();
      
      console.log('🔍 Checking JIRA connection...');
      
      // Test basic connectivity
      const myself = await client.get('/rest/api/3/myself');
      console.log(`✅ Connected as: ${myself.displayName} (${myself.emailAddress})`);
      
      // Test permissions
      const permissions = await client.get('/rest/api/3/mypermissions');
      console.log(`✅ Permissions loaded: ${Object.keys(permissions.permissions).length} permissions`);
      
      console.log('✅ JIRA connection is healthy!');
      
    } catch (error: any) {
      console.error('❌ JIRA connection failed:', error.message);
      logger.error('Health check failed', { error: error.message });
      process.exit(1);
    }
  });

// Add custom field management commands
program.addCommand(customFieldCommand);

// Add advanced reporting commands
const client = createJiraClient();
program.addCommand(createReportCommand(client));

// Parse command line arguments
program.parse();
