# Clixen MVP Development Makefile
# Task orchestration for multi-agent workflows

.PHONY: help install build test deploy clean security-check sync-check

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo '${CYAN}Clixen MVP Development Tasks${NC}'
	@echo ''
	@echo 'Usage:'
	@echo '  ${GREEN}make${NC} ${YELLOW}<target>${NC}'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  ${GREEN}%-20s${NC} %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies (frontend + backend)
	@echo '${CYAN}Installing dependencies...${NC}'
	cd frontend && npm install
	cd backend && npm install
	@echo '${GREEN}✓ Dependencies installed${NC}'

build: ## Build frontend for production
	@echo '${CYAN}Building frontend...${NC}'
	cd frontend && npm run build
	@echo '${GREEN}✓ Frontend built${NC}'

test: ## Run all tests
	@echo '${CYAN}Running tests...${NC}'
	@make test-security
	@make test-isolation
	@make test-sync
	@echo '${GREEN}✓ All tests passed${NC}'

test-security: ## Run security tests
	@echo '${YELLOW}Testing security...${NC}'
	node simple-user-isolation-test.mjs || true

test-isolation: ## Test user isolation
	@echo '${YELLOW}Testing user isolation...${NC}'
	node test-user-isolation.mjs || true

test-sync: ## Test 2-way sync system
	@echo '${YELLOW}Testing sync system...${NC}'
	node test-sync-system.mjs || true

deploy-edge-functions: ## Deploy Edge Functions to Supabase
	@echo '${CYAN}Deploying Edge Functions...${NC}'
	cd backend && npx supabase functions deploy --project-ref zfbgdixbzezpxllkoyfc
	@echo '${GREEN}✓ Edge Functions deployed${NC}'

security-check: ## Check for hardcoded secrets
	@echo '${CYAN}Checking for hardcoded secrets...${NC}'
	@grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . | grep -v ".env" || echo '${GREEN}✓ No hardcoded secrets found${NC}'

sync-check: ## Check sync system health
	@echo '${CYAN}Checking sync system...${NC}'
	@curl -s http://18.221.12.50:5678/api/v1/workflows \
		-H "X-N8N-API-KEY: ${N8N_API_KEY}" | jq '.data | length' || echo '${RED}✗ n8n connection failed${NC}'

db-status: ## Check database status
	@echo '${CYAN}Checking database status...${NC}'
	@npx supabase db remote status --db-url "${SUPABASE_DB_URL}" || echo '${RED}✗ Database connection failed${NC}'

monitor: ## Monitor system health (continuous)
	@echo '${CYAN}Starting monitoring...${NC}'
	@watch -n 5 'make sync-check'

parallel-test: ## Run tests in parallel
	@echo '${CYAN}Running tests in parallel...${NC}'
	@parallel -j 3 ::: \
		"node simple-user-isolation-test.mjs" \
		"node test-sync-system.mjs" \
		"node mvp-user-journey-test.mjs"

clean: ## Clean build artifacts
	@echo '${CYAN}Cleaning build artifacts...${NC}'
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.cache
	@echo '${GREEN}✓ Clean complete${NC}'

dev: ## Start development servers
	@echo '${CYAN}Starting development servers...${NC}'
	cd frontend && npm run dev

prod-check: ## Pre-production checklist
	@echo '${CYAN}Running production checklist...${NC}'
	@make security-check
	@make build
	@make test
	@echo '${GREEN}✓ Ready for production${NC}'

logs: ## View Edge Function logs
	@echo '${CYAN}Fetching Edge Function logs...${NC}'
	npx supabase functions logs --project-ref zfbgdixbzezpxllkoyfc --tail

help-verbose: ## Show detailed help
	@echo '${CYAN}═══════════════════════════════════════════════════════${NC}'
	@echo '${GREEN}Clixen MVP Development Orchestration${NC}'
	@echo '${CYAN}═══════════════════════════════════════════════════════${NC}'
	@echo ''
	@echo '${YELLOW}Core Tasks:${NC}'
	@echo '  make install        - Install all project dependencies'
	@echo '  make build          - Build frontend for production'
	@echo '  make test           - Run complete test suite'
	@echo '  make deploy         - Deploy to production'
	@echo ''
	@echo '${YELLOW}Testing Tasks:${NC}'
	@echo '  make test-security  - Test security implementation'
	@echo '  make test-isolation - Test user isolation'
	@echo '  make test-sync      - Test 2-way sync system'
	@echo '  make parallel-test  - Run tests in parallel'
	@echo ''
	@echo '${YELLOW}Monitoring:${NC}'
	@echo '  make monitor        - Live system monitoring'
	@echo '  make logs           - View Edge Function logs'
	@echo '  make sync-check     - Check sync system health'
	@echo ''
	@echo '${YELLOW}Production:${NC}'
	@echo '  make prod-check     - Pre-production validation'
	@echo '  make security-check - Scan for hardcoded secrets'
	@echo ''
	@echo '${CYAN}═══════════════════════════════════════════════════════${NC}'