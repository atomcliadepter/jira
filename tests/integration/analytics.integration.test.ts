
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { config } from 'dotenv';
import { JiraRestClient } from '../src/http/JiraRestClient.js';
import { WorkflowAnalytics } from '../src/tools/workflowAnalytics.js';
import { WorkflowReporting } from '../src/tools/workflowReporting.js';
import { logger } from '../src/utils/logger.js';
import { existsSync, unlinkSync } from 'fs';

// Load test environment
config({ path: '.env.test' });

describe('Workflow Analytics - Integration Tests', () => {
  let client: JiraRestClient;
  let analytics: WorkflowAnalytics;
  let reporting: WorkflowReporting;
  let testProjectKey: string;

  beforeAll(async () => {
    // Skip integration tests if credentials are not available
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
      console.log('Skipping integration tests - JIRA credentials not configured');
      return;
    }

    // Initialize client with test credentials
    client = new JiraRestClient({
      baseUrl: process.env.JIRA_BASE_URL!,
      email: process.env.JIRA_EMAIL!,
      apiToken: process.env.JIRA_API_TOKEN!,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    });

    analytics = new WorkflowAnalytics(client);
    reporting = new WorkflowReporting(client);
    testProjectKey = process.env.TEST_PROJECT_KEY || 'SCRUM';

    // Verify connection
    try {
      await client.get('/rest/api/3/myself');
      logger.info('Integration test setup complete');
    } catch (error: any) {
      logger.warn('Failed to connect to JIRA for integration tests', { error: error.message });
      throw new Error('JIRA connection failed - skipping integration tests');
    }
  });

  afterAll(async () => {
    // Clean up any test files
    const testFiles = [
      './test-report.json',
      './test-report.csv',
      './test-report.md',
      './test-report.html',
      './test-export.csv',
      './test-dashboard.html'
    ];

    testFiles.forEach(file => {
      if (existsSync(file)) {
        try {
          unlinkSync(file);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('WorkflowAnalytics Integration', () => {
    test('should calculate cycle time for real project data', async () => {
      if (!client) return;

      const jql = `project = "${testProjectKey}" AND resolved >= -30d ORDER BY resolved DESC`;
      
      const result = await analytics.calculateCycleTime({
        jql,
        startStatus: 'In Progress',
        endStatus: 'Done'
      });

      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      
      if (result.issues.length > 0) {
        expect(result.metrics.count).toBeGreaterThan(0);
        expect(result.metrics.median).toBeGreaterThanOrEqual(0);
        expect(result.metrics.average).toBeGreaterThanOrEqual(0);
        
        // Verify issue data structure
        const firstIssue = result.issues[0];
        expect(firstIssue.key).toBeDefined();
        expect(firstIssue.summary).toBeDefined();
        expect(firstIssue.issueType).toBeDefined();
        expect(firstIssue.statusHistory).toBeDefined();
        expect(Array.isArray(firstIssue.statusHistory)).toBe(true);
      }

      logger.info('Cycle time integration test completed', {
        issueCount: result.issues.length,
        median: result.metrics.median,
        average: result.metrics.average
      });
    });

    test('should calculate lead time for real project data', async () => {
      if (!client) return;

      const jql = `project = "${testProjectKey}" AND resolved >= -30d ORDER BY resolved DESC`;
      
      const result = await analytics.calculateLeadTime({
        jql
      });

      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.issues).toBeDefined();
      
      if (result.issues.length > 0) {
        expect(result.metrics.count).toBeGreaterThan(0);
        expect(result.metrics.median).toBeGreaterThanOrEqual(0);
        expect(result.metrics.average).toBeGreaterThanOrEqual(0);
      }

      logger.info('Lead time integration test completed', {
        issueCount: result.issues.length,
        median: result.metrics.median,
        average: result.metrics.average
      });
    });

    test('should calculate throughput for real project data', async () => {
      if (!client) return;

      const jql = `project = "${testProjectKey}" AND resolved >= -90d ORDER BY resolved DESC`;
      
      const result = await analytics.calculateThroughput({
        jql,
        interval: 'weekly'
      });

      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.timeline).toBeDefined();
      expect(Array.isArray(result.timeline)).toBe(true);
      
      expect(result.metrics.total).toBeGreaterThanOrEqual(0);
      expect(result.metrics.average).toBeGreaterThanOrEqual(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(result.metrics.trend);

      logger.info('Throughput integration test completed', {
        total: result.metrics.total,
        average: result.metrics.average,
        trend: result.metrics.trend,
        timelineLength: result.timeline.length
      });
    });

    test('should generate comprehensive workflow analytics', async () => {
      if (!client) return;

      const jql = `project = "${testProjectKey}" AND resolved >= -30d ORDER BY resolved DESC`;
      
      const result = await analytics.generateWorkflowAnalytics({
        jql,
        groupBy: 'issueType'
      });

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.cycleTimeAnalysis).toBeDefined();
      expect(result.leadTimeAnalysis).toBeDefined();
      expect(result.throughputAnalysis).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);

      // Verify summary metrics
      expect(result.summary.cycleTime).toBeDefined();
      expect(result.summary.leadTime).toBeDefined();
      expect(result.summary.throughput).toBeDefined();
      expect(result.summary.workInProgress).toBeDefined();
      expect(typeof result.summary.flowEfficiency).toBe('number');
      expect(typeof result.summary.defectRate).toBe('number');

      // Verify recommendations are generated
      expect(result.recommendations.length).toBeGreaterThan(0);

      logger.info('Comprehensive analytics integration test completed', {
        cycleTimeCount: result.summary.cycleTime.count,
        leadTimeCount: result.summary.leadTime.count,
        throughputTotal: result.summary.throughput.total,
        recommendationsCount: result.recommendations.length
      });
    });

    test('should handle grouped analytics correctly', async () => {
      if (!client) return;

      const jql = `project = "${testProjectKey}" AND resolved >= -60d ORDER BY resolved DESC`;
      
      const result = await analytics.calculateCycleTime({
        jql,
        groupBy: 'assignee'
      });

      expect(result).toBeDefined();
      
      if (result.groupedMetrics && Object.keys(result.groupedMetrics).length > 0) {
        const firstGroup = Object.values(result.groupedMetrics)[0];
        expect(firstGroup.count).toBeGreaterThanOrEqual(0);
        expect(firstGroup.median).toBeGreaterThanOrEqual(0);
        expect(firstGroup.average).toBeGreaterThanOrEqual(0);
      }

      logger.info('Grouped analytics integration test completed', {
        groupCount: result.groupedMetrics ? Object.keys(result.groupedMetrics).length : 0
      });
    });
  });

  describe('WorkflowReporting Integration', () => {
    test('should generate JSON report', async () => {
      if (!client) return;

      const jql = `project = "${testProjectKey}" AND resolved >= -30d ORDER BY resolved DESC`;
      
      const result = await reporting.generateReport({
        jql,
        format: 'json',
        outputPath: './test-report.json'
      });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.format).toBe('json');
      expect(result.reportPath).toBeDefined();
      
      if (result.reportPath) {
        expect(existsSync(result.reportPath)).toBe(true);
      }

      // Verify report data structure
      expect(result.data.metadata).toBeDefined();
      expect(result.data.summary).toBeDefined();
      expect(result.data.detailedAnalysis).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
      expect(result.data.issues).toBeDefined();

      logger.info('JSON report integration test completed', {
        reportPath: result.reportPath,
        totalIssues: result.data.metadata.totalIssues
      });
    });

    test('should generate CSV report', async () => {
      if (!client) return;

      const jql = `project = "${testProjectKey}" AND resolved >= -30d ORDER BY resolved DESC`;
      
      const result = await reporting.generateReport({
        jql,
        format: 'csv',
        outputPath: './test-report.csv'
      });

      expect(result).toBeDefined();
      expect(result.format).toBe('csv');
      expect(result.reportPath).toBeDefined();
      
      if (result.reportPath) {
        expect(existsSync(result.reportPath)).toBe(true);
      }

      logger.info('CSV report integration test completed', {
        reportPath: result.reportPath
      });
    });

    test('should generate Markdown report', async () => {
      if (!client) return;

      const jql = `project = "${testProjectKey}" AND resolved >= -30d ORDER BY resolved DESC`;
      
      const result = await reporting.generateReport({
        jql,
        format: 'markdown',
        outputPath: './test-report.md'
      });

      expect(result).toBeDefined();
      expect(result.format).toBe('markdown');
      expect(result.reportPath).toBeDefined();
      
      if (result.reportPath) {
        expect(existsSync(result.reportPath)).toBe(true);
      }

      logger.info('Markdown report integration test completed', {
        reportPath: result.reportPath
      });
    });

    test('should generate HTML report', async () => {
      if (!client) return;

      const jql = `project = "${testProjectKey}" AND resolved >= -30d ORDER BY resolved DESC`;
      
      const result = await reporting.generateReport({
        jql,
        format: 'html',
        outputPath: './test-report.html'
      });

      expect(result).toBeDefined();
      expect(result.format).toBe('html');
      expect(result.reportPath).toBeDefined();
      
      if (result.reportPath) {
        expect(existsSync(result.reportPath)).toBe(true);
      }

      logger.info('HTML report integration test completed', {
        reportPath: result.reportPath
      });
    });

    test('should export issues with analytics data', async () => {
      if (!client) return;

      const jql = `project = "${testProjectKey}" AND resolved >= -30d ORDER BY resolved DESC`;
      
      const result = await reporting.exportIssuesWithAnalytics({
        jql,
        format: 'csv',
        outputPath: './test-export.csv',
        includeStatusHistory: true
      });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.exportPath).toBeDefined();
      
      if (result.exportPath) {
        expect(existsSync(result.exportPath)).toBe(true);
      }

      if (result.data.length > 0) {
        const firstIssue = result.data[0];
        expect(firstIssue.key).toBeDefined();
        expect(firstIssue.summary).toBeDefined();
        expect(firstIssue.statusHistory).toBeDefined();
      }

      logger.info('Issues export integration test completed', {
        exportPath: result.exportPath,
        issueCount: result.data.length
      });
    });

    test('should generate dashboard for multiple projects', async () => {
      if (!client) return;

      const result = await reporting.generateDashboard({
        projects: [testProjectKey],
        timeRange: '30d',
        outputPath: './test-dashboard.html'
      });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data[testProjectKey]).toBeDefined();
      expect(result.dashboardPath).toBeDefined();
      
      if (result.dashboardPath) {
        expect(existsSync(result.dashboardPath)).toBe(true);
      }

      const projectData = result.data[testProjectKey];
      expect(projectData.metadata).toBeDefined();
      expect(projectData.summary).toBeDefined();

      logger.info('Dashboard integration test completed', {
        dashboardPath: result.dashboardPath,
        projectCount: Object.keys(result.data).length
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle invalid JQL gracefully', async () => {
      if (!client) return;

      await expect(analytics.calculateCycleTime({
        jql: 'invalid jql syntax here'
      })).rejects.toThrow();
    });

    test('should handle non-existent project', async () => {
      if (!client) return;

      const result = await analytics.calculateCycleTime({
        jql: 'project = "NONEXISTENT"'
      });

      expect(result.metrics.count).toBe(0);
      expect(result.issues).toHaveLength(0);
    });

    test('should handle empty result sets', async () => {
      if (!client) return;

      const result = await analytics.generateWorkflowAnalytics({
        jql: `project = "${testProjectKey}" AND resolved >= "2020-01-01" AND resolved <= "2020-01-02"`
      });

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });
});
