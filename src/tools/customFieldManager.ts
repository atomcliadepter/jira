
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { logger, generateRequestId } from '../utils/logger.js';
import { createError, McpJiraError } from '../utils/errorCodes.js';
import { z } from 'zod';

// Custom Field Types supported by Jira
export const CUSTOM_FIELD_TYPES = {
  // Basic types
  TEXT_FIELD: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
  TEXTAREA: 'com.atlassian.jira.plugin.system.customfieldtypes:textarea',
  NUMBER_FIELD: 'com.atlassian.jira.plugin.system.customfieldtypes:float',
  DATE_PICKER: 'com.atlassian.jira.plugin.system.customfieldtypes:datepicker',
  DATETIME_PICKER: 'com.atlassian.jira.plugin.system.customfieldtypes:datetime',
  
  // Select types
  SELECT_LIST: 'com.atlassian.jira.plugin.system.customfieldtypes:select',
  MULTI_SELECT: 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect',
  RADIO_BUTTONS: 'com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons',
  CHECKBOXES: 'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes',
  
  // Advanced types
  CASCADING_SELECT: 'com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect',
  USER_PICKER: 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker',
  GROUP_PICKER: 'com.atlassian.jira.plugin.system.customfieldtypes:grouppicker',
  PROJECT_PICKER: 'com.atlassian.jira.plugin.system.customfieldtypes:project',
  VERSION_PICKER: 'com.atlassian.jira.plugin.system.customfieldtypes:version',
  
  // URL and labels
  URL_FIELD: 'com.atlassian.jira.plugin.system.customfieldtypes:url',
  LABELS: 'com.atlassian.jira.plugin.system.customfieldtypes:labels'
} as const;

// Searcher types for custom fields
export const SEARCHER_TYPES = {
  TEXT_SEARCHER: 'com.atlassian.jira.plugin.system.customfieldtypes:textsearcher',
  EXACT_TEXT_SEARCHER: 'com.atlassian.jira.plugin.system.customfieldtypes:exacttextsearcher',
  NUMBER_SEARCHER: 'com.atlassian.jira.plugin.system.customfieldtypes:exactnumber',
  DATE_SEARCHER: 'com.atlassian.jira.plugin.system.customfieldtypes:daterange',
  SELECT_SEARCHER: 'com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher',
  CASCADING_SEARCHER: 'com.atlassian.jira.plugin.system.customfieldtypes:cascadingselectsearcher',
  USER_SEARCHER: 'com.atlassian.jira.plugin.system.customfieldtypes:userpickersearcher',
  GROUP_SEARCHER: 'com.atlassian.jira.plugin.system.customfieldtypes:grouppickersearcher'
} as const;

// Validation schemas
const CustomFieldCreateSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'Field type is required'),
  searcherKey: z.string().min(1, 'Searcher key is required'),
  projectIds: z.array(z.string()).optional(),
  issueTypeIds: z.array(z.string()).optional()
});

const CustomFieldUpdateSchema = z.object({
  fieldId: z.string().min(1, 'Field ID is required'),
  name: z.string().optional(),
  description: z.string().optional()
});

const FieldContextSchema = z.object({
  fieldId: z.string().min(1, 'Field ID is required'),
  name: z.string().min(1, 'Context name is required'),
  description: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
  issueTypeIds: z.array(z.string()).optional()
});

const FieldOptionSchema = z.object({
  fieldId: z.string().min(1, 'Field ID is required'),
  contextId: z.string().min(1, 'Context ID is required'),
  options: z.array(z.object({
    value: z.string().min(1, 'Option value is required'),
    disabled: z.boolean().optional(),
    optionId: z.string().optional()
  }))
});

const CascadingOptionSchema = z.object({
  fieldId: z.string().min(1, 'Field ID is required'),
  contextId: z.string().min(1, 'Context ID is required'),
  parentOptions: z.array(z.object({
    value: z.string().min(1, 'Parent option value is required'),
    children: z.array(z.object({
      value: z.string().min(1, 'Child option value is required'),
      disabled: z.boolean().optional()
    })).optional()
  }))
});

const FieldCalculationSchema = z.object({
  fieldId: z.string().min(1, 'Field ID is required'),
  expression: z.string().min(1, 'Calculation expression is required'),
  dependentFields: z.array(z.string()).optional(),
  updateTrigger: z.enum(['onChange', 'onSave', 'manual']).default('onChange')
});

export class CustomFieldManager {
  constructor(private client: JiraRestClient) {}

  /**
   * Create a new custom field
   */
  async createCustomField(params: z.infer<typeof CustomFieldCreateSchema>): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Creating custom field', { params, requestId });

    try {
      const validatedParams = CustomFieldCreateSchema.parse(params);
      
      const fieldData = {
        name: validatedParams.name,
        description: validatedParams.description || '',
        type: validatedParams.type,
        searcherKey: validatedParams.searcherKey
      };

      const response = await this.client.post('/rest/api/3/field', fieldData);
      
      // If project or issue type restrictions are specified, create context
      if (validatedParams.projectIds || validatedParams.issueTypeIds) {
        await this.createFieldContext({
          fieldId: response.id,
          name: `${validatedParams.name} Context`,
          description: `Auto-created context for ${validatedParams.name}`,
          projectIds: validatedParams.projectIds,
          issueTypeIds: validatedParams.issueTypeIds
        });
      }

      logger.info('Custom field created successfully', { fieldId: response.id, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to create custom field', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Update an existing custom field
   */
  async updateCustomField(params: z.infer<typeof CustomFieldUpdateSchema>): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Updating custom field', { params, requestId });

    try {
      const validatedParams = CustomFieldUpdateSchema.parse(params);
      
      const updateData: any = {};
      if (validatedParams.name) updateData.name = validatedParams.name;
      if (validatedParams.description !== undefined) updateData.description = validatedParams.description;

      const response = await this.client.put(`/rest/api/3/field/${validatedParams.fieldId}`, updateData);
      
      logger.info('Custom field updated successfully', { fieldId: validatedParams.fieldId, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to update custom field', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Delete a custom field
   */
  async deleteCustomField(fieldId: string): Promise<void> {
    const requestId = generateRequestId();
    logger.info('Deleting custom field', { fieldId, requestId });

    try {
      await this.client.delete(`/rest/api/3/field/${fieldId}`);
      logger.info('Custom field deleted successfully', { fieldId, requestId });
    } catch (error: any) {
      logger.error('Failed to delete custom field', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Get custom field details
   */
  async getCustomField(fieldId: string): Promise<any> {
    const requestId = generateRequestId();
    logger.debug('Getting custom field details', { fieldId, requestId });

    try {
      const response = await this.client.get(`/rest/api/3/field/${fieldId}`);
      logger.debug('Custom field retrieved successfully', { fieldId, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to get custom field', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Search custom fields
   */
  async searchCustomFields(query?: string, type?: string, startAt = 0, maxResults = 50): Promise<any> {
    const requestId = generateRequestId();
    logger.debug('Searching custom fields', { query, type, startAt, maxResults, requestId });

    try {
      const params = new URLSearchParams({
        startAt: startAt.toString(),
        maxResults: maxResults.toString()
      });

      if (query) params.append('query', query);
      if (type) params.append('type', type);

      const response = await this.client.get(`/rest/api/3/field/search?${params.toString()}`);
      logger.debug('Custom fields search completed', { count: response.values?.length || 0, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to search custom fields', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Create field context
   */
  async createFieldContext(params: z.infer<typeof FieldContextSchema>): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Creating field context', { params, requestId });

    try {
      const validatedParams = FieldContextSchema.parse(params);
      
      const contextData = {
        name: validatedParams.name,
        description: validatedParams.description || '',
        projectIds: validatedParams.projectIds || [],
        issueTypeIds: validatedParams.issueTypeIds || []
      };

      const response = await this.client.post(`/rest/api/3/field/${validatedParams.fieldId}/context`, contextData);
      
      logger.info('Field context created successfully', { contextId: response.id, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to create field context', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Get field contexts
   */
  async getFieldContexts(fieldId: string, startAt = 0, maxResults = 50): Promise<any> {
    const requestId = generateRequestId();
    logger.debug('Getting field contexts', { fieldId, startAt, maxResults, requestId });

    try {
      const params = new URLSearchParams({
        startAt: startAt.toString(),
        maxResults: maxResults.toString()
      });

      const response = await this.client.get(`/rest/api/3/field/${fieldId}/context?${params.toString()}`);
      logger.debug('Field contexts retrieved successfully', { fieldId, count: response.values?.length || 0, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to get field contexts', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Update field context
   */
  async updateFieldContext(fieldId: string, contextId: string, updates: Partial<z.infer<typeof FieldContextSchema>>): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Updating field context', { fieldId, contextId, updates, requestId });

    try {
      const response = await this.client.put(`/rest/api/3/field/${fieldId}/context/${contextId}`, updates);
      logger.info('Field context updated successfully', { fieldId, contextId, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to update field context', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Delete field context
   */
  async deleteFieldContext(fieldId: string, contextId: string): Promise<void> {
    const requestId = generateRequestId();
    logger.info('Deleting field context', { fieldId, contextId, requestId });

    try {
      await this.client.delete(`/rest/api/3/field/${fieldId}/context/${contextId}`);
      logger.info('Field context deleted successfully', { fieldId, contextId, requestId });
    } catch (error: any) {
      logger.error('Failed to delete field context', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Set field options for select/multi-select fields
   */
  async setFieldOptions(params: z.infer<typeof FieldOptionSchema>): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Setting field options', { params, requestId });

    try {
      const validatedParams = FieldOptionSchema.parse(params);
      
      const optionsData = {
        options: validatedParams.options.map(option => ({
          value: option.value,
          disabled: option.disabled || false,
          ...(option.optionId && { id: option.optionId })
        }))
      };

      const response = await this.client.put(
        `/rest/api/3/field/${validatedParams.fieldId}/context/${validatedParams.contextId}/option`,
        optionsData
      );
      
      logger.info('Field options set successfully', { fieldId: validatedParams.fieldId, contextId: validatedParams.contextId, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to set field options', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Get field options
   */
  async getFieldOptions(fieldId: string, contextId: string, startAt = 0, maxResults = 50): Promise<any> {
    const requestId = generateRequestId();
    logger.debug('Getting field options', { fieldId, contextId, startAt, maxResults, requestId });

    try {
      const params = new URLSearchParams({
        startAt: startAt.toString(),
        maxResults: maxResults.toString()
      });

      const response = await this.client.get(
        `/rest/api/3/field/${fieldId}/context/${contextId}/option?${params.toString()}`
      );
      
      logger.debug('Field options retrieved successfully', { fieldId, contextId, count: response.values?.length || 0, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to get field options', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Set cascading field options
   */
  async setCascadingOptions(params: z.infer<typeof CascadingOptionSchema>): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Setting cascading field options', { params, requestId });

    try {
      const validatedParams = CascadingOptionSchema.parse(params);
      
      // For cascading fields, we need to create parent options first, then children
      const results = [];
      
      for (const parentOption of validatedParams.parentOptions) {
        // Create parent option
        const parentData = {
          options: [{
            value: parentOption.value,
            disabled: false
          }]
        };
        
        const parentResponse = await this.client.put(
          `/rest/api/3/field/${validatedParams.fieldId}/context/${validatedParams.contextId}/option`,
          parentData
        );
        
        results.push(parentResponse);
        
        // Create child options if provided
        if (parentOption.children && parentOption.children.length > 0) {
          const childData = {
            options: parentOption.children.map(child => ({
              value: child.value,
              disabled: child.disabled || false
            }))
          };
          
          // Note: This is a simplified approach. Real cascading options require more complex API calls
          // that may involve the parent option ID
          const childResponse = await this.client.put(
            `/rest/api/3/field/${validatedParams.fieldId}/context/${validatedParams.contextId}/option`,
            childData
          );
          
          results.push(childResponse);
        }
      }
      
      logger.info('Cascading field options set successfully', { fieldId: validatedParams.fieldId, contextId: validatedParams.contextId, requestId });
      return results;
    } catch (error: any) {
      logger.error('Failed to set cascading field options', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Validate field value against field configuration
   */
  async validateFieldValue(fieldId: string, value: any, issueTypeId?: string, projectId?: string): Promise<{ valid: boolean; errors: string[] }> {
    const requestId = generateRequestId();
    logger.debug('Validating field value', { fieldId, value, issueTypeId, projectId, requestId });

    try {
      // Get field metadata to understand validation rules
      const field = await this.getCustomField(fieldId);
      const contexts = await this.getFieldContexts(fieldId);
      
      const errors: string[] = [];
      
      // Basic validation based on field type
      if (!value && field.required) {
        errors.push('Field is required but no value provided');
      }
      
      // Type-specific validation
      if (value !== null && value !== undefined) {
        switch (field.schema?.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push('Value must be a valid number');
            }
            break;
          case 'date':
          case 'datetime':
            if (isNaN(Date.parse(value))) {
              errors.push('Value must be a valid date');
            }
            break;
          case 'option':
            // Validate against available options
            for (const context of contexts.values || []) {
              if (this.contextApplies(context, projectId, issueTypeId)) {
                const options = await this.getFieldOptions(fieldId, context.id);
                const validValues = options.values?.map((opt: any) => opt.value) || [];
                if (!validValues.includes(value)) {
                  errors.push(`Value '${value}' is not a valid option`);
                }
                break;
              }
            }
            break;
        }
      }
      
      const isValid = errors.length === 0;
      logger.debug('Field value validation completed', { fieldId, valid: isValid, errors, requestId });
      
      return { valid: isValid, errors };
    } catch (error: any) {
      logger.error('Failed to validate field value', error, requestId);
      return { valid: false, errors: ['Validation failed due to system error'] };
    }
  }

  /**
   * Calculate field value based on expression
   */
  async calculateFieldValue(params: z.infer<typeof FieldCalculationSchema>, issueData: any): Promise<any> {
    const requestId = generateRequestId();
    logger.debug('Calculating field value', { params, requestId });

    try {
      const validatedParams = FieldCalculationSchema.parse(params);
      
      // Simple expression evaluation (in a real implementation, you'd want a more robust parser)
      let result = validatedParams.expression;
      
      // Replace field references with actual values
      if (validatedParams.dependentFields) {
        for (const depFieldId of validatedParams.dependentFields) {
          const fieldValue = issueData.fields?.[depFieldId] || 0;
          const numericValue = typeof fieldValue === 'number' ? fieldValue : parseFloat(fieldValue) || 0;
          result = result.replace(new RegExp(`\\{${depFieldId}\\}`, 'g'), numericValue.toString());
        }
      }
      
      // Basic arithmetic evaluation (simplified - in production use a proper expression parser)
      try {
        // Only allow basic arithmetic operations for security
        if (/^[\d\s+\-*/().]+$/.test(result)) {
          const calculatedValue = Function(`"use strict"; return (${result})`)();
          
          logger.debug('Field value calculated successfully', { fieldId: validatedParams.fieldId, result: calculatedValue, requestId });
          return calculatedValue;
        } else {
          throw new Error('Invalid expression - only basic arithmetic allowed');
        }
      } catch (evalError) {
        logger.warn('Expression evaluation failed', { expression: result, error: evalError, requestId });
        return null;
      }
    } catch (error: any) {
      logger.error('Failed to calculate field value', error, requestId);
      throw error instanceof McpJiraError ? error : createError('TOOL_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Get field configuration schemes
   */
  async getFieldConfigurationSchemes(startAt = 0, maxResults = 50): Promise<any> {
    const requestId = generateRequestId();
    logger.debug('Getting field configuration schemes', { startAt, maxResults, requestId });

    try {
      const params = new URLSearchParams({
        startAt: startAt.toString(),
        maxResults: maxResults.toString()
      });

      const response = await this.client.get(`/rest/api/3/fieldconfigurationscheme?${params.toString()}`);
      logger.debug('Field configuration schemes retrieved successfully', { count: response.values?.length || 0, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to get field configuration schemes', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Create field configuration scheme
   */
  async createFieldConfigurationScheme(name: string, description?: string): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Creating field configuration scheme', { name, description, requestId });

    try {
      const schemeData = {
        name,
        description: description || ''
      };

      const response = await this.client.post('/rest/api/3/fieldconfigurationscheme', schemeData);
      logger.info('Field configuration scheme created successfully', { schemeId: response.id, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to create field configuration scheme', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Helper method to check if context applies to project/issue type
   */
  private contextApplies(context: any, projectId?: string, issueTypeId?: string): boolean {
    const projectMatches = !projectId || !context.projectIds || context.projectIds.length === 0 || context.projectIds.includes(projectId);
    const issueTypeMatches = !issueTypeId || !context.issueTypeIds || context.issueTypeIds.length === 0 || context.issueTypeIds.includes(issueTypeId);
    return projectMatches && issueTypeMatches;
  }
}

// Tool definitions
export const createCustomFieldTool: Tool = {
  name: 'customfield.create',
  description: 'Create a new custom field with specified type and configuration',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the custom field'
      },
      description: {
        type: 'string',
        description: 'Description of the custom field'
      },
      type: {
        type: 'string',
        description: 'Custom field type (e.g., textfield, select, number)',
        enum: Object.values(CUSTOM_FIELD_TYPES)
      },
      searcherKey: {
        type: 'string',
        description: 'Searcher type for the field',
        enum: Object.values(SEARCHER_TYPES)
      },
      projectIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Project IDs to restrict field to (optional)'
      },
      issueTypeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Issue type IDs to restrict field to (optional)'
      }
    },
    required: ['name', 'type', 'searcherKey']
  }
};

export const updateCustomFieldTool: Tool = {
  name: 'customfield.update',
  description: 'Update an existing custom field',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: {
        type: 'string',
        description: 'ID of the custom field to update'
      },
      name: {
        type: 'string',
        description: 'New name for the custom field'
      },
      description: {
        type: 'string',
        description: 'New description for the custom field'
      }
    },
    required: ['fieldId']
  }
};

export const deleteCustomFieldTool: Tool = {
  name: 'customfield.delete',
  description: 'Delete a custom field',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: {
        type: 'string',
        description: 'ID of the custom field to delete'
      }
    },
    required: ['fieldId']
  }
};

export const getCustomFieldTool: Tool = {
  name: 'customfield.get',
  description: 'Get details of a custom field',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: {
        type: 'string',
        description: 'ID of the custom field to retrieve'
      }
    },
    required: ['fieldId']
  }
};

export const searchCustomFieldsTool: Tool = {
  name: 'customfield.search',
  description: 'Search for custom fields',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for field names'
      },
      type: {
        type: 'string',
        description: 'Filter by field type'
      },
      startAt: {
        type: 'integer',
        description: 'Starting index for pagination',
        default: 0
      },
      maxResults: {
        type: 'integer',
        description: 'Maximum results to return',
        default: 50
      }
    }
  }
};

export const createFieldContextTool: Tool = {
  name: 'customfield.context.create',
  description: 'Create a new context for a custom field',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: {
        type: 'string',
        description: 'ID of the custom field'
      },
      name: {
        type: 'string',
        description: 'Name of the context'
      },
      description: {
        type: 'string',
        description: 'Description of the context'
      },
      projectIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Project IDs for this context'
      },
      issueTypeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Issue type IDs for this context'
      }
    },
    required: ['fieldId', 'name']
  }
};

export const setFieldOptionsTool: Tool = {
  name: 'customfield.options.set',
  description: 'Set options for a select/multi-select custom field',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: {
        type: 'string',
        description: 'ID of the custom field'
      },
      contextId: {
        type: 'string',
        description: 'ID of the field context'
      },
      options: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            value: { type: 'string' },
            disabled: { type: 'boolean' },
            optionId: { type: 'string' }
          },
          required: ['value']
        },
        description: 'Array of options to set'
      }
    },
    required: ['fieldId', 'contextId', 'options']
  }
};

export const setCascadingOptionsTool: Tool = {
  name: 'customfield.cascading.set',
  description: 'Set cascading options for a cascading select field',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: {
        type: 'string',
        description: 'ID of the cascading custom field'
      },
      contextId: {
        type: 'string',
        description: 'ID of the field context'
      },
      parentOptions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            value: { type: 'string' },
            children: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                  disabled: { type: 'boolean' }
                },
                required: ['value']
              }
            }
          },
          required: ['value']
        },
        description: 'Array of parent options with their children'
      }
    },
    required: ['fieldId', 'contextId', 'parentOptions']
  }
};

export const validateFieldValueTool: Tool = {
  name: 'customfield.validate',
  description: 'Validate a field value against field configuration',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: {
        type: 'string',
        description: 'ID of the custom field'
      },
      value: {
        description: 'Value to validate'
      },
      issueTypeId: {
        type: 'string',
        description: 'Issue type ID for context validation'
      },
      projectId: {
        type: 'string',
        description: 'Project ID for context validation'
      }
    },
    required: ['fieldId', 'value']
  }
};

export const calculateFieldValueTool: Tool = {
  name: 'customfield.calculate',
  description: 'Calculate field value based on expression and dependent fields',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: {
        type: 'string',
        description: 'ID of the custom field'
      },
      expression: {
        type: 'string',
        description: 'Calculation expression (e.g., "{field1} * {field2} + 10")'
      },
      dependentFields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Field IDs referenced in the expression'
      },
      issueData: {
        type: 'object',
        description: 'Issue data containing field values'
      },
      updateTrigger: {
        type: 'string',
        enum: ['onChange', 'onSave', 'manual'],
        description: 'When to trigger calculation',
        default: 'onChange'
      }
    },
    required: ['fieldId', 'expression', 'issueData']
  }
};

// Tool executors
export async function executeCreateCustomField(client: JiraRestClient, args: any) {
  const manager = new CustomFieldManager(client);
  try {
    const result = await manager.createCustomField(args);
    return {
      content: [
        {
          type: 'text',
          text: `Custom field created successfully:\n\nField ID: ${result.id}\nName: ${result.name}\nType: ${result.schema?.type || 'Unknown'}\nSearcher: ${result.searcherKey || 'Unknown'}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to create custom field: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeUpdateCustomField(client: JiraRestClient, args: any) {
  const manager = new CustomFieldManager(client);
  try {
    const result = await manager.updateCustomField(args);
    return {
      content: [
        {
          type: 'text',
          text: `Custom field updated successfully:\n\nField ID: ${args.fieldId}\nUpdated properties: ${Object.keys(args).filter(k => k !== 'fieldId').join(', ')}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to update custom field: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeDeleteCustomField(client: JiraRestClient, args: any) {
  const manager = new CustomFieldManager(client);
  try {
    await manager.deleteCustomField(args.fieldId);
    return {
      content: [
        {
          type: 'text',
          text: `Custom field ${args.fieldId} deleted successfully`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to delete custom field: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeGetCustomField(client: JiraRestClient, args: any) {
  const manager = new CustomFieldManager(client);
  try {
    const result = await manager.getCustomField(args.fieldId);
    return {
      content: [
        {
          type: 'text',
          text: `Custom Field Details:\n\n${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to get custom field: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeSearchCustomFields(client: JiraRestClient, args: any) {
  const manager = new CustomFieldManager(client);
  try {
    const result = await manager.searchCustomFields(args.query, args.type, args.startAt, args.maxResults);
    const fields = result.values || [];
    const summary = fields.map((field: any) => 
      `- ${field.name} (${field.id}) - Type: ${field.schema?.type || 'Unknown'}`
    ).join('\n');
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${fields.length} custom fields:\n\n${summary}\n\nTotal: ${result.total || 0}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to search custom fields: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeCreateFieldContext(client: JiraRestClient, args: any) {
  const manager = new CustomFieldManager(client);
  try {
    const result = await manager.createFieldContext(args);
    return {
      content: [
        {
          type: 'text',
          text: `Field context created successfully:\n\nContext ID: ${result.id}\nName: ${result.name}\nField ID: ${args.fieldId}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to create field context: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeSetFieldOptions(client: JiraRestClient, args: any) {
  const manager = new CustomFieldManager(client);
  try {
    const result = await manager.setFieldOptions(args);
    return {
      content: [
        {
          type: 'text',
          text: `Field options set successfully for field ${args.fieldId} in context ${args.contextId}:\n\n${args.options.map((opt: any) => `- ${opt.value}`).join('\n')}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to set field options: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeSetCascadingOptions(client: JiraRestClient, args: any) {
  const manager = new CustomFieldManager(client);
  try {
    const result = await manager.setCascadingOptions(args);
    return {
      content: [
        {
          type: 'text',
          text: `Cascading options set successfully for field ${args.fieldId} in context ${args.contextId}:\n\n${args.parentOptions.map((parent: any) => 
          `- ${parent.value}${parent.children ? '\n  ' + parent.children.map((child: any) => `- ${child.value}`).join('\n  ') : ''}`
        ).join('\n')}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to set cascading options: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeValidateFieldValue(client: JiraRestClient, args: any) {
  const manager = new CustomFieldManager(client);
  try {
    const result = await manager.validateFieldValue(args.fieldId, args.value, args.issueTypeId, args.projectId);
    return {
      content: [
        {
          type: 'text',
          text: `Field validation result:\n\nValid: ${result.valid}\n${result.errors.length > 0 ? 'Errors:\n- ' + result.errors.join('\n- ') : 'No validation errors'}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to validate field value: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeCalculateFieldValue(client: JiraRestClient, args: any) {
  const manager = new CustomFieldManager(client);
  try {
    const result = await manager.calculateFieldValue(args, args.issueData);
    return {
      content: [
        {
          type: 'text',
          text: `Field calculation result:\n\nExpression: ${args.expression}\nCalculated Value: ${result}\nField ID: ${args.fieldId}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to calculate field value: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
