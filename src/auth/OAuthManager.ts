import axios from 'axios';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

export const OAuthConfigSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  redirectUri: z.string().url(),
  scopes: z.array(z.string()).default(['read:jira-user', 'read:jira-work', 'write:jira-work']),
});

export const TokenSetSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  token_type: z.string().default('Bearer'),
  scope: z.string(),
});

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;
export type TokenSet = z.infer<typeof TokenSetSchema>;

export interface AccessibleResource {
  id: string;
  name: string;
  url: string;
  scopes: string[];
  avatarUrl: string;
}

export class OAuthManager {
  private config: OAuthConfig;
  private tokenSet?: TokenSet;
  private accessibleResources?: AccessibleResource[];

  constructor(config: OAuthConfig) {
    this.config = OAuthConfigSchema.parse(config);
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: this.config.clientId,
      scope: this.config.scopes.join(' '),
      redirect_uri: this.config.redirectUri,
      state: state || 'mcp-jira-auth',
      response_type: 'code',
      prompt: 'consent',
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<TokenSet> {
    try {
      const response = await axios.post('https://auth.atlassian.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      this.tokenSet = TokenSetSchema.parse(response.data);
      logger.info('OAuth tokens obtained successfully');
      
      // Fetch accessible resources
      await this.fetchAccessibleResources();
      
      return this.tokenSet;
    } catch (error: any) {
      logger.error('Failed to exchange OAuth code', error);
      throw new Error(`OAuth code exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<TokenSet> {
    if (!this.tokenSet?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post('https://auth.atlassian.com/oauth/token', {
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.tokenSet.refresh_token,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      this.tokenSet = TokenSetSchema.parse(response.data);
      logger.info('OAuth tokens refreshed successfully');
      
      return this.tokenSet;
    } catch (error: any) {
      logger.error('Failed to refresh OAuth token', error);
      throw new Error(`Token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Fetch accessible Atlassian resources
   */
  async fetchAccessibleResources(): Promise<AccessibleResource[]> {
    if (!this.tokenSet) {
      throw new Error('No access token available');
    }

    try {
      const response = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: {
          'Authorization': `Bearer ${this.tokenSet.access_token}`,
          'Accept': 'application/json',
        },
      });

      this.accessibleResources = response.data;
      logger.info('Accessible resources fetched', { count: this.accessibleResources?.length });
      
      return this.accessibleResources || [];
    } catch (error: any) {
      logger.error('Failed to fetch accessible resources', error);
      throw new Error(`Failed to fetch resources: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get base URL for a specific site
   */
  getBaseUrlForSite(siteId: string): string | null {
    const resource = this.accessibleResources?.find(r => r.id === siteId);
    return resource?.url || null;
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh(): boolean {
    if (!this.tokenSet) return true;
    
    // Check if token expires in next 5 minutes
    const expiryTime = Date.now() + (this.tokenSet.expires_in * 1000);
    const refreshThreshold = Date.now() + (5 * 60 * 1000);
    
    return expiryTime <= refreshThreshold;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.tokenSet?.access_token || null;
  }

  /**
   * Get accessible resources
   */
  getAccessibleResources(): AccessibleResource[] {
    return this.accessibleResources || [];
  }

  /**
   * Set token set (for loading from storage)
   */
  setTokenSet(tokenSet: TokenSet): void {
    this.tokenSet = TokenSetSchema.parse(tokenSet);
  }
}
