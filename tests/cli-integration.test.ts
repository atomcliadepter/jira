/**
 * CLI Integration Tests
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

describe('CLI Integration Tests', () => {
  const distPath = path.join(__dirname, '..', 'dist');
  const cliPath = path.join(distPath, 'cli');

  beforeAll(() => {
    // Ensure project is built
    if (!existsSync(distPath)) {
      execSync('npm run build', { cwd: path.join(__dirname, '..') });
    }
  });

  describe('CLI File Existence', () => {
    test('workflow-cli.js should exist and be executable', () => {
      const filePath = path.join(cliPath, 'workflow-cli.js');
      expect(existsSync(filePath)).toBe(true);
      
      // Check if file has executable permissions (on Unix systems)
      if (process.platform !== 'win32') {
        const stats = require('fs').statSync(filePath);
        expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
      }
    });

    test('confluence-cli.js should exist and be executable', () => {
      const filePath = path.join(cliPath, 'confluence-cli.js');
      expect(existsSync(filePath)).toBe(true);
      
      if (process.platform !== 'win32') {
        const stats = require('fs').statSync(filePath);
        expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
      }
    });

    test('automation-cli.js should exist and be executable', () => {
      const filePath = path.join(cliPath, 'automation-cli.js');
      expect(existsSync(filePath)).toBe(true);
      
      if (process.platform !== 'win32') {
        const stats = require('fs').statSync(filePath);
        expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
      }
    });

    test('customfield-cli.js should exist and be executable', () => {
      const filePath = path.join(cliPath, 'customfield-cli.js');
      expect(existsSync(filePath)).toBe(true);
      
      if (process.platform !== 'win32') {
        const stats = require('fs').statSync(filePath);
        expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
      }
    });
  });

  describe('CLI Shebang Lines', () => {
    test('workflow-cli.js should have proper shebang', () => {
      const filePath = path.join(cliPath, 'workflow-cli.js');
      const content = require('fs').readFileSync(filePath, 'utf8');
      expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
    });

    test('confluence-cli.js should have proper shebang', () => {
      const filePath = path.join(cliPath, 'confluence-cli.js');
      const content = require('fs').readFileSync(filePath, 'utf8');
      expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
    });

    test('automation-cli.js should have proper shebang', () => {
      const filePath = path.join(cliPath, 'automation-cli.js');
      const content = require('fs').readFileSync(filePath, 'utf8');
      expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
    });

    test('customfield-cli.js should have proper shebang', () => {
      const filePath = path.join(cliPath, 'customfield-cli.js');
      const content = require('fs').readFileSync(filePath, 'utf8');
      expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
    });
  });

  describe('CLI Help Commands', () => {
    test('workflow-cli should respond to --help', (done) => {
      const child = spawn('node', [path.join(cliPath, 'workflow-cli.js'), '--help'], {
        stdio: 'pipe'
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('Usage:');
        expect(output).toContain('workflow');
        done();
      });

      // Set timeout for the test
      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });

    test('confluence-cli should respond to --help', (done) => {
      const child = spawn('node', [path.join(cliPath, 'confluence-cli.js'), '--help'], {
        stdio: 'pipe'
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('Usage:');
        expect(output).toContain('confluence');
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });

    test('automation-cli should respond to --help', (done) => {
      const child = spawn('node', [path.join(cliPath, 'automation-cli.js'), '--help'], {
        stdio: 'pipe'
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('Usage:');
        expect(output).toContain('automation');
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });

    test('customfield-cli should respond to --help', (done) => {
      const child = spawn('node', [path.join(cliPath, 'customfield-cli.js'), '--help'], {
        stdio: 'pipe'
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('Usage:');
        expect(output).toContain('customfield');
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });
  });

  describe('CLI Version Commands', () => {
    test('workflow-cli should respond to --version', (done) => {
      const child = spawn('node', [path.join(cliPath, 'workflow-cli.js'), '--version'], {
        stdio: 'pipe'
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        expect(code).toBe(0);
        expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });
  });

  describe('CLI Error Handling', () => {
    test('workflow-cli should handle invalid commands gracefully', (done) => {
      const child = spawn('node', [path.join(cliPath, 'workflow-cli.js'), 'invalid-command'], {
        stdio: 'pipe'
      });

      let errorOutput = '';
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        expect(code).not.toBe(0);
        expect(errorOutput).toContain('error');
        done();
      });

      setTimeout(() => {
        child.kill();
        done();
      }, 5000);
    });
  });
});
