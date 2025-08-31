#!/usr/bin/env node

/**
 * Sync tool count across documentation files
 * Automatically updates README.md and docs/API_REFERENCE.md with current tool count
 */

const fs = require('fs');
const path = require('path');

function getToolCount() {
  try {
    const indexPath = path.join(__dirname, '..', 'src', 'index.ts');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Extract TOOL_EXECUTORS object
    const match = content.match(/const TOOL_EXECUTORS = \{([^}]+)\}/s);
    if (!match) {
      throw new Error('TOOL_EXECUTORS not found in src/index.ts');
    }
    
    // Count tools by counting lines with colons (tool definitions)
    const toolLines = match[1].split('\n').filter(line => line.includes(':'));
    return toolLines.length;
  } catch (error) {
    console.error('Error counting tools:', error.message);
    process.exit(1);
  }
}

function updateFile(filePath, searchPattern, replacement) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const updatedContent = content.replace(searchPattern, replacement);
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent);
      console.log(`✅ Updated ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed in ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Syncing tool count across documentation...\n');
  
  // Get current tool count
  const toolCount = getToolCount();
  console.log(`📊 Current tool count: ${toolCount}\n`);
  
  let updatedFiles = 0;
  
  // Update README.md
  const readmePath = path.join(__dirname, '..', 'README.md');
  const readmePatterns = [
    {
      pattern: /- \*\*\d+ Professional Tools\*\*/g,
      replacement: `- **${toolCount} Professional Tools**`
    },
    {
      pattern: /- \*\*Tool Registration\*\*: < 100ms for \d+ tools/g,
      replacement: `- **Tool Registration**: < 100ms for ${toolCount} tools`
    },
    {
      pattern: /2\. \*\*Comprehensive Tool Set\*\*: \d+ tools instead of basic functionality/g,
      replacement: `2. **Comprehensive Tool Set**: ${toolCount} tools instead of basic functionality`
    }
  ];
  
  readmePatterns.forEach(({ pattern, replacement }) => {
    if (updateFile(readmePath, pattern, replacement)) {
      updatedFiles++;
    }
  });
  
  // Update API_REFERENCE.md
  const apiRefPath = path.join(__dirname, '..', 'docs', 'API_REFERENCE.md');
  const apiRefPattern = /This document provides a comprehensive reference for all \d+ tools/g;
  const apiRefReplacement = `This document provides a comprehensive reference for all ${toolCount} tools`;
  
  if (updateFile(apiRefPath, apiRefPattern, apiRefReplacement)) {
    updatedFiles++;
  }
  
  // Update package.json server:info script
  const packagePath = path.join(__dirname, '..', 'package.json');
  try {
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    if (packageJson.scripts && packageJson.scripts['server:info']) {
      const currentScript = packageJson.scripts['server:info'];
      const updatedScript = currentScript.replace(
        /Tools: \d+/g,
        `Tools: ${toolCount}`
      );
      
      if (currentScript !== updatedScript) {
        packageJson.scripts['server:info'] = updatedScript;
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
        console.log(`✅ Updated ${packagePath}`);
        updatedFiles++;
      } else {
        console.log(`ℹ️  No changes needed in ${packagePath}`);
      }
    }
  } catch (error) {
    console.error(`Error updating package.json:`, error.message);
  }
  
  // Summary
  console.log(`\n🎉 Tool count sync complete!`);
  console.log(`📊 Tool count: ${toolCount}`);
  console.log(`📝 Files updated: ${updatedFiles}`);
  
  if (updatedFiles > 0) {
    console.log(`\n💡 Don't forget to commit the changes:`);
    console.log(`   git add -A && git commit -m "docs: sync tool count to ${toolCount}"`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { getToolCount, updateFile };
