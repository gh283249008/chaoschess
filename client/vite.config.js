export default {
    root: './',
    build: {
        outDir: 'dist',
        emptyOutDir: true
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
