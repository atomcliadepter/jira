import { JiraRestClient } from '../http/JiraRestClient.js';
import { logger } from '../utils/logger.js';

export interface FieldSchema {
  id: string;
  name: string;
  type: string;
  custom: boolean;
  required: boolean;
  allowedValues?: any[];
  schema?: any;
}

export interface ProjectFieldConfig {
  projectKey: string;
  fields: Map<string, FieldSchema>;
  lastUpdated: number;
}

export class FieldSchemaCache {
  private cache: Map<string, ProjectFieldConfig> = new Map();
  private globalFields: Map<string, FieldSchema> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5 minutes
  private client: JiraRestClient;

  constructor(client: JiraRestClient) {
    this.client = client;
  }

  /**
   * Get field schema by name or ID
   */
  async getField(fieldNameOrId: string, projectKey?: string): Promise<FieldSchema | null> {
    // Try project-specific cache first
    if (projectKey) {
      const projectConfig = await this.getProjectFields(projectKey);
      const field = projectConfig.fields.get(fieldNameOrId) || 
                   Array.from(projectConfig.fields.values()).find(f => f.name === fieldNameOrId);
      if (field) return field;
    }

    // Try global cache
    const globalField = this.globalFields.get(fieldNameOrId) ||
                       Array.from(this.globalFields.values()).find(f => f.name === fieldNameOrId);
    if (globalField) return globalField;

    // Fetch from API
    return this.fetchFieldSchema(fieldNameOrId, projectKey);
  }

  /**
   * Get all fields for a project
   */
  async getProjectFields(projectKey: string): Promise<ProjectFieldConfig> {
    const cached = this.cache.get(projectKey);
    const now = Date.now();

    if (cached && (now - cached.lastUpdated) < this.ttl) {
      return cached;
    }

    return this.fetchProjectFields(projectKey);
  }

  /**
   * Resolve field ID from name
   */
  async resolveFieldId(fieldName: string, projectKey?: string): Promise<string | null> {
    const field = await this.getField(fieldName, projectKey);
    return field?.id || null;
  }

  /**
   * Validate field value against schema
   */
  async validateFieldValue(fieldNameOrId: string, value: any, projectKey?: string): Promise<{ valid: boolean; error?: string }> {
    const field = await this.getField(fieldNameOrId, projectKey);
    
    if (!field) {
      return { valid: false, error: `Field '${fieldNameOrId}' not found` };
    }

    // Required field check
    if (field.required && (value === null || value === undefined || value === '')) {
      return { valid: false, error: `Field '${field.name}' is required` };
    }

    // Type-specific validation
    switch (field.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: `Field '${field.name}' must be a string` };
        }
        break;
      
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { valid: false, error: `Field '${field.name}' must be a number` };
        }
        break;
      
      case 'array':
        if (!Array.isArray(value)) {
          return { valid: false, error: `Field '${field.name}' must be an array` };
        }
        break;
      
      case 'option':
        if (field.allowedValues && !field.allowedValues.some(v => v.value === value)) {
          return { valid: false, error: `Field '${field.name}' has invalid value. Allowed: ${field.allowedValues.map(v => v.value).join(', ')}` };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Fetch field schema from API
   */
  private async fetchFieldSchema(fieldNameOrId: string, projectKey?: string): Promise<FieldSchema | null> {
    try {
      // Try to get field by ID first
      if (fieldNameOrId.startsWith('customfield_') || fieldNameOrId.match(/^\d+$/)) {
        const response = await this.client.get(`/rest/api/3/field/${fieldNameOrId}`);
        const field = this.mapFieldResponse(response);
        this.globalFields.set(field.id, field);
        return field;
      }

      // Search by name in project context
      if (projectKey) {
        const projectConfig = await this.fetchProjectFields(projectKey);
        return Array.from(projectConfig.fields.values()).find(f => f.name === fieldNameOrId) || null;
      }

      // Global field search
      const fields = await this.client.get('/rest/api/3/field');
      const matchingField = fields.find((f: any) => f.name === fieldNameOrId);
      
      if (matchingField) {
        const field = this.mapFieldResponse(matchingField);
        this.globalFields.set(field.id, field);
        return field;
      }

      return null;
    } catch (error) {
      logger.error('Failed to fetch field schema', { fieldNameOrId, projectKey, error });
      return null;
    }
  }

  /**
   * Fetch all fields for a project
   */
  private async fetchProjectFields(projectKey: string): Promise<ProjectFieldConfig> {
    try {
      const response = await this.client.get(`/rest/api/3/field/search?projectKeys=${projectKey}`);
      const fields = new Map<string, FieldSchema>();

      for (const fieldData of response.values || []) {
        const field = this.mapFieldResponse(fieldData);
        fields.set(field.id, field);
        fields.set(field.name, field); // Also index by name
      }

      const config: ProjectFieldConfig = {
        projectKey,
        fields,
        lastUpdated: Date.now(),
      };

      this.cache.set(projectKey, config);
      logger.debug('Project fields cached', { projectKey, fieldCount: fields.size });
      
      return config;
    } catch (error) {
      logger.error('Failed to fetch project fields', { projectKey, error });
      
      // Return empty config on error
      const config: ProjectFieldConfig = {
        projectKey,
        fields: new Map(),
        lastUpdated: Date.now(),
      };
      
      return config;
    }
  }

  /**
   * Map API response to FieldSchema
   */
  private mapFieldResponse(fieldData: any): FieldSchema {
    return {
      id: fieldData.id,
      name: fieldData.name,
      type: this.mapFieldType(fieldData.schema?.type, fieldData.schema?.custom),
      custom: fieldData.custom || false,
      required: fieldData.required || false,
      allowedValues: fieldData.allowedValues,
      schema: fieldData.schema,
    };
  }

  /**
   * Map Jira field type to simplified type
   */
  private mapFieldType(schemaType: string, customType?: string): string {
    if (customType) {
      if (customType.includes('select')) return 'option';
      if (customType.includes('multiselect')) return 'array';
      if (customType.includes('number') || customType.includes('float')) return 'number';
      if (customType.includes('date')) return 'date';
      return 'string';
    }

    switch (schemaType) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'array': return 'array';
      case 'option': return 'option';
      case 'date': return 'date';
      case 'datetime': return 'datetime';
      default: return 'string';
    }
  }

  /**
   * Invalidate cache for project
   */
  invalidateProject(projectKey: string): void {
    this.cache.delete(projectKey);
    logger.debug('Project field cache invalidated', { projectKey });
  }

  /**
   * Invalidate all cache
   */
  invalidateAll(): void {
    this.cache.clear();
    this.globalFields.clear();
    logger.debug('All field cache invalidated');
  }

  /**
   * Get cache statistics
   */
  getStats(): { projects: number; globalFields: number; totalSize: number } {
    let totalSize = 0;
    for (const config of this.cache.values()) {
      totalSize += config.fields.size;
    }

    return {
      projects: this.cache.size,
      globalFields: this.globalFields.size,
      totalSize: totalSize + this.globalFields.size,
    };
  }
}
