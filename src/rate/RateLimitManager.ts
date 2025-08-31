import { logger } from '../utils/logger.js';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimitManager {
  private limits: Map<string, { count: number; resetTime: number; blocked: boolean }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  checkLimit(key: string): RateLimitInfo {
    const now = Date.now();
    const current = this.limits.get(key);

    // Reset if window expired
    if (!current || now > current.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
        blocked: false,
      });

      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      };
    }

    // Check if blocked
    if (current.blocked) {
      return {
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: current.resetTime,
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      };
    }

    // Increment count
    current.count++;

    // Block if limit exceeded
    if (current.count > this.config.maxRequests) {
      current.blocked = true;
      logger.warn('Rate limit exceeded', { key, count: current.count, limit: this.config.maxRequests });

      return {
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: current.resetTime,
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      };
    }

    return {
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - current.count,
      resetTime: current.resetTime,
    };
  }

  /**
   * Handle 429 response from Jira API
   */
  handle429Response(key: string, retryAfter?: string): void {
    const retryMs = retryAfter ? parseInt(retryAfter) * 1000 : this.config.windowMs;
    const resetTime = Date.now() + retryMs;

    this.limits.set(key, {
      count: this.config.maxRequests + 1,
      resetTime,
      blocked: true,
    });

    logger.warn('API rate limit hit, backing off', { key, retryAfter: retryMs });
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateBackoff(attempt: number, baseDelay: number = 1000): number {
    const jitter = Math.random() * 0.1; // 10% jitter
    const delay = baseDelay * Math.pow(2, attempt) * (1 + jitter);
    return Math.min(delay, 60000); // Max 60 seconds
  }

  /**
   * Get rate limit info for key
   */
  getLimitInfo(key: string): RateLimitInfo {
    const now = Date.now();
    const current = this.limits.get(key);

    if (!current || now > current.resetTime) {
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
      };
    }

    return {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - current.count),
      resetTime: current.resetTime,
      retryAfter: current.blocked ? Math.ceil((current.resetTime - now) / 1000) : undefined,
    };
  }

  /**
   * Reset rate limit for key
   */
  reset(key: string): void {
    this.limits.delete(key);
    logger.debug('Rate limit reset', { key });
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, limit] of this.limits.entries()) {
      if (now > limit.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}
