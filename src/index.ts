
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient, JiraConfigSchema } from './http/JiraRestClient.js';
import { ConfluenceRestClient, ConfluenceConfigSchema } from './http/ConfluenceRestClient.js';
import { HttpServer } from './http/HttpServer.js';
import { ConfluenceService } from './services/ConfluenceService.js';
import { ConfluenceAutomation } from './automation/ConfluenceAutomation.js';
import { config } from 'dotenv';
import { logger, generateRequestId } from './utils/logger.js';
import { configValidator } from './utils/configValidator.js';
import { HealthChecker } from './utils/healthCheck.js';
import { createError, mapJiraApiError, McpJiraError } from './utils/errorCodes.js';
import { metricsCollector } from './monitoring/MetricsCollector.js';
import { errorHandler } from './errors/ErrorHandler.js';
import { cacheManager } from './cache/CacheManager.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

// Import all tools
import { createIssueTool, executeCreateIssue } from './tools/createIssue.js';
import { getIssueTool, executeGetIssue } from './tools/getIssue.js';
import { updateIssueTool, executeUpdateIssue } from './tools/updateIssue.js';
import { deleteIssueTool, executeDeleteIssue } from './tools/deleteIssue.js';
import { transitionIssueTool, executeTransitionIssue } from './tools/transitionIssue.js';
import { getIssueTransitionsTool, executeGetIssueTransitions } from './tools/getIssueTransitions.js';
import { searchIssuesTool, executeSearchIssues } from './tools/searchIssues.js';
import { addCommentTool, executeAddComment } from './tools/addComment.js';
import { getCommentsTool, executeGetComments } from './tools/getComments.js';
import { getProjectTool, executeGetProject } from './tools/getProject.js';
import { searchProjectsTool, executeSearchProjects } from './tools/searchProjects.js';
import { getUserTool, executeGetUser } from './tools/getUser.js';
import { searchUsersTool, executeSearchUsers } from './tools/searchUsers.js';
import { 
  bulkTransitionTool, 
  conditionalTransitionTool, 
  workflowValidationTool,
  executeBulkTransition,
  executeConditionalTransition,
  executeWorkflowValidation
} from './tools/workflowTransitionManager.js';
import {
  workflowAnalyticsTool,
  cycleTimeTool,
  leadTimeTool,
  throughputTool,
  executeWorkflowAnalytics,
  executeCycleTime,
  executeLeadTime,
  executeThroughput
} from './tools/workflowAnalytics.js';
import {
  workflowReportTool,
  workflowDashboardTool,
  issuesExportTool,
  executeWorkflowReport,
  executeWorkflowDashboard,
  executeIssuesExport
} from './tools/workflowReporting.js';
import {
  createCustomFieldTool,
  updateCustomFieldTool,
  deleteCustomFieldTool,
  getCustomFieldTool,
  searchCustomFieldsTool,
  createFieldContextTool,
  setFieldOptionsTool,
  setCascadingOptionsTool,
  validateFieldValueTool,
  calculateFieldValueTool,
  executeCreateCustomField,
  executeUpdateCustomField,
  executeDeleteCustomField,
  executeGetCustomField,
  executeSearchCustomFields,
  executeCreateFieldContext,
  executeSetFieldOptions,
  executeSetCascadingOptions,
  executeValidateFieldValue,
  executeCalculateFieldValue
} from './tools/customFieldManager.js';
import {
  getFieldConfigurationsTool,
  createFieldConfigurationTool,
  updateFieldConfigurationTool,
  deleteFieldConfigurationTool,
  updateFieldConfigurationItemsTool,
  createFieldConfigurationSchemeTool,
  assignSchemeToProjectTool,
  validateFieldConfigurationTool,
  copyFieldConfigurationTool,
  executeGetFieldConfigurations,
  executeCreateFieldConfiguration,
  executeUpdateFieldConfiguration,
  executeDeleteFieldConfiguration,
  executeUpdateFieldConfigurationItems,
  executeCreateFieldConfigurationScheme,
  executeAssignSchemeToProject,
  executeValidateFieldConfiguration,
  executeCopyFieldConfiguration
} from './tools/customFieldConfiguration.js';
import {
  jqlQueryBuilderTool,
  dashboardMetricsTool,
  burndownChartTool,
  velocityTrackingTool,
  exportDataTool,
  handleJQLQueryBuilder,
  handleDashboardMetrics,
  handleBurndownChart,
  handleVelocityTracking,
  handleExportData
} from './analytics/advancedReporting.js';
import { confluenceTools, executeConfluenceTool } from './tools/confluenceTools.js';

// Import Phase 1 tools - Issue Links
import { createIssueLinkTool, executeCreateIssueLink } from './tools/issueLinkCreate.js';
import { getIssueLinkTool, executeGetIssueLink } from './tools/issueLinkGet.js';
import { deleteIssueLinkTool, executeDeleteIssueLink } from './tools/issueLinkDelete.js';
import { listIssueLinkTypesTool, executeListIssueLinkTypes } from './tools/issueLinkTypes.js';
import { createRemoteIssueLinkTool, executeCreateRemoteIssueLink } from './tools/remoteIssueLinkCreate.js';

// Import Phase 1 tools - Attachments
import { uploadAttachmentTool, executeUploadAttachment } from './tools/attachmentUpload.js';
import { getAttachmentTool, executeGetAttachment } from './tools/attachmentGet.js';
import { downloadAttachmentTool, executeDownloadAttachment } from './tools/attachmentDownload.js';
import { deleteAttachmentTool, executeDeleteAttachment } from './tools/attachmentDelete.js';
import { getAttachmentSettingsTool, executeGetAttachmentSettings } from './tools/attachmentSettings.js';

// Import Phase 2 tools - Watchers & Notifications
import { addWatcherTool, executeAddWatcher } from './tools/watchersAdd.js';
import { removeWatcherTool, executeRemoveWatcher } from './tools/watchersRemove.js';
import { listWatchersTool, executeListWatchers } from './tools/watchersList.js';
import { sendNotificationTool, executeSendNotification } from './tools/notificationsSend.js';

// Import Phase 2 tools - Version Management
import { createVersionTool, executeCreateVersion } from './tools/versionCreate.js';
import { updateVersionTool, executeUpdateVersion } from './tools/versionUpdate.js';
import { deleteVersionTool, executeDeleteVersion } from './tools/versionDelete.js';
import { getVersionTool, executeGetVersion } from './tools/versionGet.js';
import { listVersionsTool, executeListVersions } from './tools/versionList.js';
import { moveVersionTool, executeMoveVersion } from './tools/versionMove.js';
import { mergeVersionTool, executeMergeVersion } from './tools/versionMerge.js';

// Import Phase 3 tools - Advanced Reporting & Analytics
import { jqlBuilderTool as newJQLBuilderTool, executeJQLBuilder as executeNewJQLBuilder } from './tools/jqlBuilder.js';
import { dataExportTool, executeDataExport } from './tools/dataExport.js';

// Import Phase 4 tools - Custom Field Management
import { createCustomFieldTool as newCreateCustomFieldTool, executeCreateCustomField as executeNewCreateCustomField } from './tools/customFieldCreate.js';
import { updateCustomFieldTool as newUpdateCustomFieldTool, executeUpdateCustomField as executeNewUpdateCustomField } from './tools/customFieldUpdate.js';
import { deleteCustomFieldTool as newDeleteCustomFieldTool, executeDeleteCustomField as executeNewDeleteCustomField } from './tools/customFieldDelete.js';
import { getCustomFieldTool as newGetCustomFieldTool, executeGetCustomField as executeNewGetCustomField } from './tools/customFieldGet.js';
import { searchCustomFieldTool as newSearchCustomFieldTool, executeSearchCustomField as executeNewSearchCustomField } from './tools/customFieldSearch.js';
import { createCustomFieldContextTool as newCreateCustomFieldContextTool, executeCreateCustomFieldContext as executeNewCreateCustomFieldContext } from './tools/customFieldContext.js';
import { setCustomFieldOptionsTool as newSetCustomFieldOptionsTool, executeSetCustomFieldOptions as executeNewSetCustomFieldOptions } from './tools/customFieldOptions.js';
import { setCascadingCustomFieldTool as newSetCascadingCustomFieldTool, executeSetCascadingCustomField as executeNewSetCascadingCustomField } from './tools/customFieldCascading.js';
import { validateCustomFieldTool as newValidateCustomFieldTool, executeValidateCustomField as executeNewValidateCustomField } from './tools/customFieldValidate.js';
import { calculateCustomFieldTool as newCalculateCustomFieldTool, executeCalculateCustomField as executeNewCalculateCustomField } from './tools/customFieldCalculate.js';

// Import Phase 5 tools - Field Configuration Management
import { listFieldConfigTool, executeListFieldConfig } from './tools/fieldConfigList.js';
import { createFieldConfigTool, executeCreateFieldConfig } from './tools/fieldConfigCreate.js';
import { updateFieldConfigTool, executeUpdateFieldConfig } from './tools/fieldConfigUpdate.js';
import { deleteFieldConfigTool, executeDeleteFieldConfig } from './tools/fieldConfigDelete.js';
import { updateFieldConfigItemsTool, executeUpdateFieldConfigItems } from './tools/fieldConfigItems.js';
import { createFieldConfigSchemeTool, executeCreateFieldConfigScheme } from './tools/fieldConfigScheme.js';
import { assignFieldConfigSchemeTool, executeAssignFieldConfigScheme } from './tools/fieldConfigAssign.js';
import { validateFieldConfigTool, executeValidateFieldConfig } from './tools/fieldConfigValidate.js';
import { copyFieldConfigTool, executeCopyFieldConfig } from './tools/fieldConfigCopy.js';

// Import Phase 6 tools - Confluence Integration
import { createConfluencePageTool, executeCreateConfluencePage } from './tools/confluencePageCreate.js';
import { updateConfluencePageTool, executeUpdateConfluencePage } from './tools/confluencePageUpdate.js';
import { getConfluencePageTool, executeGetConfluencePage } from './tools/confluencePageGet.js';
import { createConfluenceSpaceTool, executeCreateConfluenceSpace } from './tools/confluenceSpaceCreate.js';
import { linkJiraConfluenceTool, executeLinkJiraConfluence } from './tools/confluenceJiraLink.js';
import { createConfluenceDocTool, executeCreateConfluenceDoc } from './tools/confluenceDocCreate.js';
import { searchConfluencePagesTool, executeSearchConfluencePages } from './tools/confluencePageSearch.js';
import { getConfluenceSpacesTool, executeGetConfluenceSpaces } from './tools/confluenceSpaceGet.js';
import { getConfluenceSpacePermissionsTool, executeGetConfluenceSpacePermissions } from './tools/confluenceSpacePermissions.js';

// Import Phase 7 tools - Automation Engine
import { createAutomationRuleTool, executeCreateAutomationRule } from './tools/automationRuleCreate.js';
import { updateAutomationRuleTool, executeUpdateAutomationRule } from './tools/automationRuleUpdate.js';
import { deleteAutomationRuleTool, executeDeleteAutomationRule } from './tools/automationRuleDelete.js';
import { getAutomationRuleTool, executeGetAutomationRule } from './tools/automationRuleGet.js';
import { listAutomationRulesTool, executeListAutomationRules } from './tools/automationRulesList.js';
import { executeAutomationRuleTool, executeAutomationRuleExecution } from './tools/automationRuleExecute.js';
import { getAutomationExecutionsTool, executeGetAutomationExecutions } from './tools/automationExecutionsGet.js';
import { validateAutomationRuleTool, executeValidateAutomationRule } from './tools/automationRuleValidate.js';

// Import Phase 8 tools - Advanced Reporting & Analytics
import { advancedDashboardMetricsTool, executeAdvancedDashboardMetrics } from './tools/advancedDashboardMetrics.js';
import { advancedBurndownChartTool, executeAdvancedBurndownChart } from './tools/advancedBurndownChart.js';
import { advancedVelocityTrackingTool, executeAdvancedVelocityTracking } from './tools/advancedVelocityTracking.js';
import { advancedJqlBuilderEnhancedTool, executeAdvancedJqlBuilderEnhanced } from './tools/advancedJqlBuilderEnhanced.js';
import { advancedExportDataEnhancedTool, executeAdvancedExportDataEnhanced } from './tools/advancedExportDataEnhanced.js';

// Define all available tools
const TOOLS = [
  // Issue management tools
  createIssueTool,
  getIssueTool,
  updateIssueTool,
  deleteIssueTool,
  transitionIssueTool,
  getIssueTransitionsTool,
  
  // Search and JQL tools
  searchIssuesTool,
  
  // Comment tools
  addCommentTool,
  getCommentsTool,
  
  // Project tools
  getProjectTool,
  searchProjectsTool,
  
  // User tools
  getUserTool,
  searchUsersTool,
  
  // Advanced workflow tools
  bulkTransitionTool,
  conditionalTransitionTool,
  workflowValidationTool,
  
  // Analytics and reporting tools
  workflowAnalyticsTool,
  cycleTimeTool,
  leadTimeTool,
  throughputTool,
  workflowReportTool,
  workflowDashboardTool,
  issuesExportTool,
  
  // Custom field management tools
  createCustomFieldTool,
  updateCustomFieldTool,
  deleteCustomFieldTool,
  getCustomFieldTool,
  searchCustomFieldsTool,
  createFieldContextTool,
  setFieldOptionsTool,
  setCascadingOptionsTool,
  validateFieldValueTool,
  calculateFieldValueTool,
  
  // Field configuration tools
  getFieldConfigurationsTool,
  createFieldConfigurationTool,
  updateFieldConfigurationTool,
  deleteFieldConfigurationTool,
  updateFieldConfigurationItemsTool,
  createFieldConfigurationSchemeTool,
  assignSchemeToProjectTool,
  validateFieldConfigurationTool,
  copyFieldConfigurationTool,
  
  // Advanced reporting tools
  jqlQueryBuilderTool,
  dashboardMetricsTool,
  burndownChartTool,
  velocityTrackingTool,
  exportDataTool,
  
  // Confluence integration tools
  ...confluenceTools,
  
  // Phase 1 - Issue Link Management tools
  createIssueLinkTool,
  getIssueLinkTool,
  deleteIssueLinkTool,
  listIssueLinkTypesTool,
  createRemoteIssueLinkTool,
  
  // Phase 1 - Attachment Management tools
  uploadAttachmentTool,
  getAttachmentTool,
  downloadAttachmentTool,
  deleteAttachmentTool,
  getAttachmentSettingsTool,
  
  // Phase 2 - Watchers & Notifications tools
  addWatcherTool,
  removeWatcherTool,
  listWatchersTool,
  sendNotificationTool,
  
  // Phase 2 - Version Management tools
  createVersionTool,
  updateVersionTool,
  deleteVersionTool,
  getVersionTool,
  listVersionsTool,
  moveVersionTool,
  mergeVersionTool,
  
  // Phase 3 - Advanced Reporting & Analytics tools
  newJQLBuilderTool,
  dataExportTool,
  
  // Phase 4 - Custom Field Management tools
  newCreateCustomFieldTool,
  newUpdateCustomFieldTool,
  newDeleteCustomFieldTool,
  newGetCustomFieldTool,
  newSearchCustomFieldTool,
  newCreateCustomFieldContextTool,
  newSetCustomFieldOptionsTool,
  newSetCascadingCustomFieldTool,
  newValidateCustomFieldTool,
  newCalculateCustomFieldTool,
  
  // Phase 5 - Field Configuration Management tools
  listFieldConfigTool,
  createFieldConfigTool,
  updateFieldConfigTool,
  deleteFieldConfigTool,
  updateFieldConfigItemsTool,
  createFieldConfigSchemeTool,
  assignFieldConfigSchemeTool,
  validateFieldConfigTool,
  copyFieldConfigTool,
  
  // Phase 6 - Confluence Integration tools
  createConfluencePageTool,
  updateConfluencePageTool,
  getConfluencePageTool,
  createConfluenceSpaceTool,
  linkJiraConfluenceTool,
  createConfluenceDocTool,
  searchConfluencePagesTool,
  getConfluenceSpacesTool,
  getConfluenceSpacePermissionsTool,
  
  // Phase 7 - Automation Engine tools
  createAutomationRuleTool,
  updateAutomationRuleTool,
  deleteAutomationRuleTool,
  getAutomationRuleTool,
  listAutomationRulesTool,
  executeAutomationRuleTool,
  getAutomationExecutionsTool,
  validateAutomationRuleTool,
  
  // Phase 8 - Advanced Reporting & Analytics tools
  advancedDashboardMetricsTool,
  advancedBurndownChartTool,
  advancedVelocityTrackingTool,
  advancedJqlBuilderEnhancedTool,
  advancedExportDataEnhancedTool,
];

// Global service instances (will be initialized in server constructor)
let jiraClient: JiraRestClient;
let confluenceService: ConfluenceService;

// Tool execution mapping
const TOOL_EXECUTORS = {
  'issue.create': executeCreateIssue,
  'issue.get': executeGetIssue,
  'issue.update': executeUpdateIssue,
  'issue.delete': executeDeleteIssue,
  'issue.transition': executeTransitionIssue,
  'issue.transitions.list': executeGetIssueTransitions,
  'jql.search': executeSearchIssues,
  'issue.comment.add': executeAddComment,
  'issue.comments.get': executeGetComments,
  'project.get': executeGetProject,
  'project.search': executeSearchProjects,
  'user.get': executeGetUser,
  'user.search': executeSearchUsers,
  'workflow.bulk_transition': executeBulkTransition,
  'workflow.conditional_transition': executeConditionalTransition,
  'workflow.validate': executeWorkflowValidation,
  'workflow.analytics': executeWorkflowAnalytics,
  'workflow.cycle_time': executeCycleTime,
  'workflow.lead_time': executeLeadTime,
  'workflow.throughput': executeThroughput,
  'workflow.report': executeWorkflowReport,
  'workflow.dashboard': executeWorkflowDashboard,
  'workflow.export_issues': executeIssuesExport,
  
  // Custom field management executors
  'customfield.create': executeCreateCustomField,
  'customfield.update': executeUpdateCustomField,
  'customfield.delete': executeDeleteCustomField,
  'customfield.get': executeGetCustomField,
  'customfield.search': executeSearchCustomFields,
  'customfield.context.create': executeCreateFieldContext,
  'customfield.options.set': executeSetFieldOptions,
  'customfield.cascading.set': executeSetCascadingOptions,
  'customfield.validate': executeValidateFieldValue,
  'customfield.calculate': executeCalculateFieldValue,
  
  // Field configuration executors
  'fieldconfig.list': executeGetFieldConfigurations,
  'fieldconfig.create': executeCreateFieldConfiguration,
  'fieldconfig.update': executeUpdateFieldConfiguration,
  'fieldconfig.delete': executeDeleteFieldConfiguration,
  'fieldconfig.items.update': executeUpdateFieldConfigurationItems,
  'fieldconfig.scheme.create': executeCreateFieldConfigurationScheme,
  'fieldconfig.scheme.assign': executeAssignSchemeToProject,
  'fieldconfig.validate': executeValidateFieldConfiguration,
  'fieldconfig.copy': executeCopyFieldConfiguration,
  
  // Advanced reporting executors
  'advanced.jql.builder': handleJQLQueryBuilder,
  'advanced.dashboard.metrics': handleDashboardMetrics,
  'advanced.burndown.chart': handleBurndownChart,
  'advanced.velocity.tracking': handleVelocityTracking,
  'advanced.export.data': handleExportData,
  
  // Phase 1 - Issue Link Management executors
  'issuelink.create': (args: unknown) => executeCreateIssueLink(args, jiraClient),
  'issuelink.get': (args: unknown) => executeGetIssueLink(args, jiraClient),
  'issuelink.delete': (args: unknown) => executeDeleteIssueLink(args, jiraClient),
  'issuelink.types.list': (args: unknown) => executeListIssueLinkTypes(args, jiraClient),
  'issuelink.remote.create': (args: unknown) => executeCreateRemoteIssueLink(args, jiraClient),
  
  // Phase 1 - Attachment Management executors
  'attachment.upload': (args: unknown) => executeUploadAttachment(args, jiraClient),
  'attachment.get': (args: unknown) => executeGetAttachment(args, jiraClient),
  'attachment.download': (args: unknown) => executeDownloadAttachment(args, jiraClient),
  'attachment.delete': (args: unknown) => executeDeleteAttachment(args, jiraClient),
  'attachment.settings.get': (args: unknown) => executeGetAttachmentSettings(args, jiraClient),
  
  // Phase 2 - Watchers & Notifications executors
  'watchers.add': (args: unknown) => executeAddWatcher(args, jiraClient),
  'watchers.remove': (args: unknown) => executeRemoveWatcher(args, jiraClient),
  'watchers.list': (args: unknown) => executeListWatchers(args, jiraClient),
  'notifications.send': (args: unknown) => executeSendNotification(args, jiraClient),
  
  // Phase 2 - Version Management executors
  'version.create': (args: unknown) => executeCreateVersion(args, jiraClient),
  'version.update': (args: unknown) => executeUpdateVersion(args, jiraClient),
  'version.delete': (args: unknown) => executeDeleteVersion(args, jiraClient),
  'version.get': (args: unknown) => executeGetVersion(args, jiraClient),
  'version.list': (args: unknown) => executeListVersions(args, jiraClient),
  'version.move': (args: unknown) => executeMoveVersion(args, jiraClient),
  'version.merge': (args: unknown) => executeMergeVersion(args, jiraClient),
  
  // Phase 3 - Advanced Reporting & Analytics executors
  'advanced.jql.builder.new': (args: unknown) => executeNewJQLBuilder(args, jiraClient),
  'advanced.export.data.new': (args: unknown) => executeDataExport(args, jiraClient),
  
  // Phase 4 - Custom Field Management executors
  'customfield.create.new': (args: unknown) => executeNewCreateCustomField(args, jiraClient),
  'customfield.update.new': (args: unknown) => executeNewUpdateCustomField(args, jiraClient),
  'customfield.delete.new': (args: unknown) => executeNewDeleteCustomField(args, jiraClient),
  'customfield.get.new': (args: unknown) => executeNewGetCustomField(args, jiraClient),
  'customfield.search.new': (args: unknown) => executeNewSearchCustomField(args, jiraClient),
  'customfield.context.create.new': (args: unknown) => executeNewCreateCustomFieldContext(args, jiraClient),
  'customfield.options.set.new': (args: unknown) => executeNewSetCustomFieldOptions(args, jiraClient),
  'customfield.cascading.set.new': (args: unknown) => executeNewSetCascadingCustomField(args, jiraClient),
  'customfield.validate.new': (args: unknown) => executeNewValidateCustomField(args, jiraClient),
  'customfield.calculate.new': (args: unknown) => executeNewCalculateCustomField(args, jiraClient),
  
  // Phase 5 - Field Configuration Management executors
  'fieldconfig.list.new': (args: unknown) => executeListFieldConfig(args, jiraClient),
  'fieldconfig.create.new': (args: unknown) => executeCreateFieldConfig(args, jiraClient),
  'fieldconfig.update.new': (args: unknown) => executeUpdateFieldConfig(args, jiraClient),
  'fieldconfig.delete.new': (args: unknown) => executeDeleteFieldConfig(args, jiraClient),
  'fieldconfig.items.update.new': (args: unknown) => executeUpdateFieldConfigItems(args, jiraClient),
  'fieldconfig.scheme.create.new': (args: unknown) => executeCreateFieldConfigScheme(args, jiraClient),
  'fieldconfig.scheme.assign.new': (args: unknown) => executeAssignFieldConfigScheme(args, jiraClient),
  'fieldconfig.validate.new': (args: unknown) => executeValidateFieldConfig(args, jiraClient),
  'fieldconfig.copy.new': (args: unknown) => executeCopyFieldConfig(args, jiraClient),
  
  // Phase 6 - Confluence Integration executors
  'confluence.page.create': (args: unknown) => executeCreateConfluencePage(args, jiraClient),
  'confluence.page.update': (args: unknown) => executeUpdateConfluencePage(args, jiraClient),
  'confluence.page.get': (args: unknown) => executeGetConfluencePage(args, jiraClient),
  'confluence.space.create': (args: unknown) => executeCreateConfluenceSpace(args, jiraClient),
  'confluence.jira.link': (args: unknown) => executeLinkJiraConfluence(args, jiraClient),
  'confluence.documentation.create': (args: unknown) => executeCreateConfluenceDoc(args, jiraClient),
  'confluence.pages.search': (args: unknown) => executeSearchConfluencePages(args, jiraClient),
  'confluence.spaces.get': (args: unknown) => executeGetConfluenceSpaces(args, jiraClient),
  'confluence.space.permissions.get': (args: unknown) => executeGetConfluenceSpacePermissions(args, jiraClient),
  
  // Phase 7 - Automation Engine executors
  'automation.rule.create': (args: unknown) => executeCreateAutomationRule(args, jiraClient),
  'automation.rule.update': (args: unknown) => executeUpdateAutomationRule(args, jiraClient),
  'automation.rule.delete': (args: unknown) => executeDeleteAutomationRule(args, jiraClient),
  'automation.rule.get': (args: unknown) => executeGetAutomationRule(args, jiraClient),
  'automation.rules.list': (args: unknown) => executeListAutomationRules(args, jiraClient),
  'automation.rule.execute': (args: unknown) => executeAutomationRuleExecution(args, jiraClient),
  'automation.executions.get': (args: unknown) => executeGetAutomationExecutions(args, jiraClient),
  'automation.rule.validate': (args: unknown) => executeValidateAutomationRule(args, jiraClient),
  
  // Phase 8 - Advanced Reporting & Analytics executors
  'advanced.dashboard.metrics.enhanced': (args: unknown) => executeAdvancedDashboardMetrics(args, jiraClient),
  'advanced.burndown.chart.enhanced': (args: unknown) => executeAdvancedBurndownChart(args, jiraClient),
  'advanced.velocity.tracking.enhanced': (args: unknown) => executeAdvancedVelocityTracking(args, jiraClient),
  'advanced.jql.builder.enhanced': (args: unknown) => executeAdvancedJqlBuilderEnhanced(args, jiraClient),
  'advanced.export.data.enhanced': (args: unknown) => executeAdvancedExportDataEnhanced(args, jiraClient),
};

class JiraRestMcpServer {
  private server: Server;
  private jiraClient: JiraRestClient;
  private confluenceClient: ConfluenceRestClient;
  private confluenceService: ConfluenceService;
  private confluenceAutomation: ConfluenceAutomation;
  private healthChecker: HealthChecker;
  private httpServer: HttpServer;
  private serverMetadata: any;

  constructor() {
    // Load and validate configuration
    const validatedConfig = configValidator.validateEnvironment();
    logger.info('Configuration validated successfully');

    // Load server metadata
    this.loadServerMetadata();

    this.server = new Server(
      {
        name: validatedConfig.MCP_SERVER_NAME || 'mcp-jira-rest',
        version: validatedConfig.MCP_SERVER_VERSION || '1.0.0',
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
          resources: {
            subscribe: false,
            listChanged: false,
          },
          prompts: {
            listChanged: false,
          },
          logging: {
            level: process.env.MCP_LOG_LEVEL || 'info',
          },
        },
      }
    );

    // Initialize Jira client with validated config
    const jiraConfig = JiraConfigSchema.parse({
      baseUrl: validatedConfig.JIRA_BASE_URL,
      email: validatedConfig.JIRA_EMAIL,
      apiToken: validatedConfig.JIRA_API_TOKEN,
      oauthAccessToken: validatedConfig.JIRA_OAUTH_ACCESS_TOKEN,
      timeout: parseInt(validatedConfig.REQUEST_TIMEOUT || '30000'),
      maxRetries: parseInt(validatedConfig.MAX_RETRIES || '3'),
      retryDelay: parseInt(validatedConfig.RETRY_DELAY || '1000'),
    });

    this.jiraClient = new JiraRestClient(jiraConfig);
    jiraClient = this.jiraClient; // Assign to global variable for tool executors
    
    // Initialize Confluence client with same config (can be overridden with CONFLUENCE_* env vars)
    const confluenceConfig = ConfluenceConfigSchema.parse({
      baseUrl: validatedConfig.CONFLUENCE_BASE_URL || validatedConfig.JIRA_BASE_URL,
      email: validatedConfig.CONFLUENCE_EMAIL || validatedConfig.JIRA_EMAIL,
      apiToken: validatedConfig.CONFLUENCE_API_TOKEN || validatedConfig.JIRA_API_TOKEN,
      oauthAccessToken: validatedConfig.CONFLUENCE_OAUTH_ACCESS_TOKEN || validatedConfig.JIRA_OAUTH_ACCESS_TOKEN,
      timeout: parseInt(validatedConfig.REQUEST_TIMEOUT || '30000'),
      maxRetries: parseInt(validatedConfig.MAX_RETRIES || '3'),
      retryDelay: parseInt(validatedConfig.RETRY_DELAY || '1000'),
    });

    this.confluenceClient = new ConfluenceRestClient(confluenceConfig);
    this.confluenceService = new ConfluenceService(this.confluenceClient);
    confluenceService = this.confluenceService; // Assign to global variable for tool executors
    this.confluenceAutomation = new ConfluenceAutomation(this.confluenceService, this.jiraClient);
    
    this.healthChecker = new HealthChecker(this.jiraClient);

    // Initialize HTTP server for health and metrics
    this.httpServer = new HttpServer(parseInt(process.env.HTTP_PORT || '9090'));

    // Initialize advanced features
    this.initializeAdvancedFeatures();

    this.setupHandlers();
    logger.info('MCP Jira REST Server initialized successfully');
  }

  private initializeAdvancedFeatures(): void {
    // Setup metrics collection
    metricsCollector.addHealthCheck('jira_connection', async () => {
      try {
        await this.jiraClient.get('/rest/api/3/myself');
        return { status: 'pass', message: 'JIRA connection healthy' };
      } catch (error: any) {
        return { status: 'fail', message: `JIRA connection failed: ${error?.message || 'Unknown error'}` };
      }
    });

    metricsCollector.addHealthCheck('confluence_connection', async () => {
      try {
        await this.confluenceClient.get('/rest/api/user/current');
        return { status: 'pass', message: 'Confluence connection healthy' };
      } catch (error: any) {
        return { status: 'fail', message: `Confluence connection failed: ${error?.message || 'Unknown error'}` };
      }
    });

    // Setup error handling for JIRA operations
    errorHandler.addRecoveryStrategy({
      name: 'jira_reconnect',
      condition: (error) => error.category === 'network' && error.context.operation?.includes('jira'),
      action: async (error) => {
        try {
          // Attempt to reconnect to JIRA
          await this.jiraClient.get('/rest/api/3/myself');
          return true;
        } catch {
          return false;
        }
      },
      maxRetries: 3,
      backoffMs: 5000
    });

    // Setup cache warming for common operations
    this.warmCommonCaches();

    logger.info('Advanced features initialized successfully');
  }

  private async warmCommonCaches(): Promise<void> {
    try {
      // Warm cache with user info
      await cacheManager.getOrSet(
        'current_user',
        async () => {
          const response = await this.jiraClient.get('/rest/api/3/myself');
          return response;
        },
        { ttl: 5 * 60 * 1000, tags: ['user'] } // 5 minutes
      );

      // Warm cache with server info
      await cacheManager.getOrSet(
        'server_info',
        async () => {
          const response = await this.jiraClient.get('/rest/api/3/serverInfo');
          return response;
        },
        { ttl: 60 * 60 * 1000, tags: ['server'] } // 1 hour
      );

      logger.debug('Common caches warmed successfully');
    } catch (error) {
      logger.warn('Failed to warm common caches', error);
    }
  }

  private loadServerMetadata(): void {
    try {
      const metadataPath = join(process.cwd(), 'config', 'qcli-server.json');
      this.serverMetadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      logger.debug('Server metadata loaded', { metadata: this.serverMetadata });
    } catch (error) {
      logger.warn('Failed to load server metadata, using defaults', error);
      this.serverMetadata = {
        name: 'mcp-jira-rest',
        version: '1.0.0',
        description: 'Enhanced MCP Jira server using official REST API endpoints',
        capabilities: {
          tools: { listChanged: true, callTool: true },
          resources: { subscribe: false, listChanged: false },
          prompts: { listChanged: false },
          logging: { level: 'info' }
        }
      };
    }
  }

  private setupHandlers(): void {
    // List tools handler with enhanced metadata
    this.server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      const requestId = generateRequestId();
      logger.debug('Listing tools', { requestId });

      try {
        const enhancedTools = TOOLS.map(tool => ({
          ...tool,
          metadata: {
            category: this.getToolCategory(tool.name),
            tags: this.getToolTags(tool.name),
            version: '1.0.0'
          }
        }));

        logger.debug('Tools listed successfully', { count: enhancedTools.length, requestId });
        return { tools: enhancedTools };
      } catch (error: any) {
        logger.error('Failed to list tools', error, requestId);
        throw createError('TOOL_EXECUTION_ERROR', { operation: 'list_tools', error: error.message }, requestId);
      }
    });

    // Call tool handler with enhanced error handling
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const requestId = generateRequestId();
      const { name, arguments: args } = request.params;
      
      logger.info('Tool execution started', { tool: name, requestId });

      // Check circuit breaker
      if (!errorHandler.shouldAllowOperation(name)) {
        const error = createError('TOOL_EXECUTION_ERROR', { tool: name, reason: 'Circuit breaker open' }, requestId);
        logger.warn('Tool execution blocked by circuit breaker', { tool: name, requestId });
        throw error;
      }

      const executor = TOOL_EXECUTORS[name as keyof typeof TOOL_EXECUTORS];
      if (!executor) {
        const error = createError('TOOL_NOT_FOUND_ERROR', { tool: name }, requestId);
        logger.error('Tool not found', error, requestId);
        throw error;
      }

      try {
        // Execute tool with monitoring
        const result = await metricsCollector.timeOperation(
          `tool_execution_${name}`,
          async () => {
            return await executor(this.jiraClient, args);
          },
          { tool: name, requestId }
        );

        // Record successful execution
        errorHandler.recordSuccess(name);

        logger.info('Tool execution completed successfully', { 
          tool: name, 
          requestId,
          resultType: typeof result
        });

        return result;
      } catch (error: any) {
        // Handle and record error
        const errorResult = await errorHandler.handleError(error, {
          operation: name,
          toolName: name,
          requestId,
          timestamp: Date.now(),
          metadata: { args }
        });

        // Map and enhance error
        const mappedError = mapJiraApiError(error, requestId);
        logger.error('Tool execution failed', {
          tool: name,
          error: mappedError,
          recovered: errorResult.recovered,
          recoveryAction: errorResult.action,
          requestId
        });

        throw mappedError;
      }
    });

    // Health check endpoint (custom handler)
    this.server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
      const requestId = generateRequestId();
      logger.debug('Listing resources', { requestId });

      return {
        resources: [
          {
            uri: 'health://status',
            name: 'Health Status',
            description: 'Current health status of the MCP Jira server',
            mimeType: 'application/json'
          },
          {
            uri: 'config://metadata',
            name: 'Server Metadata',
            description: 'Server configuration and metadata information',
            mimeType: 'application/json'
          }
        ]
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const requestId = generateRequestId();
      const { uri } = request.params;
      
      logger.debug('Reading resource', { uri, requestId });

      try {
        if (uri === 'health://status') {
          const healthStatus = await this.healthChecker.performHealthCheck();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(healthStatus, null, 2)
              }
            ]
          };
        }

        if (uri === 'config://metadata') {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.serverMetadata, null, 2)
              }
            ]
          };
        }

        throw createError('JIRA_NOT_FOUND_ERROR', { resource: uri }, requestId);
      } catch (error: any) {
        logger.error('Failed to read resource', error, requestId);
        throw error instanceof McpJiraError ? error : createError('INTERNAL_ERROR', { error: error.message }, requestId);
      }
    });

    // Empty prompts handler (for Q CLI compatibility)
    this.server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
      return { prompts: [] };
    });

    logger.info('Request handlers configured successfully');
  }

  private getToolCategory(toolName: string): string {
    if (toolName.startsWith('issue.')) return 'issue-management';
    if (toolName.startsWith('project.')) return 'project-management';
    if (toolName.startsWith('user.')) return 'user-management';
    if (toolName.startsWith('jql.')) return 'search';
    if (toolName.startsWith('workflow.')) return 'workflow-management';
    if (toolName.startsWith('customfield.')) return 'custom-fields';
    if (toolName.startsWith('fieldconfig.')) return 'field-configuration';
    if (toolName.includes('comment')) return 'comments';
    return 'general';
  }

  private getToolTags(toolName: string): string[] {
    const tags = ['jira'];
    
    if (toolName.includes('create')) tags.push('create');
    if (toolName.includes('get')) tags.push('get', 'read');
    if (toolName.includes('update')) tags.push('update', 'modify');
    if (toolName.includes('delete')) tags.push('delete', 'remove');
    if (toolName.includes('search')) tags.push('search', 'query');
    if (toolName.includes('list')) tags.push('list', 'read');
    if (toolName.includes('transition')) tags.push('transition', 'workflow');
    if (toolName.includes('comment')) tags.push('comment');
    if (toolName.includes('validate')) tags.push('validate', 'check');
    if (toolName.includes('calculate')) tags.push('calculate', 'compute');
    if (toolName.includes('options')) tags.push('options', 'configuration');
    if (toolName.includes('context')) tags.push('context', 'scope');
    if (toolName.includes('scheme')) tags.push('scheme', 'configuration');
    if (toolName.includes('copy')) tags.push('copy', 'duplicate');
    if (toolName.includes('assign')) tags.push('assign', 'link');
    
    return tags;
  }

  async run(): Promise<void> {
    try {
      // Perform initial health check
      const isHealthy = await this.healthChecker.isHealthy();
      if (!isHealthy) {
        logger.warn('Server starting with health issues detected');
      }

      // Start HTTP server for health and metrics
      await this.httpServer.start();

      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('MCP Jira REST Server started successfully', {
        name: this.serverMetadata.name,
        version: this.serverMetadata.version,
        transport: 'stdio',
        healthy: isHealthy
      });

      // Log to stderr for MCP compatibility
      console.error('Jira REST MCP Server running on stdio');
    } catch (error: any) {
      logger.fatal('Failed to start server', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down MCP Jira REST Server');
      // Close log stream if it exists
      if ((logger as any).logStream) {
        (logger as any).logStream.end();
      }
    } catch (error: any) {
      console.error('Error during shutdown:', error);
    }
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start the server
async function startServer() {
  try {
    const server = new JiraRestMcpServer();
    await server.run();
  } catch (error: any) {
    logger.fatal('Failed to start server', error);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
