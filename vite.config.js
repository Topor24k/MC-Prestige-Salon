import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Relative base so the built site works from any sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: Number(process.env.PORT) || 5173 },
});
