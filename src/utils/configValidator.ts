
/**
 * Configuration validation utility for Q CLI compatibility
 */

import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';
import { createError } from './errorCodes.js';

export interface JiraConfig {
  JIRA_BASE_URL: string;
  JIRA_EMAIL?: string;
  JIRA_API_TOKEN?: string;
  JIRA_OAUTH_ACCESS_TOKEN?: string;
  CONFLUENCE_BASE_URL?: string;
  CONFLUENCE_EMAIL?: string;
  CONFLUENCE_API_TOKEN?: string;
  CONFLUENCE_OAUTH_ACCESS_TOKEN?: string;
  REQUEST_TIMEOUT?: string;
  MAX_RETRIES?: string;
  RETRY_DELAY?: string;
  MCP_SERVER_NAME?: string;
  MCP_SERVER_VERSION?: string;
}

export class ConfigValidator {
  private ajv: Ajv;
  private schema: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    
    try {
      const schemaPath = join(process.cwd(), 'config', 'validation-schema.json');
      this.schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
      logger.debug('Configuration schema loaded successfully', { schemaPath });
    } catch (error) {
      logger.error('Failed to load configuration schema', error);
      throw createError('CONFIG_VALIDATION_ERROR', { 
        reason: 'Schema file not found or invalid',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  validate(config: Record<string, any>): JiraConfig {
    logger.debug('Validating configuration', { configKeys: Object.keys(config) });

    const validate = this.ajv.compile(this.schema);
    const isValid = validate(config);

    if (!isValid) {
      const errors = validate.errors?.map(error => ({
        field: error.instancePath || error.schemaPath,
        message: error.message,
        value: error.data
      })) || [];

      logger.error('Configuration validation failed', { errors });
      
      throw createError('CONFIG_VALIDATION_ERROR', {
        errors,
        providedConfig: Object.keys(config)
      });
    }

    // Additional business logic validation
    this.validateBusinessRules(config);

    logger.info('Configuration validation successful');
    return config as JiraConfig;
  }

  private validateBusinessRules(config: Record<string, any>): void {
    // Check authentication method
    const hasBasicAuth = config.JIRA_EMAIL && config.JIRA_API_TOKEN;
    const hasOAuth = config.JIRA_OAUTH_ACCESS_TOKEN;

    if (!hasBasicAuth && !hasOAuth) {
      throw createError('CONFIG_VALIDATION_ERROR', {
        reason: 'Either basic authentication (JIRA_EMAIL + JIRA_API_TOKEN) or OAuth (JIRA_OAUTH_ACCESS_TOKEN) must be provided'
      });
    }

    // Validate URL format
    if (config.JIRA_BASE_URL) {
      try {
        const url = new URL(config.JIRA_BASE_URL);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('URL must use HTTP or HTTPS protocol');
        }
      } catch (error) {
        throw createError('CONFIG_VALIDATION_ERROR', {
          reason: 'Invalid JIRA_BASE_URL format',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Validate numeric values
    const numericFields = ['REQUEST_TIMEOUT', 'MAX_RETRIES', 'RETRY_DELAY'];
    for (const field of numericFields) {
      if (config[field] && isNaN(Number(config[field]))) {
        throw createError('CONFIG_VALIDATION_ERROR', {
          reason: `${field} must be a valid number`,
          value: config[field]
        });
      }
    }

    // Validate timeout ranges
    if (config.REQUEST_TIMEOUT) {
      const timeout = Number(config.REQUEST_TIMEOUT);
      if (timeout < 1000 || timeout > 300000) {
        throw createError('CONFIG_VALIDATION_ERROR', {
          reason: 'REQUEST_TIMEOUT must be between 1000 and 300000 milliseconds',
          value: timeout
        });
      }
    }

    // Validate retry settings
    if (config.MAX_RETRIES) {
      const retries = Number(config.MAX_RETRIES);
      if (retries < 0 || retries > 10) {
        throw createError('CONFIG_VALIDATION_ERROR', {
          reason: 'MAX_RETRIES must be between 0 and 10',
          value: retries
        });
      }
    }

    if (config.RETRY_DELAY) {
      const delay = Number(config.RETRY_DELAY);
      if (delay < 100 || delay > 10000) {
        throw createError('CONFIG_VALIDATION_ERROR', {
          reason: 'RETRY_DELAY must be between 100 and 10000 milliseconds',
          value: delay
        });
      }
    }
  }

  validateEnvironment(): JiraConfig {
    const config: Record<string, any> = {};
    
    // Extract relevant environment variables
    const envVars = [
      'JIRA_BASE_URL',
      'JIRA_EMAIL',
      'JIRA_API_TOKEN',
      'JIRA_OAUTH_ACCESS_TOKEN',
      'REQUEST_TIMEOUT',
      'MAX_RETRIES',
      'RETRY_DELAY',
      'MCP_SERVER_NAME',
      'MCP_SERVER_VERSION'
    ];

    for (const envVar of envVars) {
      if (process.env[envVar]) {
        config[envVar] = process.env[envVar];
      }
    }

    return this.validate(config);
  }

  static create(): ConfigValidator {
    return new ConfigValidator();
  }
}

// Global validator instance
export const configValidator = ConfigValidator.create();
