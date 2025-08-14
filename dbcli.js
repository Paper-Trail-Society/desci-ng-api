#!/usr/bin/env node

// Database CLI tool for DeSci project
const { execSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');

// Load environment variables
dotenv.config();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Print colored message
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Ensure database URL is set
if (!process.env.DATABASE_URL) {
  print('❌ DATABASE_URL environment variable is not set', 'red');
  print('Please set DATABASE_URL in your .env file', 'yellow');
  process.exit(1);
}

// Create migrations directory if it doesn't exist
const migrationsDir = path.join(__dirname, 'drizzle', 'migrations');
if (!existsSync(path.join(__dirname, 'drizzle'))) {
  mkdirSync(path.join(__dirname, 'drizzle'));
}
if (!existsSync(migrationsDir)) {
  mkdirSync(migrationsDir);
}

// Define CLI commands
const commands = {
  // Generate database migrations
  generate: async () => {
    print('🔄 Generating migrations...', 'cyan');
    try {
      execSync('npx drizzle-kit generate:pg', { stdio: 'inherit' });
      print('✅ Migrations generated successfully!', 'green');
    } catch (error) {
      print(`❌ Failed to generate migrations: ${error.message}`, 'red');
      process.exit(1);
    }
  },

  // Apply migrations to database
  migrate: async () => {
    print('🔄 Running migrations...', 'cyan');

    try {
      // Import required modules
      const { migrate } = require('drizzle-orm/postgres-js/migrator');

      // Create database client
      const client = postgres(process.env.DATABASE_URL, { max: 1 });
      const db = drizzle(client);

      // Run migrations
      await migrate(db, { migrationsFolder: migrationsDir });

      print('✅ Migrations applied successfully!', 'green');

      // Close client
      await client.end();
    } catch (error) {
      print(`❌ Migration failed: ${error.message}`, 'red');
      process.exit(1);
    }
  },

  // Check database schema
  check: async () => {
    print('🔍 Checking database schema...', 'cyan');

    try {
      // Create database client
      const client = postgres(process.env.DATABASE_URL);
      const db = drizzle(client);

      // Get all tables
      const { rows: tables } = await client.query(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
      `);

      if (tables.length === 0) {
        print('⚠️ No tables found in database', 'yellow');
      } else {
        print('📋 Existing tables:', 'green');
        tables.forEach(row => {
          print(`  - ${row.tablename}`, 'cyan');

          // Get columns for this table
          client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = '${row.tablename}'
          `).then(({ rows: columns }) => {
            columns.forEach(col => {
              print(`    • ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`, 'magenta');
            });
          });
        });
      }

      // Give time for async queries to complete
      setTimeout(async () => {
        await client.end();
        print('✅ Schema check completed!', 'green');
      }, 500);

    } catch (error) {
      print(`❌ Schema check failed: ${error.message}`, 'red');
      process.exit(1);
    }
  },

  // Start Drizzle Studio
  studio: () => {
    print('🚀 Starting Drizzle Studio...', 'cyan');
    try {
      execSync('npx drizzle-kit studio', { stdio: 'inherit' });
    } catch (error) {
      print(`❌ Failed to start Drizzle Studio: ${error.message}`, 'red');
      process.exit(1);
    }
  },

  // Show help
  help: () => {
    print('📚 DeSci Database CLI', 'cyan');
    print('Available commands:', 'bright');
    print('  node dbcli.js generate  - Generate migrations from schema', 'cyan');
    print('  node dbcli.js migrate   - Apply migrations to database', 'cyan');
    print('  node dbcli.js check     - Check database schema', 'cyan');
    print('  node dbcli.js studio    - Start Drizzle Studio', 'cyan');
    print('  node dbcli.js help      - Show this help message', 'cyan');
  }
};

// Process command line arguments
const [,, command = 'help'] = process.argv;

// Run the requested command
if (commands[command]) {
  commands[command]();
} else {
  print(`❌ Unknown command: ${command}`, 'red');
  commands.help();
  process.exit(1);
}
