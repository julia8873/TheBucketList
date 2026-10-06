# ──────────────────────────────────────────────────────────────────────────────
# TheBucketList — Makefile
# Requires: GNU Make, Docker Desktop, Android Studio (for `make android`)
# Windows: run inside WSL2 or use `winget install GnuWin32.Make`
# ──────────────────────────────────────────────────────────────────────────────

.PHONY: help up down restart reset-db seed logs test lint typecheck apk web android clean

# Detect compose command
COMPOSE := $(shell command -v docker-compose 2>/dev/null || echo "docker compose")
SUPABASE := npx supabase

# Colors
BOLD  := \033[1m
RESET := \033[0m
GREEN := \033[32m
CYAN  := \033[36m

help: ## Show this help message
	@echo ""
	@echo "  $(BOLD)TheBucketList — Make targets$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ─── Local stack ──────────────────────────────────────────────────────────────

up: ## Start all local services (Supabase + Docker Compose)
	@echo "$(GREEN)Starting Supabase local stack...$(RESET)"
	$(SUPABASE) start
	@echo "$(GREEN)Starting Docker Compose services...$(RESET)"
	$(COMPOSE) -f infra/docker-compose.yml up -d
	@echo "$(GREEN)All services up. Metro at http://localhost:8081$(RESET)"
	@echo "$(GREEN)Supabase Studio at http://localhost:54323$(RESET)"
	@echo "$(GREEN)PWA at http://localhost:3000$(RESET)"

down: ## Stop all local services
	$(COMPOSE) -f infra/docker-compose.yml down
	$(SUPABASE) stop

restart: down up ## Restart all services

reset-db: ## Drop and recreate the local database (runs all migrations + seed)
	$(SUPABASE) db reset

seed: ## Run seed.sql on the local database
	$(SUPABASE) db reset --debug

logs: ## Tail all Docker Compose logs
	$(COMPOSE) -f infra/docker-compose.yml logs -f

logs-%: ## Tail logs for a specific service (e.g. make logs-metro)
	$(COMPOSE) -f infra/docker-compose.yml logs -f $*

# ─── Quality ──────────────────────────────────────────────────────────────────

lint: ## Run ESLint across the monorepo
	npm run lint

typecheck: ## Run TypeScript type checking across the monorepo
	npm run typecheck

test: ## Run all tests (Jest + pgTAP)
	@echo "$(GREEN)Running Jest...$(RESET)"
	npm run test
	@echo "$(GREEN)Running pgTAP RLS tests...$(RESET)"
	$(SUPABASE) test db

# ─── Mobile ───────────────────────────────────────────────────────────────────

android: ## Build dev client and launch on AVD (requires Android Studio)
	@echo "$(GREEN)Building Expo dev client for Android...$(RESET)"
	cd apps/mobile && npx expo run:android

web: ## Build and serve the PWA locally
	@echo "$(GREEN)Building PWA...$(RESET)"
	cd apps/mobile && npx expo export --platform web --output-dir ../../web-build
	$(COMPOSE) -f infra/docker-compose.yml up -d web
	@echo "$(GREEN)PWA served at http://localhost:3000$(RESET)"

apk: ## Build release APK/AAB inside Docker container (no local SDK needed)
	@echo "$(GREEN)Building APK in android-builder container...$(RESET)"
	$(COMPOSE) -f infra/docker-compose.yml run --rm android-builder \
		bash -c "cd /workspace/apps/mobile && npx expo prebuild --platform android --clean && cd android && ./gradlew assembleRelease"
	@echo "$(GREEN)APK output: apps/mobile/android/app/build/outputs/apk/release/$(RESET)"

# ─── Cleanup ──────────────────────────────────────────────────────────────────

clean: ## Remove build artifacts, node_modules caches
	rm -rf apps/mobile/.expo apps/mobile/web-build web-build
	find . -name "*.tsbuildinfo" -delete
	@echo "$(GREEN)Clean complete$(RESET)"

studio: ## Open Supabase Studio in browser
	@open http://localhost:54323 || start http://localhost:54323

inbucket: ## Open Inbucket (local email testing) in browser
	@open http://localhost:54324 || start http://localhost:54324
