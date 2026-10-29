import { open } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const prefix = '/__local-training43/';
const sizes = { map: 157738, roster: 16320, items: 32604 } as const;
const unavailable = 'Local Training43 preset unavailable. Configure the local test provider or use the manual imports.';

async function boundedFile(path: string, maximum: number): Promise<Buffer> {
  const file = await open(path, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maximum) throw new Error('Unavailable');
    const bytes = Buffer.alloc(maximum + 1);
    const { bytesRead } = await file.read(bytes, 0, bytes.length, 0);
    if (bytesRead > maximum) throw new Error('Unavailable');
    return bytes.subarray(0, bytesRead);
  } finally { await file.close(); }
}

function loopback(host: string): boolean {
  return ['127.0.0.1', '[::1]', 'localhost'].includes(host);
}

/** Server-only opt-in. No source bytes or filesystem paths enter the build. */
export function localTestPresetMiddleware(manifestPath: string | undefined) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> => {
    // Vite's ordinary source-file routes must never expose the ignored manifest/evidence.
    let requestPath = req.url ?? '';
    try { for (let i = 0; i < 3; i++) requestPath = decodeURIComponent(requestPath); } catch { /* Invalid encodings cannot name an allowed resource. */ }
    if (/(^|\/)\.local(\/|$|\?)/i.test(requestPath.replaceAll('\\', '/'))) {
      res.statusCode = 404; res.end('Not available.'); return;
    }
    if (!req.url?.startsWith('/__local-training43')) { next(); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    const fail = (status: number) => { res.statusCode = status; res.end(unavailable); };
    try {
      const host = req.headers.host;
      if (!host || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')) { fail(403); return; }
      const url = new URL(`http://${host}`);
      if (!loopback(url.hostname) || url.host !== host || url.pathname !== '/' || url.username || url.password ||
          (req.headers.origin !== undefined && req.headers.origin !== url.origin) ||
          (req.headers['sec-fetch-site'] !== undefined && req.headers['sec-fetch-site'] !== 'same-origin' && req.headers['sec-fetch-site'] !== 'none')) { fail(403); return; }
      const resource = req.url.slice(prefix.length);
      if (req.method !== 'GET' || !req.url.startsWith(prefix) || (resource !== 'catalog' && !Object.hasOwn(sizes, resource))) { fail(404); return; }
      if (!manifestPath || !isAbsolute(manifestPath)) { fail(503); return; }
      const manifest: unknown = JSON.parse((await boundedFile(manifestPath, 4096)).toString('utf8'));
      if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || Object.keys(manifest).length !== 3 ||
          Object.keys(sizes).some(key => !Object.hasOwn(manifest, key))) throw new Error('Unavailable');
      if (resource === 'catalog') {
        const catalog: Record<string, { id: string; label: string; available: boolean }[]> = {};
        for (const key of ['roster', 'items'] as const) {
          const path = (manifest as Record<string, unknown>)[key];
          let available = false;
          try { available = typeof path === 'string' && isAbsolute(path) && (await boundedFile(path, sizes[key])).length === sizes[key]; } catch { /* Only availability is public. */ }
          catalog[key] = [{ id: key, label: key === 'roster' ? 'Configured recovered OCS Characters' : 'Configured recovered OCS Items', available }];
        }
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(catalog)); return;
      }
      const path = (manifest as Record<string, unknown>)[resource];
      if (typeof path !== 'string' || !isAbsolute(path)) throw new Error('Unavailable');
      const size = sizes[resource as keyof typeof sizes];
      const bytes = await boundedFile(path, size);
      if (bytes.length !== size) throw new Error('Unavailable');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', bytes.length);
      res.end(bytes);
    } catch { fail(503); }
  };
}

export function localTestPresetPlugin(manifestPath = process.env.HIRED_GUNS_LOCAL_TEST_MANIFEST): Plugin {
  const install = (server: { middlewares: { use: (middleware: ReturnType<typeof localTestPresetMiddleware>) => void } }) => {
    server.middlewares.use(localTestPresetMiddleware(manifestPath));
  };
  return { name: 'local-training43-test-preset', configureServer: install, configurePreviewServer: install };
}
