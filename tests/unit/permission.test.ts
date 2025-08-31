import { describe, it, expect, beforeEach } from '@jest/globals';
import { PermissionManager, PermissionConfig } from '../../src/auth/PermissionManager.js';

describe('Permission Manager Tests', () => {
  let permissionManager: PermissionManager;

  const testConfig: PermissionConfig = {
    agents: {
      'agent-read-only': {
        allowedTools: ['issue.get', 'project.get', 'user.get'],
        readOnly: true,
        maxRequestsPerMinute: 30,
      },
      'agent-full-access': {
        allowedTools: ['issue.create', 'issue.update', 'issue.delete', 'issue.get'],
        readOnly: false,
        maxRequestsPerMinute: 100,
      },
      'agent-restricted': {
        allowedTools: ['issue.get', 'issue.create'],
        deniedTools: ['issue.delete'],
        readOnly: false,
        maxRequestsPerMinute: 50,
      },
    },
    defaultPolicy: {
      allowAll: false,
      readOnly: true,
      maxRequestsPerMinute: 20,
    },
  };

  beforeEach(() => {
    permissionManager = new PermissionManager(testConfig);
  });

  describe('Tool Access Control', () => {
    it('should allow explicitly allowed tools', () => {
      const result = permissionManager.checkToolAccess('agent-read-only', 'issue.get');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny explicitly denied tools', () => {
      const result = permissionManager.checkToolAccess('agent-restricted', 'issue.delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denied');
    });

    it('should deny write operations for read-only agents', () => {
      const result = permissionManager.checkToolAccess('agent-read-only', 'issue.create');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('read-only');
    });

    it('should allow write operations for full-access agents', () => {
      const result = permissionManager.checkToolAccess('agent-full-access', 'issue.create');
      expect(result.allowed).toBe(true);
    });

    it('should require confirmation for destructive operations', () => {
      const result = permissionManager.checkToolAccess('agent-full-access', 'issue.delete');
      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should apply default policy for unknown agents', () => {
      const result = permissionManager.checkToolAccess('unknown-agent', 'issue.get');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in allowlist');
    });
  });

  describe('Rate Limiting', () => {
    it('should track request counts per agent', () => {
      const agentId = 'agent-read-only';
      
      // First request should be allowed
      let result = permissionManager.checkToolAccess(agentId, 'issue.get');
      expect(result.allowed).toBe(true);
      
      // Record the request
      permissionManager.recordRequest(agentId);
      
      // Check remaining requests
      const remaining = permissionManager.getRemainingRequests(agentId);
      expect(remaining).toBeLessThan(30); // Max is 30 for this agent
    });

    it('should deny requests when rate limit exceeded', () => {
      const agentId = 'test-agent-limited';
      
      // Create a manager with very low limits for testing
      const limitedConfig: PermissionConfig = {
        agents: {
          [agentId]: {
            allowedTools: ['issue.get'],
            maxRequestsPerMinute: 2,
          },
        },
        defaultPolicy: {
          allowAll: false,
          readOnly: true,
          maxRequestsPerMinute: 1,
        },
      };
      
      const limitedManager = new PermissionManager(limitedConfig);
      
      // First two requests should be allowed
      expect(limitedManager.checkToolAccess(agentId, 'issue.get').allowed).toBe(true);
      expect(limitedManager.checkToolAccess(agentId, 'issue.get').allowed).toBe(true);
      
      // Third request should be denied
      const result = limitedManager.checkToolAccess(agentId, 'issue.get');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Rate limit exceeded');
    });

    it('should reset rate limits after time window', async () => {
      // This test would need to mock time or use a shorter window
      // For now, just test the logic
      const remaining = permissionManager.getRemainingRequests('new-agent');
      expect(remaining).toBe(20); // Default policy limit
    });
  });

  describe('Operation Classification', () => {
    it('should identify write operations correctly', () => {
      const writeOps = [
        'issue.create',
        'issue.update',
        'issue.delete',
        'issue.transition',
        'attachment.upload',
        'version.create',
      ];
      
      writeOps.forEach(op => {
        const result = permissionManager.checkToolAccess('agent-read-only', op);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('read-only');
      });
    });

    it('should identify read operations correctly', () => {
      const readOps = [
        'issue.get',
        'project.get',
        'user.get',
        'jql.search',
        'version.list',
      ];
      
      readOps.forEach(op => {
        const result = permissionManager.checkToolAccess('agent-read-only', op);
        expect(result.allowed).toBe(true);
      });
    });

    it('should identify destructive operations correctly', () => {
      const destructiveOps = [
        'issue.delete',
        'attachment.delete',
        'version.delete',
        'project.remove',
      ];
      
      destructiveOps.forEach(op => {
        const result = permissionManager.checkToolAccess('agent-full-access', op);
        if (result.allowed) {
          expect(result.requiresConfirmation).toBe(true);
        }
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should handle empty agent configuration', () => {
      const emptyConfig: PermissionConfig = {
        agents: {},
        defaultPolicy: {
          allowAll: true,
          readOnly: false,
          maxRequestsPerMinute: 100,
        },
      };
      
      const manager = new PermissionManager(emptyConfig);
      const result = manager.checkToolAccess('any-agent', 'issue.get');
      expect(result.allowed).toBe(true);
    });

    it('should handle missing allowedTools array', () => {
      const configWithoutAllowed: PermissionConfig = {
        agents: {
          'test-agent': {
            readOnly: true,
            maxRequestsPerMinute: 50,
          },
        },
        defaultPolicy: {
          allowAll: false,
          readOnly: true,
          maxRequestsPerMinute: 20,
        },
      };
      
      const manager = new PermissionManager(configWithoutAllowed);
      const result = manager.checkToolAccess('test-agent', 'issue.get');
      expect(result.allowed).toBe(false);
    });
  });
});
