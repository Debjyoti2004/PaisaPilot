#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PaisaPilot — Pull latest image from Docker Hub and redeploy
# Run on the production server from /opt/paisapilot:
#
#   cd /opt/paisapilot && sudo bash deploy.sh
#
# Optionally pass a specific tag:
#   sudo bash deploy.sh abc1234
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[paisapilot]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
fatal()   { echo -e "${RED}[✗]${NC} $*"; exit 1; }

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAG="${1:-latest}"

# ── Pre-flight checks ──────────────────────────────────────────────────────
[[ -f "$DEPLOY_DIR/.env" ]]                       || fatal ".env not found — copy .env.example and fill in secrets"
[[ -f "$DEPLOY_DIR/docker-compose.prod.yml" ]]    || fatal "docker-compose.prod.yml not found"
command -v docker &>/dev/null                      || fatal "Docker not installed"

source "$DEPLOY_DIR/.env"
[[ -n "${DOCKERHUB_USERNAME:-}" ]]  || fatal "DOCKERHUB_USERNAME not set in .env"
[[ -n "${DATABASE_URL:-}" ]]        || fatal "DATABASE_URL not set in .env"

IMAGE="${DOCKERHUB_USERNAME}/paisapilot:${TAG}"
COMPOSE="docker compose -f $DEPLOY_DIR/docker-compose.prod.yml"

info "Deploying $IMAGE ..."

# ── Pull latest image ──────────────────────────────────────────────────────
info "Pulling image from Docker Hub..."
docker pull "$IMAGE"
success "Image pulled"

# ── Record current image for rollback ─────────────────────────────────────
PREV_IMAGE=$($COMPOSE images -q app 2>/dev/null || true)

# ── Deploy ─────────────────────────────────────────────────────────────────
info "Starting new container..."
TAG="$TAG" DOCKERHUB_USERNAME="$DOCKERHUB_USERNAME" $COMPOSE up -d --remove-orphans

# ── Health check ───────────────────────────────────────────────────────────
info "Waiting for health check..."
RETRIES=12
for i in $(seq 1 $RETRIES); do
    if curl -fsS http://localhost:3000/api/health &>/dev/null; then
        success "App is healthy!"
        break
    fi
    if [[ $i -eq $RETRIES ]]; then
        warn "Health check timed out — rolling back..."
        if [[ -n "${PREV_IMAGE:-}" ]]; then
            docker tag "$PREV_IMAGE" "${DOCKERHUB_USERNAME}/paisapilot:rollback"
            TAG=rollback DOCKERHUB_USERNAME="$DOCKERHUB_USERNAME" $COMPOSE up -d
        fi
        fatal "Deployment failed — rolled back. Check logs: $COMPOSE logs -f"
    fi
    info "Attempt $i/$RETRIES — retrying in 5s..."
    sleep 5
done

# ── Prune old images ───────────────────────────────────────────────────────
info "Pruning old images..."
docker image prune -f &>/dev/null || true
success "Cleanup done"

# ── Done ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  PaisaPilot deployed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Running image : ${CYAN}${IMAGE}${NC}"
echo -e "  Status        : $COMPOSE ps"
echo -e "  Logs          : $COMPOSE logs -f"
echo ""
