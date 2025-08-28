
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Configuration schema
export const JiraConfigSchema = z.object({
  baseUrl: z.string().url(),
  email: z.string().email().optional(),
  apiToken: z.string().optional(),
  oauthAccessToken: z.string().optional(),
  timeout: z.number().default(30000),
  maxRetries: z.number().default(3),
  retryDelay: z.number().default(1000),
});

export type JiraConfig = z.infer<typeof JiraConfigSchema>;

// Error types
export class JiraApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'JiraApiError';
  }
}

export class JiraAuthError extends JiraApiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'JiraAuthError';
  }
}

export class JiraPermissionError extends JiraApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'JiraPermissionError';
  }
}

export class JiraNotFoundError extends JiraApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'JiraNotFoundError';
  }
}

// HTTP client for Jira REST API
export class JiraRestClient {
  private client: AxiosInstance;
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = JiraConfigSchema.parse(config);
    
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupAuth();
    this.setupInterceptors();
  }

  private setupAuth(): void {
    if (this.config.oauthAccessToken) {
      // OAuth Bearer token
      this.client.defaults.headers.common['Authorization'] = 
        `Bearer ${this.config.oauthAccessToken}`;
    } else if (this.config.email && this.config.apiToken) {
      // Basic auth with API token
      const credentials = Buffer.from(
        `${this.config.email}:${this.config.apiToken}`
      ).toString('base64');
      this.client.defaults.headers.common['Authorization'] = 
        `Basic ${credentials}`;
    } else {
      throw new JiraAuthError('No valid authentication method provided');
    }
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`[JIRA API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and retries
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle specific error types
        if (error.response) {
          const { status, data } = error.response;
          
          switch (status) {
            case 401:
              throw new JiraAuthError(
                data?.errorMessages?.[0] || 'Authentication failed'
              );
            case 403:
              throw new JiraPermissionError(
                data?.errorMessages?.[0] || 'Insufficient permissions'
              );
            case 404:
              throw new JiraNotFoundError(
                data?.errorMessages?.[0] || 'Resource not found'
              );
            case 429:
              // Rate limiting - implement retry with backoff
              originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
              
              if (originalRequest._retryCount <= this.config.maxRetries) {
                // Use Retry-After header if available, otherwise exponential backoff
                const retryAfter = error.response?.headers?.['retry-after'];
                let delay: number;
                
                if (retryAfter) {
                  delay = parseInt(retryAfter) * 1000; // Convert seconds to milliseconds
                } else {
                  delay = this.config.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.client(originalRequest);
              }
              break;
            default:
              throw new JiraApiError(
                data?.errorMessages?.[0] || `HTTP ${status} error`,
                status,
                data,
                error
              );
          }
        }

        // Network or other errors
        throw new JiraApiError(
          error.message || 'Network error',
          undefined,
          undefined,
          error
        );
      }
    );
  }

  // Core HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  // Jira-specific convenience methods
  async searchIssues(jql: string, options: {
    startAt?: number;
    maxResults?: number;
    fields?: string[];
    expand?: string[];
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    params.append('jql', jql);
    
    if (options.startAt !== undefined) params.append('startAt', options.startAt.toString());
    if (options.maxResults !== undefined) params.append('maxResults', options.maxResults.toString());
    if (options.fields) params.append('fields', options.fields.join(','));
    if (options.expand) params.append('expand', options.expand.join(','));

    return this.get(`/rest/api/3/search?${params.toString()}`);
  }

  async getIssue(issueIdOrKey: string, options: {
    fields?: string[];
    expand?: string[];
    properties?: string[];
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (options.fields) params.append('fields', options.fields.join(','));
    if (options.expand) params.append('expand', options.expand.join(','));
    if (options.properties) params.append('properties', options.properties.join(','));

    const queryString = params.toString();
    const url = `/rest/api/3/issue/${issueIdOrKey}${queryString ? `?${queryString}` : ''}`;
    
    return this.get(url);
  }

  async createIssue(issueData: any): Promise<any> {
    return this.post('/rest/api/3/issue', issueData);
  }

  async updateIssue(issueIdOrKey: string, updateData: any): Promise<any> {
    return this.put(`/rest/api/3/issue/${issueIdOrKey}`, updateData);
  }

  async deleteIssue(issueIdOrKey: string, deleteSubtasks: boolean = false): Promise<void> {
    const params = deleteSubtasks ? '?deleteSubtasks=true' : '';
    await this.delete(`/rest/api/3/issue/${issueIdOrKey}${params}`);
  }

  async transitionIssue(issueIdOrKey: string, transitionData: any): Promise<any> {
    return this.post(`/rest/api/3/issue/${issueIdOrKey}/transitions`, transitionData);
  }

  async getIssueTransitions(issueIdOrKey: string): Promise<any> {
    return this.get(`/rest/api/3/issue/${issueIdOrKey}/transitions`);
  }

  async addComment(issueIdOrKey: string, commentData: any): Promise<any> {
    return this.post(`/rest/api/3/issue/${issueIdOrKey}/comment`, commentData);
  }

  async getComments(issueIdOrKey: string, options: {
    startAt?: number;
    maxResults?: number;
    orderBy?: string;
    expand?: string[];
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (options.startAt !== undefined) params.append('startAt', options.startAt.toString());
    if (options.maxResults !== undefined) params.append('maxResults', options.maxResults.toString());
    if (options.orderBy) params.append('orderBy', options.orderBy);
    if (options.expand) params.append('expand', options.expand.join(','));

    const queryString = params.toString();
    const url = `/rest/api/3/issue/${issueIdOrKey}/comment${queryString ? `?${queryString}` : ''}`;
    
    return this.get(url);
  }

  // Project methods
  async getProject(projectIdOrKey: string, options: {
    expand?: string[];
    properties?: string[];
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (options.expand) params.append('expand', options.expand.join(','));
    if (options.properties) params.append('properties', options.properties.join(','));

    const queryString = params.toString();
    const url = `/rest/api/3/project/${projectIdOrKey}${queryString ? `?${queryString}` : ''}`;
    
    return this.get(url);
  }

  async searchProjects(options: {
    startAt?: number;
    maxResults?: number;
    orderBy?: string;
    query?: string;
    typeKey?: string;
    categoryId?: number;
    action?: string;
    expand?: string[];
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (options.startAt !== undefined) params.append('startAt', options.startAt.toString());
    if (options.maxResults !== undefined) params.append('maxResults', options.maxResults.toString());
    if (options.orderBy) params.append('orderBy', options.orderBy);
    if (options.query) params.append('query', options.query);
    if (options.typeKey) params.append('typeKey', options.typeKey);
    if (options.categoryId !== undefined) params.append('categoryId', options.categoryId.toString());
    if (options.action) params.append('action', options.action);
    if (options.expand) params.append('expand', options.expand.join(','));

    const queryString = params.toString();
    const url = `/rest/api/3/project/search${queryString ? `?${queryString}` : ''}`;
    
    return this.get(url);
  }

  // User methods
  async getUser(accountId: string, options: {
    expand?: string[];
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    params.append('accountId', accountId);
    
    if (options.expand) params.append('expand', options.expand.join(','));

    return this.get(`/rest/api/3/user?${params.toString()}`);
  }

  async searchUsers(query: string, options: {
    startAt?: number;
    maxResults?: number;
    property?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    params.append('query', query);
    
    if (options.startAt !== undefined) params.append('startAt', options.startAt.toString());
    if (options.maxResults !== undefined) params.append('maxResults', options.maxResults.toString());
    if (options.property) params.append('property', options.property);

    return this.get(`/rest/api/3/user/search?${params.toString()}`);
  }

  async getCurrentUser(): Promise<any> {
    return this.get('/rest/api/3/myself');
  }
}
