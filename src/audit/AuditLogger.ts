import { logger } from '../utils/logger.js';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export enum AuditEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  TOOL_EXECUTION = 'tool_execution',
  DATA_ACCESS = 'data_access',
  CONFIGURATION = 'configuration',
  SECURITY_VIOLATION = 'security_violation',
  RATE_LIMIT = 'rate_limit',
  ERROR = 'error',
}

export interface AuditEvent {
  timestamp: string;
  eventType: AuditEventType;
  userId?: string;
  agentId?: string;
  sessionId?: string;
  action: string;
  resource?: string;
  outcome: 'success' | 'failure' | 'blocked';
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class AuditLogger {
  private auditDir: string;
  private enabled: boolean;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private retentionDays: number = 90;

  constructor(auditDir: string = './logs/audit', enabled: boolean = true) {
    this.auditDir = auditDir;
    this.enabled = enabled;
    
    if (this.enabled) {
      this.ensureAuditDirectory();
    }
  }

  /**
   * Log authentication events
   */
  logAuthentication(event: {
    userId?: string;
    action: string;
    outcome: 'success' | 'failure';
    details?: any;
    ipAddress?: string;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.AUTHENTICATION,
      severity: event.outcome === 'failure' ? 'high' : 'medium',
      ...event,
    });
  }

  /**
   * Log authorization events
   */
  logAuthorization(event: {
    userId?: string;
    agentId?: string;
    action: string;
    resource?: string;
    outcome: 'success' | 'failure' | 'blocked';
    details?: any;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.AUTHORIZATION,
      severity: event.outcome === 'blocked' ? 'high' : 'medium',
      ...event,
    });
  }

  /**
   * Log tool execution events
   */
  logToolExecution(event: {
    userId?: string;
    agentId?: string;
    action: string;
    resource?: string;
    outcome: 'success' | 'failure';
    details?: any;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.TOOL_EXECUTION,
      severity: this.isDestructiveAction(event.action) ? 'high' : 'low',
      ...event,
    });
  }

  /**
   * Log data access events
   */
  logDataAccess(event: {
    userId?: string;
    agentId?: string;
    action: string;
    resource?: string;
    outcome: 'success' | 'failure';
    details?: any;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.DATA_ACCESS,
      severity: 'low',
      ...event,
    });
  }

  /**
   * Log security violations
   */
  logSecurityViolation(event: {
    userId?: string;
    agentId?: string;
    action: string;
    details?: any;
    ipAddress?: string;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.SECURITY_VIOLATION,
      outcome: 'blocked',
      severity: 'critical',
      ...event,
    });
  }

  /**
   * Log rate limiting events
   */
  logRateLimit(event: {
    userId?: string;
    agentId?: string;
    action: string;
    resource?: string;
    details?: any;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.RATE_LIMIT,
      outcome: 'blocked',
      severity: 'medium',
      ...event,
    });
  }

  /**
   * Log configuration changes
   */
  logConfiguration(event: {
    userId?: string;
    action: string;
    details?: any;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.CONFIGURATION,
      outcome: 'success',
      severity: 'high',
      ...event,
    });
  }

  /**
   * Log error events
   */
  logError(event: {
    userId?: string;
    agentId?: string;
    action: string;
    details?: any;
    requestId?: string;
  }): void {
    this.log({
      eventType: AuditEventType.ERROR,
      outcome: 'failure',
      severity: 'medium',
      ...event,
    });
  }

  /**
   * Core logging method
   */
  private log(event: Partial<AuditEvent>): void {
    if (!this.enabled) return;

    const auditEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      eventType: event.eventType!,
      userId: event.userId,
      agentId: event.agentId,
      sessionId: event.sessionId,
      action: event.action!,
      resource: event.resource,
      outcome: event.outcome || 'success',
      details: this.sanitizeDetails(event.details),
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      requestId: event.requestId,
      severity: event.severity || 'low',
    };

    try {
      // Write to audit log file
      this.writeToFile(auditEvent);
      
      // Also log to application logger for immediate visibility
      this.logToApplication(auditEvent);
    } catch (error) {
      logger.error('Failed to write audit log', error);
    }
  }

  /**
   * Write audit event to file
   */
  private writeToFile(event: AuditEvent): void {
    const date = new Date().toISOString().split('T')[0];
    const filename = `audit-${date}.jsonl`;
    const filepath = join(this.auditDir, filename);
    
    const logLine = JSON.stringify(event) + '\n';
    
    try {
      appendFileSync(filepath, logLine, 'utf8');
    } catch (error) {
      // If file doesn't exist or directory issues, create it
      this.ensureAuditDirectory();
      appendFileSync(filepath, logLine, 'utf8');
    }
  }

  /**
   * Log to application logger
   */
  private logToApplication(event: AuditEvent): void {
    const logLevel = this.getLogLevel(event.severity);
    const message = `AUDIT: ${event.eventType} - ${event.action}`;
    
    logger[logLevel](message, {
      audit: true,
      eventType: event.eventType,
      outcome: event.outcome,
      userId: event.userId,
      agentId: event.agentId,
      resource: event.resource,
      requestId: event.requestId,
      severity: event.severity,
    });
  }

  /**
   * Get log level based on severity
   */
  private getLogLevel(severity: string): 'debug' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warn';
      case 'medium': return 'info';
      case 'low': return 'debug';
      default: return 'info';
    }
  }

  /**
   * Check if action is destructive
   */
  private isDestructiveAction(action: string): boolean {
    const destructivePatterns = ['delete', 'remove', 'destroy', 'purge', 'drop'];
    return destructivePatterns.some(pattern => action.toLowerCase().includes(pattern));
  }

  /**
   * Sanitize sensitive details
   */
  private sanitizeDetails(details: any): any {
    if (!details) return details;
    
    const sanitized = { ...details };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Ensure audit directory exists
   */
  private ensureAuditDirectory(): void {
    if (!existsSync(this.auditDir)) {
      mkdirSync(this.auditDir, { recursive: true });
    }
  }

  /**
   * Get audit statistics
   */
  getStats(): { enabled: boolean; directory: string; retentionDays: number } {
    return {
      enabled: this.enabled,
      directory: this.auditDir,
      retentionDays: this.retentionDays,
    };
  }

  /**
   * Enable/disable audit logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.logConfiguration({
      action: `audit_logging_${enabled ? 'enabled' : 'disabled'}`,
      details: { enabled },
    });
  }
}
