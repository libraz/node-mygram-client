/**
 * Debug mode example for performance analysis
 */

import { MygramClient } from '../src';

async function debugModeExample(): Promise<void> {
  const client = new MygramClient({
    host: 'localhost',
    port: 11016,
  });

  try {
    console.log('Connecting to MygramDB...');
    await client.connect();
    console.log('Connected!\n');

    // Enable debug mode
    console.log('Enabling debug mode...');
    await client.enableDebug();
    console.log('Debug mode enabled!\n');

    // Perform searches and analyze performance
    const queries = [
      { table: 'articles', query: 'golang tutorial' },
      { table: 'articles', query: 'machine learning' },
      { table: 'articles', query: 'web development' },
    ];

    for (const { table, query } of queries) {
      console.log(`=== Query: "${query}" ===`);

      // Search with debug info
      const results = await client.search(table, query, { limit: 100 });

      console.log(`Total matches: ${results.totalCount}`);
      console.log(`Results returned: ${results.results.length}`);

      if (results.debug) {
        console.log('\nPerformance Metrics:');
        console.log(`  Query time: ${results.debug.queryTimeMs.toFixed(2)}ms`);
        console.log(`  Index time: ${results.debug.indexTimeMs.toFixed(2)}ms`);
        console.log(`  Filter time: ${results.debug.filterTimeMs.toFixed(2)}ms`);

        console.log('\nQuery Analysis:');
        console.log(`  Terms: ${results.debug.terms}`);
        console.log(`  N-grams: ${results.debug.ngrams}`);
        console.log(`  Candidates: ${results.debug.candidates}`);
        console.log(`  After intersection: ${results.debug.afterIntersection}`);
        console.log(`  After NOT: ${results.debug.afterNot}`);
        console.log(`  After filters: ${results.debug.afterFilters}`);
        console.log(`  Final: ${results.debug.final}`);

        console.log('\nOptimization:');
        console.log(`  Strategy: ${results.debug.optimization}`);
        if (results.debug.orderBy) {
          console.log(`  Order by: ${results.debug.orderBy}`);
        }
        if (results.debug.limit) {
          console.log(`  Limit: ${results.debug.limit}`);
        }
        if (results.debug.offset) {
          console.log(`  Offset: ${results.debug.offset}`);
        }
      }

      console.log();
    }

    // Count with debug info
    console.log('=== Count Query ===');
    const countResult = await client.count('articles', 'technology', {
      filters: { status: '1' },
    });

    console.log(`Count: ${countResult.count}`);

    if (countResult.debug) {
      console.log('\nPerformance Metrics:');
      console.log(`  Query time: ${countResult.debug.queryTimeMs.toFixed(2)}ms`);
      console.log(`  Terms: ${countResult.debug.terms}`);
      console.log(`  Final: ${countResult.debug.final}`);
    }

    console.log();

    // Disable debug mode
    console.log('Disabling debug mode...');
    await client.disableDebug();
    console.log('Debug mode disabled!');

    // Search without debug info
    console.log('\n=== Query without debug ===');
    const normalResults = await client.search('articles', 'test', { limit: 10 });
    console.log(`Total matches: ${normalResults.totalCount}`);
    console.log(`Debug info present: ${normalResults.debug ? 'Yes' : 'No'}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\nDisconnecting...');
    client.disconnect();
    console.log('Disconnected!');
  }
}

// Run example
debugModeExample().catch(console.error);
