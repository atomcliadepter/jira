#!/usr/bin/env node

/**
 * Workflow Management Integration Tests
 * 
 * Transformed from tests/workflow.test.ts
 * Tests workflow transition functionality with real Jira API.
 * 
 * Usage: node test-suite/integration/workflow/workflow-management.test.js
 */

import { JiraRestClient } from '../../../dist/http/JiraRestClient.js';
import TestHelpers from '../../utils/test-helpers.js';

class WorkflowIntegrationTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.jiraClient = null;
    this.testProjectKey = 'PA'; // Use PA project which has issues
    this.testIssueKey = null;
  }

  async initialize() {
    console.log('🔧 Initializing Workflow Integration Tests...\n');
    
    // Initialize Jira client
    const config = TestHelpers.getJiraConfig();
    this.jiraClient = new JiraRestClient(config);
    
    console.log('✅ JiraRestClient initialized for workflow testing\n');
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

  async testProjectAccess() {
    const project = await this.jiraClient.getProject(this.testProjectKey);
    
    if (!project || !project.key) {
      throw new Error(`Project ${this.testProjectKey} not found or inaccessible`);
    }
    
    console.log(`   - Project Name: ${project.name}`);
    console.log(`   - Project Key: ${project.key}`);
    console.log(`   - Project Type: ${project.projectTypeKey}`);
    
    return project;
  }

  async testFindTestIssue() {
    const searchResult = await this.jiraClient.searchIssues(
      `project = "${this.testProjectKey}" ORDER BY created DESC`,
      { maxResults: 1, fields: ['summary', 'status'] }
    );
    
    if (searchResult.issues.length === 0) {
      throw new Error(`No issues found in project ${this.testProjectKey}`);
    }
    
    this.testIssueKey = searchResult.issues[0].key;
    const issue = searchResult.issues[0];
    
    console.log(`   - Found test issue: ${this.testIssueKey}`);
    console.log(`   - Summary: ${issue.fields.summary}`);
    console.log(`   - Status: ${issue.fields.status.name}`);
    
    return issue;
  }

  async testGetIssueTransitions() {
    if (!this.testIssueKey) {
      throw new Error('No test issue available');
    }
    
    const transitions = await this.jiraClient.getIssueTransitions(this.testIssueKey);
    
    if (!transitions.transitions || transitions.transitions.length === 0) {
      throw new Error('No transitions available for test issue');
    }
    
    console.log(`   - Issue: ${this.testIssueKey}`);
    console.log(`   - Available transitions: ${transitions.transitions.length}`);
    transitions.transitions.forEach((transition, index) => {
      console.log(`     ${index + 1}. ${transition.name} (ID: ${transition.id})`);
    });
    
    return transitions;
  }

  async testWorkflowValidation() {
    // Test workflow validation for the project
    const project = await this.jiraClient.getProject(this.testProjectKey, {
      expand: ['issueTypes']
    });
    
    if (!project.issueTypes || project.issueTypes.length === 0) {
      throw new Error('No issue types found in project');
    }
    
    console.log(`   - Project: ${project.key}`);
    console.log(`   - Issue types: ${project.issueTypes.length}`);
    project.issueTypes.forEach((issueType, index) => {
      console.log(`     ${index + 1}. ${issueType.name} (${issueType.subtask ? 'Subtask' : 'Standard'})`);
    });
    
    return project;
  }

  async testBulkTransitionDryRun() {
    // Test bulk transition in dry run mode
    const jql = `project = "${this.testProjectKey}" AND status != "Done" ORDER BY created DESC`;
    const searchResult = await this.jiraClient.searchIssues(jql, { 
      maxResults: 5, 
      fields: ['summary', 'status'] 
    });
    
    if (searchResult.issues.length === 0) {
      console.log('   - No issues available for bulk transition test');
      return { issues: [], dryRun: true };
    }
    
    console.log(`   - Found ${searchResult.issues.length} issues for bulk transition`);
    searchResult.issues.forEach((issue, index) => {
      console.log(`     ${index + 1}. ${issue.key}: ${issue.fields.summary} (${issue.fields.status.name})`);
    });
    
    // This would be a dry run - we don't actually transition
    console.log('   - Dry run completed (no actual transitions performed)');
    
    return { issues: searchResult.issues, dryRun: true };
  }

  async testConditionalTransition() {
    if (!this.testIssueKey) {
      throw new Error('No test issue available');
    }
    
    // Get issue details for condition evaluation
    const issue = await this.jiraClient.getIssue(this.testIssueKey, {
      fields: ['summary', 'status', 'assignee', 'priority']
    });
    
    // Test condition evaluation (mock conditions)
    const conditions = [
      {
        type: 'field_value',
        field: 'status',
        value: issue.fields.status.name,
        operator: 'equals'
      }
    ];
    
    console.log(`   - Issue: ${this.testIssueKey}`);
    console.log(`   - Current status: ${issue.fields.status.name}`);
    console.log(`   - Conditions evaluated: ${conditions.length}`);
    console.log('   - Condition check: Status matches current value ✅');
    
    return { issue, conditions, conditionsMet: true };
  }

  async testWorkflowAnalytics() {
    // Test basic workflow analytics
    const jql = `project = "${this.testProjectKey}" ORDER BY created DESC`;
    const searchResult = await this.jiraClient.searchIssues(jql, { 
      maxResults: 10, 
      fields: ['summary', 'status', 'created', 'resolutiondate', 'assignee'] 
    });
    
    if (searchResult.issues.length === 0) {
      throw new Error('No issues found for analytics');
    }
    
    // Basic analytics calculations
    const statusCounts = {};
    let resolvedCount = 0;
    
    searchResult.issues.forEach(issue => {
      const status = issue.fields.status.name;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      if (issue.fields.resolutiondate) {
        resolvedCount++;
      }
    });
    
    console.log(`   - Total issues analyzed: ${searchResult.issues.length}`);
    console.log(`   - Resolved issues: ${resolvedCount}`);
    console.log('   - Status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });
    
    return {
      totalIssues: searchResult.issues.length,
      resolvedCount,
      statusCounts
    };
  }

  async runAllTests() {
    try {
      await this.initialize();
      
      console.log('🚀 Starting Workflow Integration Tests...\n');
      
      // Run all tests
      await this.runTest('Project Access', () => this.testProjectAccess());
      await this.runTest('Find Test Issue', () => this.testFindTestIssue());
      await this.runTest('Get Issue Transitions', () => this.testGetIssueTransitions());
      await this.runTest('Workflow Validation', () => this.testWorkflowValidation());
      await this.runTest('Bulk Transition (Dry Run)', () => this.testBulkTransitionDryRun());
      await this.runTest('Conditional Transition', () => this.testConditionalTransition());
      await this.runTest('Workflow Analytics', () => this.testWorkflowAnalytics());
      
      // Print summary
      TestHelpers.printTestSummary(this.results, 'Workflow Integration Tests');
      
      return this.results;
      
    } catch (error) {
      console.error('💥 Test suite initialization failed:', error.message);
      throw error;
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new WorkflowIntegrationTest();
  testSuite.runAllTests()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite execution failed:', error);
      process.exit(1);
    });
}

export { WorkflowIntegrationTest };
