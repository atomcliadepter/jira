import { RateLimitManager } from '../../src/rate/RateLimitManager.js';

describe('Rate Limit Manager Tests', () => {
  let rateLimitManager: RateLimitManager;

  beforeEach(() => {
    rateLimitManager = new RateLimitManager({
      maxRequests: 5,
      windowMs: 1000, // 1 second for testing
    });
  });

  test('should allow requests within limit', () => {
    const key = 'test-key';
    
    for (let i = 0; i < 5; i++) {
      const info = rateLimitManager.checkLimit(key);
      expect(info.remaining).toBe(4 - i);
      expect(info.retryAfter).toBeUndefined();
    }
  });

  test('should block requests exceeding limit', () => {
    const key = 'test-key';
    
    // Use up the limit
    for (let i = 0; i < 5; i++) {
      rateLimitManager.checkLimit(key);
    }
    
    // Next request should be blocked
    const info = rateLimitManager.checkLimit(key);
    expect(info.remaining).toBe(0);
    expect(info.retryAfter).toBeGreaterThan(0);
  });

  test('should reset after window expires', async () => {
    const key = 'test-key';
    
    // Use up the limit
    for (let i = 0; i < 6; i++) {
      rateLimitManager.checkLimit(key);
    }
    
    // Should be blocked
    let info = rateLimitManager.checkLimit(key);
    expect(info.remaining).toBe(0);
    
    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Should be reset
    info = rateLimitManager.checkLimit(key);
    expect(info.remaining).toBe(4);
    expect(info.retryAfter).toBeUndefined();
  });

  test('should handle 429 responses', () => {
    const key = 'test-key';
    
    rateLimitManager.handle429Response(key, '30');
    
    const info = rateLimitManager.getLimitInfo(key);
    expect(info.remaining).toBe(0);
    expect(info.retryAfter).toBe(30);
  });

  test('should calculate exponential backoff', () => {
    const delay1 = rateLimitManager.calculateBackoff(0, 1000);
    const delay2 = rateLimitManager.calculateBackoff(1, 1000);
    const delay3 = rateLimitManager.calculateBackoff(2, 1000);
    
    expect(delay1).toBeGreaterThanOrEqual(1000);
    expect(delay1).toBeLessThan(1200); // With jitter
    
    expect(delay2).toBeGreaterThanOrEqual(2000);
    expect(delay2).toBeLessThan(2400);
    
    expect(delay3).toBeGreaterThanOrEqual(4000);
    expect(delay3).toBeLessThan(4800);
  });

  test('should cap backoff at maximum', () => {
    const delay = rateLimitManager.calculateBackoff(10, 1000);
    expect(delay).toBeLessThanOrEqual(60000); // Max 60 seconds
  });

  test('should reset specific key', () => {
    const key1 = 'test-key-1';
    const key2 = 'test-key-2';
    
    // Use up limits for both keys
    for (let i = 0; i < 6; i++) {
      rateLimitManager.checkLimit(key1);
      rateLimitManager.checkLimit(key2);
    }
    
    // Both should be blocked
    expect(rateLimitManager.getLimitInfo(key1).remaining).toBe(0);
    expect(rateLimitManager.getLimitInfo(key2).remaining).toBe(0);
    
    // Reset only key1
    rateLimitManager.reset(key1);
    
    // Key1 should be reset, key2 still blocked
    expect(rateLimitManager.getLimitInfo(key1).remaining).toBe(5);
    expect(rateLimitManager.getLimitInfo(key2).remaining).toBe(0);
  });

  test('should handle different keys independently', () => {
    const key1 = 'test-key-1';
    const key2 = 'test-key-2';
    
    // Use up limit for key1
    for (let i = 0; i < 6; i++) {
      rateLimitManager.checkLimit(key1);
    }
    
    // Key1 should be blocked, key2 should be available
    expect(rateLimitManager.getLimitInfo(key1).remaining).toBe(0);
    expect(rateLimitManager.getLimitInfo(key2).remaining).toBe(5);
    
    // Key2 should still work
    const info = rateLimitManager.checkLimit(key2);
    expect(info.remaining).toBe(4);
  });

  test('should cleanup expired entries', async () => {
    const key = 'test-key';
    
    // Create an entry
    rateLimitManager.checkLimit(key);
    
    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Cleanup should remove expired entries
    rateLimitManager.cleanup();
    
    // New request should start fresh
    const info = rateLimitManager.checkLimit(key);
    expect(info.remaining).toBe(4);
  });
});
