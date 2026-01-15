# ⚔️ 战力比拼 (Power Battle)

一款基于AI判断的创意对战游戏。玩家需要找出能够"战胜"当前物品的新物品，由AI进行胜负判定，形成一条越来越长的胜利链。

## 🎮 游戏规则

1. 游戏从「石头」开始
2. 输入你认为能战胜当前物品的新物品
3. AI会判断你的物品能否战胜当前物品
4. 战胜成功：你的物品成为新的守擂者，积分+1
5. 战胜失败：游戏结束，查看最终得分

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm (推荐) 或 npm

### 安装和运行

```bash
# 进入前端目录
cd frontend

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:5173 开始游戏！

## 🤖 AI配置（可选）

游戏默认使用模拟模式，可以直接体验。如需使用真实AI判断，请配置AI API：

## 📁 项目结构

```
├── frontend/               # 前端项目
│   ├── src/
│   │   ├── components/    # Vue组件
│   │   ├── views/         # 页面视图
│   │   ├── stores/        # Pinia状态管理
│   │   ├── services/      # API服务
│   │   └── types/         # TypeScript类型
│   └── ...
├── 项目指南.md             # 详细技术文档
└── README.md              # 本文件
```

## 🛠️ 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **样式方案**: TailwindCSS
- **路由**: Vue Router

## 📄 许可证


MIT License
