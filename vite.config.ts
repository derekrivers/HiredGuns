import { defineConfig } from 'vite';
// Local assets enter through an explicit file picker, never an auto-copied public directory.
export default defineConfig({ publicDir: false, server: { strictPort: true, port: 5173 } });
