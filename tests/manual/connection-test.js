#!/usr/bin/env node

/**
 * Manual Connection Test
 * 
 * Tests basic Jira API connectivity with real credentials.
 * This is a manual test that requires valid credentials in .env file.
 * 
 * Usage: node test-suite/manual/connection-test.js
 */

import { JiraRestClient } from '../../dist/http/JiraRestClient.js';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from project root
config({ path: join(process.cwd(), '.env') });

async function testJiraConnection() {
  console.log('🔍 Testing Jira Connection with Real Credentials...\n');
  
  try {
    // Validate environment variables
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
      throw new Error('Missing required environment variables. Please check your .env file.');
    }

    // Initialize Jira client with credentials from .env
    const jiraClient = new JiraRestClient({
      baseUrl: process.env.JIRA_BASE_URL,
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
      timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
      maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.RETRY_DELAY) || 1000
    });

    console.log('✅ Jira client initialized successfully');
    console.log(`📍 Base URL: ${process.env.JIRA_BASE_URL}`);
    console.log(`👤 Email: ${process.env.JIRA_EMAIL}`);
    console.log('🔑 API Token: [REDACTED]\n');

    // Test 1: Get current user info
    console.log('🧪 Test 1: Getting current user information...');
    try {
      const currentUser = await jiraClient.get('/rest/api/3/myself');
      console.log('✅ Current user retrieved successfully:');
      console.log(`   - Account ID: ${currentUser.accountId}`);
      console.log(`   - Display Name: ${currentUser.displayName}`);
      console.log(`   - Email: ${currentUser.emailAddress}`);
      console.log(`   - Active: ${currentUser.active}\n`);
    } catch (error) {
      console.error('❌ Failed to get current user:', error.message);
      return false;
    }

    // Test 2: List accessible projects
    console.log('🧪 Test 2: Listing accessible projects...');
    try {
      const projects = await jiraClient.get('/rest/api/3/project');
      console.log(`✅ Found ${projects.length} accessible projects:`);
      projects.slice(0, 5).forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.name} (${project.key}) - ${project.projectTypeKey}`);
      });
      if (projects.length > 5) {
        console.log(`   ... and ${projects.length - 5} more projects`);
      }
      console.log();
    } catch (error) {
      console.error('❌ Failed to list projects:', error.message);
      return false;
    }

    // Test 3: Search for recent issues
    console.log('🧪 Test 3: Searching for recent issues...');
    try {
      const searchResult = await jiraClient.searchIssues(
        'ORDER BY created DESC',
        { maxResults: 5, fields: ['summary', 'status', 'assignee', 'created'] }
      );
      console.log(`✅ Found ${searchResult.total} total issues, showing first ${searchResult.issues.length}:`);
      searchResult.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.key}: ${issue.fields.summary}`);
        console.log(`      Status: ${issue.fields.status.name}`);
        console.log(`      Assignee: ${issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned'}`);
        console.log(`      Created: ${new Date(issue.fields.created).toLocaleDateString()}`);
      });
      console.log();
    } catch (error) {
      console.error('❌ Failed to search issues:', error.message);
      return false;
    }

    // Test 4: Test issue creation capabilities (dry run)
    console.log('🧪 Test 4: Testing issue creation capabilities...');
    try {
      const projects = await jiraClient.get('/rest/api/3/project');
      if (projects.length === 0) {
        console.log('⚠️  No projects available for testing issue creation');
      } else {
        const testProject = projects[0];
        console.log(`✅ Would create issue in project: ${testProject.name} (${testProject.key})`);
        
        // Get issue types for the project
        const issueTypes = await jiraClient.get(`/rest/api/3/project/${testProject.key}`);
        console.log(`✅ Available issue types: ${issueTypes.issueTypes.map(t => t.name).join(', ')}`);
      }
      console.log();
    } catch (error) {
      console.error('❌ Failed to test issue creation:', error.message);
      return false;
    }

    // Test 5: Test workflow transitions
    console.log('🧪 Test 5: Testing workflow capabilities...');
    try {
      const searchResult = await jiraClient.searchIssues(
        'ORDER BY created DESC',
        { maxResults: 1, fields: ['summary', 'status'] }
      );
      
      if (searchResult.issues.length > 0) {
        const issue = searchResult.issues[0];
        const transitions = await jiraClient.get(`/rest/api/3/issue/${issue.key}/transitions`);
        console.log(`✅ Issue ${issue.key} has ${transitions.transitions.length} available transitions:`);
        transitions.transitions.forEach((transition, index) => {
          console.log(`   ${index + 1}. ${transition.name} (ID: ${transition.id})`);
        });
      } else {
        console.log('⚠️  No issues available for testing transitions');
      }
      console.log();
    } catch (error) {
      console.error('❌ Failed to test workflow transitions:', error.message);
      return false;
    }

    console.log('🎉 All connection tests completed successfully!');
    console.log('✅ Jira MCP Server is ready for use with your credentials.');
    return true;
    
  } catch (error) {
    console.error('💥 Fatal error during testing:', error.message);
    if (error.statusCode === 401) {
      console.error('🔐 Authentication failed. Please check your credentials in .env file.');
    } else if (error.statusCode === 403) {
      console.error('🚫 Permission denied. Please check your Jira permissions.');
    }
    return false;
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testJiraConnection()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testJiraConnection };
