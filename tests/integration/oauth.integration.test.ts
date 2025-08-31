import { OAuthManager } from '../../src/auth/OAuthManager.js';
import { EnhancedJiraRestClient } from '../../src/http/EnhancedJiraRestClient.js';
import { config } from 'dotenv';

// Load test environment
config({ path: '.env.test' });

describe('OAuth Integration Tests', () => {
  let oauthManager;
  let jiraClient;

  const testConfig = {
    clientId: process.env.OAUTH_CLIENT_ID || 'test-client-id',
    clientSecret: process.env.OAUTH_CLIENT_SECRET || 'test-client-secret',
    redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/callback',
    scopes: ['read:jira-user', 'read:jira-work', 'write:jira-work'],
  };

  beforeEach(() => {
    oauthManager = new OAuthManager(testConfig);
  });

  describe('OAuth Flow', () => {
    test('should generate valid authorization URL', () => {
      const authUrl = oauthManager.generateAuthUrl('test-state');
      
      expect(authUrl).toContain('https://auth.atlassian.com/authorize');
      expect(authUrl).toContain(`client_id=${testConfig.clientId}`);
      expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(testConfig.redirectUri)}`);
      expect(authUrl).toContain('state=test-state');
      expect(authUrl).toContain('response_type=code');
    });

    test('should handle invalid authorization code', async () => {
      await expect(oauthManager.exchangeCode('invalid-code'))
        .rejects
        .toThrow(/OAuth code exchange failed/);
    });

    test('should handle missing refresh token', async () => {
      await expect(oauthManager.refreshToken())
        .rejects
        .toThrow('No refresh token available');
    });
  });

  describe('Enhanced Jira Client with OAuth', () => {
    beforeEach(() => {
      jiraClient = new EnhancedJiraRestClient({
        baseUrl: process.env.JIRA_BASE_URL,
        email: process.env.JIRA_EMAIL,
        apiToken: process.env.JIRA_API_TOKEN,
        oauthClientId: testConfig.clientId,
        oauthClientSecret: testConfig.clientSecret,
        oauthRedirectUri: testConfig.redirectUri,
      });
    });

    test('should initialize with OAuth configuration', () => {
      expect(jiraClient.isUsingOAuth()).toBe(true);
    });

    test('should generate OAuth authorization URL', () => {
      const authUrl = jiraClient.startOAuthFlow('test-state');
      expect(authUrl).toContain('https://auth.atlassian.com/authorize');
    });

    test('should fall back to API token when OAuth not configured', () => {
      const clientWithoutOAuth = new EnhancedJiraRestClient({
        baseUrl: process.env.JIRA_BASE_URL,
        email: process.env.JIRA_EMAIL,
        apiToken: process.env.JIRA_API_TOKEN,
      });

      expect(clientWithoutOAuth.isUsingOAuth()).toBe(false);
    });
  });

  describe('Real Jira Environment Tests', () => {
    let realJiraClient;

    beforeEach(() => {
      // Use real Jira credentials from .env
      realJiraClient = new EnhancedJiraRestClient({
        baseUrl: process.env.JIRA_BASE_URL,
        email: process.env.JIRA_EMAIL,
        apiToken: process.env.JIRA_API_TOKEN,
      });
    });

    test('should connect to real Jira instance with API token', async () => {
      const response = await realJiraClient.get('/rest/api/3/myself');
      
      expect(response).toBeDefined();
      expect(response.accountId).toBeDefined();
      expect(response.emailAddress).toBe(process.env.JIRA_EMAIL);
    }, 10000);

    test('should fetch server info from real Jira', async () => {
      const serverInfo = await realJiraClient.get('/rest/api/3/serverInfo');
      
      expect(serverInfo).toBeDefined();
      expect(serverInfo.baseUrl).toBe(process.env.JIRA_BASE_URL);
      expect(serverInfo.deploymentType).toBe('Cloud');
    }, 10000);

    test('should handle authentication errors gracefully', async () => {
      const invalidClient = new EnhancedJiraRestClient({
        baseUrl: process.env.JIRA_BASE_URL,
        email: process.env.JIRA_EMAIL,
        apiToken: 'invalid-token',
      });

      await expect(invalidClient.get('/rest/api/3/myself'))
        .rejects
        .toThrow();
    }, 10000);
  });

  describe('Token Management', () => {
    test('should detect when token needs refresh', () => {
      const oauthManager = new OAuthManager(testConfig);
      
      // No token set
      expect(oauthManager.needsRefresh()).toBe(true);
      
      // Set token that expires soon
      const expiringSoon = {
        access_token: 'test-token',
        expires_in: 60, // 1 minute
        token_type: 'Bearer',
        scope: 'read:jira-user',
      };
      
      oauthManager.setTokenSet(expiringSoon);
      expect(oauthManager.needsRefresh()).toBe(true);
    });

    test('should get current access token', () => {
      const oauthManager = new OAuthManager(testConfig);
      
      expect(oauthManager.getAccessToken()).toBeNull();
      
      const tokenSet = {
        access_token: 'test-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read:jira-user',
      };
      
      oauthManager.setTokenSet(tokenSet);
      expect(oauthManager.getAccessToken()).toBe('test-access-token');
    });
  });
});
