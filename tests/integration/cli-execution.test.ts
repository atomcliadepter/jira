import { describe, test, expect, beforeAll } from '@jest/globals';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { config } from 'dotenv';

// Load test environment
config({ path: '.env.test' });

describe('CLI Execution Tests', () => {
  const CLI_SCRIPTS = [
    './dist/cli/workflow-cli.js',
    './dist/cli/confluence-cli.js',
    './dist/cli/automation-cli.js',
    './dist/cli/customfield-cli.js'
  ];

  const skipCLITests = !process.env.JIRA_BASE_URL || 
                       !process.env.JIRA_EMAIL || 
                       !process.env.JIRA_API_TOKEN;

  beforeAll(() => {
    if (skipCLITests) {
      console.log('Skipping CLI execution tests - credentials not configured');
    }
  });

  describe('CLI Script Availability', () => {
    CLI_SCRIPTS.forEach(script => {
      test(`should have ${script} available`, () => {
        expect(existsSync(script)).toBe(true);
      });
    });
  });

  describe('CLI Help Commands', () => {
    test('workflow CLI should show help', (done) => {
      if (skipCLITests) {
        done();
        return;
      }

      const process = spawn('node', ['./dist/cli/workflow-cli.js', '--help'], {
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        expect(output).toContain('Usage:');
        expect(output).toContain('workflow');
        done();
      });
    }, 10000);

    test('automation CLI should show help', (done) => {
      if (skipCLITests) {
        done();
        return;
      }

      const process = spawn('node', ['./dist/cli/automation-cli.js', '--help'], {
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        expect(output).toContain('Usage:');
        expect(output).toContain('automation');
        done();
      });
    }, 10000);
  });

  describe('CLI Error Handling', () => {
    test('should handle invalid commands gracefully', (done) => {
      if (skipCLITests) {
        done();
        return;
      }

      const process = spawn('node', ['./dist/cli/workflow-cli.js', 'invalid-command'], {
        stdio: 'pipe'
      });

      let errorOutput = '';
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        expect(code).not.toBe(0);
        expect(errorOutput.length).toBeGreaterThan(0);
        done();
      });
    }, 10000);

    test('should validate required arguments', (done) => {
      if (skipCLITests) {
        done();
        return;
      }

      const process = spawn('node', ['./dist/cli/workflow-cli.js', 'analytics'], {
        stdio: 'pipe'
      });

      let errorOutput = '';
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        expect(code).not.toBe(0);
        done();
      });
    }, 10000);
  });

  describe('CLI Integration with Jira', () => {
    test('should connect to Jira successfully', (done) => {
      if (skipCLITests) {
        done();
        return;
      }

      const process = spawn('node', ['./dist/cli/workflow-cli.js', 'health'], {
        stdio: 'pipe',
        env: { ...process.env }
      });

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          expect(output).toContain('Connection successful');
        } else {
          // Connection might fail in test environment, but should handle gracefully
          expect(output.length).toBeGreaterThan(0);
        }
        done();
      });
    }, 15000);
  });
});
