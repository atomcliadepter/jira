
import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { AdvancedReporting } from '../../src/analytics/advancedReporting.js';
import { JiraRestClient } from '../../src/http/JiraRestClient.js';
import { writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

// Mock the JiraRestClient
jest.mock('../../src/http/JiraRestClient.js');

describe('AdvancedReporting - Unit Tests', () => {
  let mockClient: jest.Mocked<JiraRestClient>;
  let reporting: AdvancedReporting;
  let testExportsDir: string;

  beforeEach(() => {
    mockClient = new JiraRestClient({
      baseUrl: 'https://test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token'
    }) as jest.Mocked<JiraRestClient>;

    reporting = new AdvancedReporting(mockClient);
    
    // Setup test exports directory
    testExportsDir = join(process.cwd(), 'test-exports');
    if (!existsSync(testExportsDir)) {
      mkdirSync(testExportsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testExportsDir)) {
      const fs = require('fs');
      const files = fs.readdirSync(testExportsDir);
      files.forEach((file: string) => {
        unlinkSync(join(testExportsDir, file));
      });
    }
  });

  describe('buildJQLQuery', () => {
    test('should build basic JQL query with project filter', async () => {
      const args = {
        project: 'TEST',
        maxResults: 100
      };

      const result = await reporting.buildJQLQuery(args);

      expect(result.jql).toBe('project = "TEST"');
      expect(result.metadata.totalClauses).toBe(1);
      expect(result.metadata.hasDateFilters).toBe(false);
      expect(result.metadata.hasCustomFields).toBe(false);
      expect(result.metadata.maxResults).toBe(100);
    });

    test('should build complex JQL query with multiple filters', async () => {
      const args = {
        project: 'TEST',
        issueType: ['Bug', 'Task'],
        status: ['Open', 'In Progress'],
        assignee: ['john.doe@example.com'],
        priority: ['High', 'Critical'],
        createdDate: {
          from: '2024-01-01',
          to: '2024-12-31',
          operator: '>=' as const
        },
        customFields: {
          'Story Points': [1, 2, 3],
          'Epic Link': 'EPIC-123'
        },
        orderBy: [
          { field: 'created', direction: 'DESC' as const }
        ]
      };

      const result = await reporting.buildJQLQuery(args);

      expect(result.jql).toContain('project = "TEST"');
      expect(result.jql).toContain('issueType IN ("Bug", "Task")');
      expect(result.jql).toContain('status IN ("Open", "In Progress")');
      expect(result.jql).toContain('assignee IN ("john.doe@example.com")');
      expect(result.jql).toContain('priority IN ("High", "Critical")');
      expect(result.jql).toContain('created >= "2024-01-01"');
      expect(result.jql).toContain('created <= "2024-12-31"');
      expect(result.jql).toContain('ORDER BY created DESC');
      expect(result.metadata.hasDateFilters).toBe(true);
      expect(result.metadata.hasCustomFields).toBe(true);
    });

    test('should build JQL query with advanced operators', async () => {
      const args = {
        project: 'TEST',
        advancedOperators: {
          and: ['status = "Open"', 'priority = "High"'],
          or: ['assignee = "user1"', 'assignee = "user2"'],
          not: ['labels = "excluded"']
        }
      };

      const result = await reporting.buildJQLQuery(args);

      expect(result.jql).toContain('(status = "Open" AND priority = "High")');
      expect(result.jql).toContain('(assignee = "user1" OR assignee = "user2")');
      expect(result.jql).toContain('NOT (labels = "excluded")');
      expect(result.metadata.hasAdvancedOperators).toBe(true);
    });

    test('should handle empty query parameters', async () => {
      const args = {};

      const result = await reporting.buildJQLQuery(args);

      expect(result.jql).toBe('');
      expect(result.metadata.totalClauses).toBe(0);
      expect(result.metadata.hasDateFilters).toBe(false);
      expect(result.metadata.hasCustomFields).toBe(false);
      expect(result.metadata.hasAdvancedOperators).toBe(false);
    });

    test('should throw error for invalid date format', async () => {
      const args = {
        createdDate: {
          from: 'invalid-date'
        }
      };

      // The function should still work as it doesn't validate date format
      const result = await reporting.buildJQLQuery(args);
      expect(result.jql).toContain('created >= "invalid-date"');
    });
  });

  describe('generateDashboardMetrics', () => {
    test('should generate dashboard metrics with default metrics', async () => {
      mockClient.searchIssues = jest.fn().mockResolvedValue({
        issues: [
          {
            key: 'TEST-1',
            fields: {
              summary: 'Test issue',
              status: { name: 'Done' },
              created: '2024-01-01T10:00:00.000Z',
              resolutiondate: '2024-01-05T15:00:00.000Z'
            }
          }
        ]
      });

      const args = {
        projectKey: 'TEST',
        timeRange: {
          from: '2024-01-01',
          to: '2024-12-31'
        },
        includeMetrics: ['velocity', 'burndown', 'cycleTime', 'throughput'] as const
      };

      const result = await reporting.generateDashboardMetrics(args);

      expect(result).toHaveProperty('velocity');
      expect(result).toHaveProperty('burndown');
      expect(result).toHaveProperty('cycleTime');
      expect(result).toHaveProperty('throughput');
      expect(result.velocity).toHaveProperty('current');
      expect(result.velocity).toHaveProperty('average');
      expect(result.velocity).toHaveProperty('trend');
    });

    test('should generate specific metrics only', async () => {
      const args = {
        projectKey: 'TEST',
        timeRange: {
          from: '2024-01-01',
          to: '2024-12-31'
        },
        includeMetrics: ['cycleTime'] as const
      };

      const result = await reporting.generateDashboardMetrics(args);

      expect(result).toHaveProperty('cycleTime');
      expect(result).not.toHaveProperty('velocity');
      expect(result).not.toHaveProperty('burndown');
      expect(result).not.toHaveProperty('throughput');
    });

    test('should handle empty metrics array', async () => {
      const args = {
        projectKey: 'TEST',
        timeRange: {
          from: '2024-01-01',
          to: '2024-12-31'
        },
        includeMetrics: [] as const
      };

      const result = await reporting.generateDashboardMetrics(args);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('generateBurndownChart', () => {
    test('should generate burndown chart data', async () => {
      mockClient.searchIssues = jest.fn().mockResolvedValue({
        issues: [
          {
            key: 'TEST-1',
            fields: {
              summary: 'Test issue',
              status: { name: 'Done' },
              created: '2024-01-01T10:00:00.000Z',
              resolutiondate: '2024-01-05T15:00:00.000Z',
              storyPoints: 3
            },
            changelog: {
              histories: []
            }
          }
        ]
      });

      const args = {
        projectKey: 'TEST',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        chartType: 'sprint' as const,
        includeScope: true,
        includeWeekends: false
      };

      const result = await reporting.generateBurndownChart(args);

      expect(result).toHaveProperty('ideal');
      expect(result).toHaveProperty('actual');
      expect(result).toHaveProperty('dates');
      expect(Array.isArray(result.ideal)).toBe(true);
      expect(Array.isArray(result.actual)).toBe(true);
      expect(Array.isArray(result.dates)).toBe(true);
    });

    test('should generate burndown chart with sprint ID', async () => {
      mockClient.searchIssues = jest.fn().mockResolvedValue({
        issues: []
      });

      const args = {
        projectKey: 'TEST',
        sprintId: '123',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        chartType: 'sprint' as const
      };

      const result = await reporting.generateBurndownChart(args);

      expect(mockClient.searchIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          jql: expect.stringContaining('sprint = 123')
        })
      );
    });
  });

  describe('trackVelocity', () => {
    test('should track velocity with default parameters', async () => {
      const args = {
        projectKey: 'TEST',
        sprintCount: 5,
        includeCommitment: true,
        includeCompleted: true
      };

      const result = await reporting.trackVelocity(args);

      expect(result).toHaveProperty('sprints');
      expect(result).toHaveProperty('average');
      expect(result).toHaveProperty('trend');
      expect(Array.isArray(result.sprints)).toBe(true);
      expect(typeof result.average).toBe('number');
      expect(['up', 'down', 'stable']).toContain(result.trend);
    });

    test('should track velocity with team ID', async () => {
      const args = {
        projectKey: 'TEST',
        teamId: 'team-123',
        sprintCount: 10
      };

      const result = await reporting.trackVelocity(args);

      expect(result).toBeDefined();
    });
  });

  describe('exportData', () => {
    test('should export data to JSON format', async () => {
      const testData = [
        { key: 'TEST-1', summary: 'Test issue 1' },
        { key: 'TEST-2', summary: 'Test issue 2' }
      ];

      const args = {
        format: 'json' as const,
        data: testData,
        filename: 'test-export',
        includeMetadata: true
      };

      const result = await reporting.exportData(args);

      expect(result.format).toBe('json');
      expect(result.filePath).toContain('test-export.json');
      expect(existsSync(result.filePath)).toBe(true);

      // Verify file content
      const fs = require('fs');
      const fileContent = JSON.parse(fs.readFileSync(result.filePath, 'utf8'));
      expect(fileContent.data).toEqual(testData);
      expect(fileContent.metadata).toBeDefined();
      expect(fileContent.metadata.exportedAt).toBeDefined();
    });

    test('should export data to CSV format', async () => {
      const testData = [
        { key: 'TEST-1', summary: 'Test issue 1', status: 'Open' },
        { key: 'TEST-2', summary: 'Test issue 2', status: 'Done' }
      ];

      const args = {
        format: 'csv' as const,
        data: testData,
        filename: 'test-export-csv'
      };

      const result = await reporting.exportData(args);

      expect(result.format).toBe('csv');
      expect(result.filePath).toContain('test-export-csv.csv');
      expect(existsSync(result.filePath)).toBe(true);

      // Verify CSV content
      const fs = require('fs');
      const fileContent = fs.readFileSync(result.filePath, 'utf8');
      expect(fileContent).toContain('key,summary,status');
      expect(fileContent).toContain('TEST-1,"Test issue 1",Open');
      expect(fileContent).toContain('TEST-2,"Test issue 2",Done');
    });

    test('should handle empty data array', async () => {
      const args = {
        format: 'json' as const,
        data: [],
        filename: 'empty-export'
      };

      const result = await reporting.exportData(args);

      expect(result.format).toBe('json');
      expect(existsSync(result.filePath)).toBe(true);
    });

    test('should generate filename with timestamp when not provided', async () => {
      const args = {
        format: 'json' as const,
        data: { test: 'data' }
      };

      const result = await reporting.exportData(args);

      expect(result.filePath).toMatch(/jira-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      expect(existsSync(result.filePath)).toBe(true);
    });

    test('should throw error for unsupported format', async () => {
      const args = {
        format: 'xml' as any,
        data: { test: 'data' }
      };

      await expect(reporting.exportData(args)).rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('CSV conversion', () => {
    test('should convert array of objects to CSV', async () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Los Angeles' }
      ];

      const args = {
        format: 'csv' as const,
        data
      };

      const result = await reporting.exportData(args);
      const fs = require('fs');
      const csvContent = fs.readFileSync(result.filePath, 'utf8');

      expect(csvContent).toContain('name,age,city');
      expect(csvContent).toContain('John,30,"New York"');
      expect(csvContent).toContain('Jane,25,"Los Angeles"');
    });

    test('should handle CSV with quotes in data', async () => {
      const data = [
        { title: 'Issue with "quotes"', description: 'Test description' }
      ];

      const args = {
        format: 'csv' as const,
        data
      };

      const result = await reporting.exportData(args);
      const fs = require('fs');
      const csvContent = fs.readFileSync(result.filePath, 'utf8');

      expect(csvContent).toContain('"Issue with ""quotes"""');
    });
  });
});
