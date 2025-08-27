/**
 * Global Test Setup
 * Runs once before all test suites
 */

export default async function globalSetup() {
  console.log('🚀 Starting Enhanced MCP Jira REST Server Test Suite');
  console.log('📊 Test Configuration:');
  console.log('  - Node.js Version:', process.version);
  console.log('  - Test Environment:', process.env.NODE_ENV || 'development');
  console.log('  - Timestamp:', new Date().toISOString());
  
  // Set global test environment
  process.env.NODE_ENV = 'test';
  process.env.CI = process.env.CI || 'false';
  
  // Verify test dependencies
  try {
    require('@jest/globals');
    require('zod');
    console.log('✅ Test dependencies verified');
  } catch (error) {
    console.error('❌ Missing test dependencies:', error);
    throw error;
  }
  
  // Create test directories if they don't exist
  const fs = require('fs');
  const path = require('path');
  
  const testDirs = [
    'test-results',
    'coverage',
    'logs/test'
  ];
  
  testDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created test directory: ${dir}`);
    }
  });
  
  console.log('✅ Global test setup completed');
}
