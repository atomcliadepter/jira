
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';

describe('CLI Integration Tests', () => {
  const CLI_PATH = './dist/cli/workflow-cli.js';
  const TEST_PROJECT = process.env.TEST_PROJECT_KEY || 'SCRUM';
  
  // Skip CLI tests if not in integration test environment
  const skipCLITests = !process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN;

  beforeEach(() => {
    if (skipCLITests) {
      console.log('Skipping CLI tests - JIRA credentials not configured');
    }
  });

  afterEach(() => {
    // Clean up test files
    const testFiles = [
      './cli-test-report.json',
      './cli-test-report.csv',
      './cli-test-report.md',
      './cli-test-export.csv',
      './reports/cli-test-dashboard.html'
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

  const runCLICommand = (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    return new Promise((resolve) => {
      const child = spawn('node', [CLI_PATH, ...args], {
        stdio: 'pipe',
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0
        });
      });

      // Set timeout for CLI commands
      setTimeout(() => {
        child.kill();
        resolve({
          stdout,
          stderr,
          exitCode: -1
        });
      }, 30000); // 30 second timeout
    });
  };

  describe('Health Check Command', () => {
    test('should check JIRA connection', async () => {
      if (skipCLITests) return;

      const result = await runCLICommand(['health']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Connected as:');
      expect(result.stdout).toContain('Permissions loaded:');
      expect(result.stdout).toContain('JIRA connection is healthy!');
    });
  });

  describe('Analytics Commands', () => {
    test('should run analytics command', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}" AND resolved >= -30d`;
      const result = await runCLICommand(['analytics', '-j', jql]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Generating workflow analytics');
      expect(result.stdout).toContain('Workflow Analytics Summary');
      expect(result.stdout).toContain('Cycle Time:');
      expect(result.stdout).toContain('Lead Time:');
      expect(result.stdout).toContain('Throughput:');
      expect(result.stdout).toContain('Recommendations:');
    });

    test('should run cycle-time command', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}" AND resolved >= -30d`;
      const result = await runCLICommand(['cycle-time', '-j', jql]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Calculating cycle time');
      expect(result.stdout).toContain('Cycle Time Metrics:');
      expect(result.stdout).toContain('Median:');
      expect(result.stdout).toContain('Average:');
      expect(result.stdout).toContain('Count:');
    });

    test('should run cycle-time command with custom statuses', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}" AND resolved >= -30d`;
      const result = await runCLICommand([
        'cycle-time', 
        '-j', jql,
        '-s', 'To Do',
        '-e', 'Done'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Start Status: To Do');
      expect(result.stdout).toContain('End Status: Done');
    });

    test('should run analytics with date range', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}"`;
      const result = await runCLICommand([
        'analytics',
        '-j', jql,
        '-s', '2024-01-01',
        '-e', '2024-12-31'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Start Date: 2024-01-01');
      expect(result.stdout).toContain('End Date: 2024-12-31');
    });

    test('should run analytics with grouping', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}" AND resolved >= -60d`;
      const result = await runCLICommand([
        'analytics',
        '-j', jql,
        '-g', 'issueType'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Generating workflow analytics');
    });
  });

  describe('Report Commands', () => {
    test('should generate JSON report', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}" AND resolved >= -30d`;
      const result = await runCLICommand([
        'report',
        '-j', jql,
        '-f', 'json',
        '-o', './cli-test-report.json'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Report generated successfully!');
      expect(result.stdout).toContain('Report saved to:');
      expect(existsSync('./cli-test-report.json')).toBe(true);

      // Verify report content
      const reportContent = JSON.parse(readFileSync('./cli-test-report.json', 'utf8'));
      expect(reportContent.metadata).toBeDefined();
      expect(reportContent.summary).toBeDefined();
    });

    test('should generate CSV report', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}" AND resolved >= -30d`;
      const result = await runCLICommand([
        'report',
        '-j', jql,
        '-f', 'csv',
        '-o', './cli-test-report.csv'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Report generated successfully!');
      expect(existsSync('./cli-test-report.csv')).toBe(true);

      // Verify CSV content
      const csvContent = readFileSync('./cli-test-report.csv', 'utf8');
      expect(csvContent).toContain('Key,Summary');
    });

    test('should generate Markdown report', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}" AND resolved >= -30d`;
      const result = await runCLICommand([
        'report',
        '-j', jql,
        '-f', 'markdown',
        '-o', './cli-test-report.md'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Report generated successfully!');
      expect(existsSync('./cli-test-report.md')).toBe(true);

      // Verify Markdown content
      const mdContent = readFileSync('./cli-test-report.md', 'utf8');
      expect(mdContent).toContain('# Workflow Analytics Report');
    });

    test('should generate report without recommendations', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}" AND resolved >= -30d`;
      const result = await runCLICommand([
        'report',
        '-j', jql,
        '-f', 'json',
        '-o', './cli-test-report.json',
        '--no-recommendations'
      ]);

      expect(result.exitCode).toBe(0);
      expect(existsSync('./cli-test-report.json')).toBe(true);

      // Verify recommendations are excluded
      const reportContent = JSON.parse(readFileSync('./cli-test-report.json', 'utf8'));
      expect(reportContent.recommendations).toHaveLength(0);
    });
  });

  describe('Dashboard Command', () => {
    test('should generate dashboard', async () => {
      if (skipCLITests) return;

      const result = await runCLICommand([
        'dashboard',
        '-p', TEST_PROJECT,
        '-t', '30d',
        '-o', './reports'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Dashboard generated successfully!');
      expect(result.stdout).toContain('Dashboard saved to:');
      expect(result.stdout).toContain('Project Summary:');
      expect(result.stdout).toContain(TEST_PROJECT);
    });

    test('should generate dashboard for multiple projects', async () => {
      if (skipCLITests) return;

      const result = await runCLICommand([
        'dashboard',
        '-p', `${TEST_PROJECT},${TEST_PROJECT}`,
        '-t', '7d'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Dashboard generated successfully!');
    });

    test('should generate dashboard with custom metrics', async () => {
      if (skipCLITests) return;

      const result = await runCLICommand([
        'dashboard',
        '-p', TEST_PROJECT,
        '-m', 'cycleTime,leadTime',
        '-t', '30d'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Metrics: cycleTime, leadTime');
    });
  });

  describe('Export Command', () => {
    test('should export issues in CSV format', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}" AND resolved >= -30d`;
      const result = await runCLICommand([
        'export',
        '-j', jql,
        '-f', 'csv',
        '-o', './cli-test-export.csv'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Export completed successfully!');
      expect(result.stdout).toContain('Export saved to:');
      expect(existsSync('./cli-test-export.csv')).toBe(true);

      // Verify CSV content
      const csvContent = readFileSync('./cli-test-export.csv', 'utf8');
      expect(csvContent).toContain('Key,Summary,Issue Type');
    });

    test('should export issues with status history', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}" AND resolved >= -30d`;
      const result = await runCLICommand([
        'export',
        '-j', jql,
        '-f', 'csv',
        '-o', './cli-test-export.csv',
        '--include-history'
      ]);

      expect(result.exitCode).toBe(0);
      expect(existsSync('./cli-test-export.csv')).toBe(true);

      // Verify status history is included
      const csvContent = readFileSync('./cli-test-export.csv', 'utf8');
      expect(csvContent).toContain('Status History');
    });

    test('should export issues in JSON format', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}" AND resolved >= -30d`;
      const result = await runCLICommand([
        'export',
        '-j', jql,
        '-f', 'json',
        '-o', './cli-test-export.json'
      ]);

      expect(result.exitCode).toBe(0);
      expect(existsSync('./cli-test-export.json')).toBe(true);

      // Verify JSON content
      const jsonContent = JSON.parse(readFileSync('./cli-test-export.json', 'utf8'));
      expect(Array.isArray(jsonContent)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JQL', async () => {
      if (skipCLITests) return;

      const result = await runCLICommand([
        'analytics',
        '-j', 'invalid jql syntax'
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Analytics generation failed');
    });

    test('should handle missing required arguments', async () => {
      if (skipCLITests) return;

      const result = await runCLICommand(['analytics']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('required option');
    });

    test('should handle invalid format option', async () => {
      if (skipCLITests) return;

      const jql = `project = "${TEST_PROJECT}"`;
      const result = await runCLICommand([
        'report',
        '-j', jql,
        '-f', 'invalid-format'
      ]);

      expect(result.exitCode).toBe(1);
    });

    test('should handle invalid time range', async () => {
      if (skipCLITests) return;

      const result = await runCLICommand([
        'dashboard',
        '-p', TEST_PROJECT,
        '-t', 'invalid-range'
      ]);

      expect(result.exitCode).toBe(1);
    });
  });

  describe('Help and Version', () => {
    test('should display help', async () => {
      const result = await runCLICommand(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Advanced JIRA Workflow Management CLI');
      expect(result.stdout).toContain('analytics');
      expect(result.stdout).toContain('report');
      expect(result.stdout).toContain('dashboard');
      expect(result.stdout).toContain('export');
    });

    test('should display version', async () => {
      const result = await runCLICommand(['--version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('1.0.0');
    });

    test('should display command-specific help', async () => {
      const result = await runCLICommand(['analytics', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Generate comprehensive workflow analytics');
      expect(result.stdout).toContain('-j, --jql');
      expect(result.stdout).toContain('-s, --start-date');
      expect(result.stdout).toContain('-g, --group-by');
    });
  });

  describe('Configuration and Environment', () => {
    test('should handle missing environment variables gracefully', async () => {
      // This test would need to be run in a separate process with modified env
      // For now, we'll just verify the CLI can start
      const result = await runCLICommand(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
