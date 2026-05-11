import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
    root: './',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                gameTest: resolve(__dirname, 'game-test.html')
            }
        }
    },
    server: {
        port: 9001,
        allowedHosts: ['.monkeycode-ai.online'],
        proxy: {
            '/ws': {
                target: 'ws://127.0.0.1:8080',
                ws: true,
                changeOrigin: true
            }
        }
    }
};
