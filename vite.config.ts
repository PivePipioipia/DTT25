import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [],
    base: './', // CRITICAL: ensures assets load with file:// protocol in Electron
    // Base config
    server: {
        port: 5173,
        strictPort: true,
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    }
});
