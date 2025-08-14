# desci-ng-api

A modern TypeScript project for decentralized science applications.

## Prerequisites

- [Node.js](https://nodejs.org/) v20.6.0 or higher
- npm (usually comes with Node.js)

## Getting Started

### Clone the Repository

```bash
git clone <repository-url>
cd desci
```

### Install Dependencies

```bash
npm install
```

## Project Setup

### Environment Variables

Create a `.env` file in the root directory with your environment variables:

```bash
# .env example
API_PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/desci
# Add other environment variables as needed
```

## Development

### Run in Development Mode

This project leverages Node.js's experimental TypeScript support, allowing you to run TypeScript files directly without a separate build step:

```bash
# Start the development server with automatic reloading
npm run dev
```

This uses Node.js's native features:
- `--experimental-strip-types`: Strips TypeScript types at runtime
- `--experimental-transform-types`: Supports TypeScript-specific syntax
- `--env-file=.env`: Loads environment variables from .env file
- `--watch`: Automatically restarts on file changes

### Manual Execution

You can also run the project directly with Node.js:

```bash
node --experimental-strip-types --env-file=.env --watch src/index.ts
```

## Building for Production

### Compile TypeScript

```bash
# Build the project
npm run build
```

This will compile TypeScript files to JavaScript in the `dist` directory.

### Run Production Build

```bash
# Start the production server
npm start
```

## Project Structure

```
desci/
├── dist/             # Compiled JavaScript output (generated)
├── node_modules/     # Dependencies (generated)
├── src/              
│   └── index.ts      # Main entry point
├── .env              # Environment variables (create this file)
├── .gitignore        # Git ignore file
├── package.json      # Project metadata and scripts
├── package-lock.json # Dependency lock file
├── README.md         # This file
└── tsconfig.json     # TypeScript configuration
```

## Scripts

The following npm scripts are available:

- `npm run dev`: Start the development server with hot reloading
- `npm run build`: Build the project for production
- `npm start`: Run the production build

## TypeScript Configuration

This project uses a modern TypeScript setup with:

- ES2022 target
- ESM modules
- Strict type checking
- Other best practices from 2024

See `tsconfig.json` for details.

## License

ISC

## Author

Justin Irabor