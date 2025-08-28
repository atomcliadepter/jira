#!/bin/bash
# Enhanced MCP Jira REST Server - Backup and Recovery System

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Create backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    log "Backup directory created: $BACKUP_DIR"
}

# Backup configuration files
backup_config() {
    local backup_path="$BACKUP_DIR/config_$TIMESTAMP"
    mkdir -p "$backup_path"
    
    log "Backing up configuration files..."
    
    # Backup environment files (excluding secrets)
    if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
        cp "$PROJECT_ROOT/.env.example" "$backup_path/"
    fi
    
    # Backup package files
    cp "$PROJECT_ROOT/package.json" "$backup_path/"
    cp "$PROJECT_ROOT/package-lock.json" "$backup_path/"
    cp "$PROJECT_ROOT/tsconfig.json" "$backup_path/"
    
    # Backup deployment configurations
    if [[ -d "$PROJECT_ROOT/deployment" ]]; then
        cp -r "$PROJECT_ROOT/deployment" "$backup_path/"
    fi
    
    # Create backup manifest
    cat > "$backup_path/backup_manifest.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "type": "configuration",
  "version": "$(node -p "require('$PROJECT_ROOT/package.json').version" 2>/dev/null || echo 'unknown')",
  "files": [
    ".env.example",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "deployment/"
  ]
}
EOF
    
    log "Configuration backup completed: $backup_path"
}

# Backup application data
backup_data() {
    local backup_path="$BACKUP_DIR/data_$TIMESTAMP"
    mkdir -p "$backup_path"
    
    log "Backing up application data..."
    
    # Backup logs if they exist
    if [[ -d "$PROJECT_ROOT/logs" ]]; then
        cp -r "$PROJECT_ROOT/logs" "$backup_path/"
    fi
    
    # Backup cache if it exists
    if [[ -d "$PROJECT_ROOT/cache" ]]; then
        cp -r "$PROJECT_ROOT/cache" "$backup_path/"
    fi
    
    # Backup any persistent data
    if [[ -d "$PROJECT_ROOT/data" ]]; then
        cp -r "$PROJECT_ROOT/data" "$backup_path/"
    fi
    
    # Create data manifest
    cat > "$backup_path/data_manifest.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "type": "data",
  "size": "$(du -sh "$backup_path" | cut -f1)",
  "directories": [
    "logs/",
    "cache/",
    "data/"
  ]
}
EOF
    
    log "Data backup completed: $backup_path"
}

# Create full system backup
backup_full() {
    log "Starting full system backup..."
    
    create_backup_dir
    backup_config
    backup_data
    
    # Create compressed archive
    local archive_name="mcp_jira_backup_$TIMESTAMP.tar.gz"
    local archive_path="$BACKUP_DIR/$archive_name"
    
    tar -czf "$archive_path" -C "$BACKUP_DIR" "config_$TIMESTAMP" "data_$TIMESTAMP"
    
    # Cleanup individual directories
    rm -rf "$BACKUP_DIR/config_$TIMESTAMP" "$BACKUP_DIR/data_$TIMESTAMP"
    
    log "Full backup completed: $archive_path"
    log "Backup size: $(du -sh "$archive_path" | cut -f1)"
}

# Restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "Starting restore from: $backup_file"
    
    # Create temporary restore directory
    local restore_dir="$BACKUP_DIR/restore_$TIMESTAMP"
    mkdir -p "$restore_dir"
    
    # Extract backup
    tar -xzf "$backup_file" -C "$restore_dir"
    
    # Restore configuration
    if [[ -d "$restore_dir/config_$TIMESTAMP" ]]; then
        log "Restoring configuration files..."
        
        # Backup current config before restore
        if [[ -f "$PROJECT_ROOT/package.json" ]]; then
            cp "$PROJECT_ROOT/package.json" "$PROJECT_ROOT/package.json.backup"
        fi
        
        # Restore files
        cp -r "$restore_dir/config_$TIMESTAMP"/* "$PROJECT_ROOT/"
        
        log "Configuration restored successfully"
    fi
    
    # Restore data
    if [[ -d "$restore_dir/data_$TIMESTAMP" ]]; then
        log "Restoring application data..."
        
        # Restore data directories
        if [[ -d "$restore_dir/data_$TIMESTAMP/logs" ]]; then
            mkdir -p "$PROJECT_ROOT/logs"
            cp -r "$restore_dir/data_$TIMESTAMP/logs"/* "$PROJECT_ROOT/logs/"
        fi
        
        if [[ -d "$restore_dir/data_$TIMESTAMP/cache" ]]; then
            mkdir -p "$PROJECT_ROOT/cache"
            cp -r "$restore_dir/data_$TIMESTAMP/cache"/* "$PROJECT_ROOT/cache/"
        fi
        
        log "Data restored successfully"
    fi
    
    # Cleanup
    rm -rf "$restore_dir"
    
    log "Restore completed successfully"
}

# List available backups
list_backups() {
    log "Available backups:"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        warn "No backup directory found"
        return
    fi
    
    find "$BACKUP_DIR" -name "mcp_jira_backup_*.tar.gz" -type f | while read -r backup; do
        local size=$(du -sh "$backup" | cut -f1)
        local date=$(basename "$backup" | sed 's/mcp_jira_backup_\(.*\)\.tar\.gz/\1/')
        echo "  - $(basename "$backup") ($size) - $date"
    done
}

# Cleanup old backups
cleanup_backups() {
    local keep_days="${1:-30}"
    
    log "Cleaning up backups older than $keep_days days..."
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        warn "No backup directory found"
        return
    fi
    
    find "$BACKUP_DIR" -name "mcp_jira_backup_*.tar.gz" -type f -mtime +$keep_days -delete
    
    log "Cleanup completed"
}

# Health check for backup system
health_check() {
    log "Running backup system health check..."
    
    # Check backup directory
    if [[ ! -d "$BACKUP_DIR" ]]; then
        warn "Backup directory does not exist: $BACKUP_DIR"
    else
        log "Backup directory exists: $BACKUP_DIR"
    fi
    
    # Check disk space
    local available_space=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    log "Available disk space: $available_space"
    
    # Check recent backups
    local recent_backups=$(find "$BACKUP_DIR" -name "mcp_jira_backup_*.tar.gz" -type f -mtime -7 | wc -l)
    log "Recent backups (last 7 days): $recent_backups"
    
    log "Health check completed"
}

# Main function
main() {
    case "${1:-}" in
        "backup")
            backup_full
            ;;
        "restore")
            if [[ -z "${2:-}" ]]; then
                error "Please specify backup file to restore"
            fi
            restore_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_backups "${2:-30}"
            ;;
        "health")
            health_check
            ;;
        *)
            echo "Usage: $0 {backup|restore <file>|list|cleanup [days]|health}"
            echo ""
            echo "Commands:"
            echo "  backup          Create full system backup"
            echo "  restore <file>  Restore from backup file"
            echo "  list            List available backups"
            echo "  cleanup [days]  Remove backups older than N days (default: 30)"
            echo "  health          Check backup system health"
            exit 1
            ;;
    esac
}

main "$@"
