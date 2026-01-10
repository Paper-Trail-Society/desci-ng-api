# DeSci API

Decentralized Science Platform API built with TypeScript, Express and PostgreSQL.

## Requirements
- Docker (https://www.docker.com)

## Quick Start

```bash

# Add required environment variables
cp .env.example .env

# Start the API
make setup

```

## Database
PostgreSQL with Drizzle ORM:
- Connection configured via `DATABASE_URL`
- Schema defined in `src/db/schema`
- Migrations in `drizzle/migrations`

Database Commands:
```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Check schema against database
npm run db:check
```

## API Endpoints

- `GET /` - API info
- `GET /health` - Health check with DB connection status

## Development

- TypeScript with Node.js
- Express for API routing
- PostgreSQL with Drizzle ORM
- ESLint and Prettier for code quality

### MIGRATIONS
When you create schema updates, run the drizzle generate command, which creates the tables to be migrated:
```bash
make db-generate
```

When that succeeds, run the migration:
```bash
make db-migrate
```
