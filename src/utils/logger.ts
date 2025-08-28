
/**
 * Enhanced logging utility for Q CLI compatibility
 */

import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  requestId?: string;
  data?: any;
  error?: any;
}

export class Logger {
  private level: LogLevel;
  private context: string;
  private logStream?: WriteStream;

  constructor(context: string = 'MCP-Jira-Server', level?: LogLevel) {
    this.context = context;
    this.level = level ?? this.parseLogLevel(process.env.MCP_LOG_LEVEL || process.env.Q_LOG_LEVEL || 'info');
    
    // Initialize log file if LOG_FILE is set
    if (process.env.MCP_LOG_FILE) {
      this.logStream = createWriteStream(process.env.MCP_LOG_FILE, { flags: 'a' });
    }
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'trace': return LogLevel.TRACE;
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      case 'fatal': return LogLevel.FATAL;
      default: return LogLevel.INFO;
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: LogLevel, message: string, data?: any, requestId?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: this.context,
      requestId,
      data: data ? (typeof data === 'object' ? data : { value: data }) : undefined
    };
  }

  private writeLog(entry: LogEntry): void {
    const logLine = JSON.stringify(entry);
    
    // Write to stderr for MCP compatibility
    console.error(logLine);
    
    // Write to log file if configured
    if (this.logStream) {
      this.logStream.write(logLine + '\n');
    }
  }

  trace(message: string, data?: any, requestId?: string): void {
    if (this.shouldLog(LogLevel.TRACE)) {
      this.writeLog(this.formatMessage(LogLevel.TRACE, message, data, requestId));
    }
  }

  debug(message: string, data?: any, requestId?: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog(this.formatMessage(LogLevel.DEBUG, message, data, requestId));
    }
  }

  info(message: string, data?: any, requestId?: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeLog(this.formatMessage(LogLevel.INFO, message, data, requestId));
    }
  }

  warn(message: string, data?: any, requestId?: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog(this.formatMessage(LogLevel.WARN, message, data, requestId));
    }
  }

  error(message: string, data?: any, requestId?: string): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeLog(this.formatMessage(LogLevel.ERROR, message, data, requestId));
    }
  }

  fatal(message: string, data?: any, requestId?: string): void {
    if (this.shouldLog(LogLevel.FATAL)) {
      this.writeLog(this.formatMessage(LogLevel.FATAL, message, data, requestId));
    }
  }

  // Utility method to create child logger with context
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.level);
  }
}

// Default logger instance
export const logger = new Logger();

// Utility function to generate request IDs
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Utility function to create structured log data
export function createLogData(data: any): any {
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack
    };
  }
  return data;
}
