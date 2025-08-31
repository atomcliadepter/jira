#!/bin/bash

# Enhanced MCP Jira REST Server - Production Deployment Script
# Usage: ./scripts/deploy.sh [environment] [version]

set -e

ENVIRONMENT=${1:-production}
VERSION=${2:-latest}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting deployment for Enhanced MCP Jira REST Server"
echo "   Environment: $ENVIRONMENT"
echo "   Version: $VERSION"
echo "   Project: $PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ required, found: $(node --version)"
        exit 1
    fi
    log_info "Node.js version check passed: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_info "npm version: $(npm --version)"
    
    # Check environment file
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        log_error ".env file not found. Please create from .env.example"
        exit 1
    fi
    log_info "Environment configuration found"
    
    # Validate required environment variables
    source "$PROJECT_DIR/.env"
    if [ -z "$JIRA_BASE_URL" ]; then
        log_error "JIRA_BASE_URL not set in .env"
        exit 1
    fi
    
    if [ -z "$JIRA_EMAIL" ] && [ -z "$OAUTH_CLIENT_ID" ]; then
        log_error "Either JIRA_EMAIL+JIRA_API_TOKEN or OAUTH_CLIENT_ID+OAUTH_CLIENT_SECRET must be set"
        exit 1
    fi
    log_info "Environment variables validated"
}

# Build application
build_application() {
    log_info "Building application..."
    cd "$PROJECT_DIR"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --production=false
    
    # Run tests
    log_info "Running tests..."
    npm run test:ci
    
    # Build TypeScript
    log_info "Building TypeScript..."
    npm run build
    
    # Validate build
    if [ ! -f "dist/index.js" ]; then
        log_error "Build failed - dist/index.js not found"
        exit 1
    fi
    log_info "Build completed successfully"
}

# Health check function
health_check() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    log_info "Performing health check on $url"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url/health" > /dev/null 2>&1; then
            log_info "Health check passed (attempt $attempt)"
            return 0
        fi
        
        log_warn "Health check failed (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Deploy to production
deploy_production() {
    log_info "Deploying to production environment..."
    
    # Create necessary directories
    mkdir -p logs/audit
    mkdir -p logs/app
    mkdir -p config
    
    # Set proper permissions
    chmod 755 dist/cli/*.js 2>/dev/null || true
    
    # Copy configuration files
    if [ ! -f "config/permissions.json" ]; then
        log_info "Creating default permissions configuration..."
        cat > config/permissions.json << EOF
{
  "agents": {
    "production-agent": {
      "allowedTools": [
        "issue.get", "issue.create", "issue.update", "issue.transition",
        "jql.search", "project.get", "user.get", "issue.comment.add"
      ],
      "readOnly": false,
      "maxRequestsPerMinute": 100
    },
    "read-only-agent": {
      "allowedTools": [
        "issue.get", "jql.search", "project.get", "user.get"
      ],
      "readOnly": true,
      "maxRequestsPerMinute": 50
    }
  },
  "defaultPolicy": {
    "allowAll": false,
    "readOnly": true,
    "maxRequestsPerMinute": 30
  }
}
EOF
    fi
    
    # Start the server
    log_info "Starting MCP Jira REST Server..."
    
    # Use PM2 if available, otherwise use nohup
    if command -v pm2 &> /dev/null; then
        pm2 delete mcp-jira-server 2>/dev/null || true
        pm2 start dist/index.js --name mcp-jira-server --log logs/app/server.log
        pm2 save
        log_info "Server started with PM2"
    else
        nohup node dist/index.js > logs/app/server.log 2>&1 &
        echo $! > .server.pid
        log_info "Server started with PID: $(cat .server.pid)"
    fi
    
    # Wait for server to start
    sleep 5
    
    # Health check
    if health_check "http://localhost:9090"; then
        log_info "Production deployment successful!"
    else
        log_error "Production deployment failed - health check failed"
        exit 1
    fi
}

# Deploy with Docker
deploy_docker() {
    log_info "Deploying with Docker..."
    
    # Build Docker image
    log_info "Building Docker image..."
    docker build -f deployment/docker/Dockerfile -t mcp-jira-server:$VERSION .
    
    # Stop existing container
    docker stop mcp-jira-server 2>/dev/null || true
    docker rm mcp-jira-server 2>/dev/null || true
    
    # Run new container
    log_info "Starting Docker container..."
    docker run -d \
        --name mcp-jira-server \
        --env-file .env \
        -p 3000:3000 \
        -p 9090:9090 \
        -v $(pwd)/logs:/app/logs \
        -v $(pwd)/config:/app/config \
        --restart unless-stopped \
        mcp-jira-server:$VERSION
    
    # Health check
    sleep 10
    if health_check "http://localhost:9090"; then
        log_info "Docker deployment successful!"
    else
        log_error "Docker deployment failed - health check failed"
        exit 1
    fi
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Apply Kubernetes manifests
    kubectl apply -f deployment/k8s/namespace.yaml
    kubectl apply -f deployment/k8s/configmap.yaml
    kubectl apply -f deployment/k8s/secret.yaml
    kubectl apply -f deployment/k8s/deployment.yaml
    kubectl apply -f deployment/k8s/service.yaml
    kubectl apply -f deployment/k8s/ingress.yaml
    
    # Wait for deployment
    kubectl rollout status deployment/mcp-jira-server -n mcp-system --timeout=300s
    
    # Get service URL
    SERVICE_URL=$(kubectl get service mcp-jira-server -n mcp-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [ -z "$SERVICE_URL" ]; then
        SERVICE_URL="localhost"
        kubectl port-forward service/mcp-jira-server 9090:9090 -n mcp-system &
        PORT_FORWARD_PID=$!
        sleep 5
    fi
    
    # Health check
    if health_check "http://$SERVICE_URL:9090"; then
        log_info "Kubernetes deployment successful!"
        [ ! -z "$PORT_FORWARD_PID" ] && kill $PORT_FORWARD_PID 2>/dev/null || true
    else
        log_error "Kubernetes deployment failed - health check failed"
        [ ! -z "$PORT_FORWARD_PID" ] && kill $PORT_FORWARD_PID 2>/dev/null || true
        exit 1
    fi
}

# Post-deployment validation
post_deployment_validation() {
    log_info "Running post-deployment validation..."
    
    # Test MCP server functionality
    log_info "Testing MCP server functionality..."
    
    # Test tool listing
    echo '{"jsonrpc":"2.0","method":"list_tools","id":1}' | timeout 10 node dist/index.js > /tmp/mcp_test.json 2>/dev/null || {
        log_error "MCP tool listing test failed"
        return 1
    }
    
    if grep -q "tools" /tmp/mcp_test.json; then
        log_info "MCP tool listing test passed"
    else
        log_error "MCP tool listing test failed - no tools found"
        return 1
    fi
    
    # Test Jira connectivity
    log_info "Testing Jira connectivity..."
    if timeout 10 node -e "
        import('./dist/http/EnhancedJiraRestClient.js').then(async ({ EnhancedJiraRestClient }) => {
            const client = new EnhancedJiraRestClient({
                baseUrl: process.env.JIRA_BASE_URL,
                email: process.env.JIRA_EMAIL,
                apiToken: process.env.JIRA_API_TOKEN,
            });
            try {
                const user = await client.get('/rest/api/3/myself');
                console.log('Jira connectivity test passed:', user.displayName);
                process.exit(0);
            } catch (error) {
                console.error('Jira connectivity test failed:', error.message);
                process.exit(1);
            }
        });
    "; then
        log_info "Jira connectivity test passed"
    else
        log_error "Jira connectivity test failed"
        return 1
    fi
    
    # Test audit logging
    if [ -d "logs/audit" ]; then
        log_info "Audit logging directory exists"
    else
        log_warn "Audit logging directory not found"
    fi
    
    # Clean up test files
    rm -f /tmp/mcp_test.json
    
    log_info "Post-deployment validation completed successfully"
}

# Main deployment flow
main() {
    case $ENVIRONMENT in
        "production")
            pre_deployment_checks
            build_application
            deploy_production
            post_deployment_validation
            ;;
        "docker")
            pre_deployment_checks
            build_application
            deploy_docker
            post_deployment_validation
            ;;
        "kubernetes"|"k8s")
            pre_deployment_checks
            build_application
            deploy_kubernetes
            post_deployment_validation
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            log_info "Supported environments: production, docker, kubernetes"
            exit 1
            ;;
    esac
    
    log_info "🎉 Deployment completed successfully!"
    log_info "Server is running and ready to accept connections"
    log_info "Health endpoint: http://localhost:9090/health"
    log_info "Metrics endpoint: http://localhost:9090/metrics"
}

# Run main function
main "$@"
