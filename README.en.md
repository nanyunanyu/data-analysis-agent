# Data Analysis Agent

[中文](./README.md) | [English](./README.en.md)

A full-stack AI Agent project for data analysis workflows. Users upload an Excel/CSV file and describe what they want to analyze; the Agent reads the dataset, plans tasks, generates and runs Python analysis code, and produces a Markdown report with charts and insights.

> **Project positioning**: This is an engineering portfolio and Agent architecture learning project. It provides a runnable data-analysis demo and keeps 5 Agent Loop implementations to show the evolution from staged code-controlled workflows to tool-driven autonomous execution.

## Video Demo

https://github.com/user-attachments/assets/1e3afc0b-32d9-4c13-a59f-c77ed540dd3e

If the online preview is unavailable, see the local demo asset: [`docs/assets/demo.mp4`](./docs/assets/demo.mp4).

## Highlights

- **End-to-end data analysis Agent**: Covers dataset inspection, requirement understanding, task planning, code generation, result interpretation, and report generation.
- **5 Agent Loop architectures**: Includes staged, autonomous, hybrid, task-driven, and tool-driven implementations, making it easy to compare how control shifts from application code to LLM tool calls.
- **Real-time execution visualization**: The backend streams Agent events through WebSocket, while the frontend displays task status, reasoning, tool calls, code execution, and chart results in real time.
- **Tool-driven task lifecycle**: The recommended `tool_driven` mode lets the LLM manage task creation, execution state, and completion through the `todo_write` tool.
- **Python analysis execution pipeline**: The Agent can generate pandas / matplotlib / seaborn code and run it in a subprocess with timeout protection.
- **Interactive frontend experience**: Built with React, TypeScript, and Tailwind CSS; supports Chinese/English UI, light/dark themes, task lists, process panels, and report rendering.
- **Complete engineering structure**: Demonstrates FastAPI APIs, WebSocket communication, configuration management, logging, frontend state handling, and report visualization.

## Architecture

```text
User uploads Excel/CSV + enters analysis request
        │
        ▼
React frontend (file upload, task list, process view, report view)
        │ REST API / WebSocket
        ▼
FastAPI backend (session management, file storage, event buffering, stop control)
        │
        ▼
Agent Loop (read dataset, plan tasks, call tools, generate report)
        │
        ├── read_dataset: inspect schema, preview rows, and statistics
        ├── run_code: execute Python analysis code and return stdout / charts
        └── todo_write: synchronize task lifecycle in tool_driven mode
        │
        ▼
Markdown report + charts + real-time event stream
```

| Module | Responsibility |
| --- | --- |
| `frontend/` | React single-page app for uploading data, submitting requests, and rendering real-time events and reports |
| `backend/main.py` | FastAPI entry point for REST APIs, WebSocket, session management, and event buffering |
| `backend/agent/` | 5 Agent Loop implementations with different task-control strategies |
| `backend/tools/` | Dataset reading and Python code execution tools |
| `backend/config/` | Environment-based configuration with Pydantic Settings |
| `record/` | Generated session logs and LLM interaction logs |

## Agent Architecture Exploration

The project keeps 5 Agent runtime modes. Each mode represents a different way to distribute control between deterministic application code and the LLM:

| Mode | Control strategy | Characteristics | Best for |
| --- | --- | --- | --- |
| `tool_driven` | The LLM manages the task lifecycle through tool calls | Default and recommended; the LLM creates tasks, updates status, runs analysis, and outputs the final report | Complex and open-ended analysis tasks |
| `task_driven` | Application code controls the task flow, while the LLM assists execution | More stable flow and stricter task ordering | Tasks that require clear execution order |
| `hybrid` | Code selects tasks, while the LLM completes task content autonomously | Balances controllability and flexibility | Medium-complexity analysis |
| `autonomous` | The LLM makes decisions through tag parsing | Closer to a free-form autonomous Agent, but more dependent on prompt and parser stability | Architecture experiments and learning |
| `staged` | Code advances through fixed stages | Data exploration → task planning → execution → report; easy to reason about | Simple and deterministic analysis |

The default mode is `tool_driven`. You can switch modes by changing `AGENT_MODE` in `backend/.env`.

## Tech Stack

### Backend

- **FastAPI**: REST API, WebSocket, and async task entry point
- **Pydantic Settings**: Environment variable configuration
- **OpenAI-compatible SDK**: Supports OpenAI API and other providers using the same protocol
- **pandas / numpy**: Dataset loading, cleaning, and statistical analysis
- **matplotlib / seaborn**: Static chart generation
- **subprocess**: Executes Agent-generated Python code in a child process

### Frontend

- **React 18 + TypeScript**: Componentized UI with type safety
- **Vite**: Development server and build tooling
- **Tailwind CSS**: Styling system
- **ECharts / Mermaid / React Markdown**: Chart, diagram, and Markdown report rendering
- **WebSocket Hook**: Receives real-time Agent execution events

## Quick Start

### Requirements

- Python 3.9+
- Node.js 18+
- An API key for an OpenAI-compatible LLM service

### 1. Configure backend environment variables

Create a `.env` file under `backend/`:

```env
# LLM configuration
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
LLM_MODEL=kimi-k2-thinking-turbo

# Agent configuration
AGENT_MODE=tool_driven
MAX_ITERATIONS=25
CODE_TIMEOUT=30
MAX_ITERATIONS_PER_TASK=5

# File configuration
UPLOAD_DIR=/tmp/data_analyst_uploads
MAX_FILE_SIZE=52428800

# WebSocket configuration
WS_HEARTBEAT_INTERVAL=30
```

> A strong reasoning-capable model is recommended. Complex analysis tasks require the model to understand fields, plan steps, generate executable code, and recover from intermediate errors.

### 2. Start the backend

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

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app

Visit:

```text
http://localhost:3000
```

The Vite dev server proxies `/api` and `/ws` to the backend at `http://localhost:8003`.

## 📖 Usage Flow

1. **Upload a dataset**: Supports `.xlsx`, `.xls`, and `.csv` files.
2. **Enter an analysis request**: For example, “Analyze sales trends and identify anomalies” or “Calculate category-level sales share and generate charts.”
3. **Start analysis**: The frontend calls `POST /api/start` to create an analysis session.
4. **Watch the real-time process**: WebSocket events show task planning, tool calls, code execution, chart generation, and status updates.
5. **Read the report**: After completion, the UI switches to the report panel and renders the generated Markdown report and charts.

## API Overview

### REST API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/start` | Upload a file and analysis request, then start the Agent asynchronously |
| `POST` | `/api/stop/{session_id}` | Request cancellation for a running analysis session |
| `POST` | `/api/start-sync` | Run analysis synchronously and return the result after completion |

### WebSocket

| Path | Description |
| --- | --- |
| `/ws/{session_id}` | Subscribe to real-time events for one session |
| `/ws` | Broadcast connection for all session events |

Common event types include: `connected`, `tasks_updated`, `tool_call`, `tool_result`, `image_generated`, `report_generated`, `agent_completed`, `agent_error`, and `agent_stopped`.

## 📁 Project Structure

```text
data-analysis-agent/
├── backend/
│   ├── main.py                    # FastAPI API, WebSocket, session and event buffering
│   ├── agent/
│   │   ├── loop.py                # staged mode
│   │   ├── autonomous_loop.py     # autonomous mode
│   │   ├── hybrid_loop.py         # hybrid mode
│   │   ├── task_driven_loop.py    # task_driven mode
│   │   ├── tool_driven_loop.py    # tool_driven mode (recommended)
│   │   ├── state.py               # Agent state, tasks, and phases
│   │   └── llm_client.py          # LLM client wrapper
│   ├── tools/
│   │   ├── read_dataset.py        # Excel/CSV dataset reader
│   │   └── run_code.py            # Python analysis code execution tool
│   ├── prompts/system_prompts.py  # System prompts
│   ├── config/settings.py         # Environment configuration
│   ├── utils/logger.py            # Logging and session records
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Main app state and UI orchestration
│   │   ├── components/            # Upload, tasks, process, report components
│   │   ├── hooks/useWebSocket.ts  # WebSocket connection management
│   │   └── lib/i18n.ts            # Chinese/English UI copy
│   ├── package.json
│   └── vite.config.ts             # Vite and API/WebSocket proxy configuration
├── docs/
│   ├── assets/demo.mp4            # Local demo video
│   └── example/kimi_thinking.py   # Example script
├── plan/                          # Architecture and refactoring notes
├── record/                        # Generated runtime logs
├── README.md                      # Chinese README
└── README.en.md                   # English README
```

## ⚠️ Safety Boundaries and Limitations

- This project is a **demo / learning / portfolio-level** project and is not intended to be used directly as a production data analysis platform.
- Agent-generated Python code runs in a subprocess with timeout protection, but this is not a complete security sandbox.
- If you process sensitive data or expose the system to external users, run code execution inside an isolated environment such as Docker, Firecracker, or a Kubernetes sandbox.
- Uploaded files are temporarily stored on the server. Adjust storage and cleanup policies based on your privacy requirements.
- LLM calls may incur cost. Complex analysis tasks can trigger multiple tool calls and model requests.

## Roadmap

- [ ] Support more data formats such as JSON and Parquet
- [ ] Strengthen code execution sandboxing and resource limits
- [ ] Add analysis history and result caching
- [ ] Support multi-turn requirement refinement
- [ ] Add more statistical analysis and machine learning tools
- [ ] Support report export and custom analysis templates
- [ ] Add automated evaluation examples for different Agent Loops

## License

MIT License
