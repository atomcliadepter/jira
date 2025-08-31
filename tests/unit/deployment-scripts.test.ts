const { describe, test, expect, beforeEach } = require('@jest/globals');
const { spawn } = require('child_process');
const { existsSync, readFileSync } = require('fs');

describe('Deployment Scripts Tests', () => {
  const DEPLOY_SCRIPT = './scripts/deploy.sh';

  beforeEach(() => {
    // Ensure deploy script exists and is executable
    if (!existsSync(DEPLOY_SCRIPT)) {
      throw new Error('Deploy script not found');
    }
  });

  describe('Script Validation', () => {
    test('should have executable permissions', () => {
      const stats = require('fs').statSync(DEPLOY_SCRIPT);
      const isExecutable = !!(stats.mode & parseInt('111', 8));
      expect(isExecutable).toBe(true);
    });

    test('should contain required functions', () => {
      const content = readFileSync(DEPLOY_SCRIPT, 'utf8');
      
      expect(content).toContain('pre_deployment_checks');
      expect(content).toContain('build_application');
      expect(content).toContain('health_check');
      expect(content).toContain('deploy_production');
      expect(content).toContain('deploy_docker');
      expect(content).toContain('deploy_kubernetes');
    });

    test('should validate environment variables', () => {
      const content = readFileSync(DEPLOY_SCRIPT, 'utf8');
      
      expect(content).toContain('JIRA_BASE_URL');
      expect(content).toContain('NODE_ENV');
      expect(content).toContain('LOG_LEVEL');
    });
  });

  describe('Help and Usage', () => {
    test('should show help when called without arguments', (done) => {
      const process = spawn('bash', [DEPLOY_SCRIPT, '--help'], {
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        expect(output).toContain('Usage:');
        expect(output).toContain('environment');
        done();
      });
    }, 10000);

    test('should show error for invalid environment', (done) => {
      const process = spawn('bash', [DEPLOY_SCRIPT, 'invalid-env'], {
        stdio: 'pipe'
      });

      let errorOutput = '';
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        expect(code).not.toBe(0);
        expect(errorOutput).toContain('Unknown environment');
        done();
      });
    }, 10000);
  });

  describe('Pre-deployment Checks', () => {
    test('should validate Node.js version requirement', () => {
      const content = readFileSync(DEPLOY_SCRIPT, 'utf8');
      expect(content).toContain('NODE_VERSION');
      expect(content).toContain('18'); // Minimum Node.js version
    });

    test('should check for required files', () => {
      const content = readFileSync(DEPLOY_SCRIPT, 'utf8');
      expect(content).toContain('.env');
      expect(content).toContain('package.json');
    });
  });
});
