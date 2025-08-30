/**
 * Structured error codes for Q CLI compatibility with JSON-RPC 2.0 support
 */

import { JSON_RPC_ERRORS, JsonRpcError } from '../protocol/JsonRpcHandler.js';

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  CONNECTION = 'connection',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  PERMISSION = 'permission',
  RATE_LIMIT = 'rate_limit',
  EXECUTION = 'execution',
  CONFIGURATION = 'configuration',
  INTERNAL = 'internal'
}

export interface StructuredError {
  code: string;
  message: string;
  category: ErrorCategory;
  details?: any;
  timestamp?: string;
  requestId?: string;
}

export class McpJiraError extends Error implements StructuredError {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly details?: any;
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    code: string,
    message: string,
    category: ErrorCategory,
    details?: any,
    requestId?: string
  ) {
    super(message);
    this.name = 'McpJiraError';
    this.code = code;
    this.category = category;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
  }

  toJSON(): StructuredError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }

  /**
   * Convert to JSON-RPC error
   */
  toJsonRpcError(id?: string | number | null): JsonRpcError {
    const jsonRpcCode = this.mapToJsonRpcCode();
    return new JsonRpcError(jsonRpcCode, this.message, this.toJSON(), id);
  }

  private mapToJsonRpcCode(): number {
    switch (this.category) {
      case ErrorCategory.NOT_FOUND:
        return JSON_RPC_ERRORS.METHOD_NOT_FOUND;
      case ErrorCategory.VALIDATION:
        return JSON_RPC_ERRORS.INVALID_PARAMS;
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.PERMISSION:
      case ErrorCategory.CONNECTION:
      case ErrorCategory.RATE_LIMIT:
      case ErrorCategory.EXECUTION:
      case ErrorCategory.CONFIGURATION:
      case ErrorCategory.INTERNAL:
      default:
        return JSON_RPC_ERRORS.INTERNAL_ERROR;
    }
  }
}

export const ErrorCodes = {
  // Authentication errors
  JIRA_AUTH_ERROR: {
    code: 'JIRA_AUTH_001',
    message: 'Authentication failed with Jira API',
    category: ErrorCategory.AUTHENTICATION
  },
  JIRA_TOKEN_EXPIRED: {
    code: 'JIRA_AUTH_002',
    message: 'Jira API token has expired',
    category: ErrorCategory.AUTHENTICATION
  },
  
  // Connection errors
  JIRA_CONNECTION_ERROR: {
    code: 'JIRA_CONN_001',
    message: 'Failed to connect to Jira API',
    category: ErrorCategory.CONNECTION
  },
  JIRA_TIMEOUT_ERROR: {
    code: 'JIRA_CONN_002',
    message: 'Request to Jira API timed out',
    category: ErrorCategory.CONNECTION
  },
  
  // Validation errors
  INVALID_ISSUE_KEY: {
    code: 'JIRA_VAL_001',
    message: 'Invalid issue key format',
    category: ErrorCategory.VALIDATION
  },
  MISSING_REQUIRED_FIELD: {
    code: 'JIRA_VAL_002',
    message: 'Required field is missing',
    category: ErrorCategory.VALIDATION
  },
  
  // Not found errors
  JIRA_NOT_FOUND_ERROR: {
    code: 'JIRA_404_001',
    message: 'Requested resource not found in Jira',
    category: ErrorCategory.NOT_FOUND
  },
  TOOL_NOT_FOUND_ERROR: {
    code: 'MCP_404_001',
    message: 'Requested tool not found',
    category: ErrorCategory.NOT_FOUND
  },
  
  // Permission errors
  JIRA_PERMISSION_ERROR: {
    code: 'JIRA_403_001',
    message: 'Insufficient permissions for Jira operation',
    category: ErrorCategory.PERMISSION
  },
  
  // Rate limit errors
  JIRA_RATE_LIMIT_ERROR: {
    code: 'JIRA_429_001',
    message: 'Jira API rate limit exceeded',
    category: ErrorCategory.RATE_LIMIT
  },
  
  // Execution errors
  TOOL_EXECUTION_ERROR: {
    code: 'MCP_EXEC_001',
    message: 'Tool execution failed',
    category: ErrorCategory.EXECUTION
  },
  JIRA_EXECUTION_ERROR: {
    code: 'JIRA_EXEC_001',
    message: 'Jira operation execution failed',
    category: ErrorCategory.EXECUTION
  },
  
  // Validation errors (additional)
  JIRA_VALIDATION_ERROR: {
    code: 'JIRA_VAL_003',
    message: 'Jira data validation failed',
    category: ErrorCategory.VALIDATION
  },
  
  // Configuration errors
  INVALID_CONFIGURATION: {
    code: 'MCP_CONFIG_001',
    message: 'Invalid configuration provided',
    category: ErrorCategory.CONFIGURATION
  },
  CONFIG_VALIDATION_ERROR: {
    code: 'MCP_CONFIG_002',
    message: 'Configuration validation failed',
    category: ErrorCategory.CONFIGURATION
  },
  
  // Internal errors
  INTERNAL_ERROR: {
    code: 'MCP_INT_001',
    message: 'Internal server error',
    category: ErrorCategory.INTERNAL
  }
};

/**
 * Create a structured error
 */
export function createError(
  errorType: keyof typeof ErrorCodes,
  details?: any,
  requestId?: string
): McpJiraError {
  const errorDef = ErrorCodes[errorType];
  return new McpJiraError(
    errorDef.code,
    errorDef.message,
    errorDef.category,
    details,
    requestId
  );
}

/**
 * Map Jira API errors to structured errors
 */
export function mapJiraApiError(error: any, requestId?: string): McpJiraError {
  if (error.response?.status === 401) {
    return createError('JIRA_AUTH_ERROR', { 
      status: error.response.status,
      statusText: error.response.statusText 
    }, requestId);
  }
  
  if (error.response?.status === 403) {
    return createError('JIRA_PERMISSION_ERROR', { 
      status: error.response.status,
      statusText: error.response.statusText 
    }, requestId);
  }
  
  if (error.response?.status === 404) {
    return createError('JIRA_NOT_FOUND_ERROR', { 
      status: error.response.status,
      statusText: error.response.statusText 
    }, requestId);
  }
  
  if (error.response?.status === 429) {
    return createError('JIRA_RATE_LIMIT_ERROR', { 
      status: error.response.status,
      retryAfter: error.response.headers?.['retry-after'] 
    }, requestId);
  }
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return createError('JIRA_CONNECTION_ERROR', { 
      code: error.code,
      message: error.message 
    }, requestId);
  }
  
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return createError('JIRA_TIMEOUT_ERROR', { 
      timeout: true,
      message: error.message 
    }, requestId);
  }
  
  // Default to internal error
  return createError('INTERNAL_ERROR', { 
    originalError: error.message || 'Unknown error',
    stack: error.stack 
  }, requestId);
}
