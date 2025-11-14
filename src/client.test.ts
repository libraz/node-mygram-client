import { describe, it, expect } from 'vitest';
import { MygramClient } from './client';
import { ConnectionError } from './errors';

describe('MygramClient', () => {
  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new MygramClient();
      expect(client).toBeDefined();
      expect(client.isConnected()).toBe(false);
    });

    it('should create client with custom config', () => {
      const client = new MygramClient({
        host: 'example.com',
        port: 12345,
        timeout: 10000
      });
      expect(client).toBeDefined();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect without error even when not connected', () => {
      const client = new MygramClient();
      expect(() => client.disconnect()).not.toThrow();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('sendCommand', () => {
    it('should throw ConnectionError when not connected', async () => {
      const client = new MygramClient();
      await expect(client.sendCommand('INFO')).rejects.toThrow(ConnectionError);
      await expect(client.sendCommand('INFO')).rejects.toThrow('Not connected to server');
    });
  });

  describe('search', () => {
    it('should throw ConnectionError when not connected', async () => {
      const client = new MygramClient();
      await expect(client.search('articles', 'test')).rejects.toThrow(ConnectionError);
    });
  });

  describe('count', () => {
    it('should throw ConnectionError when not connected', async () => {
      const client = new MygramClient();
      await expect(client.count('articles', 'test')).rejects.toThrow(ConnectionError);
    });
  });

  describe('get', () => {
    it('should throw ConnectionError when not connected', async () => {
      const client = new MygramClient();
      await expect(client.get('articles', '123')).rejects.toThrow(ConnectionError);
    });
  });

  describe('info', () => {
    it('should throw ConnectionError when not connected', async () => {
      const client = new MygramClient();
      await expect(client.info()).rejects.toThrow(ConnectionError);
    });
  });

  describe('getConfig', () => {
    it('should throw ConnectionError when not connected', async () => {
      const client = new MygramClient();
      await expect(client.getConfig()).rejects.toThrow(ConnectionError);
    });
  });

  describe('replication', () => {
    it('should throw ConnectionError when not connected - getReplicationStatus', async () => {
      const client = new MygramClient();
      await expect(client.getReplicationStatus()).rejects.toThrow(ConnectionError);
    });

    it('should throw ConnectionError when not connected - stopReplication', async () => {
      const client = new MygramClient();
      await expect(client.stopReplication()).rejects.toThrow(ConnectionError);
    });

    it('should throw ConnectionError when not connected - startReplication', async () => {
      const client = new MygramClient();
      await expect(client.startReplication()).rejects.toThrow(ConnectionError);
    });
  });

  describe('debug', () => {
    it('should throw ConnectionError when not connected - enableDebug', async () => {
      const client = new MygramClient();
      await expect(client.enableDebug()).rejects.toThrow(ConnectionError);
    });

    it('should throw ConnectionError when not connected - disableDebug', async () => {
      const client = new MygramClient();
      await expect(client.disableDebug()).rejects.toThrow(ConnectionError);
    });
  });
});
