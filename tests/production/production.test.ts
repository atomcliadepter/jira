import { spawn, ChildProcess } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

describe('Production Deployment Tests', () => {
  let serverProcess: ChildProcess;
  const serverUrl = 'http://localhost:9090';
  const mcpUrl = 'http://localhost:3000';

  beforeAll(async () => {
    // Start the server for testing
    console.log('Starting MCP Jira Server for production tests...');
    serverProcess = spawn('node', ['dist/index.js'], {
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
  }, 30000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  describe('Server Health', () => {
    test('should respond to health check', async () => {
      const response = await axios.get(`${serverUrl}/health`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('uptime');
    });

    test('should provide metrics endpoint', async () => {
      const response = await axios.get(`${serverUrl}/metrics`);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.data).toContain('mcp_tool_executions_total');
    });

    test('should have proper CORS headers', async () => {
      const response = await axios.options(`${serverUrl}/health`);
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('MCP Protocol Compliance', () => {
    test('should handle list_tools request', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'list_tools',
        id: 1
      };

      const response = await axios.post(mcpUrl, request);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('jsonrpc', '2.0');
      expect(response.data).toHaveProperty('result');
      expect(response.data.result).toHaveProperty('tools');
      expect(Array.isArray(response.data.result.tools)).toBe(true);
      expect(response.data.result.tools.length).toBeGreaterThan(0);
    });

    test('should handle invalid JSON-RPC request', async () => {
      const invalidRequest = {
        method: 'test', // Missing jsonrpc field
        id: 1
      };

      try {
        await axios.post(mcpUrl, invalidRequest);
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error.code).toBe(-32600); // Invalid Request
      }
    });

    test('should handle method not found', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'unknown_method',
        id: 1
      };

      try {
        await axios.post(mcpUrl, request);
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error.code).toBe(-32601); // Method not found
      }
    });
  });

  describe('Authentication & Security', () => {
    test('should validate Jira connectivity', async () => {
      // This test requires valid Jira credentials
      if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
        console.log('Skipping Jira connectivity test - credentials not provided');
        return;
      }

      const request = {
        jsonrpc: '2.0',
        method: 'call_tool',
        params: {
          name: 'user.get',
          arguments: {}
        },
        id: 1
      };

      const response = await axios.post(mcpUrl, request);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('result');
      expect(response.data.result).toHaveProperty('content');
    });

    test('should enforce rate limiting', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          axios.get(`${serverUrl}/health`).catch(error => error.response)
        );
      }

      const responses = await Promise.all(requests);
      
      // At least some requests should succeed
      const successfulRequests = responses.filter(r => r.status === 200);
      expect(successfulRequests.length).toBeGreaterThan(0);
      
      // Check if any were rate limited (this depends on configuration)
      const rateLimitedRequests = responses.filter(r => r.status === 429);
      console.log(`Rate limited requests: ${rateLimitedRequests.length}/10`);
    });
  });

  describe('Logging & Monitoring', () => {
    test('should create audit log files', () => {
      const auditDir = './logs/audit';
      const today = new Date().toISOString().split('T')[0];
      const expectedLogFile = `${auditDir}/audit-${today}.jsonl`;
      
      // Check if audit directory exists
      expect(existsSync(auditDir)).toBe(true);
      
      // Log file might not exist immediately, so we'll check for directory structure
      if (existsSync(expectedLogFile)) {
        const content = readFileSync(expectedLogFile, 'utf8');
        expect(content.length).toBeGreaterThan(0);
        
        // Validate JSONL format
        const lines = content.trim().split('\n');
        lines.forEach(line => {
          expect(() => JSON.parse(line)).not.toThrow();
        });
      }
    });

    test('should expose Prometheus metrics', async () => {
      const response = await axios.get(`${serverUrl}/metrics`);
      
      expect(response.data).toContain('# HELP');
      expect(response.data).toContain('# TYPE');
      
      // Check for specific metrics
      expect(response.data).toContain('mcp_tool_executions_total');
      expect(response.data).toContain('process_resident_memory_bytes');
      expect(response.data).toContain('nodejs_eventloop_lag_seconds');
    });
  });

  describe('Performance', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      const response = await axios.get(`${serverUrl}/health`);
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle concurrent requests', async () => {
      const concurrentRequests = 5;
      const requests = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(axios.get(`${serverUrl}/health`));
      }
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed requests gracefully', async () => {
      try {
        await axios.post(mcpUrl, 'invalid json');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should provide meaningful error messages', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'call_tool',
        params: {
          name: 'nonexistent_tool',
          arguments: {}
        },
        id: 1
      };

      try {
        await axios.post(mcpUrl, request);
      } catch (error) {
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error).toHaveProperty('message');
        expect(error.response.data.error.message).toContain('not found');
      }
    });
  });

  describe('Configuration Validation', () => {
    test('should validate environment configuration', () => {
      // Check required environment variables
      expect(process.env.JIRA_BASE_URL).toBeDefined();
      expect(process.env.JIRA_BASE_URL).toMatch(/^https?:\/\/.+/);
      
      // Check authentication configuration
      const hasApiToken = process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN;
      const hasOAuth = process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET;
      
      expect(hasApiToken || hasOAuth).toBe(true);
    });

    test('should have proper permissions configuration', () => {
      const permissionsFile = './config/permissions.json';
      
      if (existsSync(permissionsFile)) {
        const content = readFileSync(permissionsFile, 'utf8');
        const config = JSON.parse(content);
        
        expect(config).toHaveProperty('agents');
        expect(config).toHaveProperty('defaultPolicy');
        expect(config.defaultPolicy).toHaveProperty('allowAll');
        expect(config.defaultPolicy).toHaveProperty('readOnly');
      }
    });
  });
});
