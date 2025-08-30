import { FieldSchemaCache } from '../../src/schema/FieldSchemaCache.js';
import { JiraRestClient } from '../../src/http/JiraRestClient.js';

// Mock JiraRestClient
const mockClient = {
  get: jest.fn(),
} as unknown as JiraRestClient;

describe('Field Schema Cache Tests', () => {
  let fieldCache: FieldSchemaCache;

  beforeEach(() => {
    fieldCache = new FieldSchemaCache(mockClient);
    jest.clearAllMocks();
  });

  describe('Field Resolution', () => {
    test('should resolve field by ID', async () => {
      const mockField = {
        id: 'customfield_10001',
        name: 'Story Points',
        schema: { type: 'number', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:float' },
        custom: true,
      };

      (mockClient.get as jest.Mock).mockResolvedValue(mockField);

      const field = await fieldCache.getField('customfield_10001');

      expect(field).toEqual({
        id: 'customfield_10001',
        name: 'Story Points',
        type: 'number',
        custom: true,
        required: false,
        allowedValues: undefined,
        schema: mockField.schema,
      });

      expect(mockClient.get).toHaveBeenCalledWith('/rest/api/3/field/customfield_10001');
    });

    test('should resolve field by name', async () => {
      const mockFields = [
        {
          id: 'summary',
          name: 'Summary',
          schema: { type: 'string' },
          custom: false,
        },
        {
          id: 'customfield_10001',
          name: 'Story Points',
          schema: { type: 'number' },
          custom: true,
        },
      ];

      (mockClient.get as jest.Mock).mockResolvedValue(mockFields);

      const field = await fieldCache.getField('Story Points');

      expect(field?.name).toBe('Story Points');
      expect(field?.id).toBe('customfield_10001');
      expect(mockClient.get).toHaveBeenCalledWith('/rest/api/3/field');
    });

    test('should return null for non-existent field', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue([]);

      const field = await fieldCache.getField('NonExistentField');

      expect(field).toBeNull();
    });

    test('should resolve field ID from name', async () => {
      const mockFields = [
        {
          id: 'customfield_10001',
          name: 'Story Points',
          schema: { type: 'number' },
          custom: true,
        },
      ];

      (mockClient.get as jest.Mock).mockResolvedValue(mockFields);

      const fieldId = await fieldCache.resolveFieldId('Story Points');

      expect(fieldId).toBe('customfield_10001');
    });
  });

  describe('Project Fields', () => {
    test('should fetch project fields', async () => {
      const mockResponse = {
        values: [
          {
            id: 'summary',
            name: 'Summary',
            schema: { type: 'string' },
            custom: false,
            required: true,
          },
          {
            id: 'customfield_10001',
            name: 'Story Points',
            schema: { type: 'number', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:float' },
            custom: true,
            required: false,
          },
        ],
      };

      (mockClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const projectConfig = await fieldCache.getProjectFields('TEST');

      expect(projectConfig.projectKey).toBe('TEST');
      expect(projectConfig.fields.size).toBe(4); // 2 fields x 2 (by ID and name)
      expect(projectConfig.fields.get('summary')).toBeDefined();
      expect(projectConfig.fields.get('Story Points')).toBeDefined();

      expect(mockClient.get).toHaveBeenCalledWith('/rest/api/3/field/search?projectKeys=TEST');
    });

    test('should cache project fields', async () => {
      const mockResponse = { values: [] };
      (mockClient.get as jest.Mock).mockResolvedValue(mockResponse);

      // First call
      await fieldCache.getProjectFields('TEST');
      
      // Second call should use cache
      await fieldCache.getProjectFields('TEST');

      expect(mockClient.get).toHaveBeenCalledTimes(1);
    });

    test('should invalidate project cache', async () => {
      const mockResponse = { values: [] };
      (mockClient.get as jest.Mock).mockResolvedValue(mockResponse);

      // First call
      await fieldCache.getProjectFields('TEST');
      
      // Invalidate cache
      fieldCache.invalidateProject('TEST');
      
      // Second call should fetch again
      await fieldCache.getProjectFields('TEST');

      expect(mockClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Field Validation', () => {
    beforeEach(() => {
      // Mock a field for validation tests
      const mockField = {
        id: 'customfield_10001',
        name: 'Story Points',
        schema: { type: 'number' },
        custom: true,
        required: true,
      };

      (mockClient.get as jest.Mock).mockResolvedValue(mockField);
    });

    test('should validate required field', async () => {
      const result = await fieldCache.validateFieldValue('Story Points', null);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should validate field type', async () => {
      const result = await fieldCache.validateFieldValue('Story Points', 'not-a-number');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a number');
    });

    test('should pass valid field value', async () => {
      const result = await fieldCache.validateFieldValue('Story Points', 5);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should validate option field', async () => {
      const mockOptionField = {
        id: 'priority',
        name: 'Priority',
        schema: { type: 'option' },
        custom: false,
        required: false,
        allowedValues: [
          { value: 'High' },
          { value: 'Medium' },
          { value: 'Low' },
        ],
      };

      (mockClient.get as jest.Mock).mockResolvedValue(mockOptionField);

      const validResult = await fieldCache.validateFieldValue('Priority', 'High');
      expect(validResult.valid).toBe(true);

      const invalidResult = await fieldCache.validateFieldValue('Priority', 'Invalid');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('invalid value');
    });
  });

  describe('Field Type Mapping', () => {
    test('should map custom field types correctly', async () => {
      const testCases = [
        {
          schema: { type: 'any', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:select' },
          expected: 'option',
        },
        {
          schema: { type: 'any', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect' },
          expected: 'array',
        },
        {
          schema: { type: 'any', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:float' },
          expected: 'number',
        },
        {
          schema: { type: 'any', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:datepicker' },
          expected: 'date',
        },
      ];

      for (const testCase of testCases) {
        const mockField = {
          id: 'test-field',
          name: 'Test Field',
          schema: testCase.schema,
          custom: true,
        };

        (mockClient.get as jest.Mock).mockResolvedValue(mockField);

        const field = await fieldCache.getField('test-field');
        expect(field?.type).toBe(testCase.expected);
      }
    });

    test('should map standard field types correctly', async () => {
      const testCases = [
        { type: 'string', expected: 'string' },
        { type: 'number', expected: 'number' },
        { type: 'array', expected: 'array' },
        { type: 'option', expected: 'option' },
        { type: 'date', expected: 'date' },
        { type: 'datetime', expected: 'datetime' },
        { type: 'unknown', expected: 'string' }, // default
      ];

      for (const testCase of testCases) {
        const mockField = {
          id: 'test-field',
          name: 'Test Field',
          schema: { type: testCase.type },
          custom: false,
        };

        (mockClient.get as jest.Mock).mockResolvedValue(mockField);

        const field = await fieldCache.getField('test-field');
        expect(field?.type).toBe(testCase.expected);
      }
    });
  });

  describe('Cache Management', () => {
    test('should provide cache statistics', async () => {
      const mockResponse = { values: [{ id: 'field1', name: 'Field 1', schema: { type: 'string' } }] };
      (mockClient.get as jest.Mock).mockResolvedValue(mockResponse);

      await fieldCache.getProjectFields('TEST1');
      await fieldCache.getProjectFields('TEST2');

      const stats = fieldCache.getStats();

      expect(stats.projects).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    test('should invalidate all cache', async () => {
      const mockResponse = { values: [] };
      (mockClient.get as jest.Mock).mockResolvedValue(mockResponse);

      await fieldCache.getProjectFields('TEST');
      
      fieldCache.invalidateAll();
      
      const stats = fieldCache.getStats();
      expect(stats.projects).toBe(0);
      expect(stats.globalFields).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      (mockClient.get as jest.Mock).mockRejectedValue(new Error('API Error'));

      const field = await fieldCache.getField('test-field');

      expect(field).toBeNull();
    });

    test('should return empty config on project fetch error', async () => {
      (mockClient.get as jest.Mock).mockRejectedValue(new Error('API Error'));

      const projectConfig = await fieldCache.getProjectFields('TEST');

      expect(projectConfig.projectKey).toBe('TEST');
      expect(projectConfig.fields.size).toBe(0);
    });
  });
});
