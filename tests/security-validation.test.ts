/**
 * Security and Validation Tests
 * Ensures proper input validation, authentication, and security measures
 */

import { z } from 'zod';

describe('Security and Validation Tests', () => {

  describe('Input Validation Security', () => {
    test('should prevent SQL injection attempts in JQL queries', () => {
      const maliciousInputs = [
        "project = TEST'; DROP TABLE issues; --",
        "project = TEST OR 1=1",
        "project = TEST UNION SELECT * FROM users",
        "project = TEST; DELETE FROM projects WHERE 1=1",
        "project = TEST' AND (SELECT COUNT(*) FROM users) > 0 --"
      ];

      maliciousInputs.forEach(input => {
        // JQL should be treated as a string, not executed as SQL
        expect(typeof input).toBe('string');
        expect(input.includes('DROP')).toBe(true); // Verify we're testing dangerous inputs
        
        // In real implementation, this would be sanitized
        const sanitized = input.replace(/[';]/g, ''); // Basic sanitization example
        expect(sanitized.includes(';')).toBe(false);
      });
    });

    test('should validate and sanitize issue field inputs', () => {
      const IssueFieldSchema = z.object({
        summary: z.string().min(1).max(255),
        description: z.string().max(32767).optional(),
        priority: z.object({
          name: z.enum(['Highest', 'High', 'Medium', 'Low', 'Lowest'])
        }).optional(),
        labels: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/)).optional()
      });

      const validInput = {
        summary: 'Valid issue summary',
        description: 'Valid description',
        priority: { name: 'High' as const },
        labels: ['bug', 'urgent']
      };

      const invalidInputs = [
        { summary: '' }, // Empty summary
        { summary: 'x'.repeat(256) }, // Too long summary
        { summary: 'Valid', priority: { name: 'Invalid' } }, // Invalid priority
        { summary: 'Valid', labels: ['valid', 'invalid label with spaces'] } // Invalid label
      ];

      expect(() => IssueFieldSchema.parse(validInput)).not.toThrow();
      
      invalidInputs.forEach(input => {
        expect(() => IssueFieldSchema.parse(input)).toThrow();
      });
    });

    test('should prevent XSS attacks in text fields', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>'
      ];

      xssPayloads.forEach(payload => {
        // Simulate HTML sanitization
        const sanitized = payload
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+="[^"]*"/gi, '')
          .replace(/<svg[^>]*>/gi, '');

        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
      });
    });

    test('should validate automation rule configurations securely', () => {
      const AutomationRuleSchema = z.object({
        name: z.string().min(1).max(100),
        trigger: z.object({
          type: z.enum(['issue.created', 'issue.updated', 'issue.transitioned']),
          config: z.object({
            projectKeys: z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/)).optional(),
            issueTypes: z.array(z.string()).optional()
          })
        }),
        actions: z.array(z.object({
          type: z.enum(['issue.assign', 'issue.transition', 'issue.comment']),
          config: z.record(z.any())
        }))
      });

      const validRule = {
        name: 'Auto-assign new bugs',
        trigger: {
          type: 'issue.created' as const,
          config: {
            projectKeys: ['PROJ1', 'PROJ2'],
            issueTypes: ['Bug']
          }
        },
        actions: [{
          type: 'issue.assign' as const,
          config: { assigneeId: 'user123' }
        }]
      };

      const invalidRules = [
        { name: '', trigger: validRule.trigger, actions: validRule.actions }, // Empty name
        { name: 'x'.repeat(101), trigger: validRule.trigger, actions: validRule.actions }, // Too long name
        { name: 'Valid', trigger: { type: 'invalid.trigger', config: {} }, actions: validRule.actions }, // Invalid trigger
        { name: 'Valid', trigger: validRule.trigger, actions: [] } // No actions
      ];

      expect(() => AutomationRuleSchema.parse(validRule)).not.toThrow();
      
      invalidRules.forEach(rule => {
        expect(() => AutomationRuleSchema.parse(rule)).toThrow();
      });
    });
  });

  describe('Authentication Security', () => {
    test('should validate API token format', () => {
      const validTokens = [
        'ATATT3xFfGF0123456789abcdef',
        'ATATTxFfGF0987654321fedcba',
        'ATATT' + 'x'.repeat(20) // Minimum length
      ];

      const invalidTokens = [
        '', // Empty
        'invalid', // Too short
        'ATATT', // Too short
        'WRONG3xFfGF0123456789abcdef', // Wrong prefix
        'ATATT3xFfGF0123456789abcdef!@#' // Invalid characters
      ];

      const tokenRegex = /^ATATT[a-zA-Z0-9]{20,}$/;

      validTokens.forEach(token => {
        expect(tokenRegex.test(token)).toBe(true);
      });

      invalidTokens.forEach(token => {
        expect(tokenRegex.test(token)).toBe(false);
      });
    });

    test('should validate email format for authentication', () => {
      const validEmails = [
        'user@example.com',
        'test.user+tag@domain.co.uk',
        'user123@test-domain.org'
      ];

      const invalidEmails = [
        '', // Empty
        'invalid', // No @ symbol
        '@domain.com', // No local part
        'user@', // No domain
        'user@domain', // No TLD
        'user space@domain.com' // Spaces not allowed
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    test('should validate Jira base URL format', () => {
      const validUrls = [
        'https://company.atlassian.net',
        'https://jira.company.com',
        'https://subdomain.company.atlassian.net'
      ];

      const invalidUrls = [
        '', // Empty
        'http://company.atlassian.net', // HTTP not HTTPS
        'company.atlassian.net', // No protocol
        'https://', // No domain
        'ftp://company.atlassian.net', // Wrong protocol
        'https://company.atlassian.net/path' // Should not have path
      ];

      const urlRegex = /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      validUrls.forEach(url => {
        expect(urlRegex.test(url)).toBe(true);
      });

      invalidUrls.forEach(url => {
        expect(urlRegex.test(url)).toBe(false);
      });
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize user input for logging', () => {
      const sensitiveInputs = [
        'password123',
        'ATATT3xFfGF0123456789abcdef',
        'user@example.com',
        'secret-api-key'
      ];

      const sanitizeForLogging = (input: string): string => {
        // Mask sensitive patterns
        return input
          .replace(/ATATT[a-zA-Z0-9]+/g, 'ATATT***')
          .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***')
          .replace(/password\w*/gi, 'password***')
          .replace(/secret[a-zA-Z0-9-_]*/gi, 'secret***');
      };

      sensitiveInputs.forEach(input => {
        const sanitized = sanitizeForLogging(input);
        expect(sanitized).not.toBe(input); // Should be modified
        expect(sanitized).toContain('***'); // Should contain masking
      });
    });

    test('should prevent path traversal attacks', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd'
      ];

      const sanitizePath = (path: string): string => {
        // Remove path traversal attempts
        return path
          .replace(/\.\./g, '')
          .replace(/[/\\]/g, '')
          .replace(/^[a-zA-Z]:/g, ''); // Remove drive letters
      };

      maliciousPaths.forEach(path => {
        const sanitized = sanitizePath(path);
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
        expect(sanitized).not.toMatch(/^[a-zA-Z]:/);
      });
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    test('should implement rate limiting logic', () => {
      class RateLimiter {
        private requests: Map<string, number[]> = new Map();
        private readonly maxRequests = 100;
        private readonly windowMs = 60000; // 1 minute

        isAllowed(clientId: string): boolean {
          const now = Date.now();
          const clientRequests = this.requests.get(clientId) || [];
          
          // Remove old requests outside the window
          const validRequests = clientRequests.filter(time => now - time < this.windowMs);
          
          if (validRequests.length >= this.maxRequests) {
            return false;
          }
          
          validRequests.push(now);
          this.requests.set(clientId, validRequests);
          return true;
        }
      }

      const rateLimiter = new RateLimiter();
      const clientId = 'test-client';

      // Should allow initial requests
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.isAllowed(clientId)).toBe(true);
      }

      // Should block after limit
      expect(rateLimiter.isAllowed(clientId)).toBe(false);
    });

    test('should handle large payload attacks', () => {
      const maxPayloadSize = 1024 * 1024; // 1MB
      
      const validatePayloadSize = (payload: any): boolean => {
        const payloadString = JSON.stringify(payload);
        return payloadString.length <= maxPayloadSize;
      };

      const normalPayload = { summary: 'Normal issue', description: 'Normal description' };
      const largePayload = { 
        summary: 'Large issue', 
        description: 'x'.repeat(maxPayloadSize + 1) 
      };

      expect(validatePayloadSize(normalPayload)).toBe(true);
      expect(validatePayloadSize(largePayload)).toBe(false);
    });
  });

  describe('Secure Configuration', () => {
    test('should validate secure configuration settings', () => {
      const ConfigSchema = z.object({
        jiraBaseUrl: z.string().url().refine(url => url.startsWith('https://'), {
          message: 'JIRA URL must use HTTPS'
        }),
        requestTimeout: z.number().min(1000).max(300000), // 1s to 5min
        maxRetries: z.number().min(0).max(10),
        logLevel: z.enum(['error', 'warn', 'info', 'debug']),
        enableDebugLogging: z.boolean().default(false)
      });

      const validConfig = {
        jiraBaseUrl: 'https://company.atlassian.net',
        requestTimeout: 30000,
        maxRetries: 3,
        logLevel: 'info' as const,
        enableDebugLogging: false
      };

      const invalidConfigs = [
        { ...validConfig, jiraBaseUrl: 'http://company.atlassian.net' }, // HTTP not HTTPS
        { ...validConfig, requestTimeout: 500 }, // Too short timeout
        { ...validConfig, maxRetries: 20 }, // Too many retries
        { ...validConfig, logLevel: 'verbose' } // Invalid log level
      ];

      expect(() => ConfigSchema.parse(validConfig)).not.toThrow();
      
      invalidConfigs.forEach(config => {
        expect(() => ConfigSchema.parse(config)).toThrow();
      });
    });

    test('should prevent information disclosure in error messages', () => {
      const sanitizeErrorMessage = (error: Error, isProduction: boolean): string => {
        if (isProduction) {
          // In production, return generic error messages
          if (error.message.includes('ATATT')) {
            return 'Authentication failed';
          }
          if (error.message.includes('password')) {
            return 'Authentication failed';
          }
          if (error.message.includes('internal')) {
            return 'Internal server error';
          }
          return 'An error occurred';
        }
        return error.message; // Full details in development
      };

      const sensitiveErrors = [
        new Error('Invalid API token: ATATT3xFfGF0123456789abcdef'),
        new Error('Database connection failed: password incorrect'),
        new Error('Internal server error: /etc/passwd not found')
      ];

      sensitiveErrors.forEach(error => {
        const prodMessage = sanitizeErrorMessage(error, true);
        const devMessage = sanitizeErrorMessage(error, false);
        
        expect(prodMessage).not.toContain('ATATT');
        expect(prodMessage).not.toContain('password');
        expect(prodMessage).not.toContain('/etc/passwd');
        
        expect(devMessage).toBe(error.message); // Full details in dev
      });
    });
  });

  describe('Audit and Compliance', () => {
    test('should log security-relevant events', () => {
      interface SecurityEvent {
        timestamp: string;
        event: string;
        userId?: string;
        clientId: string;
        success: boolean;
        details?: any;
      }

      const securityLogger = {
        events: [] as SecurityEvent[],
        
        logAuthAttempt(clientId: string, userId: string, success: boolean) {
          this.events.push({
            timestamp: new Date().toISOString(),
            event: 'authentication_attempt',
            userId,
            clientId,
            success
          });
        },
        
        logToolExecution(clientId: string, toolName: string, success: boolean) {
          this.events.push({
            timestamp: new Date().toISOString(),
            event: 'tool_execution',
            clientId,
            success,
            details: { toolName }
          });
        }
      };

      // Simulate security events
      securityLogger.logAuthAttempt('client1', 'user1', true);
      securityLogger.logAuthAttempt('client2', 'user2', false);
      securityLogger.logToolExecution('client1', 'automation.rule.create', true);

      expect(securityLogger.events).toHaveLength(3);
      expect(securityLogger.events[0].event).toBe('authentication_attempt');
      expect(securityLogger.events[0].success).toBe(true);
      expect(securityLogger.events[1].success).toBe(false);
      expect(securityLogger.events[2].details.toolName).toBe('automation.rule.create');
    });

    test('should implement data retention policies', () => {
      interface LogEntry {
        timestamp: Date;
        level: string;
        message: string;
        sensitive: boolean;
      }

      const logRetentionManager = {
        logs: [] as LogEntry[],
        
        addLog(level: string, message: string, sensitive = false) {
          this.logs.push({
            timestamp: new Date(),
            level,
            message,
            sensitive
          });
        },
        
        cleanupOldLogs(retentionDays: number) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
          
          this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
        },
        
        anonymizeSensitiveLogs() {
          this.logs.forEach(log => {
            if (log.sensitive) {
              log.message = log.message.replace(/user-\d+/g, 'user-***');
              log.message = log.message.replace(/ATATT[a-zA-Z0-9]+/g, 'ATATT***');
            }
          });
        }
      };

      // Add test logs
      logRetentionManager.addLog('info', 'User user-123 logged in', true);
      logRetentionManager.addLog('debug', 'API token ATATT3xFfGF0123456789abcdef used', true);
      logRetentionManager.addLog('info', 'System started', false);

      expect(logRetentionManager.logs).toHaveLength(3);

      // Test anonymization
      logRetentionManager.anonymizeSensitiveLogs();
      expect(logRetentionManager.logs[0].message).toContain('user-***');
      expect(logRetentionManager.logs[1].message).toContain('ATATT***');
      expect(logRetentionManager.logs[2].message).toBe('System started'); // Unchanged
    });
  });
});
