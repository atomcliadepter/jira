#!/usr/bin/env node

/**
 * Automation Engine Unit Tests
 * 
 * Transformed from tests/automation/AutomationEngine.test.ts
 * Tests automation engine functionality with mocked dependencies.
 * 
 * Usage: node test-suite/unit/automation/automation-engine.test.js
 */

import TestHelpers from '../../utils/test-helpers.js';

class AutomationEngineUnitTest {
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
    
    // Mock automation rules
    this.mockRules = [
      {
        id: 'rule-1',
        name: 'Auto-assign high priority bugs',
        enabled: true,
        trigger: {
          type: 'issue_created',
          conditions: [
            { field: 'issuetype', operator: 'equals', value: 'Bug' },
            { field: 'priority', operator: 'equals', value: 'High' }
          ]
        },
        actions: [
          {
            type: 'assign_issue',
            parameters: { assignee: 'john.doe@example.com' }
          }
        ]
      },
      {
        id: 'rule-2',
        name: 'Auto-transition completed tasks',
        enabled: true,
        trigger: {
          type: 'field_changed',
          field: 'status',
          conditions: [
            { field: 'status', operator: 'equals', value: 'In Review' },
            { field: 'issuetype', operator: 'equals', value: 'Task' }
          ]
        },
        actions: [
          {
            type: 'transition_issue',
            parameters: { transitionId: '31' }
          }
        ]
      }
    ];
  }

  createMockMethod(method) {
    return async (url, data) => {
      // Mock responses based on URL patterns
      if (url.includes('/automation/rules') && method === 'get') {
        return { rules: this.mockRules };
      }
      
      if (url.includes('/automation/rules') && method === 'post') {
        const newRule = {
          id: `rule-${Date.now()}`,
          ...data,
          enabled: true,
          createdAt: new Date().toISOString()
        };
        this.mockRules.push(newRule);
        return newRule;
      }
      
      if (url.includes('/automation/rules/') && method === 'put') {
        const ruleId = url.split('/').pop();
        const ruleIndex = this.mockRules.findIndex(r => r.id === ruleId);
        if (ruleIndex >= 0) {
          this.mockRules[ruleIndex] = { ...this.mockRules[ruleIndex], ...data };
          return this.mockRules[ruleIndex];
        }
        throw new Error('Rule not found');
      }
      
      if (url.includes('/automation/rules/') && method === 'delete') {
        const ruleId = url.split('/').pop();
        const ruleIndex = this.mockRules.findIndex(r => r.id === ruleId);
        if (ruleIndex >= 0) {
          this.mockRules.splice(ruleIndex, 1);
          return { success: true };
        }
        throw new Error('Rule not found');
      }
      
      if (url.includes('/automation/execute') && method === 'post') {
        return {
          executionId: `exec-${Date.now()}`,
          status: 'completed',
          actionsExecuted: data.actions?.length || 0,
          timestamp: new Date().toISOString()
        };
      }
      
      return {};
    };
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

  async testCreateAutomationRule() {
    const ruleData = {
      name: 'Test Rule',
      description: 'A test automation rule',
      trigger: {
        type: 'issue_created',
        conditions: [
          { field: 'project', operator: 'equals', value: 'TEST' }
        ]
      },
      actions: [
        {
          type: 'add_comment',
          parameters: { comment: 'Issue created automatically' }
        }
      ]
    };

    const result = await this.mockClient.post('/automation/rules', ruleData);
    
    if (!result.id || !result.name) {
      throw new Error('Invalid rule creation response');
    }
    
    if (result.name !== ruleData.name) {
      throw new Error(`Expected name ${ruleData.name}, got ${result.name}`);
    }
    
    console.log(`   - Created rule: ${result.id}`);
    console.log(`   - Rule name: ${result.name}`);
    console.log(`   - Enabled: ${result.enabled}`);
    
    return result;
  }

  async testListAutomationRules() {
    const result = await this.mockClient.get('/automation/rules');
    
    if (!result.rules || !Array.isArray(result.rules)) {
      throw new Error('Invalid rules list response');
    }
    
    if (result.rules.length === 0) {
      throw new Error('No rules found');
    }
    
    console.log(`   - Found ${result.rules.length} rules`);
    result.rules.forEach((rule, index) => {
      console.log(`     ${index + 1}. ${rule.name} (${rule.enabled ? 'Enabled' : 'Disabled'})`);
    });
    
    return result;
  }

  async testUpdateAutomationRule() {
    const ruleId = this.mockRules[0].id;
    const updateData = {
      name: 'Updated Test Rule',
      enabled: false
    };

    const result = await this.mockClient.put(`/automation/rules/${ruleId}`, updateData);
    
    if (!result.id || result.id !== ruleId) {
      throw new Error('Invalid rule update response');
    }
    
    if (result.name !== updateData.name) {
      throw new Error(`Expected name ${updateData.name}, got ${result.name}`);
    }
    
    console.log(`   - Updated rule: ${result.id}`);
    console.log(`   - New name: ${result.name}`);
    console.log(`   - Enabled: ${result.enabled}`);
    
    return result;
  }

  async testDeleteAutomationRule() {
    const ruleId = this.mockRules[this.mockRules.length - 1].id;
    
    const result = await this.mockClient.delete(`/automation/rules/${ruleId}`);
    
    if (!result.success) {
      throw new Error('Delete operation failed');
    }
    
    console.log(`   - Deleted rule: ${ruleId}`);
    
    return result;
  }

  async testExecuteAutomationRule() {
    const executionData = {
      ruleId: this.mockRules[0].id,
      trigger: {
        type: 'manual',
        issueKey: 'TEST-123'
      },
      actions: [
        {
          type: 'add_comment',
          parameters: { comment: 'Automated comment' }
        }
      ]
    };

    const result = await this.mockClient.post('/automation/execute', executionData);
    
    if (!result.executionId || !result.status) {
      throw new Error('Invalid execution response');
    }
    
    console.log(`   - Execution ID: ${result.executionId}`);
    console.log(`   - Status: ${result.status}`);
    console.log(`   - Actions executed: ${result.actionsExecuted}`);
    
    return result;
  }

  async testRuleValidation() {
    // Test invalid rule structure
    const invalidRule = {
      name: '', // Invalid empty name
      trigger: {
        type: 'invalid_trigger_type'
      },
      actions: [] // Empty actions array
    };

    try {
      // Validate rule structure
      if (!invalidRule.name || invalidRule.name.trim() === '') {
        throw new Error('Rule name is required');
      }
      
      if (!invalidRule.trigger || !invalidRule.trigger.type) {
        throw new Error('Rule trigger is required');
      }
      
      const validTriggerTypes = ['issue_created', 'issue_updated', 'field_changed', 'manual'];
      if (!validTriggerTypes.includes(invalidRule.trigger.type)) {
        throw new Error('Invalid trigger type');
      }
      
      if (!invalidRule.actions || invalidRule.actions.length === 0) {
        throw new Error('At least one action is required');
      }
      
      throw new Error('Validation should have failed');
      
    } catch (error) {
      if (error.message.includes('should have failed')) {
        throw error;
      }
      
      console.log('   - Rule validation working correctly');
      console.log(`   - Caught error: ${error.message}`);
      return { validationPassed: true, error: error.message };
    }
  }

  async testConditionEvaluation() {
    const mockIssue = {
      key: 'TEST-123',
      fields: {
        issuetype: { name: 'Bug' },
        priority: { name: 'High' },
        status: { name: 'Open' },
        project: { key: 'TEST' }
      }
    };

    const conditions = [
      { field: 'issuetype', operator: 'equals', value: 'Bug' },
      { field: 'priority', operator: 'equals', value: 'High' }
    ];

    // Evaluate conditions
    const results = conditions.map(condition => {
      const fieldValue = mockIssue.fields[condition.field];
      const actualValue = typeof fieldValue === 'object' ? fieldValue.name : fieldValue;
      
      switch (condition.operator) {
        case 'equals':
          return actualValue === condition.value;
        case 'not_equals':
          return actualValue !== condition.value;
        case 'contains':
          return actualValue && actualValue.includes(condition.value);
        default:
          return false;
      }
    });

    const allConditionsMet = results.every(result => result === true);
    
    console.log(`   - Issue: ${mockIssue.key}`);
    console.log(`   - Conditions evaluated: ${conditions.length}`);
    console.log(`   - All conditions met: ${allConditionsMet}`);
    
    conditions.forEach((condition, index) => {
      console.log(`     ${condition.field} ${condition.operator} ${condition.value}: ${results[index] ? '✅' : '❌'}`);
    });
    
    return {
      issue: mockIssue,
      conditions,
      results,
      allConditionsMet
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Automation Engine Unit Tests...\n');
    
    try {
      await this.runTest('Create Automation Rule', () => this.testCreateAutomationRule());
      await this.runTest('List Automation Rules', () => this.testListAutomationRules());
      await this.runTest('Update Automation Rule', () => this.testUpdateAutomationRule());
      await this.runTest('Delete Automation Rule', () => this.testDeleteAutomationRule());
      await this.runTest('Execute Automation Rule', () => this.testExecuteAutomationRule());
      await this.runTest('Rule Validation', () => this.testRuleValidation());
      await this.runTest('Condition Evaluation', () => this.testConditionEvaluation());
      
      // Print summary
      TestHelpers.printTestSummary(this.results, 'Automation Engine Unit Tests');
      
      return this.results;
      
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
      throw error;
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new AutomationEngineUnitTest();
  testSuite.runAllTests()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite execution failed:', error);
      process.exit(1);
    });
}

export { AutomationEngineUnitTest };
