# PaisaPilot 💸

Personal money manager for India — envelope budgeting, salary split engine, savings hub. Built for a ₹37,000/month SBI salary with no bank sync (SBI has no free personal API). Single-user, self-hosted.

---

## Features

- **Salary Split Engine** — divide salary into envelopes the moment it arrives; handles surplus (₹45k month) and shortfall (₹30k month) automatically
- **Envelope Budgeting** — green/amber/red color states at 0/70/90% usage; safe-to-spend shown per day
- **Manual Transaction Entry** — smart merchant autocomplete ("zomato" → Eating Out, "hdfc" → EMI)
- **Savings Hub** — liquid vs reserved vs locked breakdown; emergency fund gauge
- **Calculators** — SIP, Step-up SIP, Goal planner, Lumpsum, EMI, FD/RD (all client-side)
- **Goals & Investments tracker**
- **Dark UI** — glassmorphism cards, mobile-first, PWA-ready

---

## Local Development

### Prerequisites

- Node.js 20+
- Docker Desktop (for local Postgres)

### Setup

```bash
git clone <repo-url>
cd paisapilot
npm install

# Start Postgres, push schema, seed ₹37k budget
npm run setup

# Start dev server
npm run dev
```

Open **http://localhost:3000**

On the same WiFi network (phone testing):

```bash
npm run dev -- -H 0.0.0.0
# then open http://<your-mac-ip>:3000
```

### Useful commands

```bash
npm run db:studio      # Prisma Studio — visual DB browser
npm run db:seed        # Re-seed default ₹37k budget
npx prisma db push     # Sync schema changes to DB
docker-compose up -d   # Start local Postgres
docker-compose down    # Stop Postgres
```

---

## Production Deployment

### Architecture

```
GitHub push → GitHub Actions → Docker Hub
                                    ↓
                          EC2 / VPS: deploy.sh
                                    ↓
                          Docker container (port 3000)
                                    ↓
                          Neon PostgreSQL (free tier)
```

### 1 — Docker Hub secrets (GitHub)

Add to **GitHub → Settings → Secrets → Actions**:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (not password) |

Every push to `main` triggers `.github/workflows/build-push.yml` which builds and pushes:
- `<username>/paisapilot:latest`
- `<username>/paisapilot:<short-sha>` (for rollback pinning)

### 2 — Server setup (first time only)

```bash
ssh ubuntu@your-server
mkdir -p /opt/paisapilot
cd /opt/paisapilot

# Copy files from repo
scp docker-compose.prod.yml deploy.sh ubuntu@your-server:/opt/paisapilot/

# Create .env
cat > .env <<EOF
DOCKERHUB_USERNAME=debjyoti2004
DATABASE_URL=postgresql://redacted_user:<pass>@<host>/neondb?sslmode=require
DIRECT_URL=postgresql://redacted_user:<pass>@<host>/neondb?sslmode=require
NEXT_PUBLIC_APP_NAME=PaisaPilot
EOF

chmod +x deploy.sh
```

### 3 — Deploy

```bash
cd /opt/paisapilot && sudo bash deploy.sh
```

The script:
1. Pulls `paisapilot:latest` from Docker Hub
2. Runs `docker compose up -d`
3. Health-checks `/api/health` (12 × 5s = 60s window)
4. **Auto-rolls back** to previous image if health check fails
5. Prunes old images

Deploy a specific tag (rollback):

```bash
sudo bash deploy.sh abc1234
```

Check status / logs:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

### 4 — Database (Neon free tier)

- Use the **non-pooled** connection string for both `DATABASE_URL` and `DIRECT_URL` (Neon's free tier pooler can cause Prisma issues)
- The container runs `prisma migrate deploy` on every startup — schema changes deploy automatically
- **Always keep your own nightly `pg_dump` backup** — never rely on Neon free tier retention

---

## Environment Variables

| Variable | Local | Production |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/paisapilot` | Neon connection string |
| `DIRECT_URL` | same as above | same Neon string (non-pooled) |
| `NEXT_PUBLIC_APP_NAME` | `PaisaPilot` | `PaisaPilot` |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS |
| ORM | Prisma |
| Database | PostgreSQL (Docker local · Neon prod) |
| Charts | Recharts |
| Icons | Lucide React |
| CI/CD | GitHub Actions → Docker Hub |
| Runtime | Node.js 20 (Alpine) |

---

## Budget (default seed data)

| Envelope | Type | Amount |
|---|---|---|
| Food (Groceries + Eating Out) | Need | ₹12,500 |
| EMI | Need | ₹7,000 |
| Gym | Need | ₹1,000 |
| Gym Supplements | Need | ₹2,200 |
| Grooming | Want | ₹2,000 |
| Clothes | Want | ₹1,500 |
| Fun / Misc | Want | ₹1,300 |
| Nifty 50 SIP | Invest | ₹5,000 |
| Short-term Fund | Save | ₹1,000 |
| Emergency Fund | Save | ₹2,000 |
| Travel Goal | Goal | ₹1,000 |
| Buffer | Save | ₹500 |
| **Total** | | **₹37,000** |

Savings rate: ~26% | All amounts fully editable via the Split Editor.

---

## Roadmap

- [x] Phase 1 — Dashboard · Envelope budgeting · Manual entry · Split engine · Savings Hub · Calculators
- [ ] Phase 2 — SMS ingestion webhook · Gmail parser · Web Push · Month rollover insights
- [ ] Phase 3 — Goals + flight price watcher · Investments AMFI NAV · Subscription detection · Export
