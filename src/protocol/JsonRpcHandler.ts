import { z } from 'zod';
import { logger } from '../utils/logger.js';

// JSON-RPC 2.0 Error Codes
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// JSON-RPC 2.0 Schemas
export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.any().optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
});

export const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional(),
  }).optional(),
  id: z.union([z.string(), z.number(), z.null()]),
});

export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;

export class JsonRpcError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any,
    public id?: string | number | null
  ) {
    super(message);
    this.name = 'JsonRpcError';
  }

  toResponse(): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      error: {
        code: this.code,
        message: this.message,
        ...(this.data && { data: this.data }),
      },
      id: this.id || null,
    };
  }
}

export class JsonRpcHandler {
  /**
   * Process single or batch JSON-RPC requests
   */
  async processRequest(
    input: string,
    handler: (request: JsonRpcRequest) => Promise<any>
  ): Promise<JsonRpcResponse | JsonRpcResponse[]> {
    try {
      const parsed = JSON.parse(input);
      
      // Handle batch requests
      if (Array.isArray(parsed)) {
        return this.processBatchRequest(parsed, handler);
      }
      
      // Handle single request
      return this.processSingleRequest(parsed, handler);
    } catch (error) {
      logger.error('JSON-RPC parse error', error);
      return new JsonRpcError(
        JSON_RPC_ERRORS.PARSE_ERROR,
        'Parse error',
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      ).toResponse();
    }
  }

  /**
   * Process batch JSON-RPC requests
   */
  private async processBatchRequest(
    requests: any[],
    handler: (request: JsonRpcRequest) => Promise<any>
  ): Promise<JsonRpcResponse[]> {
    if (requests.length === 0) {
      return [new JsonRpcError(
        JSON_RPC_ERRORS.INVALID_REQUEST,
        'Invalid Request',
        { reason: 'Empty batch array' }
      ).toResponse()];
    }

    const responses = await Promise.all(
      requests.map(req => this.processSingleRequest(req, handler))
    );

    // Filter out responses for notifications (requests without id)
    return responses.filter(response => response.id !== undefined);
  }

  /**
   * Process single JSON-RPC request
   */
  private async processSingleRequest(
    request: any,
    handler: (request: JsonRpcRequest) => Promise<any>
  ): Promise<JsonRpcResponse> {
    let requestId: string | number | null = null;

    try {
      // Extract ID early for error responses
      requestId = request?.id || null;

      // Validate request structure
      const validatedRequest = JsonRpcRequestSchema.parse(request);
      requestId = validatedRequest.id || null;

      // Execute handler
      const result = await handler(validatedRequest);

      // Return success response (only if not a notification)
      if (validatedRequest.id !== undefined) {
        return {
          jsonrpc: '2.0',
          result,
          id: validatedRequest.id,
        };
      }

      // For notifications, return empty response that will be filtered out
      return { jsonrpc: '2.0', id: undefined } as any;

    } catch (error) {
      if (error instanceof z.ZodError) {
        return new JsonRpcError(
          JSON_RPC_ERRORS.INVALID_REQUEST,
          'Invalid Request',
          { validationErrors: error.issues },
          requestId
        ).toResponse();
      }

      if (error instanceof JsonRpcError) {
        error.id = requestId;
        return error.toResponse();
      }

      // Map application errors to JSON-RPC errors
      return this.mapApplicationError(error, requestId);
    }
  }

  /**
   * Map application errors to JSON-RPC errors
   */
  private mapApplicationError(error: any, id: string | number | null): JsonRpcResponse {
    if (error?.code === 'METHOD_NOT_FOUND' || error?.message?.includes('not found')) {
      return new JsonRpcError(
        JSON_RPC_ERRORS.METHOD_NOT_FOUND,
        'Method not found',
        { originalError: error.message },
        id
      ).toResponse();
    }

    if (error?.code === 'INVALID_PARAMS' || error?.message?.includes('validation')) {
      return new JsonRpcError(
        JSON_RPC_ERRORS.INVALID_PARAMS,
        'Invalid params',
        { originalError: error.message },
        id
      ).toResponse();
    }

    // Default to internal error
    return new JsonRpcError(
      JSON_RPC_ERRORS.INTERNAL_ERROR,
      'Internal error',
      { originalError: error.message || 'Unknown error' },
      id
    ).toResponse();
  }

  /**
   * Create method not found error
   */
  static methodNotFound(method: string, id?: string | number | null): JsonRpcError {
    return new JsonRpcError(
      JSON_RPC_ERRORS.METHOD_NOT_FOUND,
      `Method '${method}' not found`,
      { method },
      id
    );
  }

  /**
   * Create invalid params error
   */
  static invalidParams(message: string, id?: string | number | null): JsonRpcError {
    return new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      `Invalid params: ${message}`,
      undefined,
      id
    );
  }
}
