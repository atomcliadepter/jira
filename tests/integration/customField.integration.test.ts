
import { CustomFieldManager } from '../src/tools/customFieldManager.js';
import { CustomFieldConfiguration } from '../src/tools/customFieldConfiguration.js';
import { JiraRestClient } from '../src/http/JiraRestClient.js';
import { configValidator } from '../src/utils/configValidator.js';

describe('Custom Field Integration Tests', () => {
  let jiraClient: JiraRestClient;
  let customFieldManager: CustomFieldManager;
  let customFieldConfig: CustomFieldConfiguration;
  let testFieldId: string;
  let testConfigId: string;

  beforeAll(async () => {
    // Initialize Jira client with test configuration
    try {
      const validatedConfig = configValidator.validateEnvironment();
      jiraClient = new JiraRestClient({
        baseUrl: validatedConfig.JIRA_BASE_URL,
        email: validatedConfig.JIRA_EMAIL,
        apiToken: validatedConfig.JIRA_API_TOKEN,
        oauthAccessToken: validatedConfig.JIRA_OAUTH_ACCESS_TOKEN,
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      });

      customFieldManager = new CustomFieldManager(jiraClient);
      customFieldConfig = new CustomFieldConfiguration(jiraClient);
    } catch (error) {
      console.warn('Skipping integration tests - configuration not available:', error);
      return;
    }
  });

  beforeEach(() => {
    if (!jiraClient) {
      pending('Jira client not configured - skipping integration test');
    }
  });

  afterEach(async () => {
    // Clean up test data
    if (testFieldId) {
      try {
        await customFieldManager.deleteCustomField(testFieldId);
      } catch (error) {
        console.warn('Failed to clean up test field:', error);
      }
      testFieldId = '';
    }

    if (testConfigId) {
      try {
        await customFieldConfig.deleteFieldConfiguration(testConfigId);
      } catch (error) {
        console.warn('Failed to clean up test configuration:', error);
      }
      testConfigId = '';
    }
  });

  describe('Custom Field Lifecycle', () => {
    it('should create, update, and delete a custom field', async () => {
      // Create custom field
      const createParams = {
        name: `Test Field ${Date.now()}`,
        description: 'Integration test field',
        type: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
        searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:textsearcher'
      };

      const createdField = await customFieldManager.createCustomField(createParams);
      testFieldId = createdField.id;

      expect(createdField.id).toBeDefined();
      expect(createdField.name).toBe(createParams.name);
      expect(createdField.schema?.type).toBe('string');

      // Get field details
      const fieldDetails = await customFieldManager.getCustomField(testFieldId);
      expect(fieldDetails.id).toBe(testFieldId);
      expect(fieldDetails.name).toBe(createParams.name);

      // Update field
      const updateParams = {
        fieldId: testFieldId,
        name: `Updated ${createParams.name}`,
        description: 'Updated description'
      };

      await customFieldManager.updateCustomField(updateParams);

      // Verify update
      const updatedField = await customFieldManager.getCustomField(testFieldId);
      expect(updatedField.name).toBe(updateParams.name);

      // Search for field
      const searchResults = await customFieldManager.searchCustomFields(updateParams.name);
      expect(searchResults.values).toBeDefined();
      expect(searchResults.values.some((field: any) => field.id === testFieldId)).toBe(true);
    }, 60000);

    it('should create and manage field contexts', async () => {
      // First create a custom field
      const fieldParams = {
        name: `Context Test Field ${Date.now()}`,
        description: 'Field for context testing',
        type: 'com.atlassian.jira.plugin.system.customfieldtypes:select',
        searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher'
      };

      const createdField = await customFieldManager.createCustomField(fieldParams);
      testFieldId = createdField.id;

      // Create field context
      const contextParams = {
        fieldId: testFieldId,
        name: 'Test Context',
        description: 'Integration test context'
      };

      const createdContext = await customFieldManager.createFieldContext(contextParams);
      expect(createdContext.id).toBeDefined();
      expect(createdContext.name).toBe(contextParams.name);

      // Get field contexts
      const contexts = await customFieldManager.getFieldContexts(testFieldId);
      expect(contexts.values).toBeDefined();
      expect(contexts.values.length).toBeGreaterThan(0);

      // Set field options
      const optionsParams = {
        fieldId: testFieldId,
        contextId: createdContext.id,
        options: [
          { value: 'Option 1', disabled: false },
          { value: 'Option 2', disabled: false },
          { value: 'Option 3', disabled: true }
        ]
      };

      await customFieldManager.setFieldOptions(optionsParams);

      // Get field options
      const options = await customFieldManager.getFieldOptions(testFieldId, createdContext.id);
      expect(options.values).toBeDefined();
      expect(options.values.length).toBe(3);
    }, 60000);

    it('should validate field values correctly', async () => {
      // Create a number field for validation testing
      const fieldParams = {
        name: `Validation Test Field ${Date.now()}`,
        description: 'Field for validation testing',
        type: 'com.atlassian.jira.plugin.system.customfieldtypes:float',
        searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:exactnumber'
      };

      const createdField = await customFieldManager.createCustomField(fieldParams);
      testFieldId = createdField.id;

      // Test valid number
      const validResult = await customFieldManager.validateFieldValue(testFieldId, 42.5);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Test invalid number
      const invalidResult = await customFieldManager.validateFieldValue(testFieldId, 'not a number');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Field Configuration Management', () => {
    it('should create and manage field configurations', async () => {
      // Get existing field configurations
      const existingConfigs = await customFieldConfig.getFieldConfigurations(0, 10);
      expect(existingConfigs.values).toBeDefined();

      // Create new field configuration
      const configParams = {
        name: `Test Configuration ${Date.now()}`,
        description: 'Integration test configuration'
      };

      const createdConfig = await customFieldConfig.createFieldConfiguration(configParams);
      testConfigId = createdConfig.id;

      expect(createdConfig.id).toBeDefined();
      expect(createdConfig.name).toBe(configParams.name);

      // Update configuration
      await customFieldConfig.updateFieldConfiguration(testConfigId, 'Updated Configuration Name');

      // Validate configuration
      const validationResult = await customFieldConfig.validateFieldConfiguration(testConfigId);
      expect(validationResult.valid).toBe(true);
    }, 60000);

    it('should manage field configuration schemes', async () => {
      // Get existing schemes
      const existingSchemes = await customFieldConfig.getFieldConfigurationSchemes(0, 10);
      expect(existingSchemes.values).toBeDefined();

      // Create field configuration scheme
      const schemeParams = {
        name: `Test Scheme ${Date.now()}`,
        description: 'Integration test scheme'
      };

      const createdScheme = await customFieldConfig.createFieldConfigurationScheme(schemeParams);
      expect(createdScheme.id).toBeDefined();
      expect(createdScheme.name).toBe(schemeParams.name);

      // Get scheme mappings
      const mappings = await customFieldConfig.getFieldConfigurationSchemeMapping(createdScheme.id);
      expect(mappings).toBeDefined();

      // Clean up scheme
      await customFieldConfig.deleteFieldConfigurationScheme(createdScheme.id);
    }, 60000);
  });

  describe('Field Calculations', () => {
    it('should perform field calculations correctly', async () => {
      const calculationParams = {
        fieldId: 'customfield_test',
        expression: '{field1} * {field2} + 100',
        dependentFields: ['field1', 'field2']
      };

      const issueData = {
        fields: {
          field1: 10,
          field2: 5
        }
      };

      const result = await customFieldManager.calculateFieldValue(calculationParams, issueData);
      expect(result).toBe(150); // 10 * 5 + 100 = 150
    });

    it('should handle complex calculations safely', async () => {
      const calculationParams = {
        fieldId: 'customfield_test',
        expression: '({field1} + {field2}) / {field3}',
        dependentFields: ['field1', 'field2', 'field3']
      };

      const issueData = {
        fields: {
          field1: 20,
          field2: 10,
          field3: 3
        }
      };

      const result = await customFieldManager.calculateFieldValue(calculationParams, issueData);
      expect(result).toBe(10); // (20 + 10) / 3 = 10
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Try to get a non-existent field
      await expect(customFieldManager.getCustomField('customfield_nonexistent')).rejects.toThrow();

      // Try to delete a non-existent configuration
      await expect(customFieldConfig.deleteFieldConfiguration('nonexistent')).rejects.toThrow();
    });

    it('should validate input parameters', async () => {
      // Invalid field creation parameters
      await expect(customFieldManager.createCustomField({
        name: '',
        type: 'invalid_type',
        searcherKey: 'invalid_searcher'
      })).rejects.toThrow();

      // Invalid configuration parameters
      await expect(customFieldConfig.createFieldConfiguration({
        name: ''
      })).rejects.toThrow();
    });
  });
});
