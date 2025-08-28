
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Configuration schema
export const ConfluenceConfigSchema = z.object({
  baseUrl: z.string().url(),
  email: z.string().email().optional(),
  apiToken: z.string().optional(),
  oauthAccessToken: z.string().optional(),
  timeout: z.number().default(30000),
  maxRetries: z.number().default(3),
  retryDelay: z.number().default(1000),
});

export type ConfluenceConfig = z.infer<typeof ConfluenceConfigSchema>;

// Error types
export class ConfluenceApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ConfluenceApiError';
  }
}

export class ConfluenceAuthError extends ConfluenceApiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'ConfluenceAuthError';
  }
}

export class ConfluencePermissionError extends ConfluenceApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'ConfluencePermissionError';
  }
}

export class ConfluenceNotFoundError extends ConfluenceApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'ConfluenceNotFoundError';
  }
}

// HTTP client for Confluence REST API
export class ConfluenceRestClient {
  private client: AxiosInstance;
  private config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    this.config = ConfluenceConfigSchema.parse(config);
    
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
      throw new ConfluenceAuthError('No valid authentication method provided');
    }
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`[CONFLUENCE API] ${config.method?.toUpperCase()} ${config.url}`);
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
              throw new ConfluenceAuthError(
                data?.message || 'Authentication failed'
              );
            case 403:
              throw new ConfluencePermissionError(
                data?.message || 'Insufficient permissions'
              );
            case 404:
              throw new ConfluenceNotFoundError(
                data?.message || 'Resource not found'
              );
            case 429:
              // Rate limiting - implement retry with exponential backoff
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
                
                logger.warn(`[CONFLUENCE API] Rate limited. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.client(originalRequest);
              }
              break;
            default:
              throw new ConfluenceApiError(
                data?.message || `HTTP ${status} error`,
                status,
                data,
                error
              );
          }
        }

        throw new ConfluenceApiError(
          'Network error or request failed',
          undefined,
          undefined,
          error
        );
      }
    );
  }

  // Generic request method
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client(config);
      return response.data;
    } catch (error) {
      logger.error('[CONFLUENCE API] Request failed:', error);
      throw error;
    }
  }

  // GET request
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  // POST request
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  // PUT request
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  // DELETE request
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}
