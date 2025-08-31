import { z } from 'zod';
import { logger } from '../utils/logger.js';

export const PermissionConfigSchema = z.object({
  agents: z.record(z.object({
    allowedTools: z.array(z.string()).optional(),
    deniedTools: z.array(z.string()).optional(),
    readOnly: z.boolean().default(false),
    maxRequestsPerMinute: z.number().default(100),
  })),
  defaultPolicy: z.object({
    allowAll: z.boolean().default(false),
    readOnly: z.boolean().default(true),
    maxRequestsPerMinute: z.number().default(50),
  }),
});

export type PermissionConfig = z.infer<typeof PermissionConfigSchema>;

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
}

export class PermissionManager {
  private config: PermissionConfig;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: PermissionConfig) {
    this.config = PermissionConfigSchema.parse(config);
  }

  /**
   * Check if agent can access a specific tool
   */
  checkToolAccess(agentId: string, toolName: string): ValidationResult {
    const agentConfig = this.config.agents[agentId];
    
    // Check rate limiting first
    if (!this.checkRateLimit(agentId)) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
      };
    }

    // Use agent-specific config or default
    const policy = agentConfig || this.config.defaultPolicy;

    // Check if tool is explicitly denied
    if (agentConfig?.deniedTools?.includes(toolName)) {
      return {
        allowed: false,
        reason: `Tool ${toolName} is denied for agent ${agentId}`,
      };
    }

    // Check if tool is explicitly allowed
    if (agentConfig?.allowedTools?.includes(toolName)) {
      return this.validateOperation(toolName, policy.readOnly);
    }

    // Check default policy
    if (this.config.defaultPolicy.allowAll) {
      return this.validateOperation(toolName, policy.readOnly);
    }

    return {
      allowed: false,
      reason: `Tool ${toolName} not in allowlist for agent ${agentId}`,
    };
  }

  /**
   * Validate operation based on read-only restrictions
   */
  private validateOperation(toolName: string, readOnly: boolean): ValidationResult {
    const isWriteOperation = this.isWriteOperation(toolName);
    
    if (readOnly && isWriteOperation) {
      return {
        allowed: false,
        reason: 'Write operations not allowed in read-only mode',
      };
    }

    // Destructive operations require confirmation
    if (this.isDestructiveOperation(toolName)) {
      return {
        allowed: true,
        requiresConfirmation: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if operation is a write operation
   */
  private isWriteOperation(toolName: string): boolean {
    const writePatterns = [
      'create', 'update', 'delete', 'transition', 'add', 'remove',
      'set', 'assign', 'execute', 'send', 'upload', 'move', 'merge'
    ];
    
    return writePatterns.some(pattern => toolName.includes(pattern));
  }

  /**
   * Check if operation is destructive
   */
  private isDestructiveOperation(toolName: string): boolean {
    const destructivePatterns = ['delete', 'remove', 'merge'];
    return destructivePatterns.some(pattern => toolName.includes(pattern));
  }

  /**
   * Check rate limiting for agent
   */
  private checkRateLimit(agentId: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    
    const agentConfig = this.config.agents[agentId];
    const maxRequests = agentConfig?.maxRequestsPerMinute || this.config.defaultPolicy.maxRequestsPerMinute;
    
    const current = this.requestCounts.get(agentId);
    
    if (!current || now > current.resetTime) {
      // Reset or initialize counter
      this.requestCounts.set(agentId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }
    
    if (current.count >= maxRequests) {
      return false;
    }
    
    current.count++;
    return true;
  }

  /**
   * Record successful request for rate limiting
   */
  recordRequest(agentId: string): void {
    // Rate limiting is handled in checkRateLimit
    logger.debug('Request recorded for agent', { agentId });
  }

  /**
   * Get remaining requests for agent
   */
  getRemainingRequests(agentId: string): number {
    const agentConfig = this.config.agents[agentId];
    const maxRequests = agentConfig?.maxRequestsPerMinute || this.config.defaultPolicy.maxRequestsPerMinute;
    
    const current = this.requestCounts.get(agentId);
    if (!current || Date.now() > current.resetTime) {
      return maxRequests;
    }
    
    return Math.max(0, maxRequests - current.count);
  }
}
