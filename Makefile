.PHONY: dev build preview clean

# 默认端口
FRONTEND_PORT ?= 9001

# 开发模式
dev:
	@echo "🎮 启动混乱棋局开发服务器..."
	@bun install
	@echo "🌐 游戏地址: http://localhost:$(FRONTEND_PORT)"
	@FRONTEND_PORT=$(FRONTEND_PORT) bun run dev --cwd client

# 构建生产版本
build:
	@echo "📦 构建生产版本..."
	@bun install
	@bun run build --cwd client
	@echo "✅ 构建完成！输出目录: client/dist/"

# 预览生产版本
preview:
	@echo "👀 预览生产版本..."
	@bun run preview --cwd client

# 清理构建文件
clean:
	@echo "🧹 清理构建文件..."
	@rm -rf client/dist
	@echo "✅ 清理完成！"
