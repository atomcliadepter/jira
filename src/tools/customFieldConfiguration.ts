
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { logger, generateRequestId } from '../utils/logger.js';
import { createError, McpJiraError } from '../utils/errorCodes.js';
import { z } from 'zod';

// Field Configuration Schemas
const FieldConfigurationSchema = z.object({
  name: z.string().min(1, 'Configuration name is required'),
  description: z.string().optional(),
  fields: z.array(z.object({
    fieldId: z.string().min(1, 'Field ID is required'),
    isHidden: z.boolean().optional(),
    isRequired: z.boolean().optional(),
    renderer: z.string().optional(),
    description: z.string().optional()
  })).optional()
});

const FieldConfigurationSchemeSchema = z.object({
  name: z.string().min(1, 'Scheme name is required'),
  description: z.string().optional(),
  mappings: z.array(z.object({
    issueTypeId: z.string().min(1, 'Issue type ID is required'),
    fieldConfigurationId: z.string().min(1, 'Field configuration ID is required')
  })).optional()
});

const FieldConfigurationItemSchema = z.object({
  fieldId: z.string().min(1, 'Field ID is required'),
  isHidden: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  renderer: z.string().optional(),
  description: z.string().optional()
});

export class CustomFieldConfiguration {
  constructor(private client: JiraRestClient) {}

  /**
   * Get all field configurations
   */
  async getFieldConfigurations(startAt = 0, maxResults = 50): Promise<any> {
    const requestId = generateRequestId();
    logger.debug('Getting field configurations', { startAt, maxResults, requestId });

    try {
      const params = new URLSearchParams({
        startAt: startAt.toString(),
        maxResults: maxResults.toString()
      });

      const response = await this.client.get(`/rest/api/3/fieldconfiguration?${params.toString()}`);
      logger.debug('Field configurations retrieved successfully', { count: response.values?.length || 0, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to get field configurations', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Create a new field configuration
   */
  async createFieldConfiguration(params: z.infer<typeof FieldConfigurationSchema>): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Creating field configuration', { params, requestId });

    try {
      const validatedParams = FieldConfigurationSchema.parse(params);
      
      const configData = {
        name: validatedParams.name,
        description: validatedParams.description || ''
      };

      const response = await this.client.post('/rest/api/3/fieldconfiguration', configData);
      
      // If fields are specified, update the configuration with field settings
      if (validatedParams.fields && validatedParams.fields.length > 0) {
        await this.updateFieldConfigurationItems(response.id, validatedParams.fields);
      }
      
      logger.info('Field configuration created successfully', { configId: response.id, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to create field configuration', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Update a field configuration
   */
  async updateFieldConfiguration(configId: string, name?: string, description?: string): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Updating field configuration', { configId, name, description, requestId });

    try {
      const updateData: any = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      const response = await this.client.put(`/rest/api/3/fieldconfiguration/${configId}`, updateData);
      logger.info('Field configuration updated successfully', { configId, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to update field configuration', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Delete a field configuration
   */
  async deleteFieldConfiguration(configId: string): Promise<void> {
    const requestId = generateRequestId();
    logger.info('Deleting field configuration', { configId, requestId });

    try {
      await this.client.delete(`/rest/api/3/fieldconfiguration/${configId}`);
      logger.info('Field configuration deleted successfully', { configId, requestId });
    } catch (error: any) {
      logger.error('Failed to delete field configuration', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Get field configuration items (field settings within a configuration)
   */
  async getFieldConfigurationItems(configId: string, startAt = 0, maxResults = 50): Promise<any> {
    const requestId = generateRequestId();
    logger.debug('Getting field configuration items', { configId, startAt, maxResults, requestId });

    try {
      const params = new URLSearchParams({
        startAt: startAt.toString(),
        maxResults: maxResults.toString()
      });

      const response = await this.client.get(`/rest/api/3/fieldconfiguration/${configId}/fields?${params.toString()}`);
      logger.debug('Field configuration items retrieved successfully', { configId, count: response.values?.length || 0, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to get field configuration items', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Update field configuration items
   */
  async updateFieldConfigurationItems(configId: string, items: z.infer<typeof FieldConfigurationItemSchema>[]): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Updating field configuration items', { configId, itemCount: items.length, requestId });

    try {
      const validatedItems = items.map(item => FieldConfigurationItemSchema.parse(item));
      
      const updateData = {
        fieldConfigurationItems: validatedItems.map(item => ({
          id: item.fieldId,
          isHidden: item.isHidden || false,
          isRequired: item.isRequired || false,
          renderer: item.renderer,
          description: item.description
        }))
      };

      const response = await this.client.put(`/rest/api/3/fieldconfiguration/${configId}/fields`, updateData);
      logger.info('Field configuration items updated successfully', { configId, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to update field configuration items', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
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
   * Create a field configuration scheme
   */
  async createFieldConfigurationScheme(params: z.infer<typeof FieldConfigurationSchemeSchema>): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Creating field configuration scheme', { params, requestId });

    try {
      const validatedParams = FieldConfigurationSchemeSchema.parse(params);
      
      const schemeData = {
        name: validatedParams.name,
        description: validatedParams.description || ''
      };

      const response = await this.client.post('/rest/api/3/fieldconfigurationscheme', schemeData);
      
      // If mappings are specified, add them to the scheme
      if (validatedParams.mappings && validatedParams.mappings.length > 0) {
        await this.setFieldConfigurationSchemeMapping(response.id, validatedParams.mappings);
      }
      
      logger.info('Field configuration scheme created successfully', { schemeId: response.id, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to create field configuration scheme', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Update a field configuration scheme
   */
  async updateFieldConfigurationScheme(schemeId: string, name?: string, description?: string): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Updating field configuration scheme', { schemeId, name, description, requestId });

    try {
      const updateData: any = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      const response = await this.client.put(`/rest/api/3/fieldconfigurationscheme/${schemeId}`, updateData);
      logger.info('Field configuration scheme updated successfully', { schemeId, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to update field configuration scheme', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Delete a field configuration scheme
   */
  async deleteFieldConfigurationScheme(schemeId: string): Promise<void> {
    const requestId = generateRequestId();
    logger.info('Deleting field configuration scheme', { schemeId, requestId });

    try {
      await this.client.delete(`/rest/api/3/fieldconfigurationscheme/${schemeId}`);
      logger.info('Field configuration scheme deleted successfully', { schemeId, requestId });
    } catch (error: any) {
      logger.error('Failed to delete field configuration scheme', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Get field configuration scheme mappings
   */
  async getFieldConfigurationSchemeMapping(schemeId?: string, startAt = 0, maxResults = 50): Promise<any> {
    const requestId = generateRequestId();
    logger.debug('Getting field configuration scheme mappings', { schemeId, startAt, maxResults, requestId });

    try {
      const params = new URLSearchParams({
        startAt: startAt.toString(),
        maxResults: maxResults.toString()
      });

      if (schemeId) {
        params.append('fieldConfigurationSchemeId', schemeId);
      }

      const response = await this.client.get(`/rest/api/3/fieldconfigurationscheme/mapping?${params.toString()}`);
      logger.debug('Field configuration scheme mappings retrieved successfully', { count: response.values?.length || 0, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to get field configuration scheme mappings', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Set field configuration scheme mapping
   */
  async setFieldConfigurationSchemeMapping(schemeId: string, mappings: Array<{ issueTypeId: string; fieldConfigurationId: string }>): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Setting field configuration scheme mapping', { schemeId, mappingCount: mappings.length, requestId });

    try {
      const mappingData = {
        mappings: mappings.map(mapping => ({
          issueTypeId: mapping.issueTypeId,
          fieldConfigurationId: mapping.fieldConfigurationId
        }))
      };

      const response = await this.client.put(`/rest/api/3/fieldconfigurationscheme/${schemeId}/mapping`, mappingData);
      logger.info('Field configuration scheme mapping set successfully', { schemeId, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to set field configuration scheme mapping', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Assign field configuration scheme to project
   */
  async assignSchemeToProject(projectId: string, schemeId: string): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Assigning field configuration scheme to project', { projectId, schemeId, requestId });

    try {
      const assignmentData = {
        fieldConfigurationSchemeId: schemeId,
        projectId: projectId
      };

      const response = await this.client.put('/rest/api/3/fieldconfigurationscheme/project', assignmentData);
      logger.info('Field configuration scheme assigned to project successfully', { projectId, schemeId, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to assign field configuration scheme to project', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Get project field configuration scheme
   */
  async getProjectFieldConfigurationScheme(projectId: string): Promise<any> {
    const requestId = generateRequestId();
    logger.debug('Getting project field configuration scheme', { projectId, requestId });

    try {
      const response = await this.client.get(`/rest/api/3/fieldconfigurationscheme/project?projectId=${projectId}`);
      logger.debug('Project field configuration scheme retrieved successfully', { projectId, requestId });
      return response;
    } catch (error: any) {
      logger.error('Failed to get project field configuration scheme', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }

  /**
   * Validate field configuration
   */
  async validateFieldConfiguration(configId: string): Promise<{ valid: boolean; issues: string[] }> {
    const requestId = generateRequestId();
    logger.debug('Validating field configuration', { configId, requestId });

    try {
      const issues: string[] = [];
      
      // Get configuration details
      const config = await this.client.get(`/rest/api/3/fieldconfiguration/${configId}`);
      const items = await this.getFieldConfigurationItems(configId);
      
      // Basic validation checks
      if (!config.name || config.name.trim().length === 0) {
        issues.push('Configuration name is empty');
      }
      
      // Check for duplicate field configurations
      const fieldIds = new Set();
      for (const item of items.values || []) {
        if (fieldIds.has(item.id)) {
          issues.push(`Duplicate field configuration for field: ${item.id}`);
        }
        fieldIds.add(item.id);
      }
      
      // Check for required fields that are hidden
      const hiddenRequiredFields = (items.values || []).filter((item: any) => item.isHidden && item.isRequired);
      if (hiddenRequiredFields.length > 0) {
        issues.push(`Fields cannot be both hidden and required: ${hiddenRequiredFields.map((f: any) => f.id).join(', ')}`);
      }
      
      const isValid = issues.length === 0;
      logger.debug('Field configuration validation completed', { configId, valid: isValid, issues, requestId });
      
      return { valid: isValid, issues };
    } catch (error: any) {
      logger.error('Failed to validate field configuration', error, requestId);
      return { valid: false, issues: ['Validation failed due to system error'] };
    }
  }

  /**
   * Copy field configuration
   */
  async copyFieldConfiguration(sourceConfigId: string, newName: string, newDescription?: string): Promise<any> {
    const requestId = generateRequestId();
    logger.info('Copying field configuration', { sourceConfigId, newName, requestId });

    try {
      // Get source configuration
      const sourceConfig = await this.client.get(`/rest/api/3/fieldconfiguration/${sourceConfigId}`);
      const sourceItems = await this.getFieldConfigurationItems(sourceConfigId);
      
      // Create new configuration
      const newConfig = await this.createFieldConfiguration({
        name: newName,
        description: newDescription || `Copy of ${sourceConfig.name}`,
        fields: (sourceItems.values || []).map((item: any) => ({
          fieldId: item.id,
          isHidden: item.isHidden,
          isRequired: item.isRequired,
          renderer: item.renderer,
          description: item.description
        }))
      });
      
      logger.info('Field configuration copied successfully', { sourceConfigId, newConfigId: newConfig.id, requestId });
      return newConfig;
    } catch (error: any) {
      logger.error('Failed to copy field configuration', error, requestId);
      throw error instanceof McpJiraError ? error : createError('JIRA_EXECUTION_ERROR', { error: error.message }, requestId);
    }
  }
}

// Tool definitions
export const getFieldConfigurationsTool: Tool = {
  name: 'fieldconfig.list',
  description: 'Get all field configurations',
  inputSchema: {
    type: 'object',
    properties: {
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

export const createFieldConfigurationTool: Tool = {
  name: 'fieldconfig.create',
  description: 'Create a new field configuration',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the field configuration'
      },
      description: {
        type: 'string',
        description: 'Description of the field configuration'
      },
      fields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fieldId: { type: 'string' },
            isHidden: { type: 'boolean' },
            isRequired: { type: 'boolean' },
            renderer: { type: 'string' },
            description: { type: 'string' }
          },
          required: ['fieldId']
        },
        description: 'Field settings for this configuration'
      }
    },
    required: ['name']
  }
};

export const updateFieldConfigurationTool: Tool = {
  name: 'fieldconfig.update',
  description: 'Update a field configuration',
  inputSchema: {
    type: 'object',
    properties: {
      configId: {
        type: 'string',
        description: 'ID of the field configuration to update'
      },
      name: {
        type: 'string',
        description: 'New name for the configuration'
      },
      description: {
        type: 'string',
        description: 'New description for the configuration'
      }
    },
    required: ['configId']
  }
};

export const deleteFieldConfigurationTool: Tool = {
  name: 'fieldconfig.delete',
  description: 'Delete a field configuration',
  inputSchema: {
    type: 'object',
    properties: {
      configId: {
        type: 'string',
        description: 'ID of the field configuration to delete'
      }
    },
    required: ['configId']
  }
};

export const updateFieldConfigurationItemsTool: Tool = {
  name: 'fieldconfig.items.update',
  description: 'Update field configuration items (field settings)',
  inputSchema: {
    type: 'object',
    properties: {
      configId: {
        type: 'string',
        description: 'ID of the field configuration'
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fieldId: { type: 'string' },
            isHidden: { type: 'boolean' },
            isRequired: { type: 'boolean' },
            renderer: { type: 'string' },
            description: { type: 'string' }
          },
          required: ['fieldId']
        },
        description: 'Field settings to update'
      }
    },
    required: ['configId', 'items']
  }
};

export const createFieldConfigurationSchemeTool: Tool = {
  name: 'fieldconfig.scheme.create',
  description: 'Create a field configuration scheme',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the field configuration scheme'
      },
      description: {
        type: 'string',
        description: 'Description of the scheme'
      },
      mappings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            issueTypeId: { type: 'string' },
            fieldConfigurationId: { type: 'string' }
          },
          required: ['issueTypeId', 'fieldConfigurationId']
        },
        description: 'Issue type to field configuration mappings'
      }
    },
    required: ['name']
  }
};

export const assignSchemeToProjectTool: Tool = {
  name: 'fieldconfig.scheme.assign',
  description: 'Assign a field configuration scheme to a project',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'ID of the project'
      },
      schemeId: {
        type: 'string',
        description: 'ID of the field configuration scheme'
      }
    },
    required: ['projectId', 'schemeId']
  }
};

export const validateFieldConfigurationTool: Tool = {
  name: 'fieldconfig.validate',
  description: 'Validate a field configuration for issues',
  inputSchema: {
    type: 'object',
    properties: {
      configId: {
        type: 'string',
        description: 'ID of the field configuration to validate'
      }
    },
    required: ['configId']
  }
};

export const copyFieldConfigurationTool: Tool = {
  name: 'fieldconfig.copy',
  description: 'Copy an existing field configuration',
  inputSchema: {
    type: 'object',
    properties: {
      sourceConfigId: {
        type: 'string',
        description: 'ID of the source field configuration'
      },
      newName: {
        type: 'string',
        description: 'Name for the new configuration'
      },
      newDescription: {
        type: 'string',
        description: 'Description for the new configuration'
      }
    },
    required: ['sourceConfigId', 'newName']
  }
};

// Tool executors
export async function executeGetFieldConfigurations(client: JiraRestClient, args: any) {
  const manager = new CustomFieldConfiguration(client);
  try {
    const result = await manager.getFieldConfigurations(args.startAt, args.maxResults);
    const configs = result.values || [];
    const summary = configs.map((config: any) => 
      `- ${config.name} (${config.id}) - ${config.description || 'No description'}`
    ).join('\n');
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${configs.length} field configurations:\n\n${summary}\n\nTotal: ${result.total || 0}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to get field configurations: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeCreateFieldConfiguration(client: JiraRestClient, args: any) {
  const manager = new CustomFieldConfiguration(client);
  try {
    const result = await manager.createFieldConfiguration(args);
    return {
      content: [
        {
          type: 'text',
          text: `Field configuration created successfully:\n\nConfiguration ID: ${result.id}\nName: ${result.name}\nDescription: ${result.description || 'None'}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to create field configuration: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeUpdateFieldConfiguration(client: JiraRestClient, args: any) {
  const manager = new CustomFieldConfiguration(client);
  try {
    await manager.updateFieldConfiguration(args.configId, args.name, args.description);
    return {
      content: [
        {
          type: 'text',
          text: `Field configuration ${args.configId} updated successfully`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to update field configuration: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeDeleteFieldConfiguration(client: JiraRestClient, args: any) {
  const manager = new CustomFieldConfiguration(client);
  try {
    await manager.deleteFieldConfiguration(args.configId);
    return {
      content: [
        {
          type: 'text',
          text: `Field configuration ${args.configId} deleted successfully`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to delete field configuration: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeUpdateFieldConfigurationItems(client: JiraRestClient, args: any) {
  const manager = new CustomFieldConfiguration(client);
  try {
    await manager.updateFieldConfigurationItems(args.configId, args.items);
    return {
      content: [
        {
          type: 'text',
          text: `Field configuration items updated successfully for configuration ${args.configId}:\n\n${args.items.map((item: any) => `- ${item.fieldId}: Hidden=${item.isHidden || false}, Required=${item.isRequired || false}`).join('\n')}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to update field configuration items: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeCreateFieldConfigurationScheme(client: JiraRestClient, args: any) {
  const manager = new CustomFieldConfiguration(client);
  try {
    const result = await manager.createFieldConfigurationScheme(args);
    return {
      content: [
        {
          type: 'text',
          text: `Field configuration scheme created successfully:\n\nScheme ID: ${result.id}\nName: ${result.name}\nDescription: ${result.description || 'None'}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to create field configuration scheme: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeAssignSchemeToProject(client: JiraRestClient, args: any) {
  const manager = new CustomFieldConfiguration(client);
  try {
    await manager.assignSchemeToProject(args.projectId, args.schemeId);
    return {
      content: [
        {
          type: 'text',
          text: `Field configuration scheme ${args.schemeId} assigned to project ${args.projectId} successfully`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to assign scheme to project: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeValidateFieldConfiguration(client: JiraRestClient, args: any) {
  const manager = new CustomFieldConfiguration(client);
  try {
    const result = await manager.validateFieldConfiguration(args.configId);
    return {
      content: [
        {
          type: 'text',
          text: `Field configuration validation result:\n\nValid: ${result.valid}\n${result.issues.length > 0 ? 'Issues:\n- ' + result.issues.join('\n- ') : 'No validation issues found'}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to validate field configuration: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeCopyFieldConfiguration(client: JiraRestClient, args: any) {
  const manager = new CustomFieldConfiguration(client);
  try {
    const result = await manager.copyFieldConfiguration(args.sourceConfigId, args.newName, args.newDescription);
    return {
      content: [
        {
          type: 'text',
          text: `Field configuration copied successfully:\n\nNew Configuration ID: ${result.id}\nName: ${result.name}\nSource: ${args.sourceConfigId}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to copy field configuration: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
