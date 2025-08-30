import { JsonRpcHandler, JsonRpcError, JSON_RPC_ERRORS } from '../../src/protocol/JsonRpcHandler.js';

describe('JSON-RPC 2.0 Protocol Tests', () => {
  let handler: JsonRpcHandler;

  beforeEach(() => {
    handler = new JsonRpcHandler();
  });

  describe('Single Request Processing', () => {
    test('should handle valid request', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'test_method',
        params: { arg1: 'value1' },
        id: 1
      });

      const response = await handler.processRequest(request, mockHandler);

      expect(response).toEqual({
        jsonrpc: '2.0',
        result: { success: true },
        id: 1
      });
      expect(mockHandler).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'test_method',
        params: { arg1: 'value1' },
        id: 1
      });
    });

    test('should handle notification (no id)', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'test_notification',
        params: { arg1: 'value1' }
      });

      const response = await handler.processRequest(request, mockHandler);

      // Notifications should not return a response
      expect(response).toEqual({ jsonrpc: '2.0', id: undefined });
    });

    test('should handle parse error', async () => {
      const mockHandler = jest.fn();
      const invalidJson = '{ invalid json }';

      const response = await handler.processRequest(invalidJson, mockHandler);

      expect(response).toEqual({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.PARSE_ERROR,
          message: 'Parse error',
          data: expect.any(Object)
        },
        id: null
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    test('should handle invalid request structure', async () => {
      const mockHandler = jest.fn();
      const request = JSON.stringify({
        method: 'test_method', // missing jsonrpc field
        id: 1
      });

      const response = await handler.processRequest(request, mockHandler);

      expect(response).toEqual({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.INVALID_REQUEST,
          message: 'Invalid Request',
          data: expect.any(Object)
        },
        id: 1
      });
    });

    test('should handle method not found error', async () => {
      const mockHandler = jest.fn().mockRejectedValue(
        new Error('Method not found')
      );
      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'unknown_method',
        id: 1
      });

      const response = await handler.processRequest(request, mockHandler);

      expect(response).toEqual({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
          message: 'Method not found',
          data: expect.any(Object)
        },
        id: 1
      });
    });

    test('should handle internal error', async () => {
      const mockHandler = jest.fn().mockRejectedValue(
        new Error('Internal server error')
      );
      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'test_method',
        id: 1
      });

      const response = await handler.processRequest(request, mockHandler);

      expect(response).toEqual({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.INTERNAL_ERROR,
          message: 'Internal error',
          data: expect.any(Object)
        },
        id: 1
      });
    });
  });

  describe('Batch Request Processing', () => {
    test('should handle valid batch request', async () => {
      const mockHandler = jest.fn()
        .mockResolvedValueOnce({ result: 'first' })
        .mockResolvedValueOnce({ result: 'second' });

      const batchRequest = JSON.stringify([
        { jsonrpc: '2.0', method: 'method1', id: 1 },
        { jsonrpc: '2.0', method: 'method2', id: 2 }
      ]);

      const responses = await handler.processRequest(batchRequest, mockHandler);

      expect(Array.isArray(responses)).toBe(true);
      expect(responses).toHaveLength(2);
      expect(responses).toEqual([
        { jsonrpc: '2.0', result: { result: 'first' }, id: 1 },
        { jsonrpc: '2.0', result: { result: 'second' }, id: 2 }
      ]);
    });

    test('should handle batch with notifications', async () => {
      const mockHandler = jest.fn()
        .mockResolvedValueOnce({ result: 'first' })
        .mockResolvedValueOnce({ result: 'notification' });

      const batchRequest = JSON.stringify([
        { jsonrpc: '2.0', method: 'method1', id: 1 },
        { jsonrpc: '2.0', method: 'notification' } // no id
      ]);

      const responses = await handler.processRequest(batchRequest, mockHandler);

      expect(Array.isArray(responses)).toBe(true);
      expect(responses).toHaveLength(1); // notification filtered out
      expect(responses).toEqual([
        { jsonrpc: '2.0', result: { result: 'first' }, id: 1 }
      ]);
    });

    test('should handle empty batch', async () => {
      const mockHandler = jest.fn();
      const emptyBatch = JSON.stringify([]);

      const responses = await handler.processRequest(emptyBatch, mockHandler);

      expect(Array.isArray(responses)).toBe(true);
      expect(responses).toHaveLength(1);
      expect(responses[0]).toEqual({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.INVALID_REQUEST,
          message: 'Invalid Request',
          data: { reason: 'Empty batch array' }
        },
        id: null
      });
    });

    test('should handle batch with mixed success and errors', async () => {
      const mockHandler = jest.fn()
        .mockResolvedValueOnce({ result: 'success' })
        .mockRejectedValueOnce(new Error('Method not found'));

      const batchRequest = JSON.stringify([
        { jsonrpc: '2.0', method: 'valid_method', id: 1 },
        { jsonrpc: '2.0', method: 'invalid_method', id: 2 }
      ]);

      const responses = await handler.processRequest(batchRequest, mockHandler);

      expect(Array.isArray(responses)).toBe(true);
      expect(responses).toHaveLength(2);
      expect(responses[0]).toEqual({
        jsonrpc: '2.0',
        result: { result: 'success' },
        id: 1
      });
      expect(responses[1]).toEqual({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
          message: 'Method not found',
          data: expect.any(Object)
        },
        id: 2
      });
    });
  });

  describe('JsonRpcError Class', () => {
    test('should create proper error response', () => {
      const error = new JsonRpcError(
        JSON_RPC_ERRORS.INVALID_PARAMS,
        'Invalid parameters',
        { field: 'missing' },
        123
      );

      const response = error.toResponse();

      expect(response).toEqual({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: { field: 'missing' }
        },
        id: 123
      });
    });

    test('should create method not found error', () => {
      const error = JsonRpcHandler.methodNotFound('unknown_method', 456);

      expect(error.code).toBe(JSON_RPC_ERRORS.METHOD_NOT_FOUND);
      expect(error.message).toBe("Method 'unknown_method' not found");
      expect(error.id).toBe(456);
    });

    test('should create invalid params error', () => {
      const error = JsonRpcHandler.invalidParams('Missing required field', 789);

      expect(error.code).toBe(JSON_RPC_ERRORS.INVALID_PARAMS);
      expect(error.message).toBe('Invalid params: Missing required field');
      expect(error.id).toBe(789);
    });
  });

  describe('Error Code Constants', () => {
    test('should have correct JSON-RPC error codes', () => {
      expect(JSON_RPC_ERRORS.PARSE_ERROR).toBe(-32700);
      expect(JSON_RPC_ERRORS.INVALID_REQUEST).toBe(-32600);
      expect(JSON_RPC_ERRORS.METHOD_NOT_FOUND).toBe(-32601);
      expect(JSON_RPC_ERRORS.INVALID_PARAMS).toBe(-32602);
      expect(JSON_RPC_ERRORS.INTERNAL_ERROR).toBe(-32603);
    });
  });
});
