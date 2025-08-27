# Production Deployment Guide

This guide provides comprehensive instructions for deploying the Enhanced MCP Jira REST Server in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Monitoring Setup](#monitoring-setup)
6. [Security Configuration](#security-configuration)
7. [Performance Tuning](#performance-tuning)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **Memory**: Minimum 512MB, Recommended 1GB+
- **CPU**: Minimum 1 core, Recommended 2+ cores
- **Storage**: 10GB+ available space
- **Network**: HTTPS access to Jira/Confluence instances

### External Dependencies

- **Jira Cloud**: API access with valid credentials
- **Confluence Cloud**: (Optional) API access with valid credentials
- **Monitoring**: Prometheus and Grafana (recommended)
- **Load Balancer**: For high availability deployments

## Environment Configuration

### Required Environment Variables

```bash
# Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token

# Optional Confluence Configuration
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your-confluence-token

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info
MCP_SERVER_NAME=mcp-jira-rest-prod
MCP_SERVER_VERSION=1.0.0

# Performance Configuration
REQUEST_TIMEOUT=30000
MAX_RETRIES=3
RETRY_DELAY=1000

# Monitoring Configuration
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
PROMETHEUS_PORT=9090

# Cache Configuration
CACHE_MAX_SIZE=104857600  # 100MB
CACHE_DEFAULT_TTL=300000  # 5 minutes
CACHE_MAX_ENTRIES=10000

# Security Configuration
RATE_LIMIT_WINDOW=60000   # 1 minute
RATE_LIMIT_MAX=100        # 100 requests per minute
ENABLE_CORS=false
TRUST_PROXY=true
```

### Environment File Setup

Create a `.env` file in the project root:

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Docker Deployment

### Single Container Deployment

1. **Build the Docker image:**
```bash
docker build -f deployment/docker/Dockerfile -t mcp-jira-server:1.0.0 .
```

2. **Run the container:**
```bash
docker run -d \
  --name mcp-jira-server \
  --env-file .env \
  -p 3000:3000 \
  -p 9090:9090 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/cache:/app/cache \
  --restart unless-stopped \
  mcp-jira-server:1.0.0
```

### Docker Compose Deployment

1. **Start the services:**
```bash
cd deployment/docker
docker-compose up -d
```

2. **View logs:**
```bash
docker-compose logs -f mcp-jira-server
```

3. **Scale the service:**
```bash
docker-compose up -d --scale mcp-jira-server=3
```

### Docker Compose with Monitoring

To include Prometheus and Grafana:

```bash
docker-compose --profile monitoring up -d
```

Access points:
- **Application**: http://localhost:3000
- **Metrics**: http://localhost:9090
- **Prometheus**: http://localhost:9091
- **Grafana**: http://localhost:3001 (admin/admin123)

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.20+)
- kubectl configured
- Helm (optional, for advanced deployments)

### Basic Deployment

1. **Create namespace:**
```bash
kubectl create namespace mcp-system
```

2. **Create secrets:**
```bash
# Jira credentials
kubectl create secret generic jira-credentials \
  --from-literal=base-url="https://your-domain.atlassian.net" \
  --from-literal=email="your-email@example.com" \
  --from-literal=api-token="your-api-token" \
  -n mcp-system

# Confluence credentials (optional)
kubectl create secret generic confluence-credentials \
  --from-literal=base-url="https://your-domain.atlassian.net/wiki" \
  --from-literal=email="your-email@example.com" \
  --from-literal=api-token="your-confluence-token" \
  -n mcp-system
```

3. **Deploy the application:**
```bash
kubectl apply -f deployment/k8s/deployment.yaml
```

4. **Verify deployment:**
```bash
kubectl get pods -n mcp-system
kubectl get services -n mcp-system
```

### High Availability Deployment

For production high availability:

1. **Configure horizontal pod autoscaler:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-jira-server-hpa
  namespace: mcp-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-jira-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

2. **Configure pod disruption budget:**
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: mcp-jira-server-pdb
  namespace: mcp-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: mcp-jira-server
```

### Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-jira-server
  namespace: mcp-system
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - mcp-jira.yourdomain.com
    secretName: mcp-jira-tls
  rules:
  - host: mcp-jira.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mcp-jira-server
            port:
              number: 80
```

## Monitoring Setup

### Prometheus Configuration

1. **Deploy Prometheus:**
```bash
# Using Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Or using manifests
kubectl apply -f deployment/monitoring/prometheus.yml
```

2. **Configure service monitor:**
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mcp-jira-server
  namespace: mcp-system
spec:
  selector:
    matchLabels:
      app: mcp-jira-server
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
```

### Grafana Dashboards

Import the provided Grafana dashboards:

1. **Application Dashboard**: `deployment/monitoring/grafana/dashboards/application.json`
2. **Performance Dashboard**: `deployment/monitoring/grafana/dashboards/performance.json`
3. **Error Tracking Dashboard**: `deployment/monitoring/grafana/dashboards/errors.json`

### Alert Configuration

Key alerts to configure:

- **Service Down**: Application unavailable
- **High Error Rate**: > 5% error rate for 5 minutes
- **High Response Time**: > 2s 95th percentile for 5 minutes
- **Memory Usage**: > 90% for 10 minutes
- **Circuit Breaker Open**: Any circuit breaker opens

## Security Configuration

### Network Security

1. **Use HTTPS only:**
```bash
# Ensure all external communication uses HTTPS
JIRA_BASE_URL=https://your-domain.atlassian.net
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
```

2. **Configure firewall rules:**
```bash
# Allow only necessary ports
- 3000 (application)
- 9090 (metrics, internal only)
- 443 (HTTPS ingress)
```

### Authentication Security

1. **Rotate API tokens regularly:**
```bash
# Set up automated token rotation
# Update secrets in Kubernetes or environment variables
```

2. **Use least privilege access:**
```bash
# Ensure Jira/Confluence users have minimal required permissions
# Regular audit of permissions
```

### Container Security

1. **Run as non-root user:**
```dockerfile
USER mcpuser
```

2. **Use read-only filesystem:**
```yaml
securityContext:
  readOnlyRootFilesystem: true
```

3. **Scan images for vulnerabilities:**
```bash
# Use tools like Trivy, Clair, or Snyk
trivy image mcp-jira-server:1.0.0
```

## Performance Tuning

### Application Tuning

1. **Node.js optimization:**
```bash
# Set Node.js flags for production
NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"
```

2. **Cache configuration:**
```bash
# Optimize cache settings based on usage patterns
CACHE_MAX_SIZE=209715200  # 200MB for high-traffic
CACHE_DEFAULT_TTL=600000  # 10 minutes for stable data
CACHE_MAX_ENTRIES=20000   # Increase for more cached items
```

3. **Connection pooling:**
```bash
# Optimize HTTP connection settings
REQUEST_TIMEOUT=15000     # Reduce for faster failures
MAX_RETRIES=2            # Reduce retries for faster response
```

### Resource Allocation

1. **Kubernetes resource requests/limits:**
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

2. **JVM tuning (if using Java components):**
```bash
# Not applicable for Node.js, but useful for Java-based tools
```

### Database Optimization

1. **Cache warming strategy:**
```bash
# Implement cache warming for frequently accessed data
# Use background jobs to pre-populate cache
```

2. **Connection optimization:**
```bash
# Optimize HTTP connections to Jira/Confluence
# Use connection pooling and keep-alive
```

## Load Testing

### Performance Benchmarks

Run load tests to establish baselines:

```bash
# Install dependencies
npm install -g artillery

# Run load tests
artillery run deployment/load-tests/basic-load.yml
artillery run deployment/load-tests/stress-test.yml
artillery run deployment/load-tests/spike-test.yml
```

### Expected Performance

- **Throughput**: 100+ requests/second
- **Response Time**: < 500ms (95th percentile)
- **Error Rate**: < 1%
- **Memory Usage**: < 80% of allocated
- **CPU Usage**: < 70% under normal load

## Health Checks

### Application Health Endpoints

- **Health Check**: `GET /health`
- **Readiness**: `GET /ready`
- **Liveness**: `GET /live`
- **Metrics**: `GET /metrics`

### Monitoring Checklist

- [ ] Application is responding to health checks
- [ ] Metrics are being collected
- [ ] Alerts are configured and firing correctly
- [ ] Logs are being collected and stored
- [ ] Performance is within acceptable ranges
- [ ] Error rates are below thresholds

## Troubleshooting

### Common Issues

1. **Application won't start:**
```bash
# Check environment variables
kubectl describe pod <pod-name> -n mcp-system

# Check logs
kubectl logs <pod-name> -n mcp-system

# Check secrets
kubectl get secrets -n mcp-system
```

2. **High memory usage:**
```bash
# Check memory metrics
kubectl top pods -n mcp-system

# Analyze heap dumps (if available)
# Adjust memory limits
```

3. **Connection timeouts:**
```bash
# Check network connectivity
# Verify Jira/Confluence URLs
# Check firewall rules
```

4. **Performance issues:**
```bash
# Check resource utilization
# Review cache hit rates
# Analyze slow queries
# Check for memory leaks
```

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug
```

### Support Channels

- **Documentation**: Check README.md and inline code comments
- **Monitoring**: Use Grafana dashboards for real-time insights
- **Logs**: Check application logs for detailed error information
- **Metrics**: Use Prometheus metrics for performance analysis

## Maintenance

### Regular Tasks

1. **Update dependencies:**
```bash
npm audit
npm update
```

2. **Rotate credentials:**
```bash
# Update API tokens
# Update TLS certificates
```

3. **Monitor performance:**
```bash
# Review metrics and alerts
# Analyze performance trends
# Plan capacity upgrades
```

4. **Backup configuration:**
```bash
# Backup Kubernetes manifests
# Backup environment configurations
# Document any customizations
```

### Upgrade Process

1. **Test in staging environment**
2. **Create backup of current deployment**
3. **Deploy new version with rolling update**
4. **Verify health checks pass**
5. **Monitor for issues**
6. **Rollback if necessary**

## Conclusion

This deployment guide provides a comprehensive approach to running the Enhanced MCP Jira REST Server in production. Follow the security, monitoring, and performance recommendations to ensure a stable and scalable deployment.

For additional support or questions, refer to the project documentation or monitoring dashboards for real-time system insights.
