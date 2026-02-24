#!/bin/bash

# Webpage PDF Generator Deployment Script
# This script deploys the application directly from Git repository

set -e

# Configuration
GIT_REPO="https://github.com/gleesonb/webpage-pdf-generator.git"
GIT_BRANCH="main"
COMPOSE_FILE="docker-compose.git.yml"
PROD_COMPOSE_FILE="docker-compose.git-prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update repository URL in compose files
update_repo_url() {
    local repo_url="$1"
    log_info "Updating repository URL to: $repo_url"
    
    # Update basic compose file
    sed -i "s|https://github.com/yourusername/webpage-pdf-generator.git#main|$repo_url#$GIT_BRANCH|g" $COMPOSE_FILE
    
    # Update production compose file
    sed -i "s|https://github.com/yourusername/webpage-pdf-generator.git#main|$repo_url#$GIT_BRANCH|g" $PROD_COMPOSE_FILE
}

# Deploy function
deploy() {
    local environment="$1"
    
    log_info "Starting deployment for $environment environment..."
    
    # Pull latest changes
    log_info "Pulling latest changes from Git repository..."
    docker-compose -f $COMPOSE_FILE pull
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f $COMPOSE_FILE down
    
    # Build and start containers
    if [ "$environment" = "production" ]; then
        log_info "Building and starting production containers..."
        docker-compose -f $PROD_COMPOSE_FILE up -d --build
    else
        log_info "Building and starting development containers..."
        docker-compose -f $COMPOSE_FILE up -d --build
    fi
    
    # Wait for health check
    log_info "Waiting for application to be healthy..."
    sleep 30
    
    # Check status
    if docker-compose -f $COMPOSE_FILE ps | grep -q "Up (healthy)"; then
        log_info "Deployment successful! Application is running and healthy."
    else
        log_error "Deployment failed! Check logs with: docker-compose -f $COMPOSE_FILE logs"
        exit 1
    fi
}

# Update function
update() {
    log_info "Updating application from Git repository..."
    
    # Pull latest changes
    docker-compose -f $COMPOSE_FILE pull
    
    # Restart containers with new image
    docker-compose -f $COMPOSE_FILE up -d
    
    log_info "Update completed!"
}

# Main script
case "$1" in
    "deploy-dev")
        deploy "development"
        ;;
    "deploy-prod")
        deploy "production"
        ;;
    "update")
        update
        ;;
    "set-repo")
        if [ -z "$2" ]; then
            log_error "Please provide repository URL: ./deploy.sh set-repo https://github.com/user/repo.git"
            exit 1
        fi
        update_repo_url "$2"
        ;;
    "logs")
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
    "status")
        docker-compose -f $COMPOSE_FILE ps
        ;;
    *)
        echo "Usage: $0 {deploy-dev|deploy-prod|update|set-repo|logs|status}"
        echo ""
        echo "Commands:"
        echo "  deploy-dev    - Deploy development environment"
        echo "  deploy-prod   - Deploy production environment"
        echo "  update        - Update running application"
        echo "  set-repo URL  - Set Git repository URL"
        echo "  logs          - Show application logs"
        echo "  status        - Show container status"
        exit 1
        ;;
esac
