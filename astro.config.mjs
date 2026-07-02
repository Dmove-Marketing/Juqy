import { defineConfig } from 'astro/config';

export default defineConfig({
  // Output estático (padrão) — gera HTML puro
  output: 'static',

  // View Transitions habilitadas
  prefetch: true,

  // Build otimizado
  build: {
    inlineStylesheets: 'auto',
  },

  // Dev server
  server: {
    port: 4321,
  },
});
