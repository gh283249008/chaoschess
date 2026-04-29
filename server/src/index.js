import { GameServer } from './GameServer.js';

/**
 * 服务器入口
 */
const PORT = process.env.PORT || 8080;

const server = new GameServer(PORT);
server.start();

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    server.stop();
    process.exit(0);
});
