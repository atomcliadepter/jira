
import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { Command } from 'commander';
import { JiraRestClient } from '../../src/http/JiraRestClient.js';
import { createReportCommand } from '../../src/cli/commands/report.js';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

// Mock the JiraRestClient
jest.mock('../../src/http/JiraRestClient.js');

// Mock console methods to capture output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Mock process.exit
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
  throw new Error(`Process exit called with code ${code}`);
});

describe('Report CLI Commands - Unit Tests', () => {
  let mockClient: jest.Mocked<JiraRestClient>;
  let reportCommand: Command;
  let testExportsDir: string;

  beforeEach(() => {
    mockClient = new JiraRestClient({
      baseUrl: 'https://test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token'
    }) as jest.Mocked<JiraRestClient>;

    reportCommand = createReportCommand(mockClient);
    
    // Setup test exports directory
    testExportsDir = join(process.cwd(), 'exports');
    if (!existsSync(testExportsDir)) {
      mkdirSync(testExportsDir, { recursive: true });
    }

    // Clear mock calls
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testExportsDir)) {
      const fs = require('fs');
      try {
        const files = fs.readdirSync(testExportsDir);
        files.forEach((file: string) => {
          try {
            unlinkSync(join(testExportsDir, file));
          } catch (error) {
            // Ignore cleanup errors
          }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('jql-builder command', () => {
    test('should build basic JQL query', async () => {
      const args = ['jql-builder', '--project', 'TEST', '--max-results', '100'];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('🔍 Building advanced JQL query...');
      expect(mockConsoleLog).toHaveBeenCalledWith('\n📋 Generated JQL Query:');
      expect(mockConsoleLog).toHaveBeenCalledWith('project = "TEST"\n');
      expect(mockConsoleLog).toHaveBeenCalledWith('📊 Query Metadata:');
    });

    test('should build complex JQL query with multiple filters', async () => {
      const args = [
        'jql-builder',
        '--project', 'TEST',
        '--issue-types', 'Bug,Task',
        '--statuses', 'Open,In Progress',
        '--assignees', 'john.doe@example.com',
        '--created-from', '2024-01-01',
        '--created-to', '2024-12-31',
        '--order-by', 'created:DESC'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('🔍 Building advanced JQL query...');
      // The generated JQL should contain all the specified filters
      const jqlOutput = mockConsoleLog.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('project = "TEST"')
      );
      expect(jqlOutput).toBeDefined();
    });

    test('should build JQL query with advanced operators', async () => {
      const args = [
        'jql-builder',
        '--project', 'TEST',
        '--and', 'status = "Open",priority = "High"',
        '--or', 'assignee = "user1",assignee = "user2"',
        '--not', 'labels = "excluded"'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('🔍 Building advanced JQL query...');
      expect(mockConsoleLog).toHaveBeenCalledWith('📊 Query Metadata:');
    });

    test('should handle custom fields JSON', async () => {
      const customFields = JSON.stringify({ 'Story Points': [1, 2, 3], 'Epic Link': 'EPIC-123' });
      const args = [
        'jql-builder',
        '--project', 'TEST',
        '--custom-fields', customFields
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('🔍 Building advanced JQL query...');
    });

    test('should handle invalid custom fields JSON', async () => {
      const args = [
        'jql-builder',
        '--project', 'TEST',
        '--custom-fields', 'invalid-json'
      ];
      
      await expect(reportCommand.parseAsync(args, { from: 'user' })).rejects.toThrow();
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Error building JQL query:'));
    });
  });

  describe('dashboard command', () => {
    test('should generate dashboard metrics', async () => {
      const args = [
        'dashboard',
        '--project', 'TEST',
        '--from', '2024-01-01',
        '--to', '2024-12-31',
        '--metrics', 'velocity,cycleTime',
        '--export', 'json'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('📊 Generating dashboard metrics...');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ Dashboard metrics exported to:'));
    });

    test('should generate dashboard metrics without export', async () => {
      const args = [
        'dashboard',
        '--project', 'TEST',
        '--from', '2024-01-01',
        '--to', '2024-12-31'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('📊 Generating dashboard metrics...');
      expect(mockConsoleLog).toHaveBeenCalledWith('\n📈 Dashboard Metrics:');
    });

    test('should require project parameter', async () => {
      const args = [
        'dashboard',
        '--from', '2024-01-01',
        '--to', '2024-12-31'
      ];
      
      await expect(reportCommand.parseAsync(args, { from: 'user' })).rejects.toThrow();
    });

    test('should require from parameter', async () => {
      const args = [
        'dashboard',
        '--project', 'TEST',
        '--to', '2024-12-31'
      ];
      
      await expect(reportCommand.parseAsync(args, { from: 'user' })).rejects.toThrow();
    });

    test('should require to parameter', async () => {
      const args = [
        'dashboard',
        '--project', 'TEST',
        '--from', '2024-01-01'
      ];
      
      await expect(reportCommand.parseAsync(args, { from: 'user' })).rejects.toThrow();
    });
  });

  describe('burndown command', () => {
    test('should generate burndown chart', async () => {
      const args = [
        'burndown',
        '--project', 'TEST',
        '--start', '2024-01-01',
        '--end', '2024-01-31',
        '--type', 'sprint',
        '--export', 'json'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('📉 Generating burndown chart...');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ Burndown chart exported to:'));
    });

    test('should generate burndown chart with sprint ID', async () => {
      const args = [
        'burndown',
        '--project', 'TEST',
        '--start', '2024-01-01',
        '--end', '2024-01-31',
        '--sprint', '123',
        '--include-scope',
        '--include-weekends'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('📉 Generating burndown chart...');
    });

    test('should generate burndown chart with PDF export', async () => {
      const args = [
        'burndown',
        '--project', 'TEST',
        '--start', '2024-01-01',
        '--end', '2024-01-31',
        '--export', 'pdf'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('📉 Generating burndown chart...');
    });
  });

  describe('velocity command', () => {
    test('should track velocity', async () => {
      const args = [
        'velocity',
        '--project', 'TEST',
        '--sprints', '5',
        '--export', 'json'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('🏃 Tracking velocity...');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ Velocity data exported to:'));
    });

    test('should track velocity with team ID', async () => {
      const args = [
        'velocity',
        '--project', 'TEST',
        '--team', 'team-123',
        '--sprints', '10',
        '--story-point-field', 'customfield_10001'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('🏃 Tracking velocity...');
    });

    test('should track velocity with Excel export', async () => {
      const args = [
        'velocity',
        '--project', 'TEST',
        '--export', 'excel'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('🏃 Tracking velocity...');
    });
  });

  describe('export command', () => {
    test('should export data in CSV format', async () => {
      mockClient.searchIssues = jest.fn().mockResolvedValue({
        issues: [
          {
            key: 'TEST-1',
            fields: {
              summary: 'Test issue 1',
              status: { name: 'Open' },
              assignee: { displayName: 'John Doe' },
              created: '2024-01-01T10:00:00.000Z',
              updated: '2024-01-02T10:00:00.000Z',
              priority: { name: 'High' },
              issuetype: { name: 'Bug' }
            }
          }
        ]
      });

      const args = [
        'export',
        '--format', 'csv',
        '--query', 'project = TEST',
        '--output', 'test-export',
        '--max-results', '500'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('📤 Exporting data...');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ Data exported to:'));
      expect(mockConsoleLog).toHaveBeenCalledWith('📊 Exported 1 issues');
      expect(mockClient.searchIssues).toHaveBeenCalledWith({
        jql: 'project = TEST',
        maxResults: 500,
        fields: ['summary', 'status', 'assignee', 'created', 'updated', 'priority', 'issuetype']
      });
    });

    test('should export data in PDF format', async () => {
      mockClient.searchIssues = jest.fn().mockResolvedValue({
        issues: []
      });

      const args = [
        'export',
        '--format', 'pdf',
        '--query', 'project = TEST AND issueType = Bug',
        '--include-charts',
        '--include-metadata'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('📤 Exporting data...');
      expect(mockConsoleLog).toHaveBeenCalledWith('📊 Exported 0 issues');
    });

    test('should export data in Excel format', async () => {
      mockClient.searchIssues = jest.fn().mockResolvedValue({
        issues: [
          { key: 'TEST-1', fields: { summary: 'Test' } },
          { key: 'TEST-2', fields: { summary: 'Test 2' } }
        ]
      });

      const args = [
        'export',
        '--format', 'excel',
        '--query', 'project = TEST',
        '--output', 'excel-export'
      ];
      
      await reportCommand.parseAsync(args, { from: 'user' });

      expect(mockConsoleLog).toHaveBeenCalledWith('📤 Exporting data...');
      expect(mockConsoleLog).toHaveBeenCalledWith('📊 Exported 2 issues');
    });

    test('should handle search errors', async () => {
      mockClient.searchIssues = jest.fn().mockRejectedValue(new Error('Search failed'));

      const args = [
        'export',
        '--format', 'json',
        '--query', 'invalid jql'
      ];
      
      await expect(reportCommand.parseAsync(args, { from: 'user' })).rejects.toThrow();
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Error exporting data:'));
    });
  });

  describe('scheduled reports commands', () => {
    describe('scheduled create', () => {
      test('should create daily scheduled report', async () => {
        const args = [
          'scheduled', 'create',
          '--name', 'Daily Bug Report',
          '--query', 'project = TEST AND issueType = Bug',
          '--format', 'csv',
          '--frequency', 'daily',
          '--time', '09:00',
          '--description', 'Daily report of all bugs',
          '--recipients', 'admin@example.com,manager@example.com'
        ];
        
        await reportCommand.parseAsync(args, { from: 'user' });

        expect(mockConsoleLog).toHaveBeenCalledWith('📅 Creating scheduled report...');
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ Scheduled report created with ID:'));
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📅 Next run:'));
      });

      test('should create weekly scheduled report', async () => {
        const args = [
          'scheduled', 'create',
          '--name', 'Weekly Sprint Report',
          '--query', 'project = TEST',
          '--format', 'pdf',
          '--frequency', 'weekly',
          '--time', '10:00',
          '--day-of-week', '1',
          '--timezone', 'America/New_York'
        ];
        
        await reportCommand.parseAsync(args, { from: 'user' });

        expect(mockConsoleLog).toHaveBeenCalledWith('📅 Creating scheduled report...');
      });

      test('should create monthly scheduled report', async () => {
        const args = [
          'scheduled', 'create',
          '--name', 'Monthly Summary',
          '--query', 'project = TEST',
          '--format', 'excel',
          '--frequency', 'monthly',
          '--time', '08:00',
          '--day-of-month', '1'
        ];
        
        await reportCommand.parseAsync(args, { from: 'user' });

        expect(mockConsoleLog).toHaveBeenCalledWith('📅 Creating scheduled report...');
      });

      test('should handle invalid time format', async () => {
        const args = [
          'scheduled', 'create',
          '--name', 'Invalid Time Report',
          '--query', 'project = TEST',
          '--format', 'csv',
          '--frequency', 'daily',
          '--time', '25:00' // Invalid time
        ];
        
        await expect(reportCommand.parseAsync(args, { from: 'user' })).rejects.toThrow();
        expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Error creating scheduled report:'));
      });

      test('should handle invalid email format', async () => {
        const args = [
          'scheduled', 'create',
          '--name', 'Invalid Email Report',
          '--query', 'project = TEST',
          '--format', 'csv',
          '--frequency', 'daily',
          '--time', '09:00',
          '--recipients', 'invalid-email' // Invalid email
        ];
        
        await expect(reportCommand.parseAsync(args, { from: 'user' })).rejects.toThrow();
        expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Error creating scheduled report:'));
      });
    });

    describe('scheduled list', () => {
      test('should list all scheduled reports', async () => {
        const args = ['scheduled', 'list'];
        
        await reportCommand.parseAsync(args, { from: 'user' });

        expect(mockConsoleLog).toHaveBeenCalledWith('📋 No scheduled reports found');
      });

      test('should list only enabled reports', async () => {
        const args = ['scheduled', 'list', '--enabled-only'];
        
        await reportCommand.parseAsync(args, { from: 'user' });

        expect(mockConsoleLog).toHaveBeenCalledWith('📋 No scheduled reports found');
      });
    });

    describe('scheduled run', () => {
      test('should run scheduled report', async () => {
        mockClient.searchIssues = jest.fn().mockResolvedValue({
          issues: [{ key: 'TEST-1', fields: { summary: 'Test' } }]
        });

        // First create a report
        const createArgs = [
          'scheduled', 'create',
          '--name', 'Test Report',
          '--query', 'project = TEST',
          '--format', 'json',
          '--frequency', 'daily',
          '--time', '09:00'
        ];
        
        await reportCommand.parseAsync(createArgs, { from: 'user' });

        // Extract the report ID from the console output
        const createOutput = mockConsoleLog.mock.calls.find(call => 
          typeof call[0] === 'string' && call[0].includes('✅ Scheduled report created with ID:')
        );
        
        if (createOutput) {
          const reportId = createOutput[0].split('ID: ')[1];
          
          const runArgs = ['scheduled', 'run', '--id', reportId];
          
          await reportCommand.parseAsync(runArgs, { from: 'user' });

          expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🏃 Running scheduled report'));
          expect(mockConsoleLog).toHaveBeenCalledWith('✅ Report executed successfully');
        }
      });

      test('should handle non-existent report ID', async () => {
        const args = ['scheduled', 'run', '--id', 'non-existent-id'];
        
        await expect(reportCommand.parseAsync(args, { from: 'user' })).rejects.toThrow();
        expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Error running scheduled report:'));
      });
    });

    describe('scheduled delete', () => {
      test('should delete scheduled report', async () => {
        // First create a report
        const createArgs = [
          'scheduled', 'create',
          '--name', 'Test Report to Delete',
          '--query', 'project = TEST',
          '--format', 'csv',
          '--frequency', 'daily',
          '--time', '09:00'
        ];
        
        await reportCommand.parseAsync(createArgs, { from: 'user' });

        // Extract the report ID from the console output
        const createOutput = mockConsoleLog.mock.calls.find(call => 
          typeof call[0] === 'string' && call[0].includes('✅ Scheduled report created with ID:')
        );
        
        if (createOutput) {
          const reportId = createOutput[0].split('ID: ')[1];
          
          const deleteArgs = ['scheduled', 'delete', '--id', reportId];
          
          await reportCommand.parseAsync(deleteArgs, { from: 'user' });

          expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🗑️ Deleting scheduled report'));
          expect(mockConsoleLog).toHaveBeenCalledWith('✅ Scheduled report deleted successfully');
        }
      });

      test('should handle non-existent report ID for deletion', async () => {
        const args = ['scheduled', 'delete', '--id', 'non-existent-id'];
        
        await reportCommand.parseAsync(args, { from: 'user' });

        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🗑️ Deleting scheduled report'));
        expect(mockConsoleLog).toHaveBeenCalledWith('❌ Scheduled report not found');
      });
    });
  });

  describe('error handling', () => {
    test('should handle missing required options', async () => {
      const args = ['dashboard']; // Missing required options
      
      await expect(reportCommand.parseAsync(args, { from: 'user' })).rejects.toThrow();
    });

    test('should handle invalid command', async () => {
      const args = ['invalid-command'];
      
      await expect(reportCommand.parseAsync(args, { from: 'user' })).rejects.toThrow();
    });
  });
});
