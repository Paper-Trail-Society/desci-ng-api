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
API_PORT=<PORT>
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
- `--experimental-transform-types`: Supports TypeScript-specific syntax like enums
- `--env-file=.env`: Loads environment variables from .env file (no dotenv needed)
- `--watch`: Automatically restarts on file changes

The project uses ECMAScript Modules (ESM), which is specified by `"type": "module"` in package.json.

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
- ESM modules (ECMAScript Modules)
- Strict type checking
- Other best practices from 2024

This project is configured to use ECMAScript Modules (ESM) instead of CommonJS, as specified by `"type": "module"` in package.json. This means:

- Import statements use the `import` syntax instead of `require()`
- When importing local files in TypeScript, you must use the `.js` extension (not `.ts`) even though the source files are `.ts`
- The project works with Node.js native ESM support

See `tsconfig.json` for detailed configuration.

## License

ISC

## Author

Justin Irabor
