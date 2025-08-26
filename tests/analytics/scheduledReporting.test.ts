
import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { ScheduledReporting } from '../../src/analytics/scheduledReporting.js';
import { JiraRestClient } from '../../src/http/JiraRestClient.js';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

// Mock the JiraRestClient
jest.mock('../../src/http/JiraRestClient.js');

describe('ScheduledReporting - Unit Tests', () => {
  let mockClient: jest.Mocked<JiraRestClient>;
  let scheduledReporting: ScheduledReporting;
  let testConfigPath: string;

  beforeEach(() => {
    mockClient = new JiraRestClient({
      baseUrl: 'https://test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token'
    }) as jest.Mocked<JiraRestClient>;

    // Setup test config directory
    const testConfigDir = join(process.cwd(), 'test-config');
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true });
    }
    testConfigPath = join(testConfigDir, 'scheduled-reports.json');

    scheduledReporting = new ScheduledReporting(mockClient);
  });

  afterEach(() => {
    // Clean up test config file
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe('createScheduledReport', () => {
    test('should create a new scheduled report', async () => {
      const reportConfig = {
        name: 'Daily Bug Report',
        description: 'Daily report of all bugs',
        query: { jql: 'project = TEST AND issueType = Bug' },
        format: 'csv' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
          timezone: 'UTC'
        },
        recipients: ['admin@example.com'],
        enabled: true
      };

      const result = await scheduledReporting.createScheduledReport(reportConfig);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Daily Bug Report');
      expect(result.description).toBe('Daily report of all bugs');
      expect(result.format).toBe('csv');
      expect(result.schedule.frequency).toBe('daily');
      expect(result.schedule.time).toBe('09:00');
      expect(result.enabled).toBe(true);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.nextRun).toBeDefined();
    });

    test('should create weekly scheduled report', async () => {
      const reportConfig = {
        name: 'Weekly Sprint Report',
        query: { jql: 'project = TEST' },
        format: 'pdf' as const,
        schedule: {
          frequency: 'weekly' as const,
          time: '10:00',
          dayOfWeek: 1, // Monday
          timezone: 'UTC'
        }
      };

      const result = await scheduledReporting.createScheduledReport(reportConfig);

      expect(result.schedule.frequency).toBe('weekly');
      expect(result.schedule.dayOfWeek).toBe(1);
      expect(result.nextRun).toBeDefined();
    });

    test('should create monthly scheduled report', async () => {
      const reportConfig = {
        name: 'Monthly Summary',
        query: { jql: 'project = TEST' },
        format: 'excel' as const,
        schedule: {
          frequency: 'monthly' as const,
          time: '08:00',
          dayOfMonth: 1,
          timezone: 'UTC'
        }
      };

      const result = await scheduledReporting.createScheduledReport(reportConfig);

      expect(result.schedule.frequency).toBe('monthly');
      expect(result.schedule.dayOfMonth).toBe(1);
      expect(result.nextRun).toBeDefined();
    });

    test('should throw error for invalid schedule time format', async () => {
      const reportConfig = {
        name: 'Invalid Time Report',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '25:00', // Invalid time
          timezone: 'UTC'
        }
      };

      await expect(scheduledReporting.createScheduledReport(reportConfig)).rejects.toThrow();
    });

    test('should throw error for invalid email format', async () => {
      const reportConfig = {
        name: 'Invalid Email Report',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
          timezone: 'UTC'
        },
        recipients: ['invalid-email'] // Invalid email format
      };

      await expect(scheduledReporting.createScheduledReport(reportConfig)).rejects.toThrow();
    });
  });

  describe('updateScheduledReport', () => {
    test('should update existing scheduled report', async () => {
      // First create a report
      const reportConfig = {
        name: 'Test Report',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
          timezone: 'UTC'
        }
      };

      const createdReport = await scheduledReporting.createScheduledReport(reportConfig);

      // Then update it
      const updates = {
        name: 'Updated Test Report',
        description: 'Updated description',
        enabled: false
      };

      const updatedReport = await scheduledReporting.updateScheduledReport(createdReport.id!, updates);

      expect(updatedReport.name).toBe('Updated Test Report');
      expect(updatedReport.description).toBe('Updated description');
      expect(updatedReport.enabled).toBe(false);
      expect(updatedReport.updatedAt).not.toBe(createdReport.updatedAt);
    });

    test('should recalculate next run when schedule is updated', async () => {
      const reportConfig = {
        name: 'Test Report',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
          timezone: 'UTC'
        }
      };

      const createdReport = await scheduledReporting.createScheduledReport(reportConfig);
      const originalNextRun = createdReport.nextRun;

      // Update schedule
      const updates = {
        schedule: {
          frequency: 'weekly' as const,
          time: '10:00',
          dayOfWeek: 2,
          timezone: 'UTC'
        }
      };

      const updatedReport = await scheduledReporting.updateScheduledReport(createdReport.id!, updates);

      expect(updatedReport.schedule.frequency).toBe('weekly');
      expect(updatedReport.schedule.time).toBe('10:00');
      expect(updatedReport.schedule.dayOfWeek).toBe(2);
      expect(updatedReport.nextRun).not.toBe(originalNextRun);
    });

    test('should throw error when updating non-existent report', async () => {
      const updates = { name: 'Updated Name' };

      await expect(scheduledReporting.updateScheduledReport('non-existent-id', updates))
        .rejects.toThrow('Scheduled report with ID non-existent-id not found');
    });
  });

  describe('deleteScheduledReport', () => {
    test('should delete existing scheduled report', async () => {
      const reportConfig = {
        name: 'Test Report',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
          timezone: 'UTC'
        }
      };

      const createdReport = await scheduledReporting.createScheduledReport(reportConfig);
      const deleted = await scheduledReporting.deleteScheduledReport(createdReport.id!);

      expect(deleted).toBe(true);
      expect(scheduledReporting.getScheduledReport(createdReport.id!)).toBeUndefined();
    });

    test('should return false when deleting non-existent report', async () => {
      const deleted = await scheduledReporting.deleteScheduledReport('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('getScheduledReports', () => {
    test('should return empty array when no reports exist', () => {
      const reports = scheduledReporting.getScheduledReports();
      expect(reports).toEqual([]);
    });

    test('should return all scheduled reports', async () => {
      const reportConfig1 = {
        name: 'Report 1',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: { frequency: 'daily' as const, time: '09:00', timezone: 'UTC' }
      };

      const reportConfig2 = {
        name: 'Report 2',
        query: { jql: 'project = DEMO' },
        format: 'pdf' as const,
        schedule: { frequency: 'weekly' as const, time: '10:00', dayOfWeek: 1, timezone: 'UTC' }
      };

      await scheduledReporting.createScheduledReport(reportConfig1);
      await scheduledReporting.createScheduledReport(reportConfig2);

      const reports = scheduledReporting.getScheduledReports();
      expect(reports).toHaveLength(2);
      expect(reports.map(r => r.name)).toContain('Report 1');
      expect(reports.map(r => r.name)).toContain('Report 2');
    });
  });

  describe('getDueReports', () => {
    test('should return empty array when no reports are due', async () => {
      // Create a report scheduled for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const reportConfig = {
        name: 'Future Report',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: {
          frequency: 'daily' as const,
          time: `${tomorrow.getHours().toString().padStart(2, '0')}:${tomorrow.getMinutes().toString().padStart(2, '0')}`,
          timezone: 'UTC'
        }
      };

      await scheduledReporting.createScheduledReport(reportConfig);
      const dueReports = scheduledReporting.getDueReports();
      expect(dueReports).toHaveLength(0);
    });

    test('should not return disabled reports', async () => {
      const reportConfig = {
        name: 'Disabled Report',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '00:00', // Past time
          timezone: 'UTC'
        },
        enabled: false
      };

      await scheduledReporting.createScheduledReport(reportConfig);
      const dueReports = scheduledReporting.getDueReports();
      expect(dueReports).toHaveLength(0);
    });
  });

  describe('executeScheduledReport', () => {
    test('should execute scheduled report with JQL query', async () => {
      mockClient.searchIssues = jest.fn().mockResolvedValue({
        issues: [
          { key: 'TEST-1', fields: { summary: 'Test issue' } }
        ]
      });

      const reportConfig = {
        name: 'Test Report',
        query: { jql: 'project = TEST' },
        format: 'json' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
          timezone: 'UTC'
        }
      };

      const createdReport = await scheduledReporting.createScheduledReport(reportConfig);
      const result = await scheduledReporting.executeScheduledReport(createdReport.id!);

      expect(result.format).toBe('json');
      expect(result.filePath).toBeDefined();
      expect(mockClient.searchIssues).toHaveBeenCalledWith({
        jql: 'project = TEST',
        maxResults: 1000,
        fields: ['summary', 'status', 'assignee', 'created', 'updated']
      });

      // Check that lastRun and nextRun were updated
      const updatedReport = scheduledReporting.getScheduledReport(createdReport.id!);
      expect(updatedReport?.lastRun).toBeDefined();
      expect(updatedReport?.nextRun).toBeDefined();
    });

    test('should throw error when executing non-existent report', async () => {
      await expect(scheduledReporting.executeScheduledReport('non-existent-id'))
        .rejects.toThrow('Scheduled report with ID non-existent-id not found');
    });

    test('should throw error when executing disabled report', async () => {
      const reportConfig = {
        name: 'Disabled Report',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
          timezone: 'UTC'
        },
        enabled: false
      };

      const createdReport = await scheduledReporting.createScheduledReport(reportConfig);
      
      await expect(scheduledReporting.executeScheduledReport(createdReport.id!))
        .rejects.toThrow(`Scheduled report ${createdReport.id} is disabled`);
    });

    test('should throw error for invalid query type', async () => {
      const reportConfig = {
        name: 'Invalid Query Report',
        query: { type: 'invalid' }, // Invalid query type
        format: 'csv' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
          timezone: 'UTC'
        }
      };

      const createdReport = await scheduledReporting.createScheduledReport(reportConfig);
      
      await expect(scheduledReporting.executeScheduledReport(createdReport.id!))
        .rejects.toThrow('Invalid query type in scheduled report');
    });
  });

  describe('runDueReports', () => {
    test('should run all due reports successfully', async () => {
      mockClient.searchIssues = jest.fn().mockResolvedValue({
        issues: [{ key: 'TEST-1', fields: { summary: 'Test issue' } }]
      });

      // Create a report that should be due (past time)
      const reportConfig = {
        name: 'Due Report',
        query: { jql: 'project = TEST' },
        format: 'json' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '00:00', // Past time to make it due
          timezone: 'UTC'
        }
      };

      const createdReport = await scheduledReporting.createScheduledReport(reportConfig);
      
      // Manually set nextRun to past time to make it due
      await scheduledReporting.updateScheduledReport(createdReport.id!, {
        nextRun: new Date(Date.now() - 1000).toISOString()
      });

      const results = await scheduledReporting.runDueReports();

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(createdReport.id);
      expect(results[0].result).toBeDefined();
      expect(results[0].error).toBeUndefined();
    });

    test('should handle errors in individual report execution', async () => {
      mockClient.searchIssues = jest.fn().mockRejectedValue(new Error('API Error'));

      const reportConfig = {
        name: 'Failing Report',
        query: { jql: 'project = TEST' },
        format: 'json' as const,
        schedule: {
          frequency: 'daily' as const,
          time: '00:00',
          timezone: 'UTC'
        }
      };

      const createdReport = await scheduledReporting.createScheduledReport(reportConfig);
      
      // Make it due
      await scheduledReporting.updateScheduledReport(createdReport.id!, {
        nextRun: new Date(Date.now() - 1000).toISOString()
      });

      const results = await scheduledReporting.runDueReports();

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(createdReport.id);
      expect(results[0].result).toBeNull();
      expect(results[0].error).toBeDefined();
      expect(results[0].error).toContain('API Error');
    });
  });

  describe('next run calculation', () => {
    test('should calculate next daily run correctly', async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      
      const reportConfig = {
        name: 'Daily Report',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: {
          frequency: 'daily' as const,
          time: `${futureTime.getHours().toString().padStart(2, '0')}:${futureTime.getMinutes().toString().padStart(2, '0')}`,
          timezone: 'UTC'
        }
      };

      const report = await scheduledReporting.createScheduledReport(reportConfig);
      const nextRun = new Date(report.nextRun!);
      
      expect(nextRun.getHours()).toBe(futureTime.getHours());
      expect(nextRun.getMinutes()).toBe(futureTime.getMinutes());
      expect(nextRun.getDate()).toBe(now.getDate()); // Same day since it's in the future
    });

    test('should calculate next weekly run correctly', async () => {
      const reportConfig = {
        name: 'Weekly Report',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: {
          frequency: 'weekly' as const,
          time: '09:00',
          dayOfWeek: 1, // Monday
          timezone: 'UTC'
        }
      };

      const report = await scheduledReporting.createScheduledReport(reportConfig);
      const nextRun = new Date(report.nextRun!);
      
      expect(nextRun.getDay()).toBe(1); // Monday
      expect(nextRun.getHours()).toBe(9);
      expect(nextRun.getMinutes()).toBe(0);
    });

    test('should calculate next monthly run correctly', async () => {
      const reportConfig = {
        name: 'Monthly Report',
        query: { jql: 'project = TEST' },
        format: 'csv' as const,
        schedule: {
          frequency: 'monthly' as const,
          time: '08:00',
          dayOfMonth: 15,
          timezone: 'UTC'
        }
      };

      const report = await scheduledReporting.createScheduledReport(reportConfig);
      const nextRun = new Date(report.nextRun!);
      
      expect(nextRun.getDate()).toBe(15);
      expect(nextRun.getHours()).toBe(8);
      expect(nextRun.getMinutes()).toBe(0);
    });
  });
});
