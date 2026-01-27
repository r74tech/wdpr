# wdmock (Cloudflare)

A mock Wikidot environment running on Cloudflare Pages + D1 + R2.

## Structure

```
wdmock-cf/
├── apps/
│   ├── main/          # Main app (Cloudflare Pages)
│   └── files/         # File delivery Worker (separate domain)
├── packages/
│   ├── shared/        # Shared types & utilities
│   └── db/            # Database operations
├── migrations/        # D1 migrations
└── seed.sql          # Initial data
```

## Setup

```bash
# Run from root directory (wdpr)
bun install

# Navigate to wdmock-cf
cd examples/wdmock-cf

# Copy environment variables for local development
cp apps/main/.dev.vars.example apps/main/.dev.vars

# Run D1 migrations
bun run migrate

# Seed initial data
bun run seed
```

## Development

```bash
# Start main app
bun run dev

# Start file Worker (in separate terminal)
bun run dev:files

# Or start both simultaneously
bun run dev:all
```

## Deployment

```bash
# Deploy main app
bun run deploy

# Deploy file Worker
bun run deploy:files
```

## Type Check

```bash
bun run typecheck
```
