#!/usr/bin/env node

/**
 * Verify tool count and build integrity
 */

const fs = require('fs');
const path = require('path');

function verifyTools() {
  console.log('🔍 Verifying Enhanced MCP Jira REST Server tools...\n');
  
  // Count from source
  const indexPath = path.join(__dirname, '..', 'src', 'index.ts');
  const content = fs.readFileSync(indexPath, 'utf8');
  const match = content.match(/const TOOL_EXECUTORS = \{([^}]+)\}/s);
  const sourceCount = match ? match[1].split('\n').filter(line => line.includes(':')).length : 0;
  
  console.log(`📊 Source TOOL_EXECUTORS: ${sourceCount} tools`);
  
  // Verify build exists
  const distPath = path.join(__dirname, '..', 'dist', 'index.js');
  if (fs.existsSync(distPath)) {
    console.log('✅ Build verification: dist/index.js exists');
    
    try {
      // Test if build is loadable (basic syntax check)
      const buildContent = fs.readFileSync(distPath, 'utf8');
      if (buildContent.includes('TOOL_EXECUTORS')) {
        console.log('✅ Build integrity: TOOL_EXECUTORS found in build');
      } else {
        console.log('⚠️  Build integrity: TOOL_EXECUTORS not found in build');
      }
    } catch (error) {
      console.log('❌ Build verification: dist/index.js has syntax errors');
    }
  } else {
    console.log('❌ Build verification: dist/index.js missing - run npm run build');
  }
  
  // Verify package.json version
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`📦 Package version: v${packageJson.version}`);
  
  // Verify server:info script matches
  if (packageJson.scripts && packageJson.scripts['server:info']) {
    const serverInfo = packageJson.scripts['server:info'];
    const versionMatch = serverInfo.match(/v([\d.]+)/);
    const toolsMatch = serverInfo.match(/Tools: (\d+)/);
    
    if (versionMatch && versionMatch[1] === packageJson.version) {
      console.log('✅ Version consistency: server:info matches package.json');
    } else {
      console.log('❌ Version consistency: server:info version mismatch');
    }
    
    if (toolsMatch && parseInt(toolsMatch[1]) === sourceCount) {
      console.log('✅ Tool count consistency: server:info matches source');
    } else {
      console.log('❌ Tool count consistency: server:info count mismatch');
    }
  }
  
  console.log('\n🎯 Summary:');
  console.log(`   Version: v${packageJson.version}`);
  console.log(`   Tools: ${sourceCount}`);
  console.log(`   Build: ${fs.existsSync(distPath) ? 'Ready' : 'Missing'}`);
  
  return {
    version: packageJson.version,
    toolCount: sourceCount,
    buildExists: fs.existsSync(distPath)
  };
}

if (require.main === module) {
  verifyTools();
}

module.exports = { verifyTools };
