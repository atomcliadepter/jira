
import { z } from 'zod';
import { logger, generateRequestId } from '../utils/logger.js';
import { createError, ErrorCodes, ErrorCategory } from '../utils/errorCodes.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AdvancedReporting, ExportConfigArgs } from './advancedReporting.js';
import { JiraRestClient } from '../http/JiraRestClient.js';

const ScheduledReportSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  query: z.any(),
  format: z.enum(['csv', 'pdf', 'excel']),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
    dayOfWeek: z.number().min(0).max(6).optional(), // 0-6 for weekly
    dayOfMonth: z.number().min(1).max(31).optional(), // 1-31 for monthly
    timezone: z.string().default('UTC')
  }),
  recipients: z.array(z.string().email()).optional(),
  enabled: z.boolean().default(true),
  lastRun: z.string().optional(),
  nextRun: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type ScheduledReport = z.infer<typeof ScheduledReportSchema>;

export class ScheduledReporting {
  private client: JiraRestClient;
  private requestId: string;
  private configPath: string;
  private reports: Map<string, ScheduledReport>;

  constructor(client: JiraRestClient) {
    this.client = client;
    this.requestId = generateRequestId();
    this.configPath = join(process.cwd(), 'config', 'scheduled-reports.json');
    this.reports = new Map();
    this.loadReports();
  }

  /**
   * Create a new scheduled report
   */
  async createScheduledReport(reportConfig: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledReport> {
    logger.info('Creating scheduled report', { name: reportConfig.name }, this.requestId);

    try {
      const validatedConfig = ScheduledReportSchema.parse({
        ...reportConfig,
        id: this.generateReportId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Calculate next run time
      validatedConfig.nextRun = this.calculateNextRun(validatedConfig.schedule);

      this.reports.set(validatedConfig.id!, validatedConfig);
      await this.saveReports();

      logger.info('Scheduled report created successfully', { id: validatedConfig.id }, this.requestId);
      return validatedConfig;

    } catch (error: any) {
      logger.error('Error creating scheduled report', { error: error.message }, this.requestId);
      throw createError(
        'JIRA_VALIDATION_ERROR',
        { originalError: error.message, message: `Failed to create scheduled report: ${error.message}` }
      );
    }
  }

  /**
   * Update an existing scheduled report
   */
  async updateScheduledReport(id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport> {
    logger.info('Updating scheduled report', { id }, this.requestId);

    try {
      const existingReport = this.reports.get(id);
      if (!existingReport) {
        throw new Error(`Scheduled report with ID ${id} not found`);
      }

      const updatedReport = ScheduledReportSchema.parse({
        ...existingReport,
        ...updates,
        id,
        updatedAt: new Date().toISOString()
      });

      // Recalculate next run if schedule changed
      if (updates.schedule) {
        updatedReport.nextRun = this.calculateNextRun(updatedReport.schedule);
      }

      this.reports.set(id, updatedReport);
      await this.saveReports();

      logger.info('Scheduled report updated successfully', { id }, this.requestId);
      return updatedReport;

    } catch (error: any) {
      logger.error('Error updating scheduled report', { error: error.message }, this.requestId);
      throw createError(
        'JIRA_EXECUTION_ERROR',
        { originalError: error.message, message: `Failed to update scheduled report: ${error.message}` }
      );
    }
  }

  /**
   * Delete a scheduled report
   */
  async deleteScheduledReport(id: string): Promise<boolean> {
    logger.info('Deleting scheduled report', { id }, this.requestId);

    try {
      const deleted = this.reports.delete(id);
      if (deleted) {
        await this.saveReports();
        logger.info('Scheduled report deleted successfully', { id }, this.requestId);
      }
      return deleted;

    } catch (error: any) {
      logger.error('Error deleting scheduled report', { error: error.message }, this.requestId);
      throw createError(
        'JIRA_EXECUTION_ERROR',
        { originalError: error.message, message: `Failed to delete scheduled report: ${error.message}` }
      );
    }
  }

  /**
   * Get all scheduled reports
   */
  getScheduledReports(): ScheduledReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * Get a specific scheduled report
   */
  getScheduledReport(id: string): ScheduledReport | undefined {
    return this.reports.get(id);
  }

  /**
   * Get reports that are due to run
   */
  getDueReports(): ScheduledReport[] {
    const now = new Date();
    return Array.from(this.reports.values()).filter(report => {
      if (!report.enabled || !report.nextRun) return false;
      return new Date(report.nextRun) <= now;
    });
  }

  /**
   * Execute a scheduled report
   */
  async executeScheduledReport(id: string): Promise<{ filePath: string; format: string }> {
    logger.info('Executing scheduled report', { id }, this.requestId);

    try {
      const report = this.reports.get(id);
      if (!report) {
        throw new Error(`Scheduled report with ID ${id} not found`);
      }

      if (!report.enabled) {
        throw new Error(`Scheduled report ${id} is disabled`);
      }

      // Execute the report query
      const advancedReporting = new AdvancedReporting(this.client);
      
      // Get data based on the query
      let data: any;
      if (report.query.jql) {
        const response = await this.client.searchIssues(report.query.jql, {
          maxResults: report.query.maxResults || 1000,
          fields: report.query.fields || ['summary', 'status', 'assignee', 'created', 'updated']
        });
        data = response.issues;
      } else if (report.query.type === 'dashboard') {
        data = await advancedReporting.generateDashboardMetrics(report.query);
      } else {
        throw new Error('Invalid query type in scheduled report');
      }

      // Export the data
      const exportConfig: ExportConfigArgs = {
        format: report.format,
        data,
        filename: `${report.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`,
        includeCharts: true,
        includeMetadata: true
      };

      const result = await advancedReporting.exportData(exportConfig);

      // Update last run and calculate next run
      report.lastRun = new Date().toISOString();
      report.nextRun = this.calculateNextRun(report.schedule);
      this.reports.set(id, report);
      await this.saveReports();

      logger.info('Scheduled report executed successfully', { id, filePath: result.filePath }, this.requestId);
      return result;

    } catch (error: any) {
      logger.error('Error executing scheduled report', { error: error.message }, this.requestId);
      throw createError(
        'JIRA_EXECUTION_ERROR',
        { originalError: error.message, message: `Failed to execute scheduled report: ${error.message}` }
      );
    }
  }

  /**
   * Run all due reports
   */
  async runDueReports(): Promise<Array<{ id: string; result: any; error?: string }>> {
    logger.info('Running due reports', {}, this.requestId);

    const dueReports = this.getDueReports();
    const results: Array<{ id: string; result: any; error?: string }> = [];

    for (const report of dueReports) {
      try {
        const result = await this.executeScheduledReport(report.id!);
        results.push({ id: report.id!, result });
        logger.info('Due report executed successfully', { id: report.id }, this.requestId);
      } catch (error: any) {
        results.push({ id: report.id!, result: null, error: error.message });
        logger.error('Error executing due report', { id: report.id, error: error.message }, this.requestId);
      }
    }

    logger.info('Due reports processing completed', { totalReports: dueReports.length, successful: results.filter(r => !r.error).length }, this.requestId);
    return results;
  }

  /**
   * Start the scheduler (would typically use node-cron)
   */
  startScheduler(): void {
    logger.info('Starting report scheduler', {}, this.requestId);
    
    // This would typically use node-cron to run every minute and check for due reports
    // For now, we'll just log that the scheduler would start
    setInterval(async () => {
      try {
        const results = await this.runDueReports();
        if (results.length > 0) {
          logger.info('Scheduler executed due reports', { count: results.length }, this.requestId);
        }
      } catch (error: any) {
        logger.error('Error in scheduler', { error: error.message }, this.requestId);
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    logger.info('Stopping report scheduler', {}, this.requestId);
    // Implementation would clear intervals/timeouts
  }

  // Private helper methods
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateNextRun(schedule: ScheduledReport['schedule']): string {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, move to the next occurrence
    if (nextRun <= now) {
      switch (schedule.frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          const targetDay = schedule.dayOfWeek || 0;
          const currentDay = nextRun.getDay();
          const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
          nextRun.setDate(nextRun.getDate() + daysUntilTarget);
          break;
        case 'monthly':
          const targetDate = schedule.dayOfMonth || 1;
          nextRun.setDate(targetDate);
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
          break;
      }
    }

    return nextRun.toISOString();
  }

  private loadReports(): void {
    try {
      if (existsSync(this.configPath)) {
        const data = readFileSync(this.configPath, 'utf8');
        const reportsArray = JSON.parse(data);
        this.reports = new Map(reportsArray.map((report: ScheduledReport) => [report.id!, report]));
        logger.info('Scheduled reports loaded', { count: this.reports.size }, this.requestId);
      } else {
        // Ensure config directory exists
        const configDir = join(process.cwd(), 'config');
        if (!existsSync(configDir)) {
          mkdirSync(configDir, { recursive: true });
        }
        this.reports = new Map();
        logger.info('No existing scheduled reports found, starting with empty configuration', {}, this.requestId);
      }
    } catch (error: any) {
      logger.error('Error loading scheduled reports', { error: error.message }, this.requestId);
      this.reports = new Map();
    }
  }

  private async saveReports(): Promise<void> {
    try {
      const reportsArray = Array.from(this.reports.values());
      writeFileSync(this.configPath, JSON.stringify(reportsArray, null, 2), 'utf8');
      logger.debug('Scheduled reports saved', { count: reportsArray.length }, this.requestId);
    } catch (error: any) {
      logger.error('Error saving scheduled reports', { error: error.message }, this.requestId);
      throw error;
    }
  }
}
