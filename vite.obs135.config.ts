import { defineConfig } from 'vite';
import { obs135Plugin } from './tools/obs135/plugin';

// Explicit selection only: vite --config vite.obs135.config.ts. No source provider.
export default defineConfig(({ command, isPreview }) => {
  if (command !== 'serve' || isPreview) throw Error('OBS135 refuses build and preview');
  return { publicDir: false, plugins: [obs135Plugin()], server: {
    host: '127.0.0.1', strictPort: true, port: 5175,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.local/**'] },
  } };
});
