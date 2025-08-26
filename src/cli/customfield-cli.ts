
import { Command } from 'commander';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { CustomFieldManager, CUSTOM_FIELD_TYPES, SEARCHER_TYPES } from '../tools/customFieldManager.js';
import { CustomFieldConfiguration } from '../tools/customFieldConfiguration.js';
import { logger } from '../utils/logger.js';
import { configValidator } from '../utils/configValidator.js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

// Initialize Jira client
function createJiraClient(): JiraRestClient {
  try {
    const validatedConfig = configValidator.validateEnvironment();
    return new JiraRestClient({
      baseUrl: validatedConfig.JIRA_BASE_URL,
      email: validatedConfig.JIRA_EMAIL,
      apiToken: validatedConfig.JIRA_API_TOKEN,
      oauthAccessToken: validatedConfig.JIRA_OAUTH_ACCESS_TOKEN,
      timeout: Number(validatedConfig.REQUEST_TIMEOUT) || 30000,
      maxRetries: Number(validatedConfig.MAX_RETRIES) || 3,
      retryDelay: Number(validatedConfig.RETRY_DELAY) || 1000,
    });
  } catch (error: any) {
    logger.error('Failed to initialize Jira client', { error: error.message });
    console.error('❌ Configuration error:', error.message);
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
}

// Helper function to display field types
function displayFieldTypes() {
  console.log('\n📋 Available Custom Field Types:');
  console.log('================================');
  
  const typeCategories = {
    'Basic Types': [
      { key: 'TEXT_FIELD', value: CUSTOM_FIELD_TYPES.TEXT_FIELD, description: 'Single line text field' },
      { key: 'TEXTAREA', value: CUSTOM_FIELD_TYPES.TEXTAREA, description: 'Multi-line text area' },
      { key: 'NUMBER_FIELD', value: CUSTOM_FIELD_TYPES.NUMBER_FIELD, description: 'Numeric field' },
      { key: 'DATE_PICKER', value: CUSTOM_FIELD_TYPES.DATE_PICKER, description: 'Date picker' },
      { key: 'DATETIME_PICKER', value: CUSTOM_FIELD_TYPES.DATETIME_PICKER, description: 'Date and time picker' }
    ],
    'Selection Types': [
      { key: 'SELECT_LIST', value: CUSTOM_FIELD_TYPES.SELECT_LIST, description: 'Single select dropdown' },
      { key: 'MULTI_SELECT', value: CUSTOM_FIELD_TYPES.MULTI_SELECT, description: 'Multi-select dropdown' },
      { key: 'RADIO_BUTTONS', value: CUSTOM_FIELD_TYPES.RADIO_BUTTONS, description: 'Radio button group' },
      { key: 'CHECKBOXES', value: CUSTOM_FIELD_TYPES.CHECKBOXES, description: 'Checkbox group' },
      { key: 'CASCADING_SELECT', value: CUSTOM_FIELD_TYPES.CASCADING_SELECT, description: 'Cascading select list' }
    ],
    'Advanced Types': [
      { key: 'USER_PICKER', value: CUSTOM_FIELD_TYPES.USER_PICKER, description: 'User picker' },
      { key: 'GROUP_PICKER', value: CUSTOM_FIELD_TYPES.GROUP_PICKER, description: 'Group picker' },
      { key: 'PROJECT_PICKER', value: CUSTOM_FIELD_TYPES.PROJECT_PICKER, description: 'Project picker' },
      { key: 'VERSION_PICKER', value: CUSTOM_FIELD_TYPES.VERSION_PICKER, description: 'Version picker' },
      { key: 'URL_FIELD', value: CUSTOM_FIELD_TYPES.URL_FIELD, description: 'URL field' },
      { key: 'LABELS', value: CUSTOM_FIELD_TYPES.LABELS, description: 'Labels field' }
    ]
  };

  for (const [category, types] of Object.entries(typeCategories)) {
    console.log(`\n${category}:`);
    types.forEach(type => {
      console.log(`  ${type.key.padEnd(20)} - ${type.description}`);
      console.log(`  ${''.padEnd(20)}   ${type.value}`);
    });
  }
}

// Helper function to display searcher types
function displaySearcherTypes() {
  console.log('\n🔍 Available Searcher Types:');
  console.log('============================');
  
  const searcherCategories = {
    'Text Searchers': [
      { key: 'TEXT_SEARCHER', value: SEARCHER_TYPES.TEXT_SEARCHER, description: 'General text search' },
      { key: 'EXACT_TEXT_SEARCHER', value: SEARCHER_TYPES.EXACT_TEXT_SEARCHER, description: 'Exact text match' }
    ],
    'Numeric & Date Searchers': [
      { key: 'NUMBER_SEARCHER', value: SEARCHER_TYPES.NUMBER_SEARCHER, description: 'Numeric range search' },
      { key: 'DATE_SEARCHER', value: SEARCHER_TYPES.DATE_SEARCHER, description: 'Date range search' }
    ],
    'Selection Searchers': [
      { key: 'SELECT_SEARCHER', value: SEARCHER_TYPES.SELECT_SEARCHER, description: 'Multi-select search' },
      { key: 'CASCADING_SEARCHER', value: SEARCHER_TYPES.CASCADING_SEARCHER, description: 'Cascading select search' }
    ],
    'User & Group Searchers': [
      { key: 'USER_SEARCHER', value: SEARCHER_TYPES.USER_SEARCHER, description: 'User picker search' },
      { key: 'GROUP_SEARCHER', value: SEARCHER_TYPES.GROUP_SEARCHER, description: 'Group picker search' }
    ]
  };

  for (const [category, searchers] of Object.entries(searcherCategories)) {
    console.log(`\n${category}:`);
    searchers.forEach(searcher => {
      console.log(`  ${searcher.key.padEnd(25)} - ${searcher.description}`);
      console.log(`  ${''.padEnd(25)}   ${searcher.value}`);
    });
  }
}

// Create the main command
export const customFieldCommand = new Command('customfield')
  .alias('cf')
  .description('Manage Jira custom fields and configurations');

// Custom field management commands
customFieldCommand
  .command('create')
  .description('Create a new custom field')
  .requiredOption('-n, --name <name>', 'Name of the custom field')
  .requiredOption('-t, --type <type>', 'Field type (use --list-types to see options)')
  .requiredOption('-s, --searcher <searcher>', 'Searcher type (use --list-searchers to see options)')
  .option('-d, --description <description>', 'Description of the field')
  .option('-p, --projects <projects>', 'Comma-separated project IDs to restrict field to')
  .option('-i, --issue-types <types>', 'Comma-separated issue type IDs to restrict field to')
  .option('--dry-run', 'Show what would be created without actually creating')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const manager = new CustomFieldManager(client);

      const params = {
        name: options.name,
        description: options.description,
        type: options.type,
        searcherKey: options.searcher,
        projectIds: options.projects ? options.projects.split(',').map((p: string) => p.trim()) : undefined,
        issueTypeIds: options.issueTypes ? options.issueTypes.split(',').map((t: string) => t.trim()) : undefined
      };

      if (options.dryRun) {
        console.log('🧪 Dry run - Custom field that would be created:');
        console.log(JSON.stringify(params, null, 2));
        return;
      }

      console.log('🚀 Creating custom field...');
      const result = await manager.createCustomField(params);

      console.log('✅ Custom field created successfully!');
      console.log(`📋 Field ID: ${result.id}`);
      console.log(`📝 Name: ${result.name}`);
      console.log(`🔧 Type: ${result.schema?.type || 'Unknown'}`);
      console.log(`🔍 Searcher: ${result.searcherKey || 'Unknown'}`);
    } catch (error: any) {
      console.error('❌ Failed to create custom field:', error.message);
      process.exit(1);
    }
  });

customFieldCommand
  .command('list')
  .description('List custom fields')
  .option('-q, --query <query>', 'Search query for field names')
  .option('-t, --type <type>', 'Filter by field type')
  .option('--start-at <number>', 'Starting index for pagination', '0')
  .option('--max-results <number>', 'Maximum results to return', '50')
  .option('-o, --output <file>', 'Output results to JSON file')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const manager = new CustomFieldManager(client);

      console.log('🔍 Searching custom fields...');
      const result = await manager.searchCustomFields(
        options.query,
        options.type,
        parseInt(options.startAt),
        parseInt(options.maxResults)
      );

      const fields = result.values || [];
      
      console.log(`\n📋 Found ${fields.length} custom fields (Total: ${result.total || 0}):`);
      console.log('='.repeat(80));

      fields.forEach((field: any, index: number) => {
        console.log(`\n${index + 1}. ${field.name} (${field.id})`);
        console.log(`   Type: ${field.schema?.type || 'Unknown'}`);
        console.log(`   Searcher: ${field.searcherKey || 'Unknown'}`);
        if (field.description) {
          console.log(`   Description: ${field.description}`);
        }
      });

      if (options.output) {
        writeFileSync(options.output, JSON.stringify(result, null, 2));
        console.log(`\n💾 Results saved to ${options.output}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to list custom fields:', error.message);
      process.exit(1);
    }
  });

customFieldCommand
  .command('get')
  .description('Get details of a specific custom field')
  .requiredOption('-f, --field-id <fieldId>', 'ID of the custom field')
  .option('-o, --output <file>', 'Output details to JSON file')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const manager = new CustomFieldManager(client);

      console.log(`🔍 Getting details for field ${options.fieldId}...`);
      const field = await manager.getCustomField(options.fieldId);

      console.log('\n📋 Custom Field Details:');
      console.log('='.repeat(50));
      console.log(`ID: ${field.id}`);
      console.log(`Name: ${field.name}`);
      console.log(`Type: ${field.schema?.type || 'Unknown'}`);
      console.log(`Searcher: ${field.searcherKey || 'Unknown'}`);
      if (field.description) {
        console.log(`Description: ${field.description}`);
      }

      // Get contexts
      const contexts = await manager.getFieldContexts(options.fieldId);
      if (contexts.values && contexts.values.length > 0) {
        console.log('\n🎯 Contexts:');
        contexts.values.forEach((context: any, index: number) => {
          console.log(`  ${index + 1}. ${context.name} (${context.id})`);
          if (context.description) {
            console.log(`     Description: ${context.description}`);
          }
        });
      }

      if (options.output) {
        const fullDetails = { field, contexts };
        writeFileSync(options.output, JSON.stringify(fullDetails, null, 2));
        console.log(`\n💾 Details saved to ${options.output}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to get custom field details:', error.message);
      process.exit(1);
    }
  });

customFieldCommand
  .command('update')
  .description('Update a custom field')
  .requiredOption('-f, --field-id <fieldId>', 'ID of the custom field')
  .option('-n, --name <name>', 'New name for the field')
  .option('-d, --description <description>', 'New description for the field')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const manager = new CustomFieldManager(client);

      const params = {
        fieldId: options.fieldId,
        name: options.name,
        description: options.description
      };

      console.log(`🔧 Updating custom field ${options.fieldId}...`);
      await manager.updateCustomField(params);

      console.log('✅ Custom field updated successfully!');
    } catch (error: any) {
      console.error('❌ Failed to update custom field:', error.message);
      process.exit(1);
    }
  });

customFieldCommand
  .command('delete')
  .description('Delete a custom field')
  .requiredOption('-f, --field-id <fieldId>', 'ID of the custom field')
  .option('--confirm', 'Confirm deletion without prompt')
  .action(async (options) => {
    try {
      if (!options.confirm) {
        console.log('⚠️  This will permanently delete the custom field and all its data.');
        console.log('Use --confirm flag to proceed without this warning.');
        process.exit(1);
      }

      const client = createJiraClient();
      const manager = new CustomFieldManager(client);

      console.log(`🗑️  Deleting custom field ${options.fieldId}...`);
      await manager.deleteCustomField(options.fieldId);

      console.log('✅ Custom field deleted successfully!');
    } catch (error: any) {
      console.error('❌ Failed to delete custom field:', error.message);
      process.exit(1);
    }
  });

// Field options management
customFieldCommand
  .command('set-options')
  .description('Set options for a select/multi-select field')
  .requiredOption('-f, --field-id <fieldId>', 'ID of the custom field')
  .requiredOption('-c, --context-id <contextId>', 'ID of the field context')
  .option('-o, --options <options>', 'JSON string of options array')
  .option('--options-file <file>', 'JSON file containing options array')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const manager = new CustomFieldManager(client);

      let optionsArray;
      if (options.options) {
        optionsArray = JSON.parse(options.options);
      } else if (options.optionsFile && existsSync(options.optionsFile)) {
        const fileContent = readFileSync(options.optionsFile, 'utf8');
        optionsArray = JSON.parse(fileContent);
      } else {
        console.error('❌ Please provide options via --options or --options-file');
        process.exit(1);
      }

      const params = {
        fieldId: options.fieldId,
        contextId: options.contextId,
        options: optionsArray
      };

      console.log(`🔧 Setting options for field ${options.fieldId}...`);
      await manager.setFieldOptions(params);

      console.log('✅ Field options set successfully!');
      console.log(`📋 Options: ${optionsArray.map((opt: any) => opt.value).join(', ')}`);
    } catch (error: any) {
      console.error('❌ Failed to set field options:', error.message);
      process.exit(1);
    }
  });

// Field validation
customFieldCommand
  .command('validate')
  .description('Validate a field value')
  .requiredOption('-f, --field-id <fieldId>', 'ID of the custom field')
  .requiredOption('-v, --value <value>', 'Value to validate')
  .option('-p, --project-id <projectId>', 'Project ID for context validation')
  .option('-i, --issue-type-id <issueTypeId>', 'Issue type ID for context validation')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const manager = new CustomFieldManager(client);

      console.log(`🔍 Validating value for field ${options.fieldId}...`);
      const result = await manager.validateFieldValue(
        options.fieldId,
        options.value,
        options.issueTypeId,
        options.projectId
      );

      console.log('\n📋 Validation Result:');
      console.log('='.repeat(30));
      console.log(`Valid: ${result.valid ? '✅ Yes' : '❌ No'}`);
      
      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to validate field value:', error.message);
      process.exit(1);
    }
  });

// Field calculation
customFieldCommand
  .command('calculate')
  .description('Calculate field value based on expression')
  .requiredOption('-f, --field-id <fieldId>', 'ID of the custom field')
  .requiredOption('-e, --expression <expression>', 'Calculation expression')
  .option('-d, --dependent-fields <fields>', 'Comma-separated dependent field IDs')
  .option('--issue-data <data>', 'JSON string of issue data')
  .option('--issue-file <file>', 'JSON file containing issue data')
  .action(async (options) => {
    try {
      const client = createJiraClient();
      const manager = new CustomFieldManager(client);

      let issueData;
      if (options.issueData) {
        issueData = JSON.parse(options.issueData);
      } else if (options.issueFile && existsSync(options.issueFile)) {
        const fileContent = readFileSync(options.issueFile, 'utf8');
        issueData = JSON.parse(fileContent);
      } else {
        console.error('❌ Please provide issue data via --issue-data or --issue-file');
        process.exit(1);
      }

      const params = {
        fieldId: options.fieldId,
        expression: options.expression,
        dependentFields: options.dependentFields ? options.dependentFields.split(',').map((f: string) => f.trim()) : [],
        updateTrigger: 'manual' as const
      };

      console.log(`🧮 Calculating value for field ${options.fieldId}...`);
      const result = await manager.calculateFieldValue(params, issueData);

      console.log('\n📋 Calculation Result:');
      console.log('='.repeat(30));
      console.log(`Expression: ${options.expression}`);
      console.log(`Result: ${result}`);
    } catch (error: any) {
      console.error('❌ Failed to calculate field value:', error.message);
      process.exit(1);
    }
  });

// Field configuration commands
customFieldCommand
  .command('config')
  .description('Manage field configurations')
  .addCommand(
    new Command('list')
      .description('List field configurations')
      .option('--start-at <number>', 'Starting index for pagination', '0')
      .option('--max-results <number>', 'Maximum results to return', '50')
      .action(async (options) => {
        try {
          const client = createJiraClient();
          const config = new CustomFieldConfiguration(client);

          console.log('🔍 Getting field configurations...');
          const result = await config.getFieldConfigurations(
            parseInt(options.startAt),
            parseInt(options.maxResults)
          );

          const configs = result.values || [];
          
          console.log(`\n📋 Found ${configs.length} field configurations (Total: ${result.total || 0}):`);
          console.log('='.repeat(80));

          configs.forEach((cfg: any, index: number) => {
            console.log(`\n${index + 1}. ${cfg.name} (${cfg.id})`);
            if (cfg.description) {
              console.log(`   Description: ${cfg.description}`);
            }
          });
        } catch (error: any) {
          console.error('❌ Failed to list field configurations:', error.message);
          process.exit(1);
        }
      })
  );

// Utility commands
customFieldCommand
  .command('list-types')
  .description('List available custom field types')
  .action(() => {
    displayFieldTypes();
  });

customFieldCommand
  .command('list-searchers')
  .description('List available searcher types')
  .action(() => {
    displaySearcherTypes();
  });

// Export for use in main CLI
export default customFieldCommand;
