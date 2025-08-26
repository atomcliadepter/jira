
/**
 * Health check utility for Q CLI compatibility
 */

import { JiraRestClient } from '../http/JiraRestClient.js';
import { logger } from './logger.js';
import { createError } from './errorCodes.js';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    jira_connection: HealthCheckResult;
    configuration: HealthCheckResult;
    memory: HealthCheckResult;
  };
  metadata: {
    nodeVersion: string;
    mcpVersion: string;
    buildDate: string;
  };
}

export interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration?: number;
  details?: any;
}

export class HealthChecker {
  private jiraClient: JiraRestClient;
  private startTime: number;

  constructor(jiraClient: JiraRestClient) {
    this.jiraClient = jiraClient;
    this.startTime = Date.now();
  }

  async performHealthCheck(): Promise<HealthStatus> {
    const requestId = `health_${Date.now()}`;
    logger.debug('Starting health check', undefined, requestId);

    const checks = {
      jira_connection: await this.checkJiraConnection(requestId),
      configuration: await this.checkConfiguration(requestId),
      memory: await this.checkMemoryUsage(requestId)
    };

    const overallStatus = this.determineOverallStatus(checks);
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.MCP_SERVER_VERSION || '1.0.0',
      uptime: Date.now() - this.startTime,
      checks,
      metadata: {
        nodeVersion: process.version,
        mcpVersion: '2024-11-05',
        buildDate: process.env.BUILD_DATE || '2025-08-15'
      }
    };

    logger.info('Health check completed', { status: overallStatus }, requestId);
    return healthStatus;
  }

  private async checkJiraConnection(requestId: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      logger.debug('Checking Jira connection', undefined, requestId);
      
      // Try to get current user info as a lightweight connection test
      await this.jiraClient.getCurrentUser();
      
      const duration = Date.now() - startTime;
      logger.debug('Jira connection check passed', { duration }, requestId);
      
      return {
        status: 'pass',
        message: 'Successfully connected to Jira API',
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.warn('Jira connection check failed', error, requestId);
      
      return {
        status: 'fail',
        message: 'Failed to connect to Jira API',
        duration,
        details: {
          error: error.message,
          code: error.code,
          category: error.category
        }
      };
    }
  }

  private async checkConfiguration(requestId: string): Promise<HealthCheckResult> {
    try {
      logger.debug('Checking configuration', undefined, requestId);
      
      const requiredEnvVars = ['JIRA_BASE_URL'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        return {
          status: 'fail',
          message: 'Missing required configuration',
          details: { missingVariables: missingVars }
        };
      }

      // Check authentication configuration
      const hasBasicAuth = process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN;
      const hasOAuth = process.env.JIRA_OAUTH_ACCESS_TOKEN;
      
      if (!hasBasicAuth && !hasOAuth) {
        return {
          status: 'fail',
          message: 'No valid authentication method configured',
          details: { 
            message: 'Either basic auth (JIRA_EMAIL + JIRA_API_TOKEN) or OAuth (JIRA_OAUTH_ACCESS_TOKEN) required'
          }
        };
      }

      logger.debug('Configuration check passed', undefined, requestId);
      return {
        status: 'pass',
        message: 'Configuration is valid'
      };
    } catch (error: any) {
      logger.warn('Configuration check failed', error, requestId);
      return {
        status: 'fail',
        message: 'Configuration validation failed',
        details: { error: error.message }
      };
    }
  }

  private async checkMemoryUsage(requestId: string): Promise<HealthCheckResult> {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

      logger.debug('Memory usage check', { heapUsedMB, heapTotalMB, heapUsagePercent }, requestId);

      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent}%)`;

      if (heapUsagePercent > 90) {
        status = 'fail';
        message = `Critical memory usage: ${heapUsagePercent}%`;
      } else if (heapUsagePercent > 75) {
        status = 'warn';
        message = `High memory usage: ${heapUsagePercent}%`;
      }

      return {
        status,
        message,
        details: {
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          heapUsagePercent,
          rss: Math.round(memUsage.rss / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        }
      };
    } catch (error: any) {
      logger.warn('Memory usage check failed', error, requestId);
      return {
        status: 'fail',
        message: 'Failed to check memory usage',
        details: { error: error.message }
      };
    }
  }

  private determineOverallStatus(checks: Record<string, HealthCheckResult>): 'healthy' | 'unhealthy' | 'degraded' {
    const results = Object.values(checks);
    
    if (results.every(check => check.status === 'pass')) {
      return 'healthy';
    }
    
    if (results.some(check => check.status === 'fail')) {
      return 'unhealthy';
    }
    
    return 'degraded';
  }

  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.performHealthCheck();
      return health.status === 'healthy';
    } catch (error) {
      logger.error('Health check failed', error);
      return false;
    }
  }
}
