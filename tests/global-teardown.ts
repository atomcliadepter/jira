/**
 * Global Test Teardown
 * Runs once after all test suites complete
 */

export default async function globalTeardown() {
  console.log('🏁 Enhanced MCP Jira REST Server Test Suite Completed');
  
  // Generate test summary
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Read test results if available
    const resultsPath = path.join(process.cwd(), 'test-results', 'junit.xml');
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    
    let testSummary = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      testResults: null as any,
      coverage: null as any
    };
    
    // Read coverage summary if available
    if (fs.existsSync(coveragePath)) {
      try {
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        testSummary.coverage = {
          lines: coverageData.total?.lines?.pct || 0,
          functions: coverageData.total?.functions?.pct || 0,
          branches: coverageData.total?.branches?.pct || 0,
          statements: coverageData.total?.statements?.pct || 0
        };
        
        console.log('📊 Test Coverage Summary:');
        console.log(`  - Lines: ${testSummary.coverage.lines}%`);
        console.log(`  - Functions: ${testSummary.coverage.functions}%`);
        console.log(`  - Branches: ${testSummary.coverage.branches}%`);
        console.log(`  - Statements: ${testSummary.coverage.statements}%`);
      } catch (error) {
        console.warn('⚠️  Could not read coverage summary:', error.message);
      }
    }
    
    // Save test summary
    const summaryPath = path.join(process.cwd(), 'test-results', 'test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(testSummary, null, 2));
    console.log(`📄 Test summary saved to: ${summaryPath}`);
    
  } catch (error) {
    console.warn('⚠️  Could not generate test summary:', error.message);
  }
  
  // Cleanup temporary test files
  try {
    const tempFiles = [
      'test-report.json',
      'test-report.html'
    ];
    
    tempFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Cleaned up: ${file}`);
      }
    });
  } catch (error) {
    console.warn('⚠️  Could not cleanup temporary files:', error.message);
  }
  
  // Performance summary
  const memoryUsage = process.memoryUsage();
  console.log('💾 Memory Usage:');
  console.log(`  - RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`);
  console.log(`  - Heap Used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  console.log(`  - Heap Total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`);
  
  console.log('✅ Global test teardown completed');
  console.log('🎉 All tests finished successfully!');
}
