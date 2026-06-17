import { defineConfig } from 'vite';

// PORT env support so tooling (preview harnesses, CI) can assign a port;
// defaults to vite's standard 5173 for normal `npm run dev`.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/lumisynth/' : '/',
  server: {
    port: Number(process.env.PORT) || 5173,
  },
});
