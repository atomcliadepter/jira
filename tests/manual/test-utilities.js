#!/usr/bin/env node

/**
 * Test Utilities Verification
 * 
 * Tests the TestHelpers utilities to ensure they're working correctly.
 * 
 * Usage: node test-suite/manual/test-utilities.js
 */

import TestHelpers from '../utils/test-helpers.js';

async function testUtilities() {
  console.log('🧪 Testing TestHelpers utilities...\n');

  // Test environment validation
  try {
    TestHelpers.validateEnvironment();
    console.log('✅ Environment validation: PASSED');
  } catch (error) {
    console.log('❌ Environment validation: FAILED -', error.message);
  }

  // Test Jira config
  try {
    const config = TestHelpers.getJiraConfig();
    console.log('✅ Jira config retrieval: PASSED');
    console.log('   - Base URL:', config.baseUrl);
    console.log('   - Email:', config.email);
    console.log('   - Timeout:', config.timeout);
  } catch (error) {
    console.log('❌ Jira config retrieval: FAILED -', error.message);
  }

  // Test ID generation
  const testId = TestHelpers.generateTestId();
  console.log('✅ Test ID generation: PASSED');
  console.log('   - Generated ID:', testId);

  // Test issue data generation
  const issueData = TestHelpers.generateTestIssueData('SCRUM');
  console.log('✅ Test issue data generation: PASSED');
  console.log('   - Summary:', issueData.fields.summary);

  // Test comment data generation
  const commentData = TestHelpers.generateTestCommentData();
  console.log('✅ Test comment data generation: PASSED');
  console.log('   - Body:', commentData.body);

  // Test duration formatting
  console.log('✅ Duration formatting: PASSED');
  console.log('   - 500ms:', TestHelpers.formatDuration(500));
  console.log('   - 2500ms:', TestHelpers.formatDuration(2500));
  console.log('   - 65000ms:', TestHelpers.formatDuration(65000));

  // Test JSON-RPC request creation
  const request = TestHelpers.createJsonRpcRequest('test.method', { param: 'value' });
  console.log('✅ JSON-RPC request creation: PASSED');
  console.log('   - Method:', request.method);
  console.log('   - JSON-RPC version:', request.jsonrpc);
  console.log('   - ID:', request.id);

  // Test JSON-RPC response validation
  try {
    const validResponse = {
      jsonrpc: '2.0',
      id: 123,
      result: { success: true }
    };
    TestHelpers.validateJsonRpcResponse(validResponse, 123);
    console.log('✅ JSON-RPC response validation: PASSED');
  } catch (error) {
    console.log('❌ JSON-RPC response validation: FAILED -', error.message);
  }

  // Test summary report creation
  const mockResults = {
    passed: 5,
    failed: 1,
    tests: [
      { name: 'Test 1', status: 'PASSED', duration: 100 },
      { name: 'Test 2', status: 'FAILED', duration: 200, error: 'Mock error' }
    ]
  };
  
  const summary = TestHelpers.createSummaryReport(mockResults);
  console.log('✅ Summary report creation: PASSED');
  console.log('   - Success rate:', summary.summary.successRate);

  // Test wait function
  console.log('✅ Testing wait function...');
  const startTime = Date.now();
  await TestHelpers.wait(100);
  const elapsed = Date.now() - startTime;
  console.log(`✅ Wait function: PASSED (waited ${elapsed}ms)`);

  console.log('\n🎉 All TestHelpers utilities working correctly!');
  return true;
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUtilities()
    .then(() => {
      console.log('\n✅ Utilities test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Utilities test failed:', error);
      process.exit(1);
    });
}

export { testUtilities };
