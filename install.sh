#!/bin/bash
# Agent Control Panel — One-Click Install
# Usage: curl -sSL https://raw.githubusercontent.com/serverul/agent-control-panel/main/install.sh | bash
# Or: ./install.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Agent Control Panel — Installer      ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

install_docker() {
    if command_exists docker; then
        print_step "Docker already installed"
        return
    fi
    
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    print_step "Docker installed"
    print_warn "You may need to log out and back in for Docker permissions"
}

install_docker_compose() {
    if docker compose version >/dev/null 2>&1; then
        print_step "Docker Compose already installed"
        return
    fi
    
    print_info "Installing Docker Compose plugin..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-compose-plugin
    print_step "Docker Compose installed"
}

clone_repo() {
    INSTALL_DIR="${ACP_INSTALL_DIR:-$HOME/agent-control-panel}"
    
    if [ -d "$INSTALL_DIR" ]; then
        print_info "Directory exists, pulling latest..."
        cd "$INSTALL_DIR"
        git pull
    else
        print_info "Cloning repository..."
        git clone https://github.com/serverul/agent-control-panel.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    print_step "Repository ready at $INSTALL_DIR"
}

create_env() {
    if [ -f .env ]; then
        print_info ".env already exists, skipping"
        return
    fi
    
    # Generate random secret
    SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
    
    cat > .env << EOF
# Agent Control Panel Configuration
ACP_PORT=3101
ACP_API_PORT=3100
ACP_DB_PORT=5433

# Auth
ACP_ADMIN_USER=admin
ACP_ADMIN_PASS=admin123
ACP_SECRET_KEY=$SECRET_KEY

# Database (internal, don't change unless you know what you're doing)
POSTGRES_USER=acp
POSTGRES_PASSWORD=acp_secret
POSTGRES_DB=agent_control_panel
EOF
    
    chmod 600 .env
    print_step "Configuration created (.env)"
}

start_services() {
    print_info "Starting services..."
    docker compose up -d --build
    
    print_info "Waiting for services to start..."
    sleep 10
    
    # Check if services are running
    if docker compose ps | grep -q "Up"; then
        print_step "Services started successfully"
    else
        print_error "Services failed to start. Check logs with: docker compose logs"
        exit 1
    fi
}

print_success() {
    # Get the server IP
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║        Installation Complete! ✓          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BLUE}URL:${NC}      http://${SERVER_IP}:3101"
    echo -e "  ${BLUE}Username:${NC} admin"
    echo -e "  ${BLUE}Password:${NC} admin123"
    echo ""
    echo -e "  ${YELLOW}API Docs:${NC} http://${SERVER_IP}:3100/docs"
    echo ""
    echo -e "  ${BLUE}Useful commands:${NC}"
    echo -e "    docker compose logs -f     # View logs"
    echo -e "    docker compose restart     # Restart services"
    echo -e "    docker compose down        # Stop services"
    echo -e "    docker compose up -d       # Start services"
    echo ""
    echo -e "  ${YELLOW}Change the default password after first login!${NC}"
    echo ""
}

# Main
print_header

print_info "Checking prerequisites..."

# Check git
if ! command_exists git; then
    print_info "Installing git..."
    sudo apt-get update -qq && sudo apt-get install -y -qq git
fi
print_step "Git ready"

# Check curl
if ! command_exists curl; then
    print_info "Installing curl..."
    sudo apt-get update -qq && sudo apt-get install -y -qq curl
fi
print_step "Curl ready"

# Install Docker
install_docker
install_docker_compose

# Clone repo
clone_repo

# Create .env
create_env

# Start services
start_services

# Print success
print_success
