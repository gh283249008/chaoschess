// 从环境变量读取端口配置
const FRONTEND_PORT = process.env.FRONTEND_PORT || '9001';

export default {
  server: {
    port: parseInt(FRONTEND_PORT),
    host: '0.0.0.0',
    allowedHosts: ['.monkeycode-ai.online'],
    open: true // 自动打开浏览器
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
};
