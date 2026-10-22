import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // A public review workspace is never an authentication mechanism. Production
  // keeps this off, even if a stray VITE_ flag is configured.
  define: {
    __ADMIN_PREVIEW_ENABLED__: JSON.stringify(command === 'serve' || process.env.VERCEL_ENV === 'preview'),
    'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(process.env.VERCEL_ENV || '')
  },
  server: { port: 5173 }
}));
