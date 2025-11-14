# Advanced Usage

This guide covers advanced usage patterns and best practices for mygram-client.

## Connection Pooling

For high-performance applications, implement connection pooling to reuse connections:

```typescript
import { MygramClient, ClientConfig } from 'mygram-client';

class MygramPool {
  private clients: MygramClient[] = [];
  private available: MygramClient[] = [];
  private pending: ((client: MygramClient) => void)[] = [];

  constructor(
    private config: ClientConfig,
    private poolSize: number = 10
  ) {}

  async init(): Promise<void> {
    for (let i = 0; i < this.poolSize; i++) {
      const client = new MygramClient(this.config);
      await client.connect();
      this.clients.push(client);
      this.available.push(client);
    }
  }

  async acquire(): Promise<MygramClient> {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }

    // Wait for a client to become available
    return new Promise((resolve) => {
      this.pending.push(resolve);
    });
  }

  release(client: MygramClient): void {
    if (this.pending.length > 0) {
      const resolve = this.pending.shift()!;
      resolve(client);
    } else {
      this.available.push(client);
    }
  }

  async close(): Promise<void> {
    this.clients.forEach((client) => client.disconnect());
    this.clients = [];
    this.available = [];
  }

  getStats() {
    return {
      total: this.clients.length,
      available: this.available.length,
      inUse: this.clients.length - this.available.length,
      pending: this.pending.length,
    };
  }
}

// Usage
const pool = new MygramPool(
  { host: 'localhost', port: 11016 },
  10
);

await pool.init();

const client = await pool.acquire();
try {
  const results = await client.search('articles', 'test');
  console.log(results);
} finally {
  pool.release(client);
}

// Check pool statistics
console.log(pool.getStats());

// Cleanup
await pool.close();
```

## Batch Operations

Process multiple queries efficiently:

```typescript
import { MygramClient, SearchResponse } from 'mygram-client';

async function batchSearch(
  client: MygramClient,
  table: string,
  queries: string[]
): Promise<SearchResponse[]> {
  return Promise.all(
    queries.map((query) => client.search(table, query))
  );
}

// Usage
const client = new MygramClient();
await client.connect();

const queries = [
  'golang tutorial',
  'python guide',
  'javascript tips',
  'rust programming',
];

const results = await batchSearch(client, 'articles', queries);

results.forEach((result, index) => {
  console.log(`Query "${queries[index]}": ${result.totalCount} results`);
});
```

## Parallel Processing with Pool

Combine connection pooling with parallel processing:

```typescript
async function parallelSearch(
  pool: MygramPool,
  table: string,
  queries: string[]
): Promise<SearchResponse[]> {
  return Promise.all(
    queries.map(async (query) => {
      const client = await pool.acquire();
      try {
        return await client.search(table, query);
      } finally {
        pool.release(client);
      }
    })
  );
}

// Usage
const results = await parallelSearch(pool, 'articles', [
  'golang',
  'python',
  'javascript',
  'rust',
  'java',
  'c++',
]);
```

## Health Checking

Implement health checks for monitoring:

```typescript
import { MygramClient } from 'mygram-client';

interface HealthCheckResult {
  healthy: boolean;
  version?: string;
  uptime?: number;
  docCount?: number;
  replicationRunning?: boolean;
  error?: string;
}

async function healthCheck(client: MygramClient): Promise<HealthCheckResult> {
  try {
    const [info, status] = await Promise.all([
      client.info(),
      client.getReplicationStatus(),
    ]);

    return {
      healthy: true,
      version: info.version,
      uptime: info.uptimeSeconds,
      docCount: info.docCount,
      replicationRunning: status.running,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Usage
const client = new MygramClient();
await client.connect();

const health = await healthCheck(client);
if (health.healthy) {
  console.log('Server is healthy');
  console.log(`Version: ${health.version}`);
  console.log(`Uptime: ${health.uptime} seconds`);
  console.log(`Documents: ${health.docCount}`);
} else {
  console.error('Server is unhealthy:', health.error);
}
```

## Retry Logic

Implement automatic retry for transient failures:

```typescript
import { MygramClient, TimeoutError, ConnectionError } from 'mygram-client';

async function searchWithRetry(
  client: MygramClient,
  table: string,
  query: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<SearchResponse> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.search(table, query);
    } catch (error) {
      lastError = error as Error;

      // Only retry on timeout or connection errors
      if (
        error instanceof TimeoutError ||
        error instanceof ConnectionError
      ) {
        if (attempt < maxRetries) {
          console.log(`Attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          // Reconnect if connection was lost
          if (error instanceof ConnectionError && !client.isConnected()) {
            await client.connect();
          }

          continue;
        }
      }

      // Don't retry on protocol errors
      throw error;
    }
  }

  throw lastError;
}

// Usage
const results = await searchWithRetry(client, 'articles', 'test', 3, 1000);
```

## Query Performance Monitoring

Track and analyze query performance:

```typescript
import { MygramClient, SearchResponse } from 'mygram-client';

class PerformanceMonitor {
  private stats: Map<string, { count: number; totalMs: number; minMs: number; maxMs: number }> = new Map();

  async monitoredSearch(
    client: MygramClient,
    table: string,
    query: string
  ): Promise<SearchResponse> {
    const startTime = Date.now();
    const results = await client.search(table, query);
    const duration = Date.now() - startTime;

    this.recordMetric(query, duration);
    return results;
  }

  private recordMetric(query: string, durationMs: number): void {
    const existing = this.stats.get(query);

    if (existing) {
      existing.count++;
      existing.totalMs += durationMs;
      existing.minMs = Math.min(existing.minMs, durationMs);
      existing.maxMs = Math.max(existing.maxMs, durationMs);
    } else {
      this.stats.set(query, {
        count: 1,
        totalMs: durationMs,
        minMs: durationMs,
        maxMs: durationMs,
      });
    }
  }

  getStats(query: string) {
    const stats = this.stats.get(query);
    if (!stats) return null;

    return {
      count: stats.count,
      avgMs: stats.totalMs / stats.count,
      minMs: stats.minMs,
      maxMs: stats.maxMs,
    };
  }

  getAllStats() {
    const results: Record<string, any> = {};
    this.stats.forEach((stats, query) => {
      results[query] = {
        count: stats.count,
        avgMs: stats.totalMs / stats.count,
        minMs: stats.minMs,
        maxMs: stats.maxMs,
      };
    });
    return results;
  }

  reset(): void {
    this.stats.clear();
  }
}

// Usage
const monitor = new PerformanceMonitor();
const client = new MygramClient();
await client.connect();

for (let i = 0; i < 100; i++) {
  await monitor.monitoredSearch(client, 'articles', 'golang');
}

const stats = monitor.getStats('golang');
console.log(`Average query time: ${stats?.avgMs}ms`);
console.log(`Min: ${stats?.minMs}ms, Max: ${stats?.maxMs}ms`);
```

## Caching Layer

Implement a caching layer for frequently accessed data:

```typescript
import { MygramClient, SearchResponse } from 'mygram-client';

class CachedMygramClient {
  private cache: Map<string, { data: SearchResponse; timestamp: number }> = new Map();

  constructor(
    private client: MygramClient,
    private ttlMs: number = 60000
  ) {}

  async search(
    table: string,
    query: string,
    useCache: boolean = true
  ): Promise<SearchResponse> {
    const cacheKey = `${table}:${query}`;

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.ttlMs) {
        return cached.data;
      }
    }

    const results = await this.client.search(table, query);
    this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      entries: this.cache.size,
      oldestEntry: Math.min(
        ...Array.from(this.cache.values()).map((v) => v.timestamp)
      ),
    };
  }
}

// Usage
const client = new MygramClient();
await client.connect();

const cachedClient = new CachedMygramClient(client, 60000);

// First call - hits server
const results1 = await cachedClient.search('articles', 'golang');

// Second call - returns cached result
const results2 = await cachedClient.search('articles', 'golang');

// Force bypass cache
const results3 = await cachedClient.search('articles', 'golang', false);
```

## Pagination Helper

Implement pagination for large result sets:

```typescript
import { MygramClient, SearchResponse } from 'mygram-client';

class PaginatedSearch {
  constructor(
    private client: MygramClient,
    private table: string,
    private query: string,
    private pageSize: number = 100
  ) {}

  async *pages(): AsyncIterableIterator<SearchResponse> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const results = await this.client.search(this.table, this.query, {
        limit: this.pageSize,
        offset,
      });

      yield results;

      offset += results.results.length;
      hasMore = offset < results.totalCount;
    }
  }

  async getAllResults(): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];

    for await (const page of this.pages()) {
      allResults.push(...page.results);
    }

    return allResults;
  }
}

// Usage
const client = new MygramClient();
await client.connect();

const paginated = new PaginatedSearch(client, 'articles', 'golang', 100);

// Iterate through pages
for await (const page of paginated.pages()) {
  console.log(`Page has ${page.results.length} results`);
  console.log(`Total available: ${page.totalCount}`);
}

// Or get all results at once
const allResults = await paginated.getAllResults();
console.log(`Retrieved ${allResults.length} total results`);
```

## Error Recovery

Implement comprehensive error recovery:

```typescript
import {
  MygramClient,
  ConnectionError,
  ProtocolError,
  TimeoutError,
} from 'mygram-client';

class ResilientClient {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private client: MygramClient) {}

  async search(table: string, query: string): Promise<SearchResponse> {
    try {
      return await this.client.search(table, query);
    } catch (error) {
      if (error instanceof ConnectionError) {
        return this.handleConnectionError(table, query);
      }
      if (error instanceof TimeoutError) {
        return this.handleTimeoutError(table, query);
      }
      throw error;
    }
  }

  private async handleConnectionError(
    table: string,
    query: string
  ): Promise<SearchResponse> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts reached');
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);

    await new Promise((resolve) =>
      setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts)
    );

    await this.client.connect();
    this.reconnectAttempts = 0;

    return this.client.search(table, query);
  }

  private async handleTimeoutError(
    table: string,
    query: string
  ): Promise<SearchResponse> {
    console.log('Query timed out, retrying...');
    await new Promise((resolve) => setTimeout(resolve, 500));
    return this.client.search(table, query);
  }
}

// Usage
const client = new MygramClient();
await client.connect();

const resilient = new ResilientClient(client);
const results = await resilient.search('articles', 'test');
```

## Load Balancing

Distribute queries across multiple servers:

```typescript
import { MygramClient, ClientConfig } from 'mygram-client';

class LoadBalancedClient {
  private clients: MygramClient[] = [];
  private currentIndex = 0;

  constructor(private configs: ClientConfig[]) {}

  async init(): Promise<void> {
    for (const config of this.configs) {
      const client = new MygramClient(config);
      await client.connect();
      this.clients.push(client);
    }
  }

  private getNextClient(): MygramClient {
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.clients.length;
    return client;
  }

  async search(table: string, query: string): Promise<SearchResponse> {
    const client = this.getNextClient();
    return client.search(table, query);
  }

  async close(): Promise<void> {
    this.clients.forEach((client) => client.disconnect());
  }
}

// Usage
const loadBalancer = new LoadBalancedClient([
  { host: 'server1.example.com', port: 11016 },
  { host: 'server2.example.com', port: 11016 },
  { host: 'server3.example.com', port: 11016 },
]);

await loadBalancer.init();

// Queries are distributed round-robin across servers
const results1 = await loadBalancer.search('articles', 'test1');
const results2 = await loadBalancer.search('articles', 'test2');
const results3 = await loadBalancer.search('articles', 'test3');

await loadBalancer.close();
```

## Best Practices

### 1. Always Use Connection Pooling in Production

```typescript
// Good
const pool = new MygramPool(config, 10);
await pool.init();

// Bad - creates new connection for each request
const client = new MygramClient(config);
await client.connect();
```

### 2. Handle Errors Gracefully

```typescript
// Good
try {
  const results = await client.search('articles', 'test');
} catch (error) {
  if (error instanceof TimeoutError) {
    // Retry logic
  } else if (error instanceof ConnectionError) {
    // Reconnect logic
  } else {
    // Log and report
  }
}

// Bad - no error handling
const results = await client.search('articles', 'test');
```

### 3. Use Appropriate Timeouts

```typescript
// Good - reasonable timeout for your use case
const client = new MygramClient({ timeout: 5000 });

// Bad - too short, may cause false timeouts
const client = new MygramClient({ timeout: 100 });

// Bad - too long, blocks for too long on failures
const client = new MygramClient({ timeout: 60000 });
```

### 4. Monitor Performance

```typescript
// Good - track query performance
const monitor = new PerformanceMonitor();
await monitor.monitoredSearch(client, 'articles', 'test');

// Periodically log stats
setInterval(() => {
  console.log(monitor.getAllStats());
}, 60000);
```

### 5. Clean Up Resources

```typescript
// Good
try {
  await client.connect();
  // Do work
} finally {
  client.disconnect();
}

// Bad - connection leak
await client.connect();
// Do work
// Forget to disconnect
```
