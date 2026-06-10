# 数据分析 Agent

[中文](./README.md) | [English](./README.en.md)

一个面向数据分析场景的全栈 AI Agent 项目：用户上传 Excel/CSV 数据并描述分析目标后，Agent 会自动读取数据、规划任务、生成并执行 Python 分析代码，最后输出包含图表和洞察的 Markdown 报告。

> **项目定位**：这是一个技术作品集 / Agent 架构学习项目。它不仅实现了可运行的数据分析 Demo，也保留了 5 种 Agent Loop 的演进版本，用于展示从“分阶段流程控制”到“工具驱动自主执行”的架构探索过程。


## ✨ 项目亮点

- **端到端数据分析 Agent**：覆盖数据读取、需求理解、任务规划、代码生成、结果解释和报告输出。
- **5 种 Agent Loop 架构对比**：保留 staged、autonomous、hybrid、task-driven、tool-driven 多种实现，便于观察控制权如何从代码迁移到 LLM 工具调用。
- **实时执行过程可视化**：后端通过 WebSocket 推送 Agent 事件，前端实时展示任务状态、思考过程、工具调用、代码执行和图表结果。
- **工具驱动任务生命周期**：推荐的 `tool_driven` 模式通过 `todo_write` 工具让 LLM 自主管理任务创建、执行和完成状态。
- **Python 分析代码执行链路**：Agent 可生成 pandas / matplotlib / seaborn 分析代码，并在带超时限制的子进程中执行。
- **交互式前端体验**：React + TypeScript + Tailwind CSS 构建，支持中英文界面、亮/暗色主题、任务列表、过程面板和报告面板。
- **面向工程展示的完整项目结构**：包含 FastAPI API、WebSocket、配置管理、日志记录、前端状态管理和分析报告渲染。

## 系统架构

```text
用户上传 Excel/CSV + 输入分析需求
        │
        ▼
React 前端（文件上传、任务列表、过程展示、报告展示）
        │ REST API / WebSocket
        ▼
FastAPI 后端（会话管理、文件保存、事件缓冲、停止控制）
        │
        ▼
Agent Loop（读取数据、规划任务、调用工具、生成报告）
        │
        ├── read_dataset：读取数据结构、预览和统计信息
        ├── run_code：执行 Python 分析代码并返回 stdout / 图表
        └── todo_write：在 tool_driven 模式下同步任务生命周期
        │
        ▼
Markdown 报告 + 图表 + 实时事件流
```

| 模块 | 主要职责 |
| --- | --- |
| `frontend/` | React 单页应用，负责上传数据、提交需求、展示实时事件和分析报告 |
| `backend/main.py` | FastAPI 入口，提供 REST API、WebSocket、会话管理和事件缓冲 |
| `backend/agent/` | 5 种 Agent Loop 实现，封装不同的任务控制策略 |
| `backend/tools/` | 数据读取与 Python 代码执行工具 |
| `backend/config/` | 基于 Pydantic Settings 的环境变量配置 |
| `record/` | 自动生成的会话日志和 LLM 交互日志 |

## Agent 架构探索

项目中保留了 5 种 Agent 运行模式。它们代表了不同的控制权分配方式：

| 模式 | 控制策略 | 特点 | 适合场景 |
| --- | --- | --- | --- |
| `tool_driven` | LLM 通过工具调用管理任务生命周期 | 默认推荐；LLM 创建任务、更新状态、执行分析、输出报告 | 复杂、开放式分析任务 |
| `task_driven` | 代码控制任务流程，LLM 辅助执行 | 流程更稳定，任务顺序更可控 | 需要明确执行顺序的任务 |
| `hybrid` | 代码控制任务选择，LLM 自主完成任务内容 | 在控制性和灵活性之间折中 | 中等复杂度分析 |
| `autonomous` | LLM 通过标签解析自主决策 | 更接近自由对话式 Agent，但解析稳定性更依赖提示词 | 架构实验和学习 |
| `staged` | 代码按固定阶段推进 | 数据探索 → 任务规划 → 执行 → 报告，结构清晰 | 简单、确定性较强的分析 |

默认模式为 `tool_driven`，可通过 `backend/.env` 中的 `AGENT_MODE` 切换。

## 技术栈

### 后端

- **FastAPI**：REST API、WebSocket、异步任务入口
- **Pydantic Settings**：环境变量配置管理
- **OpenAI-compatible SDK**：支持 OpenAI API 及兼容协议的大模型服务
- **pandas / numpy**：数据读取、清洗和统计分析
- **matplotlib / seaborn**：生成静态分析图表
- **subprocess**：在子进程中执行 Agent 生成的 Python 代码

### 前端

- **React 18 + TypeScript**：组件化 UI 和类型安全
- **Vite**：开发服务器和构建工具
- **Tailwind CSS**：界面样式
- **ECharts / Mermaid / React Markdown**：图表、流程图和 Markdown 报告渲染
- **WebSocket Hook**：实时接收 Agent 执行事件

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 22+
- 一个兼容 OpenAI API 协议的大模型服务 Key

### 1. 配置后端环境变量

在 `backend/` 目录下创建 `.env`：

```env
# LLM 配置
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
LLM_MODEL=kimi-k2-thinking-turbo

# Agent 配置
AGENT_MODE=tool_driven
MAX_ITERATIONS=25
CODE_TIMEOUT=30
MAX_ITERATIONS_PER_TASK=5

# 文件配置
UPLOAD_DIR=/tmp/data_analyst_uploads
MAX_FILE_SIZE=52428800

# WebSocket 配置
WS_HEARTBEAT_INTERVAL=30
```

> 建议使用具备较强推理能力的模型。复杂数据分析任务通常需要模型理解字段含义、规划步骤、生成可执行代码并修复中间错误。

### 2. 启动后端

```bash
cd backend
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows PowerShell
# .\venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn main:app --reload --port 8003
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认把 `/api` 和 `/ws` 代理到 `http://localhost:8003`。如果后端端口或地址不同，复制 `frontend/.env.example` 为 `frontend/.env.local`，并设置 `VITE_BACKEND_PORT` 或 `VITE_BACKEND_URL`。

### 4. 访问应用

打开浏览器访问：

```text
http://localhost:3000
```

如果启动分析时提示无法连接后端，请确认后端命令使用的是 `--port 8003`，或 `frontend/.env.local` 与后端实际地址一致。

## 📖 使用流程

1. **上传数据文件**：支持 `.xlsx`、`.xls`、`.csv`。
2. **输入分析需求**：例如“分析销售趋势并找出异常值”或“统计各产品类别销售占比并生成图表”。
3. **启动分析**：前端调用 `POST /api/start` 创建分析会话。
4. **查看实时过程**：WebSocket 推送任务规划、工具调用、代码执行、图表生成等事件。
5. **查看分析报告**：任务完成后自动切换到报告面板，展示 Markdown 报告和生成图表。

##  API 简览

### REST API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/start` | 上传文件和分析需求，异步启动 Agent |
| `POST` | `/api/stop/{session_id}` | 请求停止指定分析会话 |
| `POST` | `/api/start-sync` | 同步执行分析并在完成后返回结果 |

### WebSocket

| 路径 | 说明 |
| --- | --- |
| `/ws/{session_id}` | 订阅指定会话的实时事件 |
| `/ws` | 广播连接，接收所有会话事件 |

常见事件类型包括：`connected`、`tasks_updated`、`tool_call`、`tool_result`、`image_generated`、`report_generated`、`agent_completed`、`agent_error`、`agent_stopped`。

## 📁 项目结构

```text
data-analysis-agent/
├── backend/
│   ├── main.py                    # FastAPI API、WebSocket、会话和事件缓冲
│   ├── agent/
│   │   ├── loop.py                # staged 分阶段模式
│   │   ├── autonomous_loop.py     # autonomous 自主模式
│   │   ├── hybrid_loop.py         # hybrid 混合模式
│   │   ├── task_driven_loop.py    # task_driven 任务驱动模式
│   │   ├── tool_driven_loop.py    # tool_driven 工具驱动模式（推荐）
│   │   ├── state.py               # Agent 状态、任务和阶段定义
│   │   └── llm_client.py          # LLM 客户端封装
│   ├── tools/
│   │   ├── read_dataset.py        # Excel/CSV 数据读取工具
│   │   └── run_code.py            # Python 分析代码执行工具
│   ├── prompts/system_prompts.py  # 系统提示词
│   ├── config/settings.py         # 环境变量配置
│   ├── utils/logger.py            # 日志与会话记录
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # 主应用状态与界面编排
│   │   ├── components/            # 上传、任务、过程、报告等组件
│   │   ├── hooks/useWebSocket.ts  # WebSocket 连接管理
│   │   └── lib/i18n.ts            # 中英文界面文案
│   ├── package.json
│   └── vite.config.ts             # Vite 与 API/WebSocket 代理配置
├── docs/
│   ├── assets/demo.mp4            # 本地演示视频
│   └── example/kimi_thinking.py   # 示例脚本
├── plan/                          # 架构和重构计划文档
├── record/                        # 自动生成的运行日志
├── README.md                      # 中文 README
└── README.en.md                   # English README
```

## ⚠️ 安全边界与限制

- 当前项目是 **Demo / 学习 / 作品集级别**，不建议直接作为生产级数据分析平台使用。
- Agent 生成的 Python 代码会在子进程中执行，并设置了超时限制，但这不是完整安全沙箱。
- 如果处理敏感数据或开放给外部用户，建议放入 Docker、Firecracker、Kubernetes Sandbox 等隔离环境。
- 上传文件会临时保存到服务器目录，使用前请根据数据隐私要求调整存储和清理策略。
- LLM 调用会产生费用，复杂分析任务可能触发多轮工具调用和多次模型请求。

## 后续方向

- [ ] 支持 JSON、Parquet 等更多数据格式
- [ ] 增强代码执行沙箱和资源限制
- [ ] 增加分析历史记录和结果缓存
- [ ] 支持多轮对话式需求调整
- [ ] 引入更多统计分析和机器学习工具
- [ ] 支持报告导出和自定义分析模板
- [ ] 为不同 Agent Loop 增加自动化评测样例

## License

MIT License
