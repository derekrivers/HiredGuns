import { defineConfig } from 'vite';
import { localTestPresetPlugin } from './tools/local-test-preset';
// Originals use explicit import or the opt-in loopback test provider; never public/build assets.
export default defineConfig({ publicDir: false, plugins: [localTestPresetPlugin()], server: {
  strictPort: true, port: 5173,
  fs: { deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.local/**'] },
} });
