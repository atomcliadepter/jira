
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { WorkflowReporting } from '../src/tools/workflowReporting.js';
import { WorkflowAnalytics } from '../src/tools/workflowAnalytics.js';
import { JiraRestClient } from '../src/http/JiraRestClient.js';
import { existsSync, readFileSync, unlinkSync } from 'fs';

// Mock the dependencies
jest.mock('../src/http/JiraRestClient.js');
jest.mock('../src/tools/workflowAnalytics.js');

describe('WorkflowReporting - Unit Tests', () => {
  let mockClient: jest.Mocked<JiraRestClient>;
  let mockAnalytics: jest.Mocked<WorkflowAnalytics>;
  let reporting: WorkflowReporting;

  const mockAnalyticsResult = {
    summary: {
      cycleTime: {
        median: 3.5,
        average: 4.2,
        percentile85: 6.8,
        percentile95: 9.1,
        min: 1.0,
        max: 12.5,
        count: 25
      },
      leadTime: {
        median: 7.2,
        average: 8.5,
        percentile85: 12.3,
        percentile95: 15.7,
        min: 2.1,
        max: 20.8,
        count: 25
      },
      throughput: {
        total: 25,
        average: 5.2,
        trend: 'stable' as const
      },
      workInProgress: {
        current: 8,
        average: 7.5,
        max: 12
      },
      flowEfficiency: 65,
      defectRate: 12
    },
    cycleTimeAnalysis: {
      metrics: {
        median: 3.5,
        average: 4.2,
        percentile85: 6.8,
        percentile95: 9.1,
        min: 1.0,
        max: 12.5,
        count: 25
      },
      issues: [
        {
          key: 'TEST-1',
          summary: 'Test issue 1',
          issueType: 'Task',
          priority: 'High',
          assignee: 'John Doe',
          created: '2024-01-01T10:00:00.000Z',
          resolved: '2024-01-05T15:00:00.000Z',
          cycleTime: 3.5,
          leadTime: 4.5,
          statusHistory: [
            { status: 'To Do', entered: '2024-01-01T10:00:00.000Z', duration: 1.0 },
            { status: 'In Progress', entered: '2024-01-02T10:00:00.000Z', duration: 3.5 },
            { status: 'Done', entered: '2024-01-05T15:00:00.000Z', duration: 0 }
          ]
        }
      ]
    },
    leadTimeAnalysis: {
      metrics: {
        median: 7.2,
        average: 8.5,
        percentile85: 12.3,
        percentile95: 15.7,
        min: 2.1,
        max: 20.8,
        count: 25
      },
      issues: []
    },
    throughputAnalysis: {
      metrics: {
        total: 25,
        average: 5.2,
        trend: 'stable' as const
      },
      timeline: [
        { period: '2024-01-01', count: 5, issues: ['TEST-1', 'TEST-2'] },
        { period: '2024-01-08', count: 6, issues: ['TEST-3', 'TEST-4'] }
      ]
    },
    recommendations: [
      'Consider implementing WIP limits to improve flow',
      'Review high-priority items for potential blockers',
      'Investigate outliers in cycle time distribution'
    ]
  };

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    } as any;

    // Mock the WorkflowAnalytics constructor and methods
    mockAnalytics = {
      generateWorkflowAnalytics: jest.fn(),
      calculateCycleTime: jest.fn(),
      calculateLeadTime: jest.fn(),
      calculateThroughput: jest.fn()
    } as any;

    // Mock the WorkflowAnalytics constructor
    (WorkflowAnalytics as jest.MockedClass<typeof WorkflowAnalytics>).mockImplementation(() => mockAnalytics);

    reporting = new WorkflowReporting(mockClient);
  });

  afterEach(() => {
    // Clean up test files
    const testFiles = [
      './test-report.json',
      './test-report.csv',
      './test-report.md',
      './test-report.html'
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

  describe('generateReport', () => {
    beforeEach(() => {
      mockAnalytics.generateWorkflowAnalytics.mockResolvedValue(mockAnalyticsResult);
    });

    test('should generate JSON report without file output', async () => {
      const result = await reporting.generateReport({
        jql: 'project = TEST',
        format: 'json'
      });

      expect(result).toBeDefined();
      expect(result.format).toBe('json');
      expect(result.data).toBeDefined();
      expect(result.data.metadata).toBeDefined();
      expect(result.data.summary).toBeDefined();
      expect(result.data.detailedAnalysis).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
      expect(result.data.issues).toBeDefined();
      expect(result.reportPath).toBeUndefined();
    });

    test('should generate JSON report with file output', async () => {
      const result = await reporting.generateReport({
        jql: 'project = TEST',
        format: 'json',
        outputPath: './test-report.json'
      });

      expect(result).toBeDefined();
      expect(result.format).toBe('json');
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath!)).toBe(true);

      // Verify file content
      const fileContent = readFileSync(result.reportPath!, 'utf8');
      const parsedContent = JSON.parse(fileContent);
      expect(parsedContent.metadata).toBeDefined();
      expect(parsedContent.summary).toBeDefined();
    });

    test('should generate CSV report', async () => {
      const result = await reporting.generateReport({
        jql: 'project = TEST',
        format: 'csv',
        outputPath: './test-report.csv'
      });

      expect(result).toBeDefined();
      expect(result.format).toBe('csv');
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath!)).toBe(true);

      // Verify CSV content structure
      const fileContent = readFileSync(result.reportPath!, 'utf8');
      const lines = fileContent.split('\n');
      expect(lines[0]).toContain('Key'); // Header row
      expect(lines[0]).toContain('Summary');
      expect(lines[0]).toContain('Cycle Time');
    });

    test('should generate Markdown report', async () => {
      const result = await reporting.generateReport({
        jql: 'project = TEST',
        format: 'markdown',
        outputPath: './test-report.md'
      });

      expect(result).toBeDefined();
      expect(result.format).toBe('markdown');
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath!)).toBe(true);

      // Verify Markdown content structure
      const fileContent = readFileSync(result.reportPath!, 'utf8');
      expect(fileContent).toContain('# Workflow Analytics Report');
      expect(fileContent).toContain('## Summary');
      expect(fileContent).toContain('### Cycle Time Metrics');
      expect(fileContent).toContain('## Recommendations');
    });

    test('should generate HTML report', async () => {
      const result = await reporting.generateReport({
        jql: 'project = TEST',
        format: 'html',
        outputPath: './test-report.html'
      });

      expect(result).toBeDefined();
      expect(result.format).toBe('html');
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath!)).toBe(true);

      // Verify HTML content structure
      const fileContent = readFileSync(result.reportPath!, 'utf8');
      expect(fileContent).toContain('<!DOCTYPE html>');
      expect(fileContent).toContain('<title>Workflow Analytics Report</title>');
      expect(fileContent).toContain('<h1>Workflow Analytics Report</h1>');
      expect(fileContent).toContain('<h2>Summary</h2>');
    });

    test('should include/exclude recommendations based on option', async () => {
      const resultWithRec = await reporting.generateReport({
        jql: 'project = TEST',
        format: 'json',
        includeRecommendations: true
      });

      const resultWithoutRec = await reporting.generateReport({
        jql: 'project = TEST',
        format: 'json',
        includeRecommendations: false
      });

      expect(resultWithRec.data.recommendations).toHaveLength(3);
      expect(resultWithoutRec.data.recommendations).toHaveLength(0);
    });

    test('should handle date range in metadata', async () => {
      const result = await reporting.generateReport({
        jql: 'project = TEST',
        format: 'json',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.data.metadata.dateRange.start).toBe('2024-01-01');
      expect(result.data.metadata.dateRange.end).toBe('2024-01-31');
    });
  });

  describe('generateDashboard', () => {
    beforeEach(() => {
      mockAnalytics.generateWorkflowAnalytics.mockResolvedValue(mockAnalyticsResult);
    });

    test('should generate dashboard for multiple projects', async () => {
      const result = await reporting.generateDashboard({
        projects: ['TEST1', 'TEST2'],
        timeRange: '30d'
      });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data['TEST1']).toBeDefined();
      expect(result.data['TEST2']).toBeDefined();
      expect(mockAnalytics.generateWorkflowAnalytics).toHaveBeenCalledTimes(2);
    });

    test('should generate dashboard with file output', async () => {
      const result = await reporting.generateDashboard({
        projects: ['TEST'],
        timeRange: '30d',
        outputPath: './test-dashboard'
      });

      expect(result).toBeDefined();
      expect(result.dashboardPath).toBeDefined();
      expect(existsSync(result.dashboardPath!)).toBe(true);

      // Verify HTML dashboard content
      const fileContent = readFileSync(result.dashboardPath!, 'utf8');
      expect(fileContent).toContain('<!DOCTYPE html>');
      expect(fileContent).toContain('Workflow Analytics Dashboard');
      expect(fileContent).toContain('TEST');
    });

    test('should calculate correct date ranges', async () => {
      await reporting.generateDashboard({
        projects: ['TEST'],
        timeRange: '7d'
      });

      // Verify that generateWorkflowAnalytics was called with correct date range
      const call = mockAnalytics.generateWorkflowAnalytics.mock.calls[0][0];
      expect(call.startDate).toBeDefined();
      expect(call.endDate).toBeDefined();
      
      const startDate = new Date(call.startDate);
      const endDate = new Date(call.endDate);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeLessThanOrEqual(7);
    });
  });

  describe('exportIssuesWithAnalytics', () => {
    beforeEach(() => {
      mockAnalytics.calculateCycleTime.mockResolvedValue({
        metrics: mockAnalyticsResult.cycleTimeAnalysis.metrics,
        issues: mockAnalyticsResult.cycleTimeAnalysis.issues,
        groupedMetrics: undefined
      });
    });

    test('should export issues in CSV format', async () => {
      const result = await reporting.exportIssuesWithAnalytics({
        jql: 'project = TEST',
        format: 'csv',
        outputPath: './test-export.csv'
      });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.exportPath).toBeDefined();
      expect(existsSync(result.exportPath!)).toBe(true);

      // Verify CSV content
      const fileContent = readFileSync(result.exportPath!, 'utf8');
      const lines = fileContent.split('\n');
      expect(lines[0]).toContain('Key,Summary,Issue Type');
      expect(lines[1]).toContain('TEST-1');
    });

    test('should export issues in JSON format', async () => {
      const result = await reporting.exportIssuesWithAnalytics({
        jql: 'project = TEST',
        format: 'json',
        outputPath: './test-export.json'
      });

      expect(result).toBeDefined();
      expect(result.exportPath).toBeDefined();
      expect(existsSync(result.exportPath!)).toBe(true);

      // Verify JSON content
      const fileContent = readFileSync(result.exportPath!, 'utf8');
      const parsedContent = JSON.parse(fileContent);
      expect(Array.isArray(parsedContent)).toBe(true);
      expect(parsedContent[0].key).toBe('TEST-1');
    });

    test('should include status history when requested', async () => {
      const result = await reporting.exportIssuesWithAnalytics({
        jql: 'project = TEST',
        format: 'csv',
        outputPath: './test-export-history.csv',
        includeStatusHistory: true
      });

      expect(result).toBeDefined();
      expect(result.exportPath).toBeDefined();
      expect(existsSync(result.exportPath!)).toBe(true);

      // Verify status history is included in CSV
      const fileContent = readFileSync(result.exportPath!, 'utf8');
      expect(fileContent).toContain('Status History');
      expect(fileContent).toContain('To Do:1d;In Progress:3.5d');

      // Clean up
      unlinkSync(result.exportPath!);
    });
  });

  describe('error handling', () => {
    test('should handle analytics generation errors', async () => {
      mockAnalytics.generateWorkflowAnalytics.mockRejectedValue(new Error('Analytics error'));

      await expect(reporting.generateReport({
        jql: 'project = TEST',
        format: 'json'
      })).rejects.toThrow('Failed to generate report');
    });

    test('should handle unsupported format', async () => {
      mockAnalytics.generateWorkflowAnalytics.mockResolvedValue(mockAnalyticsResult);

      await expect(reporting.generateReport({
        jql: 'project = TEST',
        format: 'xml' as any
      })).rejects.toThrow('Unsupported format');
    });

    test('should handle file system errors gracefully', async () => {
      mockAnalytics.generateWorkflowAnalytics.mockResolvedValue(mockAnalyticsResult);

      // Try to write to an invalid path
      await expect(reporting.generateReport({
        jql: 'project = TEST',
        format: 'json',
        outputPath: '/invalid/path/report.json'
      })).rejects.toThrow();
    });
  });

  describe('template and formatting', () => {
    beforeEach(() => {
      mockAnalytics.generateWorkflowAnalytics.mockResolvedValue(mockAnalyticsResult);
    });

    test('should format metrics tables correctly in markdown', async () => {
      const result = await reporting.generateReport({
        jql: 'project = TEST',
        format: 'markdown',
        outputPath: './test-report.md'
      });

      const fileContent = readFileSync(result.reportPath!, 'utf8');
      
      // Check for table formatting
      expect(fileContent).toContain('| Metric | Value |');
      expect(fileContent).toContain('|--------|-------|');
      expect(fileContent).toContain('| Median | 3.5 days |');
      expect(fileContent).toContain('| Average | 4.2 days |');
    });

    test('should format metrics correctly in HTML', async () => {
      const result = await reporting.generateReport({
        jql: 'project = TEST',
        format: 'html',
        outputPath: './test-report.html'
      });

      const fileContent = readFileSync(result.reportPath!, 'utf8');
      
      // Check for HTML table formatting
      expect(fileContent).toContain('<table>');
      expect(fileContent).toContain('<tr><td><strong>Median</strong></td><td>3.5 days</td></tr>');
      expect(fileContent).toContain('<tr><td><strong>Average</strong></td><td>4.2 days</td></tr>');
    });

    test('should handle empty recommendations', async () => {
      const emptyRecommendationsResult = {
        ...mockAnalyticsResult,
        recommendations: []
      };
      
      mockAnalytics.generateWorkflowAnalytics.mockResolvedValue(emptyRecommendationsResult);

      const result = await reporting.generateReport({
        jql: 'project = TEST',
        format: 'markdown',
        outputPath: './test-report.md'
      });

      const fileContent = readFileSync(result.reportPath!, 'utf8');
      expect(fileContent).toContain('## Recommendations');
      // Should not contain any recommendation bullets
      expect(fileContent).not.toContain('- Consider');
    });
  });
});
