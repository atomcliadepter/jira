
/**
 * CLI interface for Automation Engine
 */

import { Command } from 'commander';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// Load environment variables
config();
import { join } from 'path';
import { AutomationEngine } from '../automation/AutomationEngine.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { logger } from '../utils/logger.js';
import {
  AutomationRule,
  TriggerType,
  ActionType,
  ExecutionStatus,
  AutomationExecution
} from '../automation/types.js';

const program = new Command();

// Initialize JIRA client
const jiraClient = new JiraRestClient({
  baseUrl: process.env.JIRA_BASE_URL || '',
  email: process.env.JIRA_EMAIL || '',
  apiToken: process.env.JIRA_API_TOKEN || '',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000
});

// Initialize automation engine
const automationEngine = new AutomationEngine(jiraClient);

program
  .name('jira-automation')
  .description('JIRA Automation Engine CLI')
  .version('1.0.0');

/**
 * Create automation rule command
 */
program
  .command('create-rule')
  .description('Create a new automation rule')
  .option('-f, --file <file>', 'Rule definition file (JSON)')
  .option('-n, --name <name>', 'Rule name')
  .option('-d, --description <description>', 'Rule description')
  .option('--enabled', 'Enable rule immediately', false)
  .option('--project <projects...>', 'Project keys to scope the rule')
  .action(async (options) => {
    try {
      let ruleData: any;

      if (options.file) {
        if (!existsSync(options.file)) {
          console.error(`❌ Rule file not found: ${options.file}`);
          process.exit(1);
        }
        const fileContent = readFileSync(options.file, 'utf-8');
        ruleData = JSON.parse(fileContent);
      } else {
        // Interactive rule creation
        ruleData = await createRuleInteractively(options);
      }

      console.log('🔄 Creating automation rule...');
      const rule = await automationEngine.createRule(ruleData);

      console.log('✅ Automation rule created successfully!');
      console.log(`📋 Rule ID: ${rule.id}`);
      console.log(`📝 Name: ${rule.name}`);
      console.log(`🔧 Status: ${rule.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`🎯 Triggers: ${rule.triggers.length}`);
      console.log(`⚡ Actions: ${rule.actions.length}`);

      // Save rule to file for reference
      const ruleFile = `automation-rule-${rule.id}.json`;
      writeFileSync(ruleFile, JSON.stringify(rule, null, 2));
      console.log(`💾 Rule saved to: ${ruleFile}`);

    } catch (error) {
      console.error('❌ Failed to create automation rule:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * List automation rules command
 */
program
  .command('list-rules')
  .description('List all automation rules')
  .option('--enabled', 'Show only enabled rules')
  .option('--disabled', 'Show only disabled rules')
  .option('--project <project>', 'Filter by project key')
  .option('--trigger <trigger>', 'Filter by trigger type')
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(async (options) => {
    try {
      const filters: any = {};
      
      if (options.enabled) filters.enabled = true;
      if (options.disabled) filters.enabled = false;
      if (options.project) filters.projectKey = options.project;
      if (options.trigger) filters.triggerType = options.trigger as TriggerType;

      const rules = automationEngine.getRules(filters);

      if (options.format === 'json') {
        console.log(JSON.stringify(rules, null, 2));
        return;
      }

      if (rules.length === 0) {
        console.log('📭 No automation rules found matching the criteria.');
        return;
      }

      console.log(`📋 Found ${rules.length} automation rule(s):\n`);
      
      rules.forEach((rule, index) => {
        console.log(`${index + 1}. ${rule.name}`);
        console.log(`   📋 ID: ${rule.id}`);
        console.log(`   🔧 Status: ${rule.enabled ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   🎯 Triggers: ${rule.triggers.map(t => t.type).join(', ')}`);
        console.log(`   ⚡ Actions: ${rule.actions.length}`);
        console.log(`   📊 Executions: ${rule.executionCount} (${rule.failureCount} failures)`);
        console.log(`   📅 Created: ${rule.createdAt.toLocaleDateString()}`);
        if (rule.projectKeys && rule.projectKeys.length > 0) {
          console.log(`   🎯 Projects: ${rule.projectKeys.join(', ')}`);
        }
        console.log('');
      });

    } catch (error) {
      console.error('❌ Failed to list automation rules:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Get automation rule command
 */
program
  .command('get-rule <ruleId>')
  .description('Get details of a specific automation rule')
  .option('--format <format>', 'Output format (json|yaml)', 'json')
  .action(async (ruleId, options) => {
    try {
      const rule = automationEngine.getRule(ruleId);
      
      if (!rule) {
        console.error(`❌ Automation rule not found: ${ruleId}`);
        process.exit(1);
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(rule, null, 2));
      } else {
        // Display in human-readable format
        console.log(`📋 Automation Rule: ${rule.name}`);
        console.log(`   📋 ID: ${rule.id}`);
        console.log(`   📝 Description: ${rule.description || 'No description'}`);
        console.log(`   🔧 Status: ${rule.enabled ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   👤 Created by: ${rule.createdBy}`);
        console.log(`   📅 Created: ${rule.createdAt.toLocaleString()}`);
        console.log(`   📅 Updated: ${rule.updatedAt.toLocaleString()}`);
        console.log(`   📊 Executions: ${rule.executionCount} (${rule.failureCount} failures)`);
        
        if (rule.projectKeys && rule.projectKeys.length > 0) {
          console.log(`   🎯 Projects: ${rule.projectKeys.join(', ')}`);
        }

        console.log('\n🎯 Triggers:');
        rule.triggers.forEach((trigger, index) => {
          console.log(`   ${index + 1}. ${trigger.type}`);
          if (Object.keys(trigger.config).length > 0) {
            console.log(`      Config: ${JSON.stringify(trigger.config, null, 6)}`);
          }
        });

        console.log('\n⚡ Actions:');
        rule.actions.forEach((action, index) => {
          console.log(`   ${index + 1}. ${action.type} (order: ${action.order})`);
          if (Object.keys(action.config).length > 0) {
            console.log(`      Config: ${JSON.stringify(action.config, null, 6)}`);
          }
        });

        if (rule.conditions && rule.conditions.length > 0) {
          console.log('\n🔍 Conditions:');
          rule.conditions.forEach((condition, index) => {
            console.log(`   ${index + 1}. ${condition.type}`);
            if (Object.keys(condition.config).length > 0) {
              console.log(`      Config: ${JSON.stringify(condition.config, null, 6)}`);
            }
          });
        }
      }

    } catch (error) {
      console.error('❌ Failed to get automation rule:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Update automation rule command
 */
program
  .command('update-rule <ruleId>')
  .description('Update an automation rule')
  .option('-f, --file <file>', 'Updated rule definition file (JSON)')
  .option('-n, --name <name>', 'New rule name')
  .option('-d, --description <description>', 'New rule description')
  .option('--enable', 'Enable the rule')
  .option('--disable', 'Disable the rule')
  .action(async (ruleId, options) => {
    try {
      let updates: any = {};

      if (options.file) {
        if (!existsSync(options.file)) {
          console.error(`❌ Update file not found: ${options.file}`);
          process.exit(1);
        }
        const fileContent = readFileSync(options.file, 'utf-8');
        updates = JSON.parse(fileContent);
      } else {
        if (options.name) updates.name = options.name;
        if (options.description) updates.description = options.description;
        if (options.enable) updates.enabled = true;
        if (options.disable) updates.enabled = false;
      }

      if (Object.keys(updates).length === 0) {
        console.error('❌ No updates specified. Use --name, --description, --enable, --disable, or --file options.');
        process.exit(1);
      }

      console.log('🔄 Updating automation rule...');
      const rule = await automationEngine.updateRule(ruleId, updates);

      console.log('✅ Automation rule updated successfully!');
      console.log(`📋 Rule ID: ${rule.id}`);
      console.log(`📝 Name: ${rule.name}`);
      console.log(`🔧 Status: ${rule.enabled ? 'Enabled' : 'Disabled'}`);

    } catch (error) {
      console.error('❌ Failed to update automation rule:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Delete automation rule command
 */
program
  .command('delete-rule <ruleId>')
  .description('Delete an automation rule')
  .option('--force', 'Skip confirmation prompt')
  .action(async (ruleId, options) => {
    try {
      const rule = automationEngine.getRule(ruleId);
      if (!rule) {
        console.error(`❌ Automation rule not found: ${ruleId}`);
        process.exit(1);
      }

      if (!options.force) {
        console.log(`⚠️  You are about to delete the automation rule: "${rule.name}"`);
        console.log('   This action cannot be undone.');
        
        // In a real CLI, you would use a prompt library like inquirer
        console.log('   Use --force flag to skip this confirmation.');
        process.exit(1);
      }

      console.log('🔄 Deleting automation rule...');
      await automationEngine.deleteRule(ruleId);

      console.log('✅ Automation rule deleted successfully!');

    } catch (error) {
      console.error('❌ Failed to delete automation rule:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Execute automation rule command
 */
program
  .command('execute-rule <ruleId>')
  .description('Execute an automation rule manually')
  .option('--issue <issueKey>', 'Issue key for context')
  .option('--project <projectKey>', 'Project key for context')
  .option('--user <userId>', 'User ID for context')
  .option('--data <data>', 'Additional context data (JSON)')
  .action(async (ruleId, options) => {
    try {
      const context: any = {};
      
      if (options.issue) context.issueKey = options.issue;
      if (options.project) context.projectKey = options.project;
      if (options.user) context.userId = options.user;
      if (options.data) {
        try {
          context.triggerData = JSON.parse(options.data);
        } catch {
          console.error('❌ Invalid JSON data provided');
          process.exit(1);
        }
      }

      console.log('🔄 Executing automation rule...');
      const execution = await automationEngine.executeRule(ruleId, context);

      console.log('✅ Automation rule executed!');
      console.log(`📋 Execution ID: ${execution.id}`);
      console.log(`🔧 Status: ${getStatusEmoji(execution.status)} ${execution.status}`);
      console.log(`⏱️  Duration: ${execution.duration}ms`);
      console.log(`⚡ Actions executed: ${execution.results.length}`);

      if (execution.results.length > 0) {
        console.log('\n📊 Action Results:');
        execution.results.forEach((result, index) => {
          const statusEmoji = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
          console.log(`   ${index + 1}. ${result.actionType}: ${statusEmoji} ${result.status}`);
          if (result.message) {
            console.log(`      Message: ${result.message}`);
          }
        });
      }

      if (execution.error) {
        console.log(`\n❌ Error: ${execution.error}`);
      }

    } catch (error) {
      console.error('❌ Failed to execute automation rule:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * List executions command
 */
program
  .command('list-executions')
  .description('List automation rule executions')
  .option('--rule <ruleId>', 'Filter by rule ID')
  .option('--status <status>', 'Filter by execution status')
  .option('--limit <limit>', 'Limit number of results', '20')
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(async (options) => {
    try {
      const filters: any = {};
      
      if (options.rule) filters.ruleId = options.rule;
      if (options.status) filters.status = options.status as ExecutionStatus;
      if (options.limit) filters.limit = parseInt(options.limit);

      const executions = automationEngine.getExecutions(filters);

      if (options.format === 'json') {
        console.log(JSON.stringify(executions, null, 2));
        return;
      }

      if (executions.length === 0) {
        console.log('📭 No executions found matching the criteria.');
        return;
      }

      console.log(`📊 Found ${executions.length} execution(s):\n`);
      
      executions.forEach((execution, index) => {
        const statusEmoji = getStatusEmoji(execution.status);
        console.log(`${index + 1}. ${execution.id}`);
        console.log(`   📋 Rule: ${execution.ruleId}`);
        console.log(`   🔧 Status: ${statusEmoji} ${execution.status}`);
        console.log(`   👤 Triggered by: ${execution.triggeredBy}`);
        console.log(`   📅 Triggered at: ${execution.triggeredAt.toLocaleString()}`);
        console.log(`   ⏱️  Duration: ${execution.duration}ms`);
        console.log(`   ⚡ Actions: ${execution.results.length}`);
        if (execution.context.issueKey) {
          console.log(`   🎫 Issue: ${execution.context.issueKey}`);
        }
        if (execution.error) {
          console.log(`   ❌ Error: ${execution.error}`);
        }
        console.log('');
      });

    } catch (error) {
      console.error('❌ Failed to list executions:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Validate rule command
 */
program
  .command('validate-rule')
  .description('Validate an automation rule')
  .option('-f, --file <file>', 'Rule definition file (JSON)')
  .option('--rule <ruleId>', 'Validate existing rule by ID')
  .action(async (options) => {
    try {
      let rule: AutomationRule;

      if (options.file) {
        if (!existsSync(options.file)) {
          console.error(`❌ Rule file not found: ${options.file}`);
          process.exit(1);
        }
        const fileContent = readFileSync(options.file, 'utf-8');
        rule = JSON.parse(fileContent);
      } else if (options.rule) {
        const existingRule = automationEngine.getRule(options.rule);
        if (!existingRule) {
          console.error(`❌ Rule not found: ${options.rule}`);
          process.exit(1);
        }
        rule = existingRule;
      } else {
        console.error('❌ Either --file or --rule option is required');
        process.exit(1);
      }

      console.log('🔄 Validating automation rule...');
      const validation = await automationEngine.validateRule(rule);

      if (validation.valid) {
        console.log('✅ Rule validation passed!');
      } else {
        console.log('❌ Rule validation failed!');
        console.log('\n🚨 Errors:');
        validation.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.field}: ${error.message} (${error.code})`);
        });
      }

      if (validation.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        validation.warnings.forEach((warning, index) => {
          console.log(`   ${index + 1}. ${warning.field}: ${warning.message}`);
          if (warning.suggestion) {
            console.log(`      💡 Suggestion: ${warning.suggestion}`);
          }
        });
      }

      if (!validation.valid) {
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Failed to validate rule:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Get metrics command
 */
program
  .command('metrics')
  .description('Get automation metrics')
  .option('--rule <ruleId>', 'Get metrics for specific rule')
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(async (options) => {
    try {
      const metrics = automationEngine.getMetrics(options.rule);

      if (options.format === 'json') {
        console.log(JSON.stringify(metrics, null, 2));
        return;
      }

      if (metrics.length === 0) {
        console.log('📭 No metrics found.');
        return;
      }

      console.log(`📊 Automation Metrics:\n`);
      
      metrics.forEach((metric, index) => {
        console.log(`${index + 1}. Rule: ${metric.ruleId}`);
        console.log(`   📊 Executions: ${metric.executionCount}`);
        console.log(`   ✅ Success Rate: ${metric.successRate.toFixed(2)}%`);
        console.log(`   ⏱️  Avg Duration: ${metric.averageDuration.toFixed(0)}ms`);
        if (metric.lastExecution) {
          console.log(`   📅 Last Execution: ${metric.lastExecution.toLocaleString()}`);
        }
        
        if (Object.keys(metric.failureReasons).length > 0) {
          console.log('   🚨 Failure Reasons:');
          Object.entries(metric.failureReasons).forEach(([reason, count]) => {
            console.log(`      - ${reason}: ${count}`);
          });
        }
        console.log('');
      });

    } catch (error) {
      console.error('❌ Failed to get metrics:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Generate rule template command
 */
program
  .command('generate-template')
  .description('Generate automation rule templates')
  .option('--type <type>', 'Template type (basic|issue-created|scheduled|webhook)', 'basic')
  .option('--output <file>', 'Output file', 'automation-rule-template.json')
  .action(async (options) => {
    try {
      const template = generateRuleTemplate(options.type);
      
      writeFileSync(options.output, JSON.stringify(template, null, 2));
      console.log(`✅ Rule template generated: ${options.output}`);
      console.log(`📝 Template type: ${options.type}`);
      console.log('💡 Edit the template file and use it with the create-rule command.');

    } catch (error) {
      console.error('❌ Failed to generate template:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Monitor command
 */
program
  .command('monitor')
  .description('Monitor automation rule executions in real-time')
  .option('--rule <ruleId>', 'Monitor specific rule')
  .option('--interval <seconds>', 'Refresh interval in seconds', '5')
  .action(async (options) => {
    try {
      const interval = parseInt(options.interval) * 1000;
      
      console.log('🔍 Monitoring automation executions...');
      console.log('   Press Ctrl+C to stop monitoring\n');

      const monitor = setInterval(() => {
        const filters: any = { limit: 10 };
        if (options.rule) filters.ruleId = options.rule;

        const executions = automationEngine.getExecutions(filters);
        
        // Clear screen
        console.clear();
        console.log('🔍 Automation Monitor - Latest Executions\n');
        
        if (executions.length === 0) {
          console.log('📭 No recent executions found.');
        } else {
          executions.forEach((execution, index) => {
            const statusEmoji = getStatusEmoji(execution.status);
            const timeAgo = getTimeAgo(execution.triggeredAt);
            
            console.log(`${index + 1}. ${statusEmoji} ${execution.status} - ${execution.ruleId} (${timeAgo})`);
            if (execution.context.issueKey) {
              console.log(`   🎫 Issue: ${execution.context.issueKey}`);
            }
            if (execution.error) {
              console.log(`   ❌ Error: ${execution.error.substring(0, 100)}...`);
            }
          });
        }
        
        console.log(`\n🔄 Last updated: ${new Date().toLocaleTimeString()}`);
        console.log(`   Refresh interval: ${options.interval}s`);
      }, interval);

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        clearInterval(monitor);
        console.log('\n👋 Monitoring stopped.');
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ Failed to start monitoring:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Helper functions
 */

function getStatusEmoji(status: ExecutionStatus): string {
  switch (status) {
    case ExecutionStatus.COMPLETED: return '✅';
    case ExecutionStatus.FAILED: return '❌';
    case ExecutionStatus.RUNNING: return '🔄';
    case ExecutionStatus.PENDING: return '⏳';
    case ExecutionStatus.CANCELLED: return '⏹️';
    default: return '❓';
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'just now';
}

async function createRuleInteractively(options: any): Promise<any> {
  // This would use a prompt library like inquirer in a real implementation
  // For now, create a basic rule from options
  return {
    name: options.name || 'New Automation Rule',
    description: options.description || 'Created via CLI',
    enabled: options.enabled || false,
    projectKeys: options.project || [],
    triggers: [{
      type: TriggerType.MANUAL,
      config: {}
    }],
    actions: [{
      type: ActionType.ADD_COMMENT,
      config: {
        comment: 'This rule was created via CLI'
      },
      order: 1
    }],
    createdBy: 'cli-user'
  };
}

function generateRuleTemplate(type: string): any {
  const baseTemplate = {
    name: 'Template Rule',
    description: 'Generated template rule',
    enabled: false,
    projectKeys: ['PROJECT'],
    createdBy: 'template-generator'
  };

  switch (type) {
    case 'issue-created':
      return {
        ...baseTemplate,
        name: 'Issue Created Rule',
        description: 'Triggered when a new issue is created',
        triggers: [{
          type: TriggerType.ISSUE_CREATED,
          config: {
            projectKeys: ['PROJECT'],
            issueTypes: ['Task', 'Bug']
          }
        }],
        actions: [{
          type: ActionType.ADD_COMMENT,
          config: {
            comment: 'Welcome! This issue has been automatically processed.'
          },
          order: 1
        }]
      };

    case 'scheduled':
      return {
        ...baseTemplate,
        name: 'Scheduled Rule',
        description: 'Runs on a schedule',
        triggers: [{
          type: TriggerType.SCHEDULED,
          config: {
            cronExpression: '0 9 * * 1-5', // 9 AM weekdays
            timezone: 'UTC'
          }
        }],
        actions: [{
          type: ActionType.SEND_NOTIFICATION,
          config: {
            recipients: ['admin@example.com'],
            subject: 'Daily automation report',
            message: 'This is a scheduled notification.'
          },
          order: 1
        }]
      };

    case 'webhook':
      return {
        ...baseTemplate,
        name: 'Webhook Rule',
        description: 'Triggered by external webhook',
        triggers: [{
          type: TriggerType.WEBHOOK,
          config: {
            secret: 'your-webhook-secret'
          }
        }],
        actions: [{
          type: ActionType.UPDATE_ISSUE,
          config: {
            fields: {
              labels: ['webhook-triggered']
            }
          },
          order: 1
        }]
      };

    default: // basic
      return {
        ...baseTemplate,
        triggers: [{
          type: TriggerType.MANUAL,
          config: {}
        }],
        actions: [{
          type: ActionType.ADD_COMMENT,
          config: {
            comment: 'This is a basic automation rule.'
          },
          order: 1
        }]
      };
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();
