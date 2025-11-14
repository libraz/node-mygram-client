/**
 * Basic usage example for mygram-client
 */

import { MygramClient } from '../src';

async function basicExample(): Promise<void> {
  // Create client
  const client = new MygramClient({
    host: 'localhost',
    port: 11016,
    timeout: 5000,
  });

  try {
    // Connect to server
    console.log('Connecting to MygramDB...');
    await client.connect();
    console.log('Connected!');

    // Get server info
    console.log('\n=== Server Info ===');
    const info = await client.info();
    console.log(`Version: ${info.version}`);
    console.log(`Uptime: ${info.uptimeSeconds}s`);
    console.log(`Total documents: ${info.docCount}`);
    console.log(`Tables: ${info.tables.join(', ')}`);

    // Search for documents
    console.log('\n=== Search ===');
    const searchResults = await client.search('articles', 'hello world', {
      limit: 10,
      sortColumn: 'id',
      sortDesc: true,
    });
    console.log(`Found ${searchResults.totalCount} results`);
    searchResults.results.forEach((result, index) => {
      console.log(`${index + 1}. ID: ${result.primaryKey}`);
    });

    // Count documents
    console.log('\n=== Count ===');
    const countResult = await client.count('articles', 'technology');
    console.log(`Total matches: ${countResult.count}`);

    // Get document by ID
    if (searchResults.results.length > 0) {
      console.log('\n=== Get Document ===');
      const doc = await client.get('articles', searchResults.results[0].primaryKey);
      console.log(`Document ID: ${doc.primaryKey}`);
      console.log(`Fields:`, doc.fields);
    }

    // Advanced search with filters
    console.log('\n=== Advanced Search ===');
    const advancedResults = await client.search('articles', 'tutorial', {
      andTerms: ['beginner'],
      notTerms: ['advanced', 'expert'],
      filters: { status: '1' },
      limit: 5,
    });
    console.log(`Advanced search found ${advancedResults.totalCount} results`);

    // Get replication status
    console.log('\n=== Replication Status ===');
    const replStatus = await client.getReplicationStatus();
    console.log(`Running: ${replStatus.running}`);
    console.log(`GTID: ${replStatus.gtid}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Disconnect
    console.log('\nDisconnecting...');
    client.disconnect();
    console.log('Disconnected!');
  }
}

// Run example
basicExample().catch(console.error);
