export type Locale = 'zh' | 'en'

export const appCopy = {
  zh: {
    appName: '数据分析 Agent',
    tagline: 'AI 驱动的智能数据分析',
    controls: {
      light: '浅色主题',
      dark: '深色主题',
      language: '语言',
      chinese: '中文',
      english: 'English',
    },
    actions: {
      stop: '停止分析',
      start: '开始分析',
      starting: '启动中...',
      newAnalysis: '开始新分析',
    },
    connection: {
      connected: '已连接',
      connecting: '连接中...',
    },
    hero: {
      title: '开始您的数据分析之旅',
      description: '上传数据文件，描述您的分析需求，AI Agent 将自动完成分析',
    },
    upload: {
      title: '上传数据',
      description: '支持 Excel (.xlsx, .xls) 和 CSV 格式',
    },
    request: {
      title: '分析需求',
      description: '描述您想要分析的内容，越详细越好',
      placeholder: '例如：分析销售数据的趋势，找出表现最好的产品类别，并预测下个季度的销售额...',
    },
    panels: {
      taskPlanning: '任务规划',
      process: '执行过程',
      report: '分析报告',
      completed: '完成',
      agentProcess: 'Agent 执行过程',
    },
    error: {
      title: '分析出错',
      server: '服务器错误',
      missingSession: '未获取到 session_id',
      backendOffline: '无法连接到后端服务，请确保后端已启动（端口 8003）',
      unknown: '未知错误',
      maxIterations: (count: unknown) => `分析达到最大迭代次数，${count} 个任务未完成。报告可能不完整。`,
    },
    stopped: {
      title: '分析已停止',
      description: '分析过程已被手动停止，已完成的结果已保留。',
    },
    status: {
      idle: '就绪',
      uploading: '上传中',
      processing: '分析中',
      completed: '完成',
      stopped: '已停止',
      error: '错误',
    },
    footer: '数据分析 Agent · AI 驱动的智能数据分析工具',
  },
  en: {
    appName: 'Data Analysis Agent',
    tagline: 'AI-powered intelligent data analysis',
    controls: {
      light: 'Light theme',
      dark: 'Dark theme',
      language: 'Language',
      chinese: '中文',
      english: 'English',
    },
    actions: {
      stop: 'Stop analysis',
      start: 'Start analysis',
      starting: 'Starting...',
      newAnalysis: 'New analysis',
    },
    connection: {
      connected: 'Connected',
      connecting: 'Connecting...',
    },
    hero: {
      title: 'Start Your Data Analysis',
      description: 'Upload a data file, describe the question, and let the AI Agent run the analysis.',
    },
    upload: {
      title: 'Upload Data',
      description: 'Supports Excel (.xlsx, .xls) and CSV files',
    },
    request: {
      title: 'Analysis Request',
      description: 'Describe what you want to analyze. More detail leads to better results.',
      placeholder: 'Example: Analyze sales trends, identify the best-performing product categories, and forecast next quarter revenue...',
    },
    panels: {
      taskPlanning: 'Task Planning',
      process: 'Process',
      report: 'Report',
      completed: 'Done',
      agentProcess: 'Agent Process',
    },
    error: {
      title: 'Analysis Error',
      server: 'Server error',
      missingSession: 'No session_id returned',
      backendOffline: 'Cannot connect to the backend service. Make sure it is running on port 8003.',
      unknown: 'Unknown error',
      maxIterations: (count: unknown) => `The analysis reached the maximum iterations. ${count} tasks remain incomplete, so the report may be partial.`,
    },
    stopped: {
      title: 'Analysis Stopped',
      description: 'The analysis was stopped manually. Completed results are preserved.',
    },
    status: {
      idle: 'Ready',
      uploading: 'Uploading',
      processing: 'Analyzing',
      completed: 'Done',
      stopped: 'Stopped',
      error: 'Error',
    },
    footer: 'Data Analysis Agent · AI-powered intelligent data analysis tool',
  },
} as const

export const fileUploadCopy = {
  zh: {
    invalidType: (types: string) => `不支持的文件格式。请上传 ${types} 格式的文件。`,
    tooLarge: (size: number) => `文件过大。最大支持 ${size}MB。`,
    release: '释放以上传文件',
    choose: '拖放文件到这里，或点击选择',
    support: (size: number) => `支持 Excel (.xlsx, .xls) 和 CSV 格式，最大 ${size}MB`,
  },
  en: {
    invalidType: (types: string) => `Unsupported file type. Please upload ${types} files.`,
    tooLarge: (size: number) => `The file is too large. Maximum size is ${size}MB.`,
    release: 'Release to upload',
    choose: 'Drop a file here, or click to choose',
    support: (size: number) => `Supports Excel (.xlsx, .xls) and CSV files up to ${size}MB`,
  },
} as const

export const taskListCopy = {
  zh: {
    status: {
      pending: '等待中',
      in_progress: '执行中',
      completed: '已完成',
      failed: '失败',
      skipped: '已跳过',
    },
    types: {
      data_exploration: '数据探索',
      analysis: '数据分析',
      visualization: '可视化',
      report: '报告生成',
    },
    planningTitle: '用户需求分析和任务规划',
    planningDescription: '读取数据、分析需求、制定任务清单',
    planning: '正在规划任务...',
    waiting: '等待任务规划...',
  },
  en: {
    status: {
      pending: 'Pending',
      in_progress: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      skipped: 'Skipped',
    },
    types: {
      data_exploration: 'Data Exploration',
      analysis: 'Analysis',
      visualization: 'Visualization',
      report: 'Report',
    },
    planningTitle: 'Request Analysis and Task Planning',
    planningDescription: 'Read data, analyze the request, and prepare the task list',
    planning: 'Planning tasks...',
    waiting: 'Waiting for task planning...',
  },
} as const

export const agentProcessCopy = {
  zh: {
    planningTitle: '用户需求分析和任务规划',
    waitingStart: '等待 Agent 启动...',
    websocketDisconnected: 'WebSocket 未连接',
    working: 'Agent 正在工作...',
    preparing: '准备执行...',
    status: {
      pending: '等待中',
      in_progress: '执行中',
      completed: '已完成',
      failed: '失败',
    },
    dataset: {
      title: '数据集概览',
      rows: '行数',
      columns: '列数',
      missing: '缺失值',
      fields: '字段列表',
      more: (count: number) => `+${count} 更多`,
    },
    thinking: 'AI 思考过程',
    executeCode: '执行代码',
    chart: '生成图表',
    error: '执行错误',
    toolFallback: '工具调用',
    tools: {
      run_code: '执行代码',
      read_dataset: '读取数据',
      todo_write: '更新任务',
    },
    timeLocale: 'zh-CN',
  },
  en: {
    planningTitle: 'Request Analysis and Task Planning',
    waitingStart: 'Waiting for Agent to start...',
    websocketDisconnected: 'WebSocket disconnected',
    working: 'Agent is working...',
    preparing: 'Preparing...',
    status: {
      pending: 'Pending',
      in_progress: 'Running',
      completed: 'Completed',
      failed: 'Failed',
    },
    dataset: {
      title: 'Dataset Overview',
      rows: 'Rows',
      columns: 'Columns',
      missing: 'Missing',
      fields: 'Fields',
      more: (count: number) => `+${count} more`,
    },
    thinking: 'AI Reasoning',
    executeCode: 'Run Code',
    chart: 'Generated Chart',
    error: 'Execution Error',
    toolFallback: 'Tool Call',
    tools: {
      run_code: 'Run Code',
      read_dataset: 'Read Dataset',
      todo_write: 'Update Tasks',
    },
    timeLocale: 'en-US',
  },
} as const

export const reportViewerCopy = {
  zh: {
    waiting: '等待报告生成...',
    title: '分析报告',
    copied: '已复制',
    copy: '复制',
    download: '下载',
    charts: (count: number) => `生成的图表 (${count})`,
    task: '任务',
    echartsError: (error: unknown) => `ECharts 配置解析错误: ${error}`,
    mermaidError: (error: unknown) => `Mermaid 图表渲染错误: ${error}`,
  },
  en: {
    waiting: 'Waiting for the report...',
    title: 'Analysis Report',
    copied: 'Copied',
    copy: 'Copy',
    download: 'Download',
    charts: (count: number) => `Generated Charts (${count})`,
    task: 'Task',
    echartsError: (error: unknown) => `ECharts config parse error: ${error}`,
    mermaidError: (error: unknown) => `Mermaid render error: ${error}`,
  },
} as const

export const codeBlockCopy = {
  zh: {
    copied: '已复制',
    copy: '复制',
  },
  en: {
    copied: 'Copied',
    copy: 'Copy',
  },
} as const