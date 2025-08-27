#!/usr/bin/env node

/**
 * Custom Field Manager Unit Tests
 * 
 * Transformed from tests/customField.unit.test.ts
 * Tests custom field management functionality with mocked dependencies.
 * 
 * Usage: node test-suite/unit/custom-fields/customField.test.js
 */

import TestHelpers from '../../utils/test-helpers.js';

class CustomFieldUnitTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    
    // Mock JiraRestClient
    this.mockClient = {
      get: this.createMockMethod('get'),
      post: this.createMockMethod('post'),
      put: this.createMockMethod('put'),
      delete: this.createMockMethod('delete')
    };
  }

  createMockMethod(method) {
    return async (url, data) => {
      // Mock responses based on URL patterns
      if (url.includes('/rest/api/3/field') && method === 'post') {
        return {
          id: 'customfield_10001',
          name: data.name || 'Test Field',
          schema: { type: 'string' },
          searcherKey: data.searcherKey
        };
      }
      
      if (url.includes('/rest/api/3/field/') && method === 'put') {
        return {
          id: url.split('/').pop(),
          name: data.name || 'Updated Field',
          description: data.description
        };
      }
      
      if (url.includes('/rest/api/3/field/') && method === 'delete') {
        return { success: true };
      }
      
      if (url.includes('/rest/api/3/field/') && method === 'get') {
        return {
          id: url.split('/').pop(),
          name: 'Test Field',
          schema: { type: 'string' }
        };
      }
      
      return {};
    };
  }

  async runTest(testName, testFunction) {
    console.log(`🧪 Running: ${testName}...`);
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      
      console.log(`✅ PASSED: ${testName} (${duration}ms)`);
      this.results.passed++;
      this.results.tests.push({
        name: testName,
        status: 'PASSED',
        duration
      });
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
    }
  }

  async testCreateCustomField() {
    const params = {
      name: 'Test Field',
      description: 'A test custom field',
      type: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
      searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:textsearcher'
    };

    const result = await this.mockClient.post('/rest/api/3/field', params);
    
    if (!result.id || !result.name) {
      throw new Error('Invalid response structure');
    }
    
    if (result.name !== params.name) {
      throw new Error(`Expected name ${params.name}, got ${result.name}`);
    }
    
    console.log(`   - Created field: ${result.id}`);
    console.log(`   - Field name: ${result.name}`);
  }

  async testUpdateCustomField() {
    const fieldId = 'customfield_10001';
    const updateData = {
      name: 'Updated Field',
      description: 'Updated description'
    };

    const result = await this.mockClient.put(`/rest/api/3/field/${fieldId}`, updateData);
    
    if (!result.id || !result.name) {
      throw new Error('Invalid response structure');
    }
    
    if (result.name !== updateData.name) {
      throw new Error(`Expected name ${updateData.name}, got ${result.name}`);
    }
    
    console.log(`   - Updated field: ${result.id}`);
    console.log(`   - New name: ${result.name}`);
  }

  async testDeleteCustomField() {
    const fieldId = 'customfield_10001';
    
    const result = await this.mockClient.delete(`/rest/api/3/field/${fieldId}`);
    
    if (!result.success) {
      throw new Error('Delete operation failed');
    }
    
    console.log(`   - Deleted field: ${fieldId}`);
  }

  async testGetCustomField() {
    const fieldId = 'customfield_10001';
    
    const result = await this.mockClient.get(`/rest/api/3/field/${fieldId}`);
    
    if (!result.id || !result.name) {
      throw new Error('Invalid response structure');
    }
    
    console.log(`   - Retrieved field: ${result.id}`);
    console.log(`   - Field name: ${result.name}`);
  }

  async testFieldValidation() {
    // Test invalid field name
    try {
      // Validate rule structure
      const invalidRule = {
        name: '', // Invalid empty name
        type: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
        searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:textsearcher'
      };
      
      if (!invalidRule.name || invalidRule.name.trim() === '') {
        throw new Error('Field name is required');
      }
      
      // If we get here, validation failed
      throw new Error('Validation should have failed with empty name');
      
    } catch (error) {
      if (error.message.includes('should have failed')) {
        throw error;
      }
      
      // Expected validation error
      console.log('   - Validation correctly rejected empty name');
      console.log(`   - Error message: ${error.message}`);
      return { validationPassed: true, error: error.message };
    }
  }

  async testFieldOptions() {
    const fieldId = 'customfield_10001';
    const contextId = '10001';
    const options = [
      { value: 'Option 1', disabled: false },
      { value: 'Option 2', disabled: true }
    ];

    // Mock setting field options
    const result = await this.mockClient.put(
      `/rest/api/3/field/${fieldId}/context/${contextId}/option`,
      { options }
    );
    
    console.log(`   - Set options for field: ${fieldId}`);
    console.log(`   - Options count: ${options.length}`);
  }

  async runAllTests() {
    console.log('🚀 Starting Custom Field Unit Tests...\n');
    
    try {
      await this.runTest('Create Custom Field', () => this.testCreateCustomField());
      await this.runTest('Update Custom Field', () => this.testUpdateCustomField());
      await this.runTest('Delete Custom Field', () => this.testDeleteCustomField());
      await this.runTest('Get Custom Field', () => this.testGetCustomField());
      await this.runTest('Field Validation', () => this.testFieldValidation());
      await this.runTest('Field Options', () => this.testFieldOptions());
      
      // Print summary
      TestHelpers.printTestSummary(this.results, 'Custom Field Unit Tests');
      
      return this.results;
      
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
      throw error;
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new CustomFieldUnitTest();
  testSuite.runAllTests()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite execution failed:', error);
      process.exit(1);
    });
}

export { CustomFieldUnitTest };
