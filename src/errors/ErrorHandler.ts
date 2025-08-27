/**
 * Advanced Error Handling and Recovery System
 * Provides comprehensive error management with automatic recovery
 */

import { EventEmitter } from 'events';
import { metricsCollector } from '../monitoring/MetricsCollector.js';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  PERMISSION = 'permission',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  operation: string;
  toolName?: string;
  userId?: string;
  requestId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ErrorInfo {
  id: string;
  error: Error;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  retryCount: number;
  resolved: boolean;
  resolvedAt?: number;
  recoveryAction?: string;
}

export interface RecoveryStrategy {
  name: string;
  condition: (error: ErrorInfo) => boolean;
  action: (error: ErrorInfo) => Promise<boolean>;
  maxRetries: number;
  backoffMs: number;
}

export class ErrorHandler extends EventEmitter {
  private errors: Map<string, ErrorInfo> = new Map();
  private recoveryStrategies: RecoveryStrategy[] = [];
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private readonly maxErrorHistory = 1000;

  constructor() {
    super();
    this.setupDefaultRecoveryStrategies();
    this.startErrorCleanup();
  }

  /**
   * Handle an error with automatic categorization and recovery
   */
  async handleError(
    error: Error,
    context: ErrorContext,
    severity?: ErrorSeverity
  ): Promise<{ recovered: boolean; action?: string }> {
    const errorId = this.generateErrorId();
    const category = this.categorizeError(error);
    const computedSeverity = severity || this.determineSeverity(error, category);

    const errorInfo: ErrorInfo = {
      id: errorId,
      error,
      severity: computedSeverity,
      category,
      context,
      retryCount: 0,
      resolved: false
    };

    this.errors.set(errorId, errorInfo);
    this.emit('error', errorInfo);

    // Record metrics
    metricsCollector.incrementCounter('errors_total', 1, {
      severity: computedSeverity,
      category,
      operation: context.operation,
      tool: context.toolName || 'unknown'
    });

    // Update circuit breaker
    this.updateCircuitBreaker(context.operation, false);

    // Attempt recovery
    const recoveryResult = await this.attemptRecovery(errorInfo);

    // Log error details
    this.logError(errorInfo, recoveryResult);

    return recoveryResult;
  }

  /**
   * Add a custom recovery strategy
   */
  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): Record<string, any> {
    const recentErrors = Array.from(this.errors.values())
      .filter(error => Date.now() - error.context.timestamp < 24 * 60 * 60 * 1000); // Last 24 hours

    const stats = {
      total: recentErrors.length,
      resolved: recentErrors.filter(e => e.resolved).length,
      bySeverity: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byOperation: {} as Record<string, number>,
      recoveryRate: 0,
      avgResolutionTime: 0
    };

    // Calculate statistics
    recentErrors.forEach(error => {
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      stats.byOperation[error.context.operation] = (stats.byOperation[error.context.operation] || 0) + 1;
    });

    const resolvedErrors = recentErrors.filter(e => e.resolved && e.resolvedAt);
    stats.recoveryRate = resolvedErrors.length / recentErrors.length;
    
    if (resolvedErrors.length > 0) {
      const totalResolutionTime = resolvedErrors.reduce((sum, error) => {
        return sum + (error.resolvedAt! - error.context.timestamp);
      }, 0);
      stats.avgResolutionTime = totalResolutionTime / resolvedErrors.length;
    }

    return stats;
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [operation, breaker] of this.circuitBreakers) {
      status[operation] = {
        state: breaker.getState(),
        failureCount: breaker.getFailureCount(),
        successCount: breaker.getSuccessCount(),
        lastFailure: breaker.getLastFailure(),
        nextAttempt: breaker.getNextAttempt()
      };
    }
    
    return status;
  }

  /**
   * Check if operation should be allowed (circuit breaker)
   */
  shouldAllowOperation(operation: string): boolean {
    const breaker = this.circuitBreakers.get(operation);
    return breaker ? breaker.canExecute() : true;
  }

  /**
   * Record successful operation (circuit breaker)
   */
  recordSuccess(operation: string): void {
    this.updateCircuitBreaker(operation, true);
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit: number = 50): ErrorInfo[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.context.timestamp - a.context.timestamp)
      .slice(0, limit);
  }

  private async attemptRecovery(errorInfo: ErrorInfo): Promise<{ recovered: boolean; action?: string }> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.condition(errorInfo)) {
        try {
          const recovered = await strategy.action(errorInfo);
          
          if (recovered) {
            errorInfo.resolved = true;
            errorInfo.resolvedAt = Date.now();
            errorInfo.recoveryAction = strategy.name;
            
            metricsCollector.incrementCounter('error_recovery_success', 1, {
              strategy: strategy.name,
              category: errorInfo.category,
              severity: errorInfo.severity
            });

            this.emit('recovery', errorInfo);
            return { recovered: true, action: strategy.name };
          }
        } catch (recoveryError) {
          metricsCollector.incrementCounter('error_recovery_failed', 1, {
            strategy: strategy.name,
            category: errorInfo.category
          });
        }
      }
    }

    return { recovered: false };
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused')) {
      return ErrorCategory.NETWORK;
    }
    
    if (message.includes('unauthorized') || message.includes('authentication') || name.includes('auth')) {
      return ErrorCategory.AUTHENTICATION;
    }
    
    if (message.includes('validation') || message.includes('invalid') || name.includes('validation')) {
      return ErrorCategory.VALIDATION;
    }
    
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCategory.RATE_LIMIT;
    }
    
    if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied')) {
      return ErrorCategory.PERMISSION;
    }
    
    if (message.includes('system') || message.includes('internal') || name.includes('system')) {
      return ErrorCategory.SYSTEM;
    }

    return ErrorCategory.UNKNOWN;
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors
    if (category === ErrorCategory.SYSTEM || error.message.includes('critical')) {
      return ErrorSeverity.CRITICAL;
    }
    
    // High severity errors
    if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.PERMISSION) {
      return ErrorSeverity.HIGH;
    }
    
    // Medium severity errors
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.RATE_LIMIT) {
      return ErrorSeverity.MEDIUM;
    }
    
    // Low severity errors
    return ErrorSeverity.LOW;
  }

  private setupDefaultRecoveryStrategies(): void {
    // Network error recovery with exponential backoff
    this.addRecoveryStrategy({
      name: 'network_retry',
      condition: (error) => error.category === ErrorCategory.NETWORK && error.retryCount < 3,
      action: async (error) => {
        error.retryCount++;
        const backoffMs = Math.pow(2, error.retryCount) * 1000;
        await this.sleep(backoffMs);
        return true; // Assume retry will work
      },
      maxRetries: 3,
      backoffMs: 1000
    });

    // Rate limit recovery
    this.addRecoveryStrategy({
      name: 'rate_limit_backoff',
      condition: (error) => error.category === ErrorCategory.RATE_LIMIT,
      action: async (error) => {
        const backoffMs = 60000; // Wait 1 minute for rate limit reset
        await this.sleep(backoffMs);
        return true;
      },
      maxRetries: 1,
      backoffMs: 60000
    });

    // Authentication token refresh
    this.addRecoveryStrategy({
      name: 'auth_token_refresh',
      condition: (error) => error.category === ErrorCategory.AUTHENTICATION,
      action: async (error) => {
        // In a real implementation, this would refresh the auth token
        // For now, we'll just log the attempt
        console.log('Attempting to refresh authentication token');
        return false; // Cannot automatically recover from auth errors
      },
      maxRetries: 1,
      backoffMs: 0
    });

    // Validation error recovery (data sanitization)
    this.addRecoveryStrategy({
      name: 'validation_sanitize',
      condition: (error) => error.category === ErrorCategory.VALIDATION && error.retryCount < 1,
      action: async (error) => {
        error.retryCount++;
        // In a real implementation, this would sanitize the input data
        console.log('Attempting to sanitize input data for validation error');
        return false; // Usually requires manual intervention
      },
      maxRetries: 1,
      backoffMs: 0
    });
  }

  private updateCircuitBreaker(operation: string, success: boolean): void {
    if (!this.circuitBreakers.has(operation)) {
      this.circuitBreakers.set(operation, new CircuitBreaker(operation));
    }
    
    const breaker = this.circuitBreakers.get(operation)!;
    
    if (success) {
      breaker.recordSuccess();
    } else {
      breaker.recordFailure();
    }
  }

  private logError(errorInfo: ErrorInfo, recoveryResult: { recovered: boolean; action?: string }): void {
    const logLevel = this.getLogLevel(errorInfo.severity);
    const logMessage = {
      errorId: errorInfo.id,
      message: errorInfo.error.message,
      severity: errorInfo.severity,
      category: errorInfo.category,
      operation: errorInfo.context.operation,
      toolName: errorInfo.context.toolName,
      recovered: recoveryResult.recovered,
      recoveryAction: recoveryResult.action,
      timestamp: new Date(errorInfo.context.timestamp).toISOString()
    };

    console[logLevel]('Error handled:', JSON.stringify(logMessage, null, 2));
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
      default:
        return 'info';
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startErrorCleanup(): void {
    // Clean up old errors every hour
    setInterval(() => {
      const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
      
      for (const [id, error] of this.errors) {
        if (error.context.timestamp < cutoffTime) {
          this.errors.delete(id);
        }
      }
      
      // Keep only recent errors if we exceed the limit
      if (this.errors.size > this.maxErrorHistory) {
        const sortedErrors = Array.from(this.errors.entries())
          .sort(([, a], [, b]) => b.context.timestamp - a.context.timestamp);
        
        this.errors.clear();
        sortedErrors.slice(0, this.maxErrorHistory).forEach(([id, error]) => {
          this.errors.set(id, error);
        });
      }
    }, 60 * 60 * 1000); // Every hour
  }
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailure?: number;
  private nextAttempt?: number;
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 60000; // 1 minute

  constructor(private operation: string) {}

  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }
    
    if (this.state === 'open') {
      if (this.nextAttempt && Date.now() >= this.nextAttempt) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    
    // half-open state
    return true;
  }

  recordSuccess(): void {
    this.successCount++;
    this.failureCount = 0;
    
    if (this.state === 'half-open') {
      this.state = 'closed';
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailure = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.recoveryTimeout;
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  getSuccessCount(): number {
    return this.successCount;
  }

  getLastFailure(): number | undefined {
    return this.lastFailure;
  }

  getNextAttempt(): number | undefined {
    return this.nextAttempt;
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();
