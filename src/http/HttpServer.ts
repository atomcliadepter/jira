import { createServer, IncomingMessage, ServerResponse } from 'http';
import { logger } from '../utils/logger.js';
import { metricsCollector } from '../monitoring/MetricsCollector.js';

export class HttpServer {
  private server: ReturnType<typeof createServer>;
  private port: number;

  constructor(port: number = 9090) {
    this.port = port;
    this.server = createServer(this.handleRequest.bind(this));
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url || '';
    
    try {
      if (url === '/health') {
        this.handleHealth(res);
      } else if (url === '/metrics') {
        this.handleMetrics(res);
      } else {
        this.handleNotFound(res);
      }
    } catch (error) {
      logger.error('HTTP server error', { error, url });
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }

  private handleHealth(res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'mcp-jira-server'
    }));
  }

  private handleMetrics(res: ServerResponse): void {
    const metrics = metricsCollector.exportPrometheusMetrics();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(metrics);
  }

  private handleNotFound(res: ServerResponse): void {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          logger.info(`HTTP server listening on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info('HTTP server stopped');
        resolve();
      });
    });
  }
}
