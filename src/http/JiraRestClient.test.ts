
import { JiraRestClient, JiraConfigSchema, JiraApiError, JiraAuthError } from './JiraRestClient';

describe('JiraRestClient', () => {
  describe('Configuration validation', () => {
    it('should validate valid configuration', () => {
      const config = {
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      };
      
      expect(() => JiraConfigSchema.parse(config)).not.toThrow();
    });

    it('should reject invalid base URL', () => {
      const config = {
        baseUrl: 'invalid-url',
        email: 'test@example.com',
        apiToken: 'test-token',
      };
      
      expect(() => JiraConfigSchema.parse(config)).toThrow();
    });

    it('should reject invalid email', () => {
      const config = {
        baseUrl: 'https://test.atlassian.net',
        email: 'invalid-email',
        apiToken: 'test-token',
      };
      
      expect(() => JiraConfigSchema.parse(config)).toThrow();
    });
  });

  describe('Error handling', () => {
    it('should create JiraApiError with correct properties', () => {
      const error = new JiraApiError('Test error', 400, { error: 'Bad request' });
      
      expect(error.name).toBe('JiraApiError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.response).toEqual({ error: 'Bad request' });
    });

    it('should create JiraAuthError with default message', () => {
      const error = new JiraAuthError();
      
      expect(error.name).toBe('JiraAuthError');
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('Authentication setup', () => {
    it('should throw error when no authentication method provided', () => {
      const config = {
        baseUrl: 'https://test.atlassian.net',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      };
      
      expect(() => new JiraRestClient(config)).toThrow(JiraAuthError);
    });

    it('should accept API token authentication', () => {
      const config = {
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      };
      
      expect(() => new JiraRestClient(config)).not.toThrow();
    });

    it('should accept OAuth authentication', () => {
      const config = {
        baseUrl: 'https://test.atlassian.net',
        oauthAccessToken: 'oauth-token',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      };
      
      expect(() => new JiraRestClient(config)).not.toThrow();
    });
  });
});
