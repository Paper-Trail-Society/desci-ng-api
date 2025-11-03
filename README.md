# DeSci API

Decentralized Science Platform API built with Express and PostgreSQL.

## Requirements
- Nodejs v22+
- Docker (https://www.docker.com)

## Quick Start

```bash

# Add required environment variables
cp .env.example .env

# Install dependencies
npm install

# Start docker services
docker compose up -d

# Prepare database tables for usage

npm run prepare:dev

# Development
npm run dev

# Build and start production
npm run build
npm start

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

# View database with GUI
npm run db:studio
```

## API Endpoints

- `GET /` - API info
- `GET /health` - Health check with DB connection status

## Development

- TypeScript with Node.js
- Express for API routing
- PostgreSQL with Drizzle ORM
- ESLint and Prettier for code quality

## Scripts

- `npm run dev` - Start dev server with hot reload
- `npm run prepare:dev` - Prepares database - database generation, migration, and seeding.
- `npm run prepare:prod` - Prepares database - database migration and seeding, runs before deployment on prod.
- `npm run build` - Compile TypeScript
- `npm start` - Run production build
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:check` - Verify database schema
- `npm run db:studio` - Open database GUI

## Project Structure

```
desci/
├── dist/              # Compiled output
├── drizzle/           # Drizzle ORM configuration
│   └── migrations/    # Database migrations
├── netlify/           # Netlify configuration
│   └── functions/     # Serverless functions
├── src/               # Source code
│   ├── db/            # Database models & connection
│   └── index.ts       # Main entry point
├── .env               # Environment variables
├── drizzle.config.ts  # Drizzle configuration
├── netlify.toml       # Netlify configuration
├── package.json       # Dependencies & scripts
└── tsconfig.json      # TypeScript configuration
```

### MIGRATIONS
When you create schema updates, run the drizzle generate command, which creates the tables to be migrated:
```bash
npx drizzle-kit generate
```

When that succeeds, run the migration:
```bash
npx drizzle-kit migrate
```

Push directly to Supabase (pending a production database):

```bash
npx drizzle-kit push
```
