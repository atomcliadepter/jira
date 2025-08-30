# JSON-RPC 2.0 Protocol Compliance

This document describes the JSON-RPC 2.0 protocol compliance implementation for the Enhanced MCP Jira REST Server, addressing the critical protocol gap identified in the gap analysis.

## Overview

The server now implements full JSON-RPC 2.0 specification compliance:
- **Proper Error Codes**: Standard JSON-RPC error codes (-32700 to -32603)
- **Batch Request Support**: Handle multiple requests in a single call
- **Request Validation**: Strict JSON-RPC 2.0 request structure validation
- **Error Mapping**: Application errors mapped to appropriate JSON-RPC codes

## JSON-RPC 2.0 Error Codes

### Standard Error Codes
```typescript
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,      // Invalid JSON received
  INVALID_REQUEST: -32600,  // JSON is not valid request object
  METHOD_NOT_FOUND: -32601, // Method does not exist
  INVALID_PARAMS: -32602,   // Invalid method parameters
  INTERNAL_ERROR: -32603,   // Internal JSON-RPC error
} as const;
```

### Error Code Mapping
Application errors are automatically mapped to appropriate JSON-RPC codes:

| Application Error | JSON-RPC Code | Description |
|------------------|---------------|-------------|
| Tool not found | -32601 | METHOD_NOT_FOUND |
| Validation error | -32602 | INVALID_PARAMS |
| Authentication error | -32603 | INTERNAL_ERROR |
| Permission error | -32603 | INTERNAL_ERROR |
| Connection error | -32603 | INTERNAL_ERROR |
| Rate limit error | -32603 | INTERNAL_ERROR |

## Request/Response Format

### Single Request
```json
{
  "jsonrpc": "2.0",
  "method": "list_tools",
  "params": {},
  "id": 1
}
```

### Single Response (Success)
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": ["issue.get", "issue.create"]
  },
  "id": 1
}
```

### Single Response (Error)
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": {
      "method": "unknown_method",
      "originalError": "Tool not found"
    }
  },
  "id": 1
}
```

### Batch Request
```json
[
  {
    "jsonrpc": "2.0",
    "method": "list_tools",
    "id": 1
  },
  {
    "jsonrpc": "2.0",
    "method": "call_tool",
    "params": {
      "name": "issue.get",
      "arguments": {"issueKey": "PROJ-123"}
    },
    "id": 2
  },
  {
    "jsonrpc": "2.0",
    "method": "notification"
  }
]
```

### Batch Response
```json
[
  {
    "jsonrpc": "2.0",
    "result": {
      "tools": ["issue.get", "issue.create"]
    },
    "id": 1
  },
  {
    "jsonrpc": "2.0",
    "result": {
      "content": [{"type": "text", "text": "Issue data"}]
    },
    "id": 2
  }
]
```

Note: Notifications (requests without `id`) don't return responses.

## Implementation Details

### JsonRpcHandler Class

The `JsonRpcHandler` class provides the core JSON-RPC 2.0 functionality:

```typescript
class JsonRpcHandler {
  async processRequest(
    input: string,
    handler: (request: JsonRpcRequest) => Promise<any>
  ): Promise<JsonRpcResponse | JsonRpcResponse[]>

  static methodNotFound(method: string, id?: string | number | null): JsonRpcError
  static invalidParams(message: string, id?: string | number | null): JsonRpcError
}
```

### Error Handling

Errors are handled at multiple levels:

1. **Parse Errors**: Invalid JSON input
2. **Request Validation**: Invalid request structure
3. **Method Errors**: Unknown methods or invalid parameters
4. **Application Errors**: Business logic errors from tools

### Integration with MCP Server

The JSON-RPC handler is integrated into the MCP server's tool execution pipeline:

```typescript
// Enhanced error handling with JSON-RPC compliance
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    // Execute tool
    const result = await executor(this.jiraClient, args);
    return result;
  } catch (error: any) {
    // Map to JSON-RPC error
    let mappedError: JsonRpcError;
    if (error instanceof McpJiraError) {
      mappedError = error.toJsonRpcError();
    } else {
      const mcpError = mapJiraApiError(error, requestId);
      mappedError = mcpError.toJsonRpcError();
    }
    throw mappedError;
  }
});
```

## Testing & Validation

### Test Results
The JSON-RPC implementation has been thoroughly tested:

```
🎉 JSON-RPC 2.0 Protocol Compliance Test Complete!

📊 Test Results Summary:
✅ Single request processing
✅ Batch request processing  
✅ Error code mapping
✅ Parse error handling
✅ Request validation
✅ Empty batch handling
```

### Test Cases Covered

1. **Valid Single Request**: Proper request/response handling
2. **Batch Requests**: Multiple requests in single call
3. **Notifications**: Requests without ID (no response)
4. **Parse Errors**: Invalid JSON handling
5. **Invalid Requests**: Malformed request structure
6. **Method Not Found**: Unknown method handling
7. **Empty Batches**: Edge case handling

### Manual Testing

You can test the JSON-RPC compliance manually:

```bash
# Test single request
echo '{"jsonrpc":"2.0","method":"list_tools","id":1}' | node dist/index.js

# Test batch request
echo '[{"jsonrpc":"2.0","method":"list_tools","id":1},{"jsonrpc":"2.0","method":"call_tool","params":{"name":"issue.get","arguments":{"issueKey":"TEST-1"}},"id":2}]' | node dist/index.js

# Test error handling
echo '{"jsonrpc":"2.0","method":"unknown_method","id":1}' | node dist/index.js
```

## Client Compatibility

### MCP Client Support
The implementation ensures compatibility with MCP clients:

- **Claude Desktop**: Full compatibility with batch requests
- **Cursor**: Proper error handling for discovery issues
- **Custom Clients**: Standard JSON-RPC 2.0 compliance

### Error Recovery
Clients can handle errors gracefully:

```typescript
// Client-side error handling
try {
  const response = await mcpClient.callTool("issue.get", {issueKey: "PROJ-123"});
} catch (error) {
  if (error.code === -32601) {
    console.log("Tool not found:", error.message);
  } else if (error.code === -32602) {
    console.log("Invalid parameters:", error.message);
  }
}
```

## Performance Considerations

### Batch Processing
- Requests processed in parallel for better performance
- Individual request failures don't affect other requests in batch
- Notifications filtered out to reduce response size

### Error Handling Overhead
- Minimal overhead for error mapping
- Structured error objects for better debugging
- Request ID tracking for correlation

### Memory Usage
- Streaming support for large batch requests
- Efficient JSON parsing and serialization
- Proper cleanup of request/response objects

## Security Considerations

### Input Validation
- Strict JSON-RPC 2.0 schema validation
- Parameter sanitization before tool execution
- Request size limits to prevent DoS attacks

### Error Information Disclosure
- Sanitized error messages in production
- Detailed error data only in development mode
- No sensitive information in error responses

### Rate Limiting
- Per-client rate limiting for batch requests
- Circuit breaker integration for failing methods
- Request correlation for audit logging

## Migration Guide

### From Basic MCP to JSON-RPC
If migrating from basic MCP error handling:

1. **Update Error Handling**: Use `JsonRpcError` instead of basic errors
2. **Add Batch Support**: Handle array inputs in your client
3. **Update Error Codes**: Map application errors to JSON-RPC codes
4. **Test Compatibility**: Verify with your MCP client

### Backward Compatibility
The implementation maintains backward compatibility:
- Single requests work as before
- Error structure enhanced but compatible
- No breaking changes to existing tools

## Troubleshooting

### Common Issues

#### Invalid JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "validationErrors": [...]
    }
  },
  "id": null
}
```

**Solution**: Ensure request includes `jsonrpc: "2.0"` and proper structure.

#### Method Not Found
```json
{
  "jsonrpc": "2.0", 
  "error": {
    "code": -32601,
    "message": "Method 'unknown_tool' not found"
  },
  "id": 1
}
```

**Solution**: Check available tools with `list_tools` method.

#### Parse Error
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32700,
    "message": "Parse error"
  },
  "id": null
}
```

**Solution**: Validate JSON syntax before sending.

### Debug Mode
Enable debug logging to see detailed JSON-RPC processing:

```bash
LOG_LEVEL=debug npm start
```

## Standards Compliance

### JSON-RPC 2.0 Specification
Full compliance with [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification):

- ✅ Request/Response format
- ✅ Error object structure  
- ✅ Batch request handling
- ✅ Notification support
- ✅ Standard error codes
- ✅ Parameter validation

### MCP Protocol Integration
Seamless integration with Model Context Protocol:
- ✅ Tool execution compatibility
- ✅ Resource access support
- ✅ Prompt handling integration
- ✅ Client discovery support

## Gap Analysis Status

✅ **RESOLVED**: MCP Protocol Compliance Gap
- JSON-RPC 2.0 error codes implemented
- Batch request handling working
- Request validation complete
- Error mapping functional
- Client compatibility verified

The critical MCP protocol compliance gap identified in the gap analysis has been successfully addressed with full JSON-RPC 2.0 specification compliance.
