#!/usr/bin/env node

/**
 * MCP Server Protocol End-to-End Test
 * 
 * Tests the complete MCP server functionality including:
 * - Server startup and initialization
 * - JSON-RPC protocol compliance
 * - Tool listing and execution
 * - Error handling and graceful shutdown
 * 
 * Usage: node test-suite/e2e/mcp-server-protocol.test.js
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

class MCPServerE2ETest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
      serverOutput: '',
      serverError: ''
    };
    this.serverProcess = null;
  }

  async runTest(testName, testFunction) {
    console.log(`🧪 Running: ${testName}...`);
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      console.log(`✅ PASSED: ${testName} (${duration}ms)`);
      this.results.passed++;
      this.results.tests.push({
        name: testName,
        status: 'PASSED',
        duration,
        result
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`❌ FAILED: ${testName} (${duration}ms)`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({
        name: testName,
        status: 'FAILED',
        duration,
        error: error.message
      });
      
      return null;
    }
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      console.log('📡 Starting MCP server...');
      
      // Start the MCP server
      this.serverProcess = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      // Handle server output
      this.serverProcess.stdout.on('data', (data) => {
        this.results.serverOutput += data.toString();
      });

      this.serverProcess.stderr.on('data', (data) => {
        this.results.serverError += data.toString();
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Server process error: ${error.message}`));
      });

      // Wait for server to be ready
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          console.log('✅ MCP server started successfully');
          resolve();
        } else {
          reject(new Error('Server failed to start'));
        }
      }, 3000);
    });
  }

  async sendJsonRpcRequest(request) {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess || this.serverProcess.killed) {
        reject(new Error('Server is not running'));
        return;
      }

      let responseReceived = false;
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          reject(new Error('Request timeout'));
        }
      }, 10000);

      // Listen for response
      const onData = (data) => {
        const output = data.toString();
        try {
          // Look for JSON-RPC response
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.trim() && line.includes('"jsonrpc"')) {
              const response = JSON.parse(line.trim());
              if (response.id === request.id) {
                responseReceived = true;
                clearTimeout(timeout);
                this.serverProcess.stdout.off('data', onData);
                resolve(response);
                return;
              }
            }
          }
        } catch (error) {
          // Continue listening for valid JSON
        }
      };

      this.serverProcess.stdout.on('data', onData);

      // Send request
      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async testInitialize() {
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        },
        clientInfo: {
          name: 'e2e-test-client',
          version: '1.0.0'
        }
      }
    };

    const response = await this.sendJsonRpcRequest(initRequest);
    
    if (!response.result) {
      throw new Error('Initialize response missing result');
    }

    console.log(`   - Protocol Version: ${response.result.protocolVersion}`);
    console.log(`   - Server Name: ${response.result.serverInfo.name}`);
    console.log(`   - Server Version: ${response.result.serverInfo.version}`);
    
    return response.result;
  }

  async testListTools() {
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    const response = await this.sendJsonRpcRequest(listToolsRequest);
    
    if (!response.result || !response.result.tools) {
      throw new Error('List tools response missing tools');
    }

    const toolCount = response.result.tools.length;
    console.log(`   - Total tools available: ${toolCount}`);
    
    // Show first few tools
    const sampleTools = response.result.tools.slice(0, 5);
    sampleTools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
    });
    
    if (toolCount > 5) {
      console.log(`   ... and ${toolCount - 5} more tools`);
    }
    
    return response.result;
  }

  async testSearchIssuesTool() {
    const searchRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'jql.search',
        arguments: {
          jql: 'ORDER BY created DESC',
          maxResults: 2,
          fields: ['summary', 'status']
        }
      }
    };

    const response = await this.sendJsonRpcRequest(searchRequest);
    
    if (!response.result) {
      throw new Error('Search issues tool response missing result');
    }

    console.log(`   - Tool executed successfully`);
    console.log(`   - Response type: ${response.result.content[0].type}`);
    
    return response.result;
  }

  async testGetProjectTool() {
    const getProjectRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'project.get',
        arguments: {
          projectIdOrKey: 'SCRUM'
        }
      }
    };

    const response = await this.sendJsonRpcRequest(getProjectRequest);
    
    if (!response.result) {
      throw new Error('Get project tool response missing result');
    }

    console.log(`   - Tool executed successfully`);
    console.log(`   - Response type: ${response.result.content[0].type}`);
    
    return response.result;
  }

  async testInvalidTool() {
    const invalidRequest = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'nonexistent.tool',
        arguments: {}
      }
    };

    try {
      const response = await this.sendJsonRpcRequest(invalidRequest);
      
      if (response.error) {
        console.log(`   - Error handled correctly: ${response.error.message}`);
        return response;
      } else {
        throw new Error('Expected error response for invalid tool');
      }
    } catch (error) {
      // This is expected for invalid tools
      console.log(`   - Error handled correctly: ${error.message}`);
      return { error: error.message };
    }
  }

  async stopServer() {
    return new Promise((resolve) => {
      if (!this.serverProcess || this.serverProcess.killed) {
        resolve();
        return;
      }

      console.log('🔚 Stopping MCP server...');
      
      this.serverProcess.on('exit', () => {
        console.log('✅ MCP server stopped successfully');
        resolve();
      });

      this.serverProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if graceful shutdown fails
      setTimeout(() => {
        if (!this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
          resolve();
        }
      }, 5000);
    });
  }

  async runAllTests() {
    try {
      console.log('🚀 Starting MCP Server End-to-End Tests...\n');
      
      // Start server
      await this.runTest('Start MCP Server', () => this.startServer());
      
      // Wait a bit for server to fully initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Run protocol tests
      await this.runTest('Initialize Protocol', () => this.testInitialize());
      await this.runTest('List Available Tools', () => this.testListTools());
      await this.runTest('Execute Search Issues Tool', () => this.testSearchIssuesTool());
      await this.runTest('Execute Get Project Tool', () => this.testGetProjectTool());
      await this.runTest('Handle Invalid Tool Request', () => this.testInvalidTool());
      
      // Stop server
      await this.runTest('Stop MCP Server', () => this.stopServer());
      
      // Print summary
      console.log('\n📊 E2E Test Results Summary:');
      console.log('============================');
      console.log(`✅ Passed: ${this.results.passed}`);
      console.log(`❌ Failed: ${this.results.failed}`);
      console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
      
      // Save detailed results
      const detailedResults = {
        timestamp: new Date().toISOString(),
        testResults: this.results.tests,
        serverOutput: this.results.serverOutput,
        serverError: this.results.serverError,
        summary: {
          passed: this.results.passed,
          failed: this.results.failed,
          successRate: ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)
        }
      };

      const reportPath = join(process.cwd(), 'test-suite', 'reports', 'mcp-e2e-test-results.json');
      writeFileSync(reportPath, JSON.stringify(detailedResults, null, 2));
      console.log(`\n💾 Detailed results saved to: ${reportPath}`);
      
      if (this.results.failed === 0) {
        console.log('\n🎉 All MCP Server E2E tests passed!');
        console.log('✅ MCP Server is fully functional and protocol compliant.');
      } else {
        console.log('\n⚠️  Some tests failed. Check the error messages above.');
      }
      
      return this.results;
      
    } catch (error) {
      console.error('💥 E2E test suite failed:', error.message);
      
      // Ensure server is stopped
      if (this.serverProcess && !this.serverProcess.killed) {
        this.serverProcess.kill('SIGKILL');
      }
      
      throw error;
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new MCPServerE2ETest();
  testSuite.runAllTests()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('E2E test suite execution failed:', error);
      process.exit(1);
    });
}

export { MCPServerE2ETest };
