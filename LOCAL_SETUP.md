# Local Development Setup

## Prerequisites

- Node.js 20+
- npm

## First Time Setup

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Create environment file

Copy the example and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```
DATABASE_URL=your_neon_postgres_url
DIRECT_URL=your_neon_postgres_url
NEXTAUTH_SECRET=any_random_string
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash-lite
NEXT_PUBLIC_APP_NAME=PaisaPilot
```

### 3. Run database migrations

```bash
npx prisma migrate deploy
```

---

## Running the App

```bash
./dev.sh
```

Open **http://localhost:3000**

- Changes to any file reflect instantly in the browser (hot reload)
- No need to restart the server for most changes

---

## Useful Commands

| Command | What it does |
|---|---|
| `./dev.sh` | Start local dev server |
| `npx prisma studio` | Browse the database in browser |
| `npx prisma migrate deploy` | Apply DB migrations |
| `npx prisma generate` | Regenerate Prisma client after schema change |

---

## Notes

- `.env.local` is gitignored — never commit it
- The app connects to Neon (cloud Postgres) even locally
- Port 3000 is used by default; `dev.sh` kills any existing process on that port first
