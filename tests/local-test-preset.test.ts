import { afterEach, describe, expect, it } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localTestPresetMiddleware, localTestPresetPlugin } from '../tools/local-test-preset';

const servers: Server[] = [], directories: string[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))));
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })));
});
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'hg-preset-')); directories.push(directory);
  const paths = { map: join(directory, 'map.raw'), roster: join(directory, 'roster.raw'), items: join(directory, 'items.raw') };
  const manifest = join(directory, 'manifest.json');
  await Promise.all(Object.entries(paths).map(([key, path]) => writeFile(path, Buffer.alloc({ map: 157738, roster: 16320, items: 32604 }[key]!, 7))));
  await writeFile(manifest, JSON.stringify(paths));
  return { directory, paths, manifest };
}
async function serve(manifest?: string) {
  const middleware = localTestPresetMiddleware(manifest);
  const server = createServer((req, res) => { void middleware(req, res, () => { res.statusCode = 418; res.end('other app route'); }); });
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No address');
  return (path: string, headers: Record<string, string> = {}, method = 'GET') => new Promise<{ status: number; body: Buffer; headers: Record<string, unknown> }>((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: address.port, path, headers, method }, res => {
      const chunks: Buffer[] = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode!, body: Buffer.concat(chunks), headers: res.headers }));
    }); req.on('error', reject); req.end();
  });
}

describe('loopback local preset provider', () => {
  it('serves exactly the three bounded raw resources with no cache/CORS/path metadata', async () => {
    const fixtureData = await fixture(), get = await serve(fixtureData.manifest);
    for (const [resource, length] of Object.entries({ map: 157738, roster: 16320, items: 32604 })) {
      const result = await get(`/__local-training43/${resource}`);
      expect(result.status).toBe(200); expect(result.body.length).toBe(length);
      expect(result.body.equals(Buffer.alloc(length, 7))).toBe(true);
      expect(result.headers['cache-control']).toBe('no-store');
      expect(result.headers['access-control-allow-origin']).toBeUndefined();
      expect(JSON.stringify(result.headers)).not.toContain(fixtureData.directory);
    }
    expect((await get('/other')).status).toBe(418);
    const catalog = await get('/__local-training43/catalog');
    expect(catalog.status).toBe(200);
    expect(JSON.parse(catalog.body.toString())).toEqual({
      roster: [{ id: 'roster', label: 'Configured recovered OCS Characters', available: true }],
      items: [{ id: 'items', label: 'Configured recovered OCS Items', available: true }],
    });
    expect(catalog.body.toString()).not.toContain(fixtureData.directory);
    await rm(fixtureData.paths.items);
    const missing = JSON.parse((await get('/__local-training43/catalog')).body.toString());
    expect(missing.items[0].available).toBe(false); expect(missing.roster[0].available).toBe(true);
  });
  it('rejects arbitrary paths, traversal, queries and other methods', async () => {
    const { manifest } = await fixture(), get = await serve(manifest);
    for (const resource of ['', '../map', '%2e%2e/map', 'map?path=elsewhere', 'manifest', 'map/extra', 'toString', '__proto__']) {
      expect((await get(`/__local-training43/${resource}`)).status).toBe(404);
    }
    expect((await get('/__local-training43/map', {}, 'POST')).status).toBe(404);
    for (const path of ['/.local/local-test-preset.json', '/%2elocal/local-test-preset.json?raw', '/@fs/example/.local/local-test-preset.json', '/%252elocal/private.raw']) {
      const result = await get(path); expect(result.status).toBe(404); expect(result.body.toString()).toBe('Not available.');
    }
  });
  it('rejects remote/rebinding hosts, cross-origin and cross-site requests', async () => {
    const { manifest } = await fixture(), get = await serve(manifest);
    const cases: Record<string, string>[] = [{ host: 'evil.example' }, { host: '127.0.0.1.evil.example' }, { origin: 'https://evil.example' }, { origin: 'null' }, { 'sec-fetch-site': 'cross-site' }, { host: 'localhost', origin: 'http://127.0.0.1' }];
    for (const headers of cases) {
      expect((await get('/__local-training43/map', headers)).status).toBe(403);
    }
    expect((await get('/__local-training43/map', { host: 'localhost', origin: 'http://localhost' })).status).toBe(200);
  });
  it('fails closed for disabled, missing, malformed and oversized input without exposing paths', async () => {
    const data = await fixture();
    expect((await (await serve())('/__local-training43/map')).status).toBe(503);
    const get = await serve(data.manifest);
    for (const content of ['{}', '{', JSON.stringify({ ...data.paths, extra: 'no' }), JSON.stringify({ ...data.paths, map: 'relative.raw' }), ' '.repeat(4097)]) {
      await writeFile(data.manifest, content); const result = await get('/__local-training43/map');
      expect(result.status).toBe(503); expect(result.body.toString()).not.toContain(data.directory);
    }
    await writeFile(data.manifest, JSON.stringify(data.paths));
    for (const length of [0, 157737, 157739]) {
      await writeFile(data.paths.map, Buffer.alloc(length)); expect((await get('/__local-training43/map')).status).toBe(503);
    }
    await rm(data.paths.map); expect((await get('/__local-training43/map')).status).toBe(503);
    expect(typeof localTestPresetPlugin().configureServer).toBe('function');
    expect(typeof localTestPresetPlugin().configurePreviewServer).toBe('function');
  });
});
