#!/bin/bash
# 🛠️ Clixen Authentication Toolkit
# Reusable CLI tool for Vite + Supabase authentication validation and deployment

set -e

VERSION="1.0.0"
SCRIPT_NAME="clixen-auth-toolkit"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Help function
show_help() {
    cat << EOF
🛠️  Clixen Authentication Toolkit v${VERSION}

USAGE:
    ${SCRIPT_NAME} [COMMAND] [OPTIONS]

COMMANDS:
    validate        Validate Vite build for Supabase placeholder URLs
    build           Build with environment variable validation
    deploy          Deploy to production with safety checks
    setup-https     Configure HTTPS for production server
    fix-env         Interactive environment variable fix
    doctor          Full system health check

OPTIONS:
    -h, --help      Show this help message
    -v, --version   Show version information
    --env-file      Specify custom .env file path
    --dry-run       Show what would be done without executing

EXAMPLES:
    ${SCRIPT_NAME} validate
    ${SCRIPT_NAME} build --env-file .env.production
    ${SCRIPT_NAME} deploy --dry-run
    ${SCRIPT_NAME} doctor

For more information: https://github.com/your-org/clixen-auth-toolkit
EOF
}

# Validate build for placeholder URLs
validate_build() {
    local build_dir="${1:-dist}"
    
    log_info "Validating build directory: $build_dir"
    
    if [ ! -d "$build_dir" ]; then
        log_error "Build directory '$build_dir' not found. Run build first."
        return 1
    fi
    
    # Check for placeholder URLs
    local placeholder_count=$(grep -r "your-project.supabase.co" "$build_dir" 2>/dev/null | wc -l)
    if [ $placeholder_count -gt 0 ]; then
        log_error "Found $placeholder_count placeholder URLs in build:"
        grep -r "your-project.supabase.co" "$build_dir" || true
        log_error "Fix: Ensure VITE_SUPABASE_URL is set correctly during build"
        return 1
    fi
    
    # Check for placeholder API keys
    local placeholder_key_count=$(grep -r "your-anon-key" "$build_dir" 2>/dev/null | wc -l)
    if [ $placeholder_key_count -gt 0 ]; then
        log_error "Found placeholder API keys in build"
        return 1
    fi
    
    # Check for real Supabase URL (if env var is set)
    if [ -n "$VITE_SUPABASE_URL" ]; then
        local real_url_count=$(grep -r "$VITE_SUPABASE_URL" "$build_dir" 2>/dev/null | wc -l)
        if [ $real_url_count -eq 0 ]; then
            log_error "Production Supabase URL not found in build"
            return 1
        fi
        log_success "Found $real_url_count references to production Supabase URL"
    fi
    
    log_success "Build validation passed!"
    return 0
}

# Build with validation
build_with_validation() {
    local env_file="${1:-.env}"
    
    log_info "Building with environment file: $env_file"
    
    # Check if env file exists
    if [ -f "$env_file" ]; then
        log_info "Loading environment from $env_file"
        source "$env_file"
    fi
    
    # Validate environment variables
    if [ -z "$VITE_SUPABASE_URL" ]; then
        log_error "VITE_SUPABASE_URL not set. Check your $env_file file."
        return 1
    fi
    
    if [[ "$VITE_SUPABASE_URL" == *"your-project"* ]]; then
        log_error "VITE_SUPABASE_URL contains placeholder value: $VITE_SUPABASE_URL"
        return 1
    fi
    
    log_info "Environment validation passed"
    log_info "Supabase URL: $VITE_SUPABASE_URL"
    
    # Clean and build
    rm -rf dist
    
    if command -v pnpm &> /dev/null; then
        pnpm run build
    elif command -v npm &> /dev/null; then
        npm run build
    else
        log_error "Neither pnpm nor npm found"
        return 1
    fi
    
    # Validate the build
    validate_build
}

# Environment doctor
environment_doctor() {
    log_info "Running Clixen Authentication System Health Check..."
    
    local issues=0
    
    # Check for required tools
    log_info "Checking required tools..."
    for tool in curl grep; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool not found"
            ((issues++))
        else
            log_success "$tool found"
        fi
    done
    
    # Check for Node.js and package managers
    if command -v node &> /dev/null; then
        log_success "Node.js found: $(node --version)"
    else
        log_error "Node.js not found"
        ((issues++))
    fi
    
    if command -v pnpm &> /dev/null; then
        log_success "pnpm found: $(pnpm --version)"
    elif command -v npm &> /dev/null; then
        log_success "npm found: $(npm --version)"
    else
        log_error "No package manager (pnpm/npm) found"
        ((issues++))
    fi
    
    # Check environment files
    log_info "Checking environment configuration..."
    if [ -f ".env" ]; then
        log_success ".env file found"
        
        if grep -q "VITE_SUPABASE_URL" .env; then
            local url=$(grep "VITE_SUPABASE_URL" .env | cut -d'=' -f2)
            if [[ "$url" == *"your-project"* ]]; then
                log_error "VITE_SUPABASE_URL contains placeholder value"
                ((issues++))
            else
                log_success "VITE_SUPABASE_URL looks valid"
            fi
        else
            log_error "VITE_SUPABASE_URL not found in .env"
            ((issues++))
        fi
    else
        log_warning ".env file not found"
    fi
    
    # Check build directory
    if [ -d "dist" ]; then
        log_success "Build directory found"
        if validate_build "dist" &>/dev/null; then
            log_success "Build validation passed"
        else
            log_error "Build validation failed"
            ((issues++))
        fi
    else
        log_warning "No build directory found (run build first)"
    fi
    
    # Summary
    if [ $issues -eq 0 ]; then
        log_success "Health check passed! No issues found."
        return 0
    else
        log_error "Health check found $issues issue(s) that need attention."
        return 1
    fi
}

# Interactive environment fix
fix_environment() {
    log_info "Interactive Environment Variable Fix"
    
    echo "This will help you configure your Supabase environment variables."
    echo ""
    
    read -p "Enter your Supabase Project URL: " supabase_url
    read -p "Enter your Supabase Anon Key: " supabase_key
    
    if [[ "$supabase_url" == *"your-project"* ]] || [ -z "$supabase_url" ]; then
        log_error "Invalid Supabase URL provided"
        return 1
    fi
    
    if [[ "$supabase_key" == *"your-anon"* ]] || [ -z "$supabase_key" ]; then
        log_error "Invalid Supabase key provided"
        return 1
    fi
    
    # Create or update .env file
    cat > .env << EOF
# Clixen Environment Configuration - Generated by ${SCRIPT_NAME}

# Supabase Configuration
VITE_SUPABASE_URL=$supabase_url
VITE_SUPABASE_ANON_KEY=$supabase_key

# Add other environment variables as needed
EOF
    
    log_success ".env file created/updated successfully!"
    log_info "Run '${SCRIPT_NAME} build' to build with the new configuration"
}

# Main command dispatcher
main() {
    case "${1:-help}" in
        validate)
            validate_build "${2:-dist}"
            ;;
        build)
            local env_file=".env"
            if [ "$2" = "--env-file" ] && [ -n "$3" ]; then
                env_file="$3"
            fi
            build_with_validation "$env_file"
            ;;
        deploy)
            log_info "Deploy functionality - integrate with your deployment system"
            ;;
        setup-https)
            log_info "HTTPS setup - run the setup-https.sh script"
            ;;
        fix-env)
            fix_environment
            ;;
        doctor)
            environment_doctor
            ;;
        version|--version|-v)
            echo "${SCRIPT_NAME} version ${VERSION}"
            ;;
        help|--help|-h|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"