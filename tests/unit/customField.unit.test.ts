
import { CustomFieldManager, CUSTOM_FIELD_TYPES, SEARCHER_TYPES } from '../src/tools/customFieldManager.js';
import { CustomFieldConfiguration } from '../src/tools/customFieldConfiguration.js';
import { JiraRestClient } from '../src/http/JiraRestClient.js';
import { jest } from '@jest/globals';

// Mock the JiraRestClient
const mockJiraClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
} as unknown as jest.Mocked<JiraRestClient>;

describe('CustomFieldManager', () => {
  let customFieldManager: CustomFieldManager;

  beforeEach(() => {
    customFieldManager = new CustomFieldManager(mockJiraClient);
    jest.clearAllMocks();
  });

  describe('createCustomField', () => {
    it('should create a custom field successfully', async () => {
      const mockResponse = {
        id: 'customfield_10001',
        name: 'Test Field',
        schema: { type: 'string' },
        searcherKey: SEARCHER_TYPES.TEXT_SEARCHER
      };

      mockJiraClient.post.mockResolvedValue(mockResponse);

      const params = {
        name: 'Test Field',
        description: 'A test custom field',
        type: CUSTOM_FIELD_TYPES.TEXT_FIELD,
        searcherKey: SEARCHER_TYPES.TEXT_SEARCHER
      };

      const result = await customFieldManager.createCustomField(params);

      expect(mockJiraClient.post).toHaveBeenCalledWith('/rest/api/3/field', {
        name: 'Test Field',
        description: 'A test custom field',
        type: CUSTOM_FIELD_TYPES.TEXT_FIELD,
        searcherKey: SEARCHER_TYPES.TEXT_SEARCHER
      });
      expect(result).toEqual(mockResponse);
    });

    it('should create field context when project/issue type restrictions are specified', async () => {
      const mockFieldResponse = {
        id: 'customfield_10001',
        name: 'Test Field'
      };
      const mockContextResponse = {
        id: '10001',
        name: 'Test Field Context'
      };

      mockJiraClient.post
        .mockResolvedValueOnce(mockFieldResponse)
        .mockResolvedValueOnce(mockContextResponse);

      const params = {
        name: 'Test Field',
        type: CUSTOM_FIELD_TYPES.TEXT_FIELD,
        searcherKey: SEARCHER_TYPES.TEXT_SEARCHER,
        projectIds: ['10000'],
        issueTypeIds: ['10001']
      };

      await customFieldManager.createCustomField(params);

      expect(mockJiraClient.post).toHaveBeenCalledTimes(2);
      expect(mockJiraClient.post).toHaveBeenNthCalledWith(2, '/rest/api/3/field/customfield_10001/context', {
        name: 'Test Field Context',
        description: 'Auto-created context for Test Field',
        projectIds: ['10000'],
        issueTypeIds: ['10001']
      });
    });

    it('should throw error for invalid parameters', async () => {
      const params = {
        name: '',
        type: CUSTOM_FIELD_TYPES.TEXT_FIELD,
        searcherKey: SEARCHER_TYPES.TEXT_SEARCHER
      };

      await expect(customFieldManager.createCustomField(params)).rejects.toThrow();
    });
  });

  describe('updateCustomField', () => {
    it('should update a custom field successfully', async () => {
      const mockResponse = { id: 'customfield_10001', name: 'Updated Field' };
      mockJiraClient.put.mockResolvedValue(mockResponse);

      const params = {
        fieldId: 'customfield_10001',
        name: 'Updated Field',
        description: 'Updated description'
      };

      const result = await customFieldManager.updateCustomField(params);

      expect(mockJiraClient.put).toHaveBeenCalledWith('/rest/api/3/field/customfield_10001', {
        name: 'Updated Field',
        description: 'Updated description'
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteCustomField', () => {
    it('should delete a custom field successfully', async () => {
      mockJiraClient.delete.mockResolvedValue(undefined);

      await customFieldManager.deleteCustomField('customfield_10001');

      expect(mockJiraClient.delete).toHaveBeenCalledWith('/rest/api/3/field/customfield_10001');
    });
  });

  describe('searchCustomFields', () => {
    it('should search custom fields successfully', async () => {
      const mockResponse = {
        values: [
          { id: 'customfield_10001', name: 'Field 1', schema: { type: 'string' } },
          { id: 'customfield_10002', name: 'Field 2', schema: { type: 'number' } }
        ],
        total: 2
      };

      mockJiraClient.get.mockResolvedValue(mockResponse);

      const result = await customFieldManager.searchCustomFields('test', 'custom', 0, 10);

      expect(mockJiraClient.get).toHaveBeenCalledWith('/rest/api/3/field/search?startAt=0&maxResults=10&query=test&type=custom');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('setFieldOptions', () => {
    it('should set field options successfully', async () => {
      const mockResponse = { options: [{ id: '1', value: 'Option 1' }] };
      mockJiraClient.put.mockResolvedValue(mockResponse);

      const params = {
        fieldId: 'customfield_10001',
        contextId: '10001',
        options: [
          { value: 'Option 1', disabled: false },
          { value: 'Option 2', disabled: true }
        ]
      };

      const result = await customFieldManager.setFieldOptions(params);

      expect(mockJiraClient.put).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10001/context/10001/option',
        {
          options: [
            { value: 'Option 1', disabled: false },
            { value: 'Option 2', disabled: true }
          ]
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateFieldValue', () => {
    it('should validate field value successfully', async () => {
      const mockField = {
        id: 'customfield_10001',
        name: 'Test Field',
        schema: { type: 'string' },
        required: false
      };
      const mockContexts = {
        values: [
          {
            id: '10001',
            name: 'Default Context',
            projectIds: [],
            issueTypeIds: []
          }
        ]
      };

      mockJiraClient.get
        .mockResolvedValueOnce(mockField)
        .mockResolvedValueOnce(mockContexts);

      const result = await customFieldManager.validateFieldValue('customfield_10001', 'test value');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors', async () => {
      const mockField = {
        id: 'customfield_10001',
        name: 'Test Field',
        schema: { type: 'number' },
        required: true
      };
      const mockContexts = { values: [] };

      mockJiraClient.get
        .mockResolvedValueOnce(mockField)
        .mockResolvedValueOnce(mockContexts);

      const result = await customFieldManager.validateFieldValue('customfield_10001', 'not a number');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Value must be a valid number');
    });
  });

  describe('calculateFieldValue', () => {
    it('should calculate field value successfully', async () => {
      const params = {
        fieldId: 'customfield_10001',
        expression: '{customfield_10002} * {customfield_10003} + 10',
        dependentFields: ['customfield_10002', 'customfield_10003'],
        updateTrigger: 'manual' as const
      };

      const issueData = {
        fields: {
          customfield_10002: 5,
          customfield_10003: 3
        }
      };

      const result = await customFieldManager.calculateFieldValue(params, issueData);

      expect(result).toBe(25); // 5 * 3 + 10 = 25
    });

    it('should handle invalid expressions safely', async () => {
      const params = {
        fieldId: 'customfield_10001',
        expression: 'alert("hack")',
        dependentFields: [],
        updateTrigger: 'manual' as const
      };

      const issueData = { fields: {} };

      const result = await customFieldManager.calculateFieldValue(params, issueData);

      expect(result).toBeNull();
    });
  });
});

describe('CustomFieldConfiguration', () => {
  let customFieldConfig: CustomFieldConfiguration;

  beforeEach(() => {
    customFieldConfig = new CustomFieldConfiguration(mockJiraClient);
    jest.clearAllMocks();
  });

  describe('createFieldConfiguration', () => {
    it('should create field configuration successfully', async () => {
      const mockResponse = {
        id: '10001',
        name: 'Test Configuration',
        description: 'A test configuration'
      };

      mockJiraClient.post.mockResolvedValue(mockResponse);

      const params = {
        name: 'Test Configuration',
        description: 'A test configuration',
        fields: [
          {
            fieldId: 'customfield_10001',
            isHidden: false,
            isRequired: true
          }
        ]
      };

      const result = await customFieldConfig.createFieldConfiguration(params);

      expect(mockJiraClient.post).toHaveBeenCalledWith('/rest/api/3/fieldconfiguration', {
        name: 'Test Configuration',
        description: 'A test configuration'
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateFieldConfiguration', () => {
    it('should validate field configuration successfully', async () => {
      const mockConfig = {
        id: '10001',
        name: 'Test Configuration'
      };
      const mockItems = {
        values: [
          {
            id: 'customfield_10001',
            isHidden: false,
            isRequired: true
          },
          {
            id: 'customfield_10002',
            isHidden: false,
            isRequired: false
          }
        ]
      };

      mockJiraClient.get
        .mockResolvedValueOnce(mockConfig)
        .mockResolvedValueOnce(mockItems);

      const result = await customFieldConfig.validateFieldConfiguration('10001');

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect validation issues', async () => {
      const mockConfig = {
        id: '10001',
        name: ''
      };
      const mockItems = {
        values: [
          {
            id: 'customfield_10001',
            isHidden: true,
            isRequired: true
          }
        ]
      };

      mockJiraClient.get
        .mockResolvedValueOnce(mockConfig)
        .mockResolvedValueOnce(mockItems);

      const result = await customFieldConfig.validateFieldConfiguration('10001');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Configuration name is empty');
      expect(result.issues).toContain('Fields cannot be both hidden and required: customfield_10001');
    });
  });

  describe('copyFieldConfiguration', () => {
    it('should copy field configuration successfully', async () => {
      const mockSourceConfig = {
        id: '10001',
        name: 'Source Configuration'
      };
      const mockSourceItems = {
        values: [
          {
            id: 'customfield_10001',
            isHidden: false,
            isRequired: true,
            renderer: 'text',
            description: 'Test field'
          }
        ]
      };
      const mockNewConfig = {
        id: '10002',
        name: 'Copied Configuration'
      };

      mockJiraClient.get
        .mockResolvedValueOnce(mockSourceConfig)
        .mockResolvedValueOnce(mockSourceItems);
      mockJiraClient.post.mockResolvedValue(mockNewConfig);
      mockJiraClient.put.mockResolvedValue({});

      const result = await customFieldConfig.copyFieldConfiguration('10001', 'Copied Configuration');

      expect(mockJiraClient.get).toHaveBeenCalledWith('/rest/api/3/fieldconfiguration/10001');
      expect(mockJiraClient.post).toHaveBeenCalledWith('/rest/api/3/fieldconfiguration', {
        name: 'Copied Configuration',
        description: 'Copy of Source Configuration'
      });
      expect(result).toEqual(mockNewConfig);
    });
  });
});
