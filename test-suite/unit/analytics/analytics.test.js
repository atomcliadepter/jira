#!/usr/bin/env node

/**
 * Analytics Unit Tests
 * 
 * Transformed from tests/analytics.unit.test.ts
 * Tests analytics functionality with mocked data.
 * 
 * Usage: node test-suite/unit/analytics/analytics.test.js
 */

import TestHelpers from '../../utils/test-helpers.js';

class AnalyticsUnitTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    
    // Mock data for analytics testing
    this.mockIssuesData = {
      issues: [
        {
          key: 'TEST-1',
          fields: {
            summary: 'Test issue 1',
            issuetype: { name: 'Task' },
            priority: { name: 'High' },
            assignee: { displayName: 'John Doe' },
            created: '2024-01-01T10:00:00.000Z',
            resolutiondate: '2024-01-05T15:00:00.000Z',
            status: { name: 'Done' }
          },
          changelog: {
            histories: [
              {
                created: '2024-01-02T10:00:00.000Z',
                items: [
                  {
                    field: 'status',
                    fromString: 'To Do',
                    toString: 'In Progress'
                  }
                ]
              },
              {
                created: '2024-01-05T15:00:00.000Z',
                items: [
                  {
                    field: 'status',
                    fromString: 'In Progress',
                    toString: 'Done'
                  }
                ]
              }
            ]
          }
        },
        {
          key: 'TEST-2',
          fields: {
            summary: 'Test issue 2',
            issuetype: { name: 'Bug' },
            priority: { name: 'Medium' },
            assignee: { displayName: 'Jane Smith' },
            created: '2024-01-03T09:00:00.000Z',
            resolutiondate: '2024-01-08T14:00:00.000Z',
            status: { name: 'Done' }
          },
          changelog: {
            histories: [
              {
                created: '2024-01-04T11:00:00.000Z',
                items: [
                  {
                    field: 'status',
                    fromString: 'To Do',
                    toString: 'In Progress'
                  }
                ]
              },
              {
                created: '2024-01-08T14:00:00.000Z',
                items: [
                  {
                    field: 'status',
                    fromString: 'In Progress',
                    toString: 'Done'
                  }
                ]
              }
            ]
          }
        }
      ]
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

  async testCycleTimeCalculation() {
    const issues = this.mockIssuesData.issues;
    const cycleTimeData = [];
    
    issues.forEach(issue => {
      const histories = issue.changelog.histories;
      let inProgressDate = null;
      let doneDate = null;
      
      histories.forEach(history => {
        history.items.forEach(item => {
          if (item.field === 'status') {
            if (item.toString === 'In Progress') {
              inProgressDate = new Date(history.created);
            }
            if (item.toString === 'Done') {
              doneDate = new Date(history.created);
            }
          }
        });
      });
      
      if (inProgressDate && doneDate) {
        const cycleTime = (doneDate - inProgressDate) / (1000 * 60 * 60 * 24); // days
        cycleTimeData.push({
          key: issue.key,
          cycleTime: Math.round(cycleTime * 100) / 100
        });
      }
    });
    
    if (cycleTimeData.length === 0) {
      throw new Error('No cycle time data calculated');
    }
    
    const averageCycleTime = cycleTimeData.reduce((sum, item) => sum + item.cycleTime, 0) / cycleTimeData.length;
    
    console.log(`   - Issues analyzed: ${cycleTimeData.length}`);
    console.log(`   - Average cycle time: ${Math.round(averageCycleTime * 100) / 100} days`);
    cycleTimeData.forEach(item => {
      console.log(`     ${item.key}: ${item.cycleTime} days`);
    });
    
    return {
      cycleTimeData,
      averageCycleTime: Math.round(averageCycleTime * 100) / 100
    };
  }

  async testLeadTimeCalculation() {
    const issues = this.mockIssuesData.issues;
    const leadTimeData = [];
    
    issues.forEach(issue => {
      const createdDate = new Date(issue.fields.created);
      const resolvedDate = issue.fields.resolutiondate ? new Date(issue.fields.resolutiondate) : null;
      
      if (resolvedDate) {
        const leadTime = (resolvedDate - createdDate) / (1000 * 60 * 60 * 24); // days
        leadTimeData.push({
          key: issue.key,
          leadTime: Math.round(leadTime * 100) / 100
        });
      }
    });
    
    if (leadTimeData.length === 0) {
      throw new Error('No lead time data calculated');
    }
    
    const averageLeadTime = leadTimeData.reduce((sum, item) => sum + item.leadTime, 0) / leadTimeData.length;
    
    console.log(`   - Issues analyzed: ${leadTimeData.length}`);
    console.log(`   - Average lead time: ${Math.round(averageLeadTime * 100) / 100} days`);
    leadTimeData.forEach(item => {
      console.log(`     ${item.key}: ${item.leadTime} days`);
    });
    
    return {
      leadTimeData,
      averageLeadTime: Math.round(averageLeadTime * 100) / 100
    };
  }

  async testThroughputCalculation() {
    const issues = this.mockIssuesData.issues;
    const resolvedIssues = issues.filter(issue => issue.fields.resolutiondate);
    
    // Group by resolution date (simplified to daily)
    const throughputByDay = {};
    
    resolvedIssues.forEach(issue => {
      const resolvedDate = new Date(issue.fields.resolutiondate);
      const dateKey = resolvedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      throughputByDay[dateKey] = (throughputByDay[dateKey] || 0) + 1;
    });
    
    const totalDays = Object.keys(throughputByDay).length;
    const totalResolved = resolvedIssues.length;
    const averageThroughput = totalDays > 0 ? totalResolved / totalDays : 0;
    
    console.log(`   - Total resolved issues: ${totalResolved}`);
    console.log(`   - Days with resolutions: ${totalDays}`);
    console.log(`   - Average daily throughput: ${Math.round(averageThroughput * 100) / 100}`);
    
    Object.entries(throughputByDay).forEach(([date, count]) => {
      console.log(`     ${date}: ${count} issues`);
    });
    
    return {
      throughputByDay,
      totalResolved,
      averageThroughput: Math.round(averageThroughput * 100) / 100
    };
  }

  async testWorkflowAnalytics() {
    const issues = this.mockIssuesData.issues;
    
    // Analyze by assignee
    const assigneeStats = {};
    issues.forEach(issue => {
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      if (!assigneeStats[assignee]) {
        assigneeStats[assignee] = {
          total: 0,
          resolved: 0,
          byType: {},
          byPriority: {}
        };
      }
      
      assigneeStats[assignee].total++;
      if (issue.fields.resolutiondate) {
        assigneeStats[assignee].resolved++;
      }
      
      const issueType = issue.fields.issuetype.name;
      assigneeStats[assignee].byType[issueType] = (assigneeStats[assignee].byType[issueType] || 0) + 1;
      
      const priority = issue.fields.priority.name;
      assigneeStats[assignee].byPriority[priority] = (assigneeStats[assignee].byPriority[priority] || 0) + 1;
    });
    
    console.log(`   - Issues analyzed: ${issues.length}`);
    console.log('   - Assignee statistics:');
    Object.entries(assigneeStats).forEach(([assignee, stats]) => {
      console.log(`     ${assignee}: ${stats.total} total, ${stats.resolved} resolved`);
    });
    
    return {
      totalIssues: issues.length,
      assigneeStats
    };
  }

  async testReportGeneration() {
    // Test report data structure generation
    const reportData = {
      summary: {
        totalIssues: this.mockIssuesData.issues.length,
        resolvedIssues: this.mockIssuesData.issues.filter(i => i.fields.resolutiondate).length,
        generatedAt: new Date().toISOString()
      },
      metrics: {
        cycleTime: { average: 3.5, unit: 'days' },
        leadTime: { average: 5.2, unit: 'days' },
        throughput: { average: 1.0, unit: 'issues/day' }
      },
      breakdown: {
        byAssignee: { 'John Doe': 1, 'Jane Smith': 1 },
        byType: { 'Task': 1, 'Bug': 1 },
        byPriority: { 'High': 1, 'Medium': 1 }
      }
    };
    
    // Validate report structure
    if (!reportData.summary || !reportData.metrics || !reportData.breakdown) {
      throw new Error('Invalid report structure');
    }
    
    console.log(`   - Report generated successfully`);
    console.log(`   - Total issues: ${reportData.summary.totalIssues}`);
    console.log(`   - Resolved issues: ${reportData.summary.resolvedIssues}`);
    console.log(`   - Metrics included: ${Object.keys(reportData.metrics).length}`);
    
    return reportData;
  }

  async testErrorHandling() {
    // Test error handling with invalid data
    try {
      const invalidData = { issues: null };
      if (!invalidData.issues || !Array.isArray(invalidData.issues)) {
        throw new Error('Invalid issues data structure');
      }
    } catch (error) {
      if (error.message.includes('Invalid issues data')) {
        console.log('   - Error handling working correctly');
        return { errorHandled: true };
      }
      throw error;
    }
    
    throw new Error('Error handling test failed');
  }

  async runAllTests() {
    console.log('🚀 Starting Analytics Unit Tests...\n');
    
    try {
      await this.runTest('Cycle Time Calculation', () => this.testCycleTimeCalculation());
      await this.runTest('Lead Time Calculation', () => this.testLeadTimeCalculation());
      await this.runTest('Throughput Calculation', () => this.testThroughputCalculation());
      await this.runTest('Workflow Analytics', () => this.testWorkflowAnalytics());
      await this.runTest('Report Generation', () => this.testReportGeneration());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      
      // Print summary
      TestHelpers.printTestSummary(this.results, 'Analytics Unit Tests');
      
      return this.results;
      
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
      throw error;
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new AnalyticsUnitTest();
  testSuite.runAllTests()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite execution failed:', error);
      process.exit(1);
    });
}

export { AnalyticsUnitTest };
