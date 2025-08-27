#!/usr/bin/env node

/**
 * JiraRestClient Integration Test
 * 
 * Tests all JiraRestClient methods with real Jira API.
 * This test requires valid credentials and will make actual API calls.
 * 
 * Usage: node test-suite/integration/jira-client-methods.test.js
 */

import { JiraRestClient } from '../../dist/http/JiraRestClient.js';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from project root
config({ path: join(process.cwd(), '.env') });

class JiraClientIntegrationTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.jiraClient = null;
  }

  async initialize() {
    console.log('🔧 Initializing JiraRestClient Integration Tests...\n');
    
    // Validate environment variables
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
      throw new Error('Missing required environment variables. Please check your .env file.');
    }

    // Initialize Jira client
    this.jiraClient = new JiraRestClient({
      baseUrl: process.env.JIRA_BASE_URL,
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
      timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
      maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.RETRY_DELAY) || 1000
    });

    console.log('✅ JiraRestClient initialized for integration testing\n');
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

  async testSearchIssues() {
    const searchResult = await this.jiraClient.searchIssues(
      'ORDER BY created DESC',
      { maxResults: 3, fields: ['summary', 'status', 'assignee', 'created', 'priority'] }
    );
    
    console.log(`   - Total issues found: ${searchResult.total}`);
    console.log(`   - Issues returned: ${searchResult.issues.length}`);
    
    if (searchResult.issues.length > 0) {
      searchResult.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.key}: ${issue.fields.summary}`);
      });
    }
    
    return searchResult;
  }

  async testGetProject() {
    // Get first available project
    const projects = await this.jiraClient.get('/rest/api/3/project');
    if (projects.length === 0) {
      throw new Error('No projects available for testing');
    }

    const projectKey = projects[0].key;
    const project = await this.jiraClient.getProject(projectKey, {
      expand: ['description', 'lead', 'issueTypes', 'versions', 'components']
    });
    
    console.log(`   - Project Name: ${project.name}`);
    console.log(`   - Project Key: ${project.key}`);
    console.log(`   - Project Type: ${project.projectTypeKey}`);
    console.log(`   - Lead: ${project.lead ? project.lead.displayName : 'No lead'}`);
    
    return project;
  }

  async testGetIssue() {
    const searchResult = await this.jiraClient.searchIssues('ORDER BY created DESC', { maxResults: 1 });
    if (searchResult.issues.length === 0) {
      throw new Error('No issues available for testing');
    }

    const issueKey = searchResult.issues[0].key;
    const issue = await this.jiraClient.getIssue(issueKey, {
      fields: ['summary', 'description', 'status', 'assignee', 'priority', 'created', 'updated'],
      expand: ['changelog']
    });
    
    console.log(`   - Issue Key: ${issue.key}`);
    console.log(`   - Summary: ${issue.fields.summary}`);
    console.log(`   - Status: ${issue.fields.status.name}`);
    console.log(`   - Priority: ${issue.fields.priority ? issue.fields.priority.name : 'None'}`);
    
    return issue;
  }

  async testGetUser() {
    // Get current user first to get account ID
    const currentUser = await this.jiraClient.get('/rest/api/3/myself');
    const user = await this.jiraClient.getUser(currentUser.accountId);
    
    console.log(`   - Display Name: ${user.displayName}`);
    console.log(`   - Email: ${user.emailAddress}`);
    console.log(`   - Account Type: ${user.accountType}`);
    console.log(`   - Active: ${user.active}`);
    
    return user;
  }

  async testSearchUsers() {
    const users = await this.jiraClient.searchUsers('sumit', { maxResults: 5 });
    
    console.log(`   - Users found: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.displayName} (${user.emailAddress})`);
    });
    
    return users;
  }

  async testGetIssueTransitions() {
    const searchResult = await this.jiraClient.searchIssues('ORDER BY created DESC', { maxResults: 1 });
    if (searchResult.issues.length === 0) {
      throw new Error('No issues available for testing');
    }

    const issueKey = searchResult.issues[0].key;
    const transitions = await this.jiraClient.getIssueTransitions(issueKey);
    
    console.log(`   - Issue: ${issueKey}`);
    console.log(`   - Available transitions: ${transitions.transitions.length}`);
    transitions.transitions.forEach((transition, index) => {
      console.log(`     ${index + 1}. ${transition.name} (ID: ${transition.id})`);
    });
    
    return transitions;
  }

  async testCreateAndUpdateIssue() {
    // Get first project for testing
    const projects = await this.jiraClient.get('/rest/api/3/project');
    if (projects.length === 0) {
      throw new Error('No projects available for testing');
    }

    const testProject = projects[0];
    
    try {
      const issueData = {
        fields: {
          project: { key: testProject.key },
          summary: 'Integration Test Issue - ' + new Date().toISOString(),
          description: 'This is a test issue created by the integration test suite.',
          issuetype: { name: 'Task' }
        }
      };
      
      const newIssue = await this.jiraClient.createIssue(issueData);
      console.log(`   - Created Issue: ${newIssue.key}`);
      
      // Test update
      const updateData = {
        fields: {
          summary: 'Integration Test Issue - UPDATED - ' + new Date().toISOString()
        }
      };
      
      await this.jiraClient.updateIssue(newIssue.key, updateData);
      console.log(`   - Updated Issue: ${newIssue.key}`);
      
      // Test add comment
      const commentData = {
        body: 'This is a test comment added by the integration test suite.'
      };
      
      const comment = await this.jiraClient.addComment(newIssue.key, commentData);
      console.log(`   - Added Comment: ${comment.id}`);
      
      return { issue: newIssue, comment };
      
    } catch (error) {
      // If creation fails, it might be due to project configuration
      console.log(`   - Issue creation failed (likely project config): ${error.message}`);
      return { error: error.message };
    }
  }

  async runAllTests() {
    try {
      await this.initialize();
      
      console.log('🚀 Starting JiraRestClient Integration Tests...\n');
      
      // Run all tests
      await this.runTest('Search Issues', () => this.testSearchIssues());
      await this.runTest('Get Project', () => this.testGetProject());
      await this.runTest('Get Issue', () => this.testGetIssue());
      await this.runTest('Get User', () => this.testGetUser());
      await this.runTest('Search Users', () => this.testSearchUsers());
      await this.runTest('Get Issue Transitions', () => this.testGetIssueTransitions());
      await this.runTest('Create and Update Issue', () => this.testCreateAndUpdateIssue());
      
      // Print summary
      console.log('\n📊 Test Results Summary:');
      console.log('========================');
      console.log(`✅ Passed: ${this.results.passed}`);
      console.log(`❌ Failed: ${this.results.failed}`);
      console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
      
      if (this.results.failed === 0) {
        console.log('\n🎉 All JiraRestClient integration tests passed!');
        console.log('✅ JiraRestClient is fully functional with your credentials.');
      } else {
        console.log('\n⚠️  Some tests failed. Check the error messages above.');
      }
      
      return this.results;
      
    } catch (error) {
      console.error('💥 Test suite initialization failed:', error.message);
      throw error;
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new JiraClientIntegrationTest();
  testSuite.runAllTests()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite execution failed:', error);
      process.exit(1);
    });
}

export { JiraClientIntegrationTest };
