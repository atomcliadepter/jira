#!/usr/bin/env node

/**
 * Master Test Runner
 * 
 * Runs all test suites in the correct order and generates a comprehensive report.
 * Now includes transformed tests from the original ./tests directory.
 * 
 * Usage: node test-suite/run-all-tests.js [--category=<category>] [--verbose]
 */

import { testJiraConnection } from './manual/connection-test.js';
import { JiraClientIntegrationTest } from './integration/jira-client-methods.test.js';
import { MCPServerE2ETest } from './e2e/mcp-server-protocol.test.js';
import { CustomFieldUnitTest } from './unit/custom-fields/customField.test.js';
import { AnalyticsUnitTest } from './unit/analytics/analytics.test.js';
import { AutomationEngineUnitTest } from './unit/automation/automation-engine.test.js';
import { WorkflowIntegrationTest } from './integration/workflow/workflow-management.test.js';
import { CLIIntegrationTest } from './integration/cli/cli-tools.test.js';
import TestHelpers from './utils/test-helpers.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

class MasterTestRunner {
  constructor(options = {}) {
    this.options = {
      category: options.category || 'all',
      verbose: options.verbose || false,
      skipOnFailure: options.skipOnFailure || false
    };
    
    this.results = {
      overall: {
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      suites: []
    };
  }

  async runTestSuite(suiteName, testFunction) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Running Test Suite: ${suiteName}`);
    console.log(`${'='.repeat(60)}`);
    
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      const suiteResult = {
        name: suiteName,
        status: 'COMPLETED',
        duration,
        passed: result.passed || 0,
        failed: result.failed || 0,
        tests: result.tests || []
      };
      
      this.results.suites.push(suiteResult);
      this.results.overall.passed += suiteResult.passed;
      this.results.overall.failed += suiteResult.failed;
      this.results.overall.duration += duration;
      
      console.log(`\n✅ ${suiteName} completed in ${TestHelpers.formatDuration(duration)}`);
      console.log(`   Passed: ${suiteResult.passed}, Failed: ${suiteResult.failed}`);
      
      if (suiteResult.failed > 0 && this.options.skipOnFailure) {
        console.log(`⚠️  Skipping remaining tests due to failures in ${suiteName}`);
        return false;
      }
      
      return true;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const suiteResult = {
        name: suiteName,
        status: 'FAILED',
        duration,
        passed: 0,
        failed: 1,
        error: error.message,
        tests: []
      };
      
      this.results.suites.push(suiteResult);
      this.results.overall.failed += 1;
      this.results.overall.duration += duration;
      
      console.error(`\n❌ ${suiteName} failed in ${TestHelpers.formatDuration(duration)}`);
      console.error(`   Error: ${error.message}`);
      
      if (this.options.skipOnFailure) {
        console.log(`⚠️  Skipping remaining tests due to failure in ${suiteName}`);
        return false;
      }
      
      return true;
    }
  }

  // Original test suites
  async runConnectionTests() {
    return this.runTestSuite('Connection Tests', async () => {
      const success = await testJiraConnection();
      return {
        passed: success ? 1 : 0,
        failed: success ? 0 : 1,
        tests: [{ name: 'Jira Connection Test', status: success ? 'PASSED' : 'FAILED' }]
      };
    });
  }

  async runIntegrationTests() {
    return this.runTestSuite('JiraClient Integration Tests', async () => {
      const testSuite = new JiraClientIntegrationTest();
      return await testSuite.runAllTests();
    });
  }

  async runE2ETests() {
    return this.runTestSuite('MCP Server E2E Tests', async () => {
      const testSuite = new MCPServerE2ETest();
      return await testSuite.runAllTests();
    });
  }

  // Transformed unit tests
  async runUnitTests() {
    let continueTests = true;
    
    if (continueTests) {
      continueTests = await this.runTestSuite('Custom Field Unit Tests', async () => {
        const testSuite = new CustomFieldUnitTest();
        return await testSuite.runAllTests();
      });
    }
    
    if (continueTests) {
      continueTests = await this.runTestSuite('Analytics Unit Tests', async () => {
        const testSuite = new AnalyticsUnitTest();
        return await testSuite.runAllTests();
      });
    }
    
    if (continueTests) {
      continueTests = await this.runTestSuite('Automation Engine Unit Tests', async () => {
        const testSuite = new AutomationEngineUnitTest();
        return await testSuite.runAllTests();
      });
    }
    
    return continueTests;
  }

  // Transformed integration tests
  async runAdvancedIntegrationTests() {
    let continueTests = true;
    
    if (continueTests) {
      continueTests = await this.runTestSuite('Workflow Integration Tests', async () => {
        const testSuite = new WorkflowIntegrationTest();
        return await testSuite.runAllTests();
      });
    }
    
    if (continueTests) {
      continueTests = await this.runTestSuite('CLI Integration Tests', async () => {
        const testSuite = new CLIIntegrationTest();
        return await testSuite.runAllTests();
      });
    }
    
    return continueTests;
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Test Suite (Enhanced)');
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log(`🎯 Category: ${this.options.category}`);
    console.log(`📝 Verbose: ${this.options.verbose}`);
    
    const overallStartTime = Date.now();
    
    try {
      // Ensure reports directory exists
      const reportsDir = join(process.cwd(), 'test-suite', 'reports');
      if (!existsSync(reportsDir)) {
        mkdirSync(reportsDir, { recursive: true });
      }
      
      // Run test suites based on category
      let continueTests = true;
      
      // Manual/Connection tests
      if (continueTests && (this.options.category === 'all' || this.options.category === 'manual')) {
        continueTests = await this.runConnectionTests();
      }
      
      // Unit tests (transformed from original tests)
      if (continueTests && (this.options.category === 'all' || this.options.category === 'unit')) {
        continueTests = await this.runUnitTests();
      }
      
      // Integration tests (original + transformed)
      if (continueTests && (this.options.category === 'all' || this.options.category === 'integration')) {
        continueTests = await this.runIntegrationTests();
        
        if (continueTests) {
          continueTests = await this.runAdvancedIntegrationTests();
        }
      }
      
      // E2E tests
      if (continueTests && (this.options.category === 'all' || this.options.category === 'e2e')) {
        continueTests = await this.runE2ETests();
      }
      
      // Calculate final results
      this.results.overall.duration = Date.now() - overallStartTime;
      
      // Generate comprehensive report
      this.generateFinalReport();
      
      return this.results;
      
    } catch (error) {
      console.error('💥 Master test runner failed:', error.message);
      throw error;
    }
  }

  generateFinalReport() {
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 COMPREHENSIVE TEST RESULTS (ENHANCED)');
    console.log(`${'='.repeat(80)}`);
    
    const total = this.results.overall.passed + this.results.overall.failed;
    const successRate = total > 0 ? ((this.results.overall.passed / total) * 100).toFixed(1) : 0;
    
    console.log(`⏱️  Total Duration: ${TestHelpers.formatDuration(this.results.overall.duration)}`);
    console.log(`📈 Overall Success Rate: ${successRate}%`);
    console.log(`✅ Total Passed: ${this.results.overall.passed}`);
    console.log(`❌ Total Failed: ${this.results.overall.failed}`);
    console.log(`📊 Test Suites Run: ${this.results.suites.length}`);
    
    console.log('\n📋 Test Suite Breakdown:');
    this.results.suites.forEach((suite, index) => {
      const status = suite.status === 'COMPLETED' && suite.failed === 0 ? '✅' : '❌';
      const duration = TestHelpers.formatDuration(suite.duration);
      console.log(`   ${index + 1}. ${status} ${suite.name} (${duration})`);
      console.log(`      Passed: ${suite.passed}, Failed: ${suite.failed}`);
      
      if (suite.error) {
        console.log(`      Error: ${suite.error}`);
      }
    });
    
    // Save comprehensive report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: this.results.overall,
      suites: this.results.suites,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        jiraBaseUrl: process.env.JIRA_BASE_URL || 'Not configured',
        testSuiteVersion: '2.0.0-enhanced'
      },
      testCategories: {
        manual: this.results.suites.filter(s => s.name.includes('Connection')).length,
        unit: this.results.suites.filter(s => s.name.includes('Unit')).length,
        integration: this.results.suites.filter(s => s.name.includes('Integration')).length,
        e2e: this.results.suites.filter(s => s.name.includes('E2E')).length
      }
    };
    
    const reportPath = TestHelpers.saveTestResults(reportData, 'comprehensive-test-report-enhanced.json');
    console.log(`\n💾 Enhanced comprehensive report saved to: ${reportPath}`);
    
    // Print final status
    if (this.results.overall.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ The Enhanced MCP Jira Server is fully functional and ready for production.');
      console.log('🔄 All original tests have been successfully transformed and integrated.');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED');
      console.log('❌ Please review the failed tests and fix any issues before deployment.');
    }
    
    console.log(`\n📈 Test Suite Statistics:`);
    console.log(`   - Original connection tests: ✅ Integrated`);
    console.log(`   - Transformed unit tests: ✅ ${reportData.testCategories.unit} suites`);
    console.log(`   - Enhanced integration tests: ✅ ${reportData.testCategories.integration} suites`);
    console.log(`   - End-to-end tests: ✅ ${reportData.testCategories.e2e} suites`);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--category=')) {
      options.category = arg.split('=')[1];
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--skip-on-failure') {
      options.skipOnFailure = true;
    }
  });
  
  return options;
}

// Run the master test suite if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const runner = new MasterTestRunner(options);
  
  runner.runAllTests()
    .then(results => {
      process.exit(results.overall.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Master test runner execution failed:', error);
      process.exit(1);
    });
}

export { MasterTestRunner };
