
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { WorkflowAnalytics } from '../src/tools/workflowAnalytics.js';
import { JiraRestClient } from '../src/http/JiraRestClient.js';

// Mock the JiraRestClient
jest.mock('../src/http/JiraRestClient.js');

describe('WorkflowAnalytics - Unit Tests', () => {
  let mockClient: jest.Mocked<JiraRestClient>;
  let analytics: WorkflowAnalytics;

  const mockIssuesData = {
    issues: [
      {
        key: 'TEST-1',
        fields: {
          summary: 'Test issue 1',
          issuetype: { name: 'Task' },
          priority: { name: 'High' },
          assignee: { displayName: 'John Doe' },
          created: '2024-01-01T10:00:00.000Z',
          resolutiondate: '2024-01-05T15:00:00.000Z',
          status: { name: 'Done' }
        },
        changelog: {
          histories: [
            {
              created: '2024-01-02T10:00:00.000Z',
              items: [
                {
                  field: 'status',
                  fromString: 'To Do',
                  toString: 'In Progress'
                }
              ]
            },
            {
              created: '2024-01-05T15:00:00.000Z',
              items: [
                {
                  field: 'status',
                  fromString: 'In Progress',
                  toString: 'Done'
                }
              ]
            }
          ]
        }
      },
      {
        key: 'TEST-2',
        fields: {
          summary: 'Test issue 2',
          issuetype: { name: 'Bug' },
          priority: { name: 'Medium' },
          assignee: { displayName: 'Jane Smith' },
          created: '2024-01-03T09:00:00.000Z',
          resolutiondate: '2024-01-08T16:00:00.000Z',
          status: { name: 'Done' }
        },
        changelog: {
          histories: [
            {
              created: '2024-01-04T09:00:00.000Z',
              items: [
                {
                  field: 'status',
                  fromString: 'To Do',
                  toString: 'In Progress'
                }
              ]
            },
            {
              created: '2024-01-08T16:00:00.000Z',
              items: [
                {
                  field: 'status',
                  fromString: 'In Progress',
                  toString: 'Done'
                }
              ]
            }
          ]
        }
      }
    ]
  };

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    } as any;

    analytics = new WorkflowAnalytics(mockClient);
  });

  describe('calculateCycleTime', () => {
    test('should calculate cycle time metrics correctly', async () => {
      mockClient.get.mockResolvedValue(mockIssuesData);

      const result = await analytics.calculateCycleTime({
        jql: 'project = TEST',
        startStatus: 'In Progress',
        endStatus: 'Done'
      });

      expect(result.metrics.count).toBe(2);
      expect(result.metrics.median).toBeGreaterThan(0);
      expect(result.metrics.average).toBeGreaterThan(0);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].cycleTime).toBeGreaterThan(0);
    });

    test('should handle issues without cycle time data', async () => {
      const incompleteIssuesData = {
        issues: [
          {
            key: 'TEST-3',
            fields: {
              summary: 'Incomplete issue',
              issuetype: { name: 'Task' },
              priority: { name: 'Low' },
              assignee: null,
              created: '2024-01-01T10:00:00.000Z',
              resolutiondate: null,
              status: { name: 'In Progress' }
            },
            changelog: { histories: [] }
          }
        ]
      };

      mockClient.get.mockResolvedValue(incompleteIssuesData);

      const result = await analytics.calculateCycleTime({
        jql: 'project = TEST',
        startStatus: 'In Progress',
        endStatus: 'Done'
      });

      expect(result.metrics.count).toBe(0);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].cycleTime).toBeNull();
    });

    test('should group metrics by assignee', async () => {
      mockClient.get.mockResolvedValue(mockIssuesData);

      const result = await analytics.calculateCycleTime({
        jql: 'project = TEST',
        groupBy: 'assignee'
      });

      expect(result.groupedMetrics).toBeDefined();
      expect(result.groupedMetrics!['John Doe']).toBeDefined();
      expect(result.groupedMetrics!['Jane Smith']).toBeDefined();
      expect(result.groupedMetrics!['John Doe'].count).toBe(1);
      expect(result.groupedMetrics!['Jane Smith'].count).toBe(1);
    });
  });

  describe('calculateLeadTime', () => {
    test('should calculate lead time metrics correctly', async () => {
      mockClient.get.mockResolvedValue(mockIssuesData);

      const result = await analytics.calculateLeadTime({
        jql: 'project = TEST'
      });

      expect(result.metrics.count).toBe(2);
      expect(result.metrics.median).toBeGreaterThan(0);
      expect(result.metrics.average).toBeGreaterThan(0);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].leadTime).toBeGreaterThan(0);
    });

    test('should handle unresolved issues', async () => {
      const unresolvedIssuesData = {
        issues: [
          {
            key: 'TEST-4',
            fields: {
              summary: 'Unresolved issue',
              issuetype: { name: 'Task' },
              priority: { name: 'Medium' },
              assignee: { displayName: 'John Doe' },
              created: '2024-01-01T10:00:00.000Z',
              resolutiondate: null,
              status: { name: 'In Progress' }
            },
            changelog: { histories: [] }
          }
        ]
      };

      mockClient.get.mockResolvedValue(unresolvedIssuesData);

      const result = await analytics.calculateLeadTime({
        jql: 'project = TEST'
      });

      expect(result.metrics.count).toBe(0);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].leadTime).toBeNull();
    });
  });

  describe('calculateThroughput', () => {
    test('should calculate throughput metrics correctly', async () => {
      mockClient.get.mockResolvedValue(mockIssuesData);

      const result = await analytics.calculateThroughput({
        jql: 'project = TEST',
        interval: 'weekly'
      });

      expect(result.metrics.total).toBe(2);
      expect(result.metrics.average).toBeGreaterThan(0);
      expect(result.metrics.trend).toMatch(/increasing|decreasing|stable/);
      expect(result.timeline).toBeDefined();
      expect(result.timeline.length).toBeGreaterThan(0);
    });

    test('should group throughput by issue type', async () => {
      mockClient.get.mockResolvedValue(mockIssuesData);

      const result = await analytics.calculateThroughput({
        jql: 'project = TEST',
        groupBy: 'issueType'
      });

      expect(result.groupedMetrics).toBeDefined();
      expect(result.groupedMetrics!['Task']).toBeDefined();
      expect(result.groupedMetrics!['Bug']).toBeDefined();
      expect(result.groupedMetrics!['Task'].total).toBe(1);
      expect(result.groupedMetrics!['Bug'].total).toBe(1);
    });
  });

  describe('generateWorkflowAnalytics', () => {
    test('should generate comprehensive analytics', async () => {
      mockClient.get.mockResolvedValue(mockIssuesData);

      const result = await analytics.generateWorkflowAnalytics({
        jql: 'project = TEST'
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.cycleTime).toBeDefined();
      expect(result.summary.leadTime).toBeDefined();
      expect(result.summary.throughput).toBeDefined();
      expect(result.summary.workInProgress).toBeDefined();
      expect(result.summary.flowEfficiency).toBeGreaterThanOrEqual(0);
      expect(result.summary.defectRate).toBeGreaterThanOrEqual(0);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should generate recommendations based on metrics', async () => {
      // Mock data with high cycle time variance
      const highVarianceData = {
        issues: [
          {
            ...mockIssuesData.issues[0],
            changelog: {
              histories: [
                {
                  created: '2024-01-02T10:00:00.000Z',
                  items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }]
                },
                {
                  created: '2024-01-20T15:00:00.000Z', // Very long cycle time
                  items: [{ field: 'status', fromString: 'In Progress', toString: 'Done' }]
                }
              ]
            }
          },
          mockIssuesData.issues[1]
        ]
      };

      mockClient.get.mockResolvedValue(highVarianceData);

      const result = await analytics.generateWorkflowAnalytics({
        jql: 'project = TEST'
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => 
        rec.includes('variance') || rec.includes('outliers')
      )).toBe(true);
    });
  });

  describe('error handling', () => {
    test('should handle API errors gracefully', async () => {
      mockClient.get.mockRejectedValue(new Error('API Error'));

      await expect(analytics.calculateCycleTime({
        jql: 'project = TEST'
      })).rejects.toThrow('Failed to calculate cycle time');
    });

    test('should handle invalid JQL', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid JQL'));

      await expect(analytics.generateWorkflowAnalytics({
        jql: 'invalid jql'
      })).rejects.toThrow('Failed to generate workflow analytics');
    });
  });

  describe('metric calculations', () => {
    test('should calculate percentiles correctly', async () => {
      // Create data with known values for testing percentiles
      const testData = {
        issues: Array.from({ length: 10 }, (_, i) => ({
          key: `TEST-${i + 1}`,
          fields: {
            summary: `Test issue ${i + 1}`,
            issuetype: { name: 'Task' },
            priority: { name: 'Medium' },
            assignee: { displayName: 'Test User' },
            created: '2024-01-01T10:00:00.000Z',
            resolutiondate: `2024-01-${String(i + 2).padStart(2, '0')}T15:00:00.000Z`,
            status: { name: 'Done' }
          },
          changelog: {
            histories: [
              {
                created: '2024-01-01T12:00:00.000Z',
                items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }]
              },
              {
                created: `2024-01-${String(i + 2).padStart(2, '0')}T15:00:00.000Z`,
                items: [{ field: 'status', fromString: 'In Progress', toString: 'Done' }]
              }
            ]
          }
        }))
      };

      mockClient.get.mockResolvedValue(testData);

      const result = await analytics.calculateCycleTime({
        jql: 'project = TEST'
      });

      expect(result.metrics.count).toBe(10);
      expect(result.metrics.percentile85).toBeGreaterThan(result.metrics.median);
      expect(result.metrics.percentile95).toBeGreaterThan(result.metrics.percentile85);
      expect(result.metrics.max).toBeGreaterThanOrEqual(result.metrics.percentile95);
      expect(result.metrics.min).toBeLessThanOrEqual(result.metrics.median);
    });
  });
});
