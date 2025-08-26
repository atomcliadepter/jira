
/**
 * Structured error codes for Q CLI compatibility
 */

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
      requestId: this.requestId
    };
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
  JIRA_INVALID_CREDENTIALS: {
    code: 'JIRA_AUTH_003',
    message: 'Invalid Jira credentials provided',
    category: ErrorCategory.AUTHENTICATION
  },

  // Connection errors
  JIRA_CONNECTION_ERROR: {
    code: 'JIRA_CONN_001',
    message: 'Failed to connect to Jira instance',
    category: ErrorCategory.CONNECTION
  },
  JIRA_TIMEOUT_ERROR: {
    code: 'JIRA_CONN_002',
    message: 'Request to Jira API timed out',
    category: ErrorCategory.CONNECTION
  },
  JIRA_NETWORK_ERROR: {
    code: 'JIRA_CONN_003',
    message: 'Network error while connecting to Jira',
    category: ErrorCategory.CONNECTION
  },

  // Validation errors
  JIRA_VALIDATION_ERROR: {
    code: 'JIRA_VAL_001',
    message: 'Request validation failed',
    category: ErrorCategory.VALIDATION
  },
  JIRA_SCHEMA_ERROR: {
    code: 'JIRA_VAL_002',
    message: 'Request does not match expected schema',
    category: ErrorCategory.VALIDATION
  },
  JIRA_FIELD_ERROR: {
    code: 'JIRA_VAL_003',
    message: 'Invalid field value provided',
    category: ErrorCategory.VALIDATION
  },

  // Not found errors
  JIRA_NOT_FOUND_ERROR: {
    code: 'JIRA_404_001',
    message: 'Requested resource not found',
    category: ErrorCategory.NOT_FOUND
  },
  JIRA_ISSUE_NOT_FOUND: {
    code: 'JIRA_404_002',
    message: 'Jira issue not found',
    category: ErrorCategory.NOT_FOUND
  },
  JIRA_PROJECT_NOT_FOUND: {
    code: 'JIRA_404_003',
    message: 'Jira project not found',
    category: ErrorCategory.NOT_FOUND
  },
  JIRA_USER_NOT_FOUND: {
    code: 'JIRA_404_004',
    message: 'Jira user not found',
    category: ErrorCategory.NOT_FOUND
  },

  // Permission errors
  JIRA_PERMISSION_ERROR: {
    code: 'JIRA_PERM_001',
    message: 'Insufficient permissions for requested operation',
    category: ErrorCategory.PERMISSION
  },
  JIRA_PROJECT_PERMISSION_ERROR: {
    code: 'JIRA_PERM_002',
    message: 'Insufficient project permissions',
    category: ErrorCategory.PERMISSION
  },
  JIRA_ISSUE_PERMISSION_ERROR: {
    code: 'JIRA_PERM_003',
    message: 'Insufficient issue permissions',
    category: ErrorCategory.PERMISSION
  },

  // Rate limit errors
  JIRA_RATE_LIMIT_ERROR: {
    code: 'JIRA_RATE_001',
    message: 'Rate limit exceeded',
    category: ErrorCategory.RATE_LIMIT
  },

  // Tool execution errors
  TOOL_EXECUTION_ERROR: {
    code: 'TOOL_EXEC_001',
    message: 'Tool execution failed',
    category: ErrorCategory.EXECUTION
  },
  TOOL_NOT_FOUND_ERROR: {
    code: 'TOOL_EXEC_002',
    message: 'Requested tool not found',
    category: ErrorCategory.EXECUTION
  },
  TOOL_TIMEOUT_ERROR: {
    code: 'TOOL_EXEC_003',
    message: 'Tool execution timed out',
    category: ErrorCategory.EXECUTION
  },

  // JIRA execution errors
  JIRA_EXECUTION_ERROR: {
    code: 'JIRA_EXEC_001',
    message: 'JIRA operation execution failed',
    category: ErrorCategory.EXECUTION
  },

  // Configuration errors
  CONFIG_VALIDATION_ERROR: {
    code: 'CONFIG_VAL_001',
    message: 'Configuration validation failed',
    category: ErrorCategory.CONFIGURATION
  },
  CONFIG_MISSING_ERROR: {
    code: 'CONFIG_VAL_002',
    message: 'Required configuration missing',
    category: ErrorCategory.CONFIGURATION
  },
  CONFIG_INVALID_ERROR: {
    code: 'CONFIG_VAL_003',
    message: 'Invalid configuration value',
    category: ErrorCategory.CONFIGURATION
  },

  // Internal errors
  INTERNAL_ERROR: {
    code: 'INTERNAL_001',
    message: 'Internal server error',
    category: ErrorCategory.INTERNAL
  }
} as const;

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

export function isJiraApiError(error: any): boolean {
  return error?.response?.status >= 400 && error?.response?.status < 600;
}

export function mapJiraApiError(error: any, requestId?: string): McpJiraError {
  if (!isJiraApiError(error)) {
    return createError('INTERNAL_ERROR', { originalError: error.message }, requestId);
  }

  const status = error.response?.status;
  const data = error.response?.data;

  switch (status) {
    case 401:
      return createError('JIRA_AUTH_ERROR', { status, data }, requestId);
    case 403:
      return createError('JIRA_PERMISSION_ERROR', { status, data }, requestId);
    case 404:
      return createError('JIRA_NOT_FOUND_ERROR', { status, data }, requestId);
    case 429:
      return createError('JIRA_RATE_LIMIT_ERROR', { status, data }, requestId);
    case 400:
      return createError('JIRA_VALIDATION_ERROR', { status, data }, requestId);
    default:
      return createError('JIRA_CONNECTION_ERROR', { status, data }, requestId);
  }
}
