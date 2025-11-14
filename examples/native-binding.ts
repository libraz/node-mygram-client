/**
 * Example: Using native C++ binding
 *
 * This example demonstrates how to use the native C++ binding
 * with automatic fallback to pure JavaScript.
 */

import { createMygramClient, isNativeAvailable, getClientType } from '../src/index';

async function main() {
  console.log('=== MygramDB Native Binding Example ===\n');

  // Check if native binding is available
  if (isNativeAvailable()) {
    console.log('✓ Native C++ binding is available');
    console.log('  This provides better performance for high-throughput scenarios\n');
  } else {
    console.log('✗ Native binding not available, using pure JavaScript');
    console.log('  To enable native binding, run: npm run build:native\n');
  }

  // Create client with automatic selection
  const client = createMygramClient({
    host: process.env.MYGRAM_HOST || '127.0.0.1',
    port: parseInt(process.env.MYGRAM_PORT || '11016', 10),
    timeout: 5000
  });

  console.log(`Client type: ${getClientType(client)}`);
  console.log(`Host: ${process.env.MYGRAM_HOST || '127.0.0.1'}`);
  console.log(`Port: ${process.env.MYGRAM_PORT || '11016'}\n`);

  try {
    // Connect to server
    console.log('Connecting to MygramDB server...');
    await client.connect();
    console.log('✓ Connected successfully\n');

    // Get server info
    console.log('Fetching server information...');
    const info = await client.info();
    console.log('Server Info:');
    console.log(`  Version: ${info.version}`);
    console.log(`  Uptime: ${info.uptimeSeconds}s`);
    console.log(`  Total documents: ${info.docCount}`);
    console.log(`  Active connections: ${info.activeConnections}`);
    console.log(`  Tables: ${info.tables.join(', ')}\n`);

    // Perform a search (if tables exist)
    if (info.tables.length > 0) {
      const table = info.tables[0];
      console.log(`Searching in table: ${table}`);

      const startTime = Date.now();
      const results = await client.search(table, 'test', { limit: 10 });
      const duration = Date.now() - startTime;

      console.log(`  Found ${results.totalCount} results in ${duration}ms`);
      console.log(`  Returned ${results.results.length} IDs`);

      if (results.results.length > 0) {
        console.log(`  First result: ${results.results[0].primaryKey}`);
      }
      console.log('');
    }

    // Count documents
    if (info.tables.length > 0) {
      const table = info.tables[0];
      console.log(`Counting documents in table: ${table}`);

      const startTime = Date.now();
      const count = await client.count(table, 'test');
      const duration = Date.now() - startTime;

      console.log(`  Total matches: ${count.count} (${duration}ms)\n`);
    }

    // Get replication status
    console.log('Checking replication status...');
    const status = await client.getReplicationStatus();
    console.log(`  Running: ${status.running}`);
    console.log(`  GTID: ${status.gtid}\n`);

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  } finally {
    // Disconnect
    console.log('Disconnecting...');
    client.disconnect();
    console.log('✓ Disconnected');
  }
}

// Run example
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
