import { AuditLogger, AuditEventType } from '../../src/audit/AuditLogger.js';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('Audit Logger Tests', () => {
  let auditLogger: AuditLogger;
  const testAuditDir = './test-audit-logs';

  beforeEach(() => {
    // Clean up any existing test logs
    if (existsSync(testAuditDir)) {
      rmSync(testAuditDir, { recursive: true, force: true });
    }
    
    auditLogger = new AuditLogger(testAuditDir, true);
  });

  afterEach(() => {
    // Clean up test logs
    if (existsSync(testAuditDir)) {
      rmSync(testAuditDir, { recursive: true, force: true });
    }
  });

  describe('Authentication Logging', () => {
    test('should log successful authentication', () => {
      auditLogger.logAuthentication({
        userId: 'user123',
        action: 'oauth_login',
        outcome: 'success',
        ipAddress: '192.168.1.1',
        requestId: 'req-123',
      });

      const logFile = getLatestLogFile();
      const logEntry = JSON.parse(readFileSync(logFile, 'utf8').trim());

      expect(logEntry.eventType).toBe(AuditEventType.AUTHENTICATION);
      expect(logEntry.userId).toBe('user123');
      expect(logEntry.action).toBe('oauth_login');
      expect(logEntry.outcome).toBe('success');
      expect(logEntry.severity).toBe('medium');
      expect(logEntry.ipAddress).toBe('192.168.1.1');
      expect(logEntry.requestId).toBe('req-123');
    });

    test('should log failed authentication with high severity', () => {
      auditLogger.logAuthentication({
        userId: 'user123',
        action: 'login_attempt',
        outcome: 'failure',
        details: { reason: 'invalid_credentials' },
      });

      const logFile = getLatestLogFile();
      const logEntry = JSON.parse(readFileSync(logFile, 'utf8').trim());

      expect(logEntry.eventType).toBe(AuditEventType.AUTHENTICATION);
      expect(logEntry.outcome).toBe('failure');
      expect(logEntry.severity).toBe('high');
      expect(logEntry.details.reason).toBe('invalid_credentials');
    });
  });

  describe('Authorization Logging', () => {
    test('should log successful authorization', () => {
      auditLogger.logAuthorization({
        userId: 'user123',
        agentId: 'agent-456',
        action: 'tool_access',
        resource: 'issue.create',
        outcome: 'success',
        requestId: 'req-123',
      });

      const logFile = getLatestLogFile();
      const logEntry = JSON.parse(readFileSync(logFile, 'utf8').trim());

      expect(logEntry.eventType).toBe(AuditEventType.AUTHORIZATION);
      expect(logEntry.agentId).toBe('agent-456');
      expect(logEntry.resource).toBe('issue.create');
      expect(logEntry.outcome).toBe('success');
      expect(logEntry.severity).toBe('medium');
    });

    test('should log blocked authorization with high severity', () => {
      auditLogger.logAuthorization({
        agentId: 'agent-456',
        action: 'tool_access',
        resource: 'issue.delete',
        outcome: 'blocked',
        details: { reason: 'insufficient_permissions' },
      });

      const logFile = getLatestLogFile();
      const logEntry = JSON.parse(readFileSync(logFile, 'utf8').trim());

      expect(logEntry.outcome).toBe('blocked');
      expect(logEntry.severity).toBe('high');
      expect(logEntry.details.reason).toBe('insufficient_permissions');
    });
  });

  describe('Tool Execution Logging', () => {
    test('should log tool execution with appropriate severity', () => {
      auditLogger.logToolExecution({
        agentId: 'agent-123',
        action: 'execute_issue.get',
        resource: 'PROJ-123',
        outcome: 'success',
        details: { executionTime: 150 },
      });

      const logFile = getLatestLogFile();
      const logEntry = JSON.parse(readFileSync(logFile, 'utf8').trim());

      expect(logEntry.eventType).toBe(AuditEventType.TOOL_EXECUTION);
      expect(logEntry.action).toBe('execute_issue.get');
      expect(logEntry.severity).toBe('low'); // Non-destructive operation
    });

    test('should log destructive operations with high severity', () => {
      auditLogger.logToolExecution({
        agentId: 'agent-123',
        action: 'execute_issue.delete',
        resource: 'PROJ-123',
        outcome: 'success',
      });

      const logFile = getLatestLogFile();
      const logEntry = JSON.parse(readFileSync(logFile, 'utf8').trim());

      expect(logEntry.action).toBe('execute_issue.delete');
      expect(logEntry.severity).toBe('high'); // Destructive operation
    });
  });

  describe('Security Violation Logging', () => {
    test('should log security violations with critical severity', () => {
      auditLogger.logSecurityViolation({
        agentId: 'agent-123',
        action: 'suspicious_activity',
        details: { 
          type: 'rapid_requests',
          count: 100,
          timeframe: '1_minute' 
        },
        ipAddress: '192.168.1.100',
      });

      const logFile = getLatestLogFile();
      const logEntry = JSON.parse(readFileSync(logFile, 'utf8').trim());

      expect(logEntry.eventType).toBe(AuditEventType.SECURITY_VIOLATION);
      expect(logEntry.outcome).toBe('blocked');
      expect(logEntry.severity).toBe('critical');
      expect(logEntry.details.type).toBe('rapid_requests');
    });
  });

  describe('Rate Limiting Logging', () => {
    test('should log rate limit events', () => {
      auditLogger.logRateLimit({
        agentId: 'agent-123',
        action: 'rate_limit_exceeded',
        resource: '/rest/api/3/search',
        details: { 
          limit: 100,
          current: 101,
          resetTime: Date.now() + 60000 
        },
      });

      const logFile = getLatestLogFile();
      const logEntry = JSON.parse(readFileSync(logFile, 'utf8').trim());

      expect(logEntry.eventType).toBe(AuditEventType.RATE_LIMIT);
      expect(logEntry.outcome).toBe('blocked');
      expect(logEntry.severity).toBe('medium');
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize sensitive data', () => {
      auditLogger.logAuthentication({
        userId: 'user123',
        action: 'token_refresh',
        outcome: 'success',
        details: {
          accessToken: 'secret-token-123',
          password: 'user-password',
          apiKey: 'api-key-456',
          normalField: 'normal-value',
        },
      });

      const logFile = getLatestLogFile();
      const logEntry = JSON.parse(readFileSync(logFile, 'utf8').trim());

      expect(logEntry.details.accessToken).toBe('[REDACTED]');
      expect(logEntry.details.password).toBe('[REDACTED]');
      expect(logEntry.details.apiKey).toBe('[REDACTED]');
      expect(logEntry.details.normalField).toBe('normal-value');
    });
  });

  describe('Configuration Management', () => {
    test('should log configuration changes', () => {
      auditLogger.logConfiguration({
        userId: 'admin123',
        action: 'update_rate_limits',
        details: { 
          oldLimit: 100,
          newLimit: 200 
        },
      });

      const logFile = getLatestLogFile();
      const logEntry = JSON.parse(readFileSync(logFile, 'utf8').trim());

      expect(logEntry.eventType).toBe(AuditEventType.CONFIGURATION);
      expect(logEntry.severity).toBe('high');
      expect(logEntry.outcome).toBe('success');
    });

    test('should provide audit statistics', () => {
      const stats = auditLogger.getStats();

      expect(stats.enabled).toBe(true);
      expect(stats.directory).toBe(testAuditDir);
      expect(stats.retentionDays).toBe(90);
    });

    test('should enable/disable logging', () => {
      auditLogger.setEnabled(false);
      
      // This should not create a log entry (except the config change)
      auditLogger.logAuthentication({
        userId: 'user123',
        action: 'test',
        outcome: 'success',
      });

      const stats = auditLogger.getStats();
      expect(stats.enabled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid audit directory gracefully', () => {
      // This should not throw an error
      expect(() => {
        const invalidLogger = new AuditLogger('/invalid/path/that/does/not/exist');
        invalidLogger.logAuthentication({
          action: 'test',
          outcome: 'success',
        });
      }).not.toThrow();
    });
  });

  describe('File Management', () => {
    test('should create daily log files', () => {
      auditLogger.logAuthentication({
        action: 'test1',
        outcome: 'success',
      });

      auditLogger.logAuthorization({
        action: 'test2',
        outcome: 'success',
      });

      const logFile = getLatestLogFile();
      const content = readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
      
      const entry1 = JSON.parse(lines[0]);
      const entry2 = JSON.parse(lines[1]);

      expect(entry1.action).toBe('test1');
      expect(entry2.action).toBe('test2');
    });

    test('should use JSONL format for log files', () => {
      auditLogger.logAuthentication({
        action: 'test',
        outcome: 'success',
      });

      const logFile = getLatestLogFile();
      const content = readFileSync(logFile, 'utf8');

      // Should be valid JSON followed by newline
      expect(() => JSON.parse(content.trim())).not.toThrow();
      expect(content.endsWith('\n')).toBe(true);
    });
  });

  // Helper function to get the latest log file
  function getLatestLogFile(): string {
    const date = new Date().toISOString().split('T')[0];
    return join(testAuditDir, `audit-${date}.jsonl`);
  }
});
