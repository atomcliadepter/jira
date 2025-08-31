import { JiraRestClient, JiraConfig, JiraConfigSchema } from './JiraRestClient.js';
import { OAuthManager, OAuthConfig, TokenSet } from '../auth/OAuthManager.js';
import { RateLimitManager } from '../rate/RateLimitManager.js';
import { FieldSchemaCache } from '../schema/FieldSchemaCache.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const EnhancedJiraConfigSchema = JiraConfigSchema.extend({
  // OAuth 2.0 configuration
  oauthClientId: z.string().optional(),
  oauthClientSecret: z.string().optional(),
  oauthRedirectUri: z.string().url().optional(),
  oauthScopes: z.array(z.string()).optional(),
  
  // Multi-site support
  siteId: z.string().optional(),
  autoRefreshTokens: z.boolean().default(true),
});

export type EnhancedJiraConfig = z.infer<typeof EnhancedJiraConfigSchema>;

export class EnhancedJiraRestClient extends JiraRestClient {
  private oauthManager?: OAuthManager;
  private siteId?: string;
  private autoRefresh: boolean;
  private rateLimitManager: RateLimitManager;
  private fieldSchemaCache: FieldSchemaCache;

  constructor(config: EnhancedJiraConfig) {
    const enhancedConfig = EnhancedJiraConfigSchema.parse(config);
    super(enhancedConfig);
    
    this.siteId = enhancedConfig.siteId;
    this.autoRefresh = enhancedConfig.autoRefreshTokens;

    // Initialize rate limiting
    this.rateLimitManager = new RateLimitManager({
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
    });

    // Initialize field schema cache
    this.fieldSchemaCache = new FieldSchemaCache(this);

    // Initialize OAuth if configured
    if (enhancedConfig.oauthClientId && enhancedConfig.oauthClientSecret) {
      this.initializeOAuth(enhancedConfig);
    }
  }

  private initializeOAuth(config: EnhancedJiraConfig): void {
    if (!config.oauthClientId || !config.oauthClientSecret || !config.oauthRedirectUri) {
      logger.warn('OAuth configuration incomplete, falling back to API token');
      return;
    }

    const oauthConfig: OAuthConfig = {
      clientId: config.oauthClientId,
      clientSecret: config.oauthClientSecret,
      redirectUri: config.oauthRedirectUri,
      scopes: config.oauthScopes || ['read:jira-user', 'read:jira-work', 'write:jira-work'],
    };

    this.oauthManager = new OAuthManager(oauthConfig);
    logger.info('OAuth manager initialized');
  }

  /**
   * Start OAuth flow and return authorization URL
   */
  startOAuthFlow(state?: string): string {
    if (!this.oauthManager) {
      throw new Error('OAuth not configured');
    }
    
    const authUrl = this.oauthManager.generateAuthUrl(state);
    logger.info('OAuth flow started', { authUrl });
    return authUrl;
  }

  /**
   * Complete OAuth flow with authorization code
   */
  async completeOAuthFlow(code: string): Promise<TokenSet> {
    if (!this.oauthManager) {
      throw new Error('OAuth not configured');
    }

    const tokenSet = await this.oauthManager.exchangeCode(code);
    
    // Update client with new token
    this.updateAuthHeader(tokenSet.access_token);
    
    // If siteId specified, update base URL
    if (this.siteId) {
      await this.updateBaseUrlForSite(this.siteId);
    }
    
    return tokenSet;
  }

  /**
   * Set tokens from storage
   */
  async setTokens(tokenSet: TokenSet): Promise<void> {
    if (!this.oauthManager) {
      throw new Error('OAuth not configured');
    }

    this.oauthManager.setTokenSet(tokenSet);
    this.updateAuthHeader(tokenSet.access_token);
    
    // Fetch accessible resources
    await this.oauthManager.fetchAccessibleResources();
    
    // Update base URL if siteId specified
    if (this.siteId) {
      await this.updateBaseUrlForSite(this.siteId);
    }
  }

  /**
   * Update base URL for specific site
   */
  private async updateBaseUrlForSite(siteId: string): Promise<void> {
    if (!this.oauthManager) {
      throw new Error('OAuth not configured');
    }

    const baseUrl = this.oauthManager.getBaseUrlForSite(siteId);
    if (!baseUrl) {
      throw new Error(`Site ${siteId} not found in accessible resources`);
    }

    // Update client base URL
    this.client.defaults.baseURL = baseUrl;
    logger.info('Base URL updated for site', { siteId, baseUrl });
  }

  /**
   * Update authorization header
   */
  private updateAuthHeader(accessToken: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    logger.debug('Authorization header updated');
  }

  /**
   * Get accessible resources
   */
  async getAccessibleResources() {
    if (!this.oauthManager) {
      throw new Error('OAuth not configured');
    }

    return this.oauthManager.getAccessibleResources();
  }

  /**
   * Override request method to handle token refresh and rate limiting
   */
  async request<T = any>(config: any): Promise<T> {
    const endpoint = config.url || config;
    const rateLimitKey = `${this.config.baseUrl}:${endpoint}`;

    // Check rate limit
    const rateLimitInfo = this.rateLimitManager.checkLimit(rateLimitKey);
    if (rateLimitInfo.retryAfter) {
      const error = new Error(`Rate limit exceeded. Retry after ${rateLimitInfo.retryAfter} seconds`);
      (error as any).code = 429;
      (error as any).retryAfter = rateLimitInfo.retryAfter;
      throw error;
    }

    // Check if token needs refresh
    if (this.oauthManager && this.autoRefresh && this.oauthManager.needsRefresh()) {
      try {
        logger.info('Refreshing OAuth token');
        const newTokenSet = await this.oauthManager.refreshToken();
        this.updateAuthHeader(newTokenSet.access_token);
      } catch (error) {
        logger.error('Failed to refresh token', error);
        throw new Error('Authentication expired, please re-authenticate');
      }
    }

    try {
      const response = await super.request(config);
      return response.data as T;
    } catch (error: any) {
      // Handle 429 rate limit responses
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        this.rateLimitManager.handle429Response(rateLimitKey, retryAfter);
        
        // Add retry information to error
        error.retryAfter = retryAfter ? parseInt(retryAfter) : 60;
        error.rateLimitInfo = this.rateLimitManager.getLimitInfo(rateLimitKey);
      }
      
      throw error;
    }
  }

  /**
   * Check if using OAuth authentication
   */
  isUsingOAuth(): boolean {
    return !!this.oauthManager;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.oauthManager?.getAccessToken() || null;
  }

  /**
   * Get field schema cache
   */
  getFieldSchemaCache(): FieldSchemaCache {
    return this.fieldSchemaCache;
  }

  /**
   * Get rate limit manager
   */
  getRateLimitManager(): RateLimitManager {
    return this.rateLimitManager;
  }

  /**
   * Get rate limit info for endpoint
   */
  getRateLimitInfo(endpoint?: string): any {
    const key = endpoint ? `${this.config.baseUrl}:${endpoint}` : this.config.baseUrl;
    return this.rateLimitManager.getLimitInfo(key);
  }
}
