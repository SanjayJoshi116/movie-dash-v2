// Coverage for server/bootstrap.ts (the entry-point helpers server.ts uses): strict port parsing,
// optional .env loading, listen() turning EADDRINUSE into a rejection, and graceful shutdown.
// Everything is injected, so no child processes, real signals or process.exit.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { ConfigError, DEFAULT_PORT, installShutdown, listen, loadEnvFile, parsePort } from '../bootstrap';
import { deferred, errnoError as errno, sleep as tick } from './helpers';

function captureLogger() {
  const lines: string[] = [];
  const logger = { log: (...a: unknown[]) => { lines.push(a.join(' ')); }, error: (...a: unknown[]) => { lines.push(a.join(' ')); } };
  return { lines, logger };
}

describe('parsePort', () => {
  it('defaults when unset or blank', () => {
    assert.equal(parsePort(undefined), DEFAULT_PORT);
    assert.equal(parsePort('  '), DEFAULT_PORT);
  });

  it('accepts plain port numbers', () => {
    assert.equal(parsePort('8080'), 8080);
    assert.equal(parsePort(' 3001 '), 3001);
    assert.equal(parsePort('65535'), 65535);
  });

  for (const bad of ['abc', '5000abc', '0', '70000', '-1', '50.5', '0x1F']) {
    it(`rejects ${JSON.stringify(bad)} with a message naming the value`, () => {
      assert.throws(() => parsePort(bad), (err: unknown) => err instanceof ConfigError && err.message.includes(`"${bad}"`));
    });
  }
});

describe('loadEnvFile', () => {
  it('is silent when the file does not exist', () => {
    const { lines, logger } = captureLogger();
    loadEnvFile('.env', { load: () => { throw errno('ENOENT'); }, logger });
    assert.deepEqual(lines, []);
  });

  it('logs and continues when the file exists but cannot be read', () => {
    const { lines, logger } = captureLogger();
    assert.doesNotThrow(() => loadEnvFile('.env', { load: () => { throw errno('EACCES'); }, logger }));
    assert.equal(lines.length, 1);
    assert.match(lines[0], /Could not read \.env.*EACCES/);
  });

  it('loads the file when readable', () => {
    let loaded = '';
    loadEnvFile('x/.env', { load: (f) => { loaded = f; } });
    assert.equal(loaded, 'x/.env');
  });
});

describe('listen', () => {
  it('binds to the requested host', async () => {
    const server = await listen(express(), 0, '127.0.0.1');
    try {
      assert.equal((server.address() as AddressInfo).address, '127.0.0.1');
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it('rejects with EADDRINUSE when the port is already held', async () => {
    const holder = await listen(express(), 0, '127.0.0.1');
    const { port } = holder.address() as AddressInfo;
    try {
      await assert.rejects(listen(express(), port, '127.0.0.1'), (err: NodeJS.ErrnoException) => err.code === 'EADDRINUSE');
    } finally {
      await new Promise<void>((r) => holder.close(() => r()));
    }
  });
});

describe('installShutdown', () => {
  function fakeServer() {
    let closeCb: (() => void) | undefined;
    const server = {
      closed: false,
      idleClosed: false,
      close(cb?: () => void) { this.closed = true; closeCb = cb; return this as unknown as http.Server; },
      closeIdleConnections() { this.idleClosed = true; },
      finishClose: () => closeCb?.(),
    };
    return server;
  }

  function setup(timeoutMs = 1000) {
    const server = fakeServer();
    const work = deferred();
    const target = new EventEmitter();
    const exits: number[] = [];
    const { logger } = captureLogger();
    installShutdown(server, { drain: () => work.promise, timeoutMs, exit: (c) => { exits.push(c); }, target, logger });
    return { server, work, target, exits };
  }

  it('stops accepting, waits for queued work and open requests, then exits 0', async () => {
    const { server, work, target, exits } = setup();
    target.emit('SIGTERM');
    assert.equal(server.closed, true);
    assert.equal(server.idleClosed, true);
    server.finishClose();
    await tick();
    assert.deepEqual(exits, [], 'must not exit while drain is pending');
    work.resolve();
    await tick();
    assert.deepEqual(exits, [0]);
  });

  it('exits 1 after the timeout if work is still pending', async () => {
    const { target, exits } = setup(30);
    target.emit('SIGINT');
    await tick(80);
    assert.deepEqual(exits, [1]);
  });

  it('a second signal exits 1 immediately', async () => {
    const { target, exits } = setup();
    target.emit('SIGINT');
    target.emit('SIGINT');
    assert.deepEqual(exits, [1]);
  });
});
