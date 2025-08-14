# DeSci API

Decentralized Science Platform API built with Express and PostgreSQL.

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build and start production
npm run build
npm start

# Deploy to Netlify
npm run netlify:deploy
```

## Environment Setup

Create `.env` file with:

```
PORT=8080
DATABASE_URL=postgres://user:password@localhost:5432/desci
```

## Database

PostgreSQL with Drizzle ORM:
- Connection configured via `DATABASE_URL`
- Schema defined in `src/db/schema`

## API Endpoints

- `GET /` - API info
- `GET /health` - Health check with DB connection status

## Development

- TypeScript with Node.js
- Express for API routing
- PostgreSQL with Drizzle ORM
- ESLint and Prettier for code quality

## Deployment

Configured for Netlify:
- Serverless functions in `netlify/functions`
- Redirects configured in `netlify.toml`
- Environment variables must be set in Netlify dashboard

## Scripts

- `npm run dev` - Start dev server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Run production build
- `npm run netlify:dev` - Test Netlify deployment locally
- `npm run netlify:deploy` - Deploy to Netlify

## Project Structure

```
desci/
├── dist/              # Compiled output
├── netlify/           # Netlify configuration
│   └── functions/     # Serverless functions
├── src/               # Source code
│   ├── db/            # Database models & connection
│   └── index.ts       # Main entry point
├── .env               # Environment variables
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
