
import { Command } from 'commander';
import { JiraRestClient } from '../../http/JiraRestClient.js';
import { AdvancedReporting } from '../../analytics/advancedReporting.js';
import { ScheduledReporting } from '../../analytics/scheduledReporting.js';
import { logger } from '../../utils/logger.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function createReportCommand(client: JiraRestClient): Command {
  const reportCmd = new Command('report');
  reportCmd.description('Advanced reporting and analytics commands');

  // JQL Query Builder command
  reportCmd
    .command('jql-builder')
    .description('Build advanced JQL queries with complex operators')
    .option('-p, --project <project>', 'Project key')
    .option('-t, --issue-types <types>', 'Issue types (comma-separated)')
    .option('-s, --statuses <statuses>', 'Statuses (comma-separated)')
    .option('-a, --assignees <assignees>', 'Assignees (comma-separated)')
    .option('--priority <priorities>', 'Priorities (comma-separated)')
    .option('--labels <labels>', 'Labels (comma-separated)')
    .option('--components <components>', 'Components (comma-separated)')
    .option('--created-from <date>', 'Created from date (YYYY-MM-DD)')
    .option('--created-to <date>', 'Created to date (YYYY-MM-DD)')
    .option('--updated-from <date>', 'Updated from date (YYYY-MM-DD)')
    .option('--updated-to <date>', 'Updated to date (YYYY-MM-DD)')
    .option('--custom-fields <json>', 'Custom fields as JSON string')
    .option('--and <clauses>', 'AND clauses (comma-separated)')
    .option('--or <clauses>', 'OR clauses (comma-separated)')
    .option('--not <clauses>', 'NOT clauses (comma-separated)')
    .option('--order-by <field:direction>', 'Order by field and direction (e.g., created:DESC)')
    .option('--max-results <number>', 'Maximum results', '1000')
    .action(async (options) => {
      try {
        console.log('🔍 Building advanced JQL query...');
        
        const reporting = new AdvancedReporting(client);
        
        const args: any = {
          maxResults: parseInt(options.maxResults)
        };

        if (options.project) args.project = options.project;
        if (options.issueTypes) args.issueType = options.issueTypes.split(',');
        if (options.statuses) args.status = options.statuses.split(',');
        if (options.assignees) args.assignee = options.assignees.split(',');
        if (options.priority) args.priority = options.priority.split(',');
        if (options.labels) args.labels = options.labels.split(',');
        if (options.components) args.components = options.components.split(',');

        if (options.createdFrom || options.createdTo) {
          args.createdDate = {};
          if (options.createdFrom) args.createdDate.from = options.createdFrom;
          if (options.createdTo) args.createdDate.to = options.createdTo;
        }

        if (options.updatedFrom || options.updatedTo) {
          args.updatedDate = {};
          if (options.updatedFrom) args.updatedDate.from = options.updatedFrom;
          if (options.updatedTo) args.updatedDate.to = options.updatedTo;
        }

        if (options.customFields) {
          args.customFields = JSON.parse(options.customFields);
        }

        if (options.and || options.or || options.not) {
          args.advancedOperators = {};
          if (options.and) args.advancedOperators.and = options.and.split(',');
          if (options.or) args.advancedOperators.or = options.or.split(',');
          if (options.not) args.advancedOperators.not = options.not.split(',');
        }

        if (options.orderBy) {
          const [field, direction] = options.orderBy.split(':');
          args.orderBy = [{ field, direction: direction || 'ASC' }];
        }

        const result = await reporting.buildJQLQuery(args);
        
        console.log('\n📋 Generated JQL Query:');
        console.log(`${result.jql}\n`);
        
        console.log('📊 Query Metadata:');
        console.log(`- Total clauses: ${result.metadata.totalClauses}`);
        console.log(`- Has date filters: ${result.metadata.hasDateFilters}`);
        console.log(`- Has custom fields: ${result.metadata.hasCustomFields}`);
        console.log(`- Has advanced operators: ${result.metadata.hasAdvancedOperators}`);
        console.log(`- Max results: ${result.metadata.maxResults}`);

      } catch (error: any) {
        console.error('❌ Error building JQL query:', error.message);
        logger.error('JQL builder command failed', { error: error.message });
        process.exit(1);
      }
    });

  // Dashboard Metrics command
  reportCmd
    .command('dashboard')
    .description('Generate real-time dashboard metrics and KPIs')
    .requiredOption('-p, --project <project>', 'Project key')
    .requiredOption('--from <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--metrics <metrics>', 'Metrics to include (comma-separated)', 'velocity,burndown,cycleTime,throughput')
    .option('--refresh <seconds>', 'Refresh interval in seconds', '300')
    .option('--export <format>', 'Export format (json, csv)', 'json')
    .action(async (options) => {
      try {
        console.log('📊 Generating dashboard metrics...');
        
        const reporting = new AdvancedReporting(client);
        
        const args = {
          projectKey: options.project,
          timeRange: {
            from: options.from,
            to: options.to
          },
          refreshInterval: parseInt(options.refresh),
          includeMetrics: options.metrics.split(',')
        };

        const metrics = await reporting.generateDashboardMetrics(args);
        
        if (options.export === 'json') {
          const exportResult = await reporting.exportData({
            format: 'json',
            data: metrics,
            filename: `dashboard-metrics-${options.project}-${new Date().toISOString().split('T')[0]}`,
            includeCharts: true,
            includeMetadata: true
          });
          console.log(`✅ Dashboard metrics exported to: ${exportResult.filePath}`);
        } else {
          console.log('\n📈 Dashboard Metrics:');
          console.log(JSON.stringify(metrics, null, 2));
        }

      } catch (error: any) {
        console.error('❌ Error generating dashboard metrics:', error.message);
        logger.error('Dashboard metrics command failed', { error: error.message });
        process.exit(1);
      }
    });

  // Burndown Chart command
  reportCmd
    .command('burndown')
    .description('Generate burndown charts for sprints, releases, or epics')
    .requiredOption('-p, --project <project>', 'Project key')
    .requiredOption('--start <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--end <date>', 'End date (YYYY-MM-DD)')
    .option('--sprint <id>', 'Sprint ID')
    .option('--type <type>', 'Chart type (sprint, release, epic)', 'sprint')
    .option('--include-scope', 'Include scope changes', false)
    .option('--include-weekends', 'Include weekends', false)
    .option('--export <format>', 'Export format (json, csv, pdf)', 'json')
    .action(async (options) => {
      try {
        console.log('📉 Generating burndown chart...');
        
        const reporting = new AdvancedReporting(client);
        
        const args = {
          projectKey: options.project,
          startDate: options.start,
          endDate: options.end,
          sprintId: options.sprint,
          chartType: options.type,
          includeScope: options.includeScope,
          includeWeekends: options.includeWeekends
        };

        const burndownData = await reporting.generateBurndownChart(args);
        
        const exportResult = await reporting.exportData({
          format: options.export,
          data: burndownData,
          filename: `burndown-${options.project}-${options.start}-${options.end}`,
          includeCharts: true,
          includeMetadata: true
        });

        console.log(`✅ Burndown chart exported to: ${exportResult.filePath}`);

      } catch (error: any) {
        console.error('❌ Error generating burndown chart:', error.message);
        logger.error('Burndown chart command failed', { error: error.message });
        process.exit(1);
      }
    });

  // Velocity Tracking command
  reportCmd
    .command('velocity')
    .description('Track velocity and sprint analytics')
    .requiredOption('-p, --project <project>', 'Project key')
    .option('--team <id>', 'Team ID')
    .option('--sprints <count>', 'Number of sprints to analyze', '10')
    .option('--include-commitment', 'Include commitment data', true)
    .option('--include-completed', 'Include completed data', true)
    .option('--story-point-field <field>', 'Story point field name')
    .option('--export <format>', 'Export format (json, csv, excel)', 'json')
    .action(async (options) => {
      try {
        console.log('🏃 Tracking velocity...');
        
        const reporting = new AdvancedReporting(client);
        
        const args = {
          projectKey: options.project,
          teamId: options.team,
          sprintCount: parseInt(options.sprints),
          includeCommitment: options.includeCommitment,
          includeCompleted: options.includeCompleted,
          storyPointField: options.storyPointField
        };

        const velocityData = await reporting.trackVelocity(args);
        
        const exportResult = await reporting.exportData({
          format: options.export,
          data: velocityData,
          filename: `velocity-${options.project}-${new Date().toISOString().split('T')[0]}`,
          includeCharts: true,
          includeMetadata: true
        });

        console.log(`✅ Velocity data exported to: ${exportResult.filePath}`);

      } catch (error: any) {
        console.error('❌ Error tracking velocity:', error.message);
        logger.error('Velocity tracking command failed', { error: error.message });
        process.exit(1);
      }
    });

  // Export command
  reportCmd
    .command('export')
    .description('Export data in various formats')
    .requiredOption('-f, --format <format>', 'Export format (csv, pdf, excel, json)')
    .requiredOption('-q, --query <jql>', 'JQL query to export')
    .option('-o, --output <filename>', 'Output filename (without extension)')
    .option('--include-charts', 'Include charts in export', false)
    .option('--include-metadata', 'Include metadata in export', true)
    .option('--max-results <number>', 'Maximum results', '1000')
    .action(async (options) => {
      try {
        console.log('📤 Exporting data...');
        
        // First, get the data using the JQL query
        const response = await client.searchIssues(options.query, {
          maxResults: parseInt(options.maxResults),
          fields: ['summary', 'status', 'assignee', 'created', 'updated', 'priority', 'issuetype']
        });

        const reporting = new AdvancedReporting(client);
        
        const exportResult = await reporting.exportData({
          format: options.format,
          data: response.issues,
          filename: options.output,
          includeCharts: options.includeCharts,
          includeMetadata: options.includeMetadata
        });

        console.log(`✅ Data exported to: ${exportResult.filePath}`);
        console.log(`📊 Exported ${response.issues?.length || 0} issues`);

      } catch (error: any) {
        console.error('❌ Error exporting data:', error.message);
        logger.error('Export command failed', { error: error.message });
        process.exit(1);
      }
    });

  // Scheduled Reports commands
  const scheduledCmd = reportCmd.command('scheduled').description('Manage scheduled reports');

  scheduledCmd
    .command('create')
    .description('Create a new scheduled report')
    .requiredOption('-n, --name <name>', 'Report name')
    .requiredOption('-q, --query <jql>', 'JQL query or query file path')
    .requiredOption('-f, --format <format>', 'Export format (csv, pdf, excel)')
    .requiredOption('--frequency <freq>', 'Frequency (daily, weekly, monthly)')
    .requiredOption('--time <time>', 'Time to run (HH:MM)')
    .option('-d, --description <desc>', 'Report description')
    .option('--day-of-week <day>', 'Day of week for weekly reports (0-6)')
    .option('--day-of-month <day>', 'Day of month for monthly reports (1-31)')
    .option('--recipients <emails>', 'Email recipients (comma-separated)')
    .option('--timezone <tz>', 'Timezone', 'UTC')
    .action(async (options) => {
      try {
        console.log('📅 Creating scheduled report...');
        
        const scheduledReporting = new ScheduledReporting(client);
        
        let query = options.query;
        // Check if query is a file path
        if (existsSync(options.query)) {
          query = JSON.parse(readFileSync(options.query, 'utf8'));
        } else {
          // Assume it's a JQL string
          query = { jql: options.query };
        }

        const reportConfig = {
          name: options.name,
          description: options.description,
          query,
          format: options.format,
          schedule: {
            frequency: options.frequency,
            time: options.time,
            dayOfWeek: options.dayOfWeek ? parseInt(options.dayOfWeek) : undefined,
            dayOfMonth: options.dayOfMonth ? parseInt(options.dayOfMonth) : undefined,
            timezone: options.timezone
          },
          recipients: options.recipients ? options.recipients.split(',') : undefined,
          enabled: true
        };

        const report = await scheduledReporting.createScheduledReport(reportConfig);
        
        console.log(`✅ Scheduled report created with ID: ${report.id}`);
        console.log(`📅 Next run: ${report.nextRun}`);

      } catch (error: any) {
        console.error('❌ Error creating scheduled report:', error.message);
        logger.error('Create scheduled report command failed', { error: error.message });
        process.exit(1);
      }
    });

  scheduledCmd
    .command('list')
    .description('List all scheduled reports')
    .option('--enabled-only', 'Show only enabled reports', false)
    .action(async (options) => {
      try {
        const scheduledReporting = new ScheduledReporting(client);
        let reports = scheduledReporting.getScheduledReports();
        
        if (options.enabledOnly) {
          reports = reports.filter(r => r.enabled);
        }

        if (reports.length === 0) {
          console.log('📋 No scheduled reports found');
          return;
        }

        console.log(`📋 Found ${reports.length} scheduled report(s):\n`);
        
        reports.forEach(report => {
          console.log(`🔹 ${report.name} (${report.id})`);
          console.log(`   Description: ${report.description || 'N/A'}`);
          console.log(`   Format: ${report.format}`);
          console.log(`   Schedule: ${report.schedule.frequency} at ${report.schedule.time}`);
          console.log(`   Enabled: ${report.enabled ? '✅' : '❌'}`);
          console.log(`   Next run: ${report.nextRun || 'N/A'}`);
          console.log(`   Last run: ${report.lastRun || 'Never'}\n`);
        });

      } catch (error: any) {
        console.error('❌ Error listing scheduled reports:', error.message);
        logger.error('List scheduled reports command failed', { error: error.message });
        process.exit(1);
      }
    });

  scheduledCmd
    .command('run')
    .description('Run a scheduled report immediately')
    .requiredOption('-i, --id <id>', 'Report ID')
    .action(async (options) => {
      try {
        console.log(`🏃 Running scheduled report ${options.id}...`);
        
        const scheduledReporting = new ScheduledReporting(client);
        const result = await scheduledReporting.executeScheduledReport(options.id);
        
        console.log(`✅ Report executed successfully`);
        console.log(`📄 File: ${result.filePath}`);
        console.log(`📊 Format: ${result.format}`);

      } catch (error: any) {
        console.error('❌ Error running scheduled report:', error.message);
        logger.error('Run scheduled report command failed', { error: error.message });
        process.exit(1);
      }
    });

  scheduledCmd
    .command('delete')
    .description('Delete a scheduled report')
    .requiredOption('-i, --id <id>', 'Report ID')
    .action(async (options) => {
      try {
        console.log(`🗑️ Deleting scheduled report ${options.id}...`);
        
        const scheduledReporting = new ScheduledReporting(client);
        const deleted = await scheduledReporting.deleteScheduledReport(options.id);
        
        if (deleted) {
          console.log(`✅ Scheduled report deleted successfully`);
        } else {
          console.log(`❌ Scheduled report not found`);
        }

      } catch (error: any) {
        console.error('❌ Error deleting scheduled report:', error.message);
        logger.error('Delete scheduled report command failed', { error: error.message });
        process.exit(1);
      }
    });

  return reportCmd;
}
