## 产品概述

将现有的 Vite + React 19 单页应用迁移至 Next.js App Router 架构，实现前后端分离的现代化应用。项目核心功能为调用 Gemini 2.0 API 进行 AI 交互，使用 Mammoth.js 处理文档，通过 Tailwind CSS 实现样式。

## 核心功能

- 完整的 Next.js App Router 架构，采用 Server Components 和 Client Components 混合模式
- 统一的 API 端点 `/api/gemini` 处理所有 Gemini API 请求
- 前端组件仅负责 UI 交互，所有 API 调用通过服务端完成
- 保持现有的文档处理能力（Mammoth.js）和样式系统（Tailwind CSS）
- 使用 @google/genai SDK 与 Gemini 2.0 Flash 模型交互

## 技术栈

- **框架**: Next.js 15+ (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **AI SDK**: @google/genai
- **文档处理**: Mammoth.js
- **运行时**: Node.js 18+

## 系统架构

### 整体架构模式

采用 Next.js App Router 的混合渲染架构：

- Server Components 负责数据获取和服务端逻辑
- Client Components 负责交互式 UI
- API Routes 作为统一的后端接口层

```mermaid
graph TD
    A[用户浏览器] --> B[Next.js App Router]
    B --> C[Server Components]
    B --> D[Client Components]
    D --> E[API Routes /api/gemini]
    E --> F[@google/genai SDK]
    F --> G[Gemini 2.0 Flash API]
    C --> H[服务端渲染逻辑]
    D --> I[客户端交互逻辑]
```

### 模块划分

#### 1. App Router 层 (app/)

- **职责**: 页面路由和布局管理
- **技术**: Next.js App Router, React Server Components
- **依赖**: 无外部依赖
- **接口**: 页面组件导出

#### 2. API 层 (app/api/)

- **职责**: 统一的 Gemini API 调用端点
- **技术**: Next.js Route Handlers, @google/genai
- **依赖**: @google/genai SDK
- **接口**: POST /api/gemini

#### 3. 组件层 (components/)

- **职责**: 可复用的 UI 组件
- **技术**: React Client Components, Tailwind CSS
- **依赖**: API 层
- **接口**: React 组件 props

#### 4. 工具层 (lib/)

- **职责**: 共享工具函数、类型定义
- **技术**: TypeScript, Mammoth.js
- **依赖**: 无
- **接口**: 导出工具函数和类型

### 数据流

```mermaid
flowchart LR
    User[用户操作] --> Client[Client Component]
    Client --> API[POST /api/gemini]
    API --> SDK[@google/genai SDK]
    SDK --> Gemini[Gemini 2.0 API]
    Gemini --> SDK
    SDK --> API
    API --> Client
    Client --> UI[更新 UI]
```

## 实现细节

### 核心目录结构

```
nextjs-app-router-project/
├── app/
│   ├── layout.tsx              # 根布局（Server Component）
│   ├── page.tsx                # 首页（Server Component）
│   ├── api/
│   │   └── gemini/
│   │       └── route.ts        # 统一 API 端点
│   └── globals.css             # Tailwind CSS 配置
├── components/
│   ├── GeminiChat.tsx          # 聊天组件（Client Component）
│   ├── DocumentUpload.tsx      # 文档上传（Client Component）
│   └── ui/                     # UI 组件库
├── lib/
│   ├── gemini.ts               # Gemini SDK 配置
│   ├── types.ts                # TypeScript 类型定义
│   └── utils.ts                # 工具函数
├── public/                     # 静态资源
├── next.config.js              # Next.js 配置
├── tailwind.config.js          # Tailwind 配置
├── tsconfig.json               # TypeScript 配置
└── package.json
```

### 关键代码结构

#### API 端点设计

```typescript
// app/api/gemini/route.ts
interface GeminiRequest {
  action: 'chat' | 'analyze' | 'generate';
  payload: {
    prompt?: string;
    document?: string;
    model?: string;
  };
}

export async function POST(request: Request) {
  const body: GeminiRequest = await request.json();
  // 根据 action 调用不同的 Gemini 功能
  // 返回统一格式的响应
}
```

#### Client Component 结构

```typescript
// components/GeminiChat.tsx
'use client';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function GeminiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  async function sendMessage(prompt: string) {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ action: 'chat', payload: { prompt } })
    });
    // 处理响应并更新 UI
  }
}
```

### 技术实现方案

#### 1. Next.js App Router 迁移

**问题**: 从 Vite SPA 迁移到 Next.js 服务端渲染架构
**方案**:

- 使用 `'use client'` 指令标记交互组件
- 将路由从 React Router 迁移到文件系统路由
- 使用 Server Components 处理静态内容
**实施步骤**:

1. 创建 Next.js 项目结构
2. 迁移现有组件，区分 Server/Client Components
3. 配置 Tailwind CSS 和 TypeScript
4. 设置环境变量管理（.env.local）
5. 测试组件渲染和样式
**挑战**: 组件边界划分，需明确哪些组件需要客户端交互

#### 2. 统一 API 端点设计

**问题**: 将分散的 Gemini API 调用集中到服务端
**方案**:

- 创建 `/api/gemini` Route Handler
- 使用 action 参数区分不同操作
- 服务端集中管理 API Key 和错误处理
**实施步骤**:

1. 定义统一的请求/响应接口
2. 实现 Route Handler 核心逻辑
3. 集成 @google/genai SDK
4. 添加错误处理和日志
5. 实现流式响应支持（如需要）
**挑战**: 错误处理和超时管理

#### 3. Gemini SDK 集成

**问题**: 在服务端安全使用 @google/genai
**方案**:

- 使用环境变量存储 API Key
- 创建单例 SDK 实例
- 实现请求缓存和限流
**实施步骤**:

1. 安装 @google/genai 包
2. 配置 API Key（环境变量）
3. 创建 SDK 初始化函数
4. 实现 Gemini 2.0 Flash 调用逻辑
5. 添加错误重试机制
**挑战**: API 限流和成本控制

#### 4. 文档处理迁移

**问题**: 迁移 Mammoth.js 文档处理功能
**方案**:

- 在客户端组件中处理文件上传
- 通过 API 传递文档内容
- 服务端或客户端调用 Mammoth.js
**实施步骤**:

1. 创建文档上传 Client Component
2. 实现文件读取和预处理
3. 将文档内容传递给 API
4. 集成 Mammoth.js 解析逻辑
5. 展示处理结果
**挑战**: 大文件处理和性能优化

## 集成点

### 前后端通信

- **格式**: JSON
- **端点**: POST /api/gemini
- **认证**: 通过环境变量管理 API Key（服务端）
- **错误处理**: 统一的错误响应格式

### 第三方服务集成

- **Gemini API**: 通过 @google/genai SDK
- **Mammoth.js**: 客户端或服务端文档解析

## 技术考量

### 性能优化

- 使用 Next.js 增量静态再生成（ISR）缓存静态内容
- API 路由实现请求去重和缓存
- 组件懒加载（dynamic import）
- 图片优化（next/image）

### 安全措施

- API Key 仅存储在服务端环境变量
- API 端点添加 CORS 和 rate limiting
- 输入验证和消毒
- 使用 Next.js 内置的 CSRF 保护

### 可扩展性

- 统一的 API 端点易于添加新功能
- 组件化架构支持功能模块化
- 通过 action 参数扩展 API 能力
- 支持未来的微服务拆分

### 开发工作流

- 使用 TypeScript 确保类型安全
- ESLint + Prettier 代码规范
- 本地开发使用 `next dev`
- 生产构建使用 `next build`
- 部署到 Vercel 或其他 Node.js 平台