import { useState, useCallback, useMemo, useEffect } from 'react'
import { 
  Sparkles, 
  Upload, 
  Brain, 
  FileText, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  StopCircle,
  LayoutList,
  FileBarChart,
  Languages,
  Moon,
  Sun
} from 'lucide-react'
import { Button } from './components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/Card'
import { FileUpload } from './components/FileUpload'
import { TaskList, Task } from './components/TaskList'
import { AgentProcess } from './components/AgentProcess'
import { ReportViewer } from './components/ReportViewer'
import { useWebSocket, AgentEvent } from './hooks/useWebSocket'
import { cn } from './lib/utils'
import { appCopy, type Locale } from './lib/i18n'

type AppState = 'idle' | 'uploading' | 'processing' | 'completed' | 'stopped' | 'error'
type RightPanelTab = 'process' | 'report'
type ThemeMode = 'light' | 'dark'

interface AnalysisResult {
  report: string
  images: Array<{
    task_id: number
    task_name: string
    image_base64: string
  }>
}

function App() {
  // 状态
  const [appState, setAppState] = useState<AppState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [userRequest, setUserRequest] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentTaskId, setCurrentTaskId] = useState<number | undefined>()
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // 新增状态
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('process')
  const [selectedTaskId, setSelectedTaskId] = useState<number | 'planning'>('planning')
  const [planningStatus, setPlanningStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending')
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light'
    return window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  })
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'zh'
    return window.localStorage.getItem('locale') === 'en' ? 'en' : 'zh'
  })
  const copy = appCopy[locale]

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    window.localStorage.setItem('locale', locale)
  }, [locale])

  // 计算 planningStatus：根据事件判断规划阶段的状态
  const computePlanningStatus = useCallback((events: AgentEvent[]): 'pending' | 'in_progress' | 'completed' => {
    // 检查是否有任务列表创建事件（第一次 tasks_updated with source=tool）
    const hasTasksCreated = events.some(e => 
      e.type === 'tasks_updated' && e.payload.source === 'tool'
    )
    
    if (hasTasksCreated) return 'completed'
    
    // 检查是否已开始（有任何事件）
    const hasStarted = events.some(e => 
      e.type === 'data_explored' || e.type === 'llm_streaming' || e.type === 'llm_thinking'
    )
    
    if (hasStarted) return 'in_progress'
    
    return 'pending'
  }, [])

  // WebSocket 事件处理
  const handleEvent = useCallback((event: AgentEvent) => {
    const { type, payload } = event

    // 记录状态变更
    console.log(`[App] 处理事件: ${type}`)

    switch (type) {
      case 'connected':
        console.log('[App] ✅ WebSocket 连接确认')
        setPlanningStatus('in_progress')
        break

      case 'tasks_planned':
        const plannedTasks = (payload.tasks as Task[]) || []
        console.log(`[App] 📋 收到任务规划: ${plannedTasks.length} 个任务`)
        plannedTasks.forEach((t, i) => console.log(`[App]   ${i + 1}. ${t.name}`))
        setTasks(plannedTasks)
        break

      case 'tasks_updated':
        // 自主循环模式：LLM 自主更新任务状态
        const updatedTasks = (payload.tasks as Task[]) || []
        console.log(`[App] 🔄 任务状态更新 (来源: ${payload.source}): ${updatedTasks.length} 个任务`)
        updatedTasks.forEach(t => console.log(`[App]   ${t.status === 'completed' ? '✅' : '⏳'} ${t.name}`))
        
        // 标记规划阶段完成
        if (payload.source === 'tool') {
          setPlanningStatus('completed')
        }
        
        if (payload.source === 'llm') {
          // LLM 自主更新的任务状态：合并更新
          setTasks(prevTasks => {
            if (prevTasks.length === 0) {
              // 如果没有之前的任务，直接使用新任务
              return updatedTasks.map(t => ({
                ...t,
                status: t.status as Task['status']
              }))
            }
            // 合并更新：保留原有任务信息，更新状态
            return updatedTasks.map((newTask, index) => ({
              ...(prevTasks[index] || {}),
              ...newTask,
              status: newTask.status as Task['status']
            }))
          })
        } else {
          setTasks(updatedTasks)
        }
        
        // 更新当前任务ID（找到 in_progress 的任务）
        const inProgressTask = updatedTasks.find(t => t.status === 'in_progress')
        if (inProgressTask) {
          setCurrentTaskId(inProgressTask.id as number)
          setSelectedTaskId(inProgressTask.id as number)
        }
        break

      case 'task_started':
        console.log(`[App] ▶️ 任务开始: #${payload.task_id} ${payload.task_name}`)
        setCurrentTaskId(payload.task_id as number)
        setSelectedTaskId(payload.task_id as number)
        setTasks(prev => prev.map(t => 
          t.id === payload.task_id 
            ? { ...t, status: 'in_progress' as const }
            : t
        ))
        break

      case 'task_completed':
        console.log(`[App] ✅ 任务完成: #${payload.task_id} ${payload.task_name}`)
        // 任务完成时清除错误状态
        setTasks(prev => prev.map(t => 
          t.id === payload.task_id 
            ? { ...t, status: 'completed' as const, error: undefined }
            : t
        ))
        break

      case 'task_failed':
        console.log(`[App] ❌ 任务失败: #${payload.task_id} ${payload.task_name}`)
        console.log(`[App]    错误: ${payload.error}`)
        setTasks(prev => prev.map(t => 
          t.id === payload.task_id 
            ? { ...t, status: 'failed' as const, error: payload.error as string }
            : t
        ))
        break

      case 'image_generated':
        console.log(`[App] 🖼️ 收到图表: 任务 #${payload.task_id}`)
        setResult(prev => ({
          report: prev?.report || '',
          images: [
            ...(prev?.images || []),
            {
              task_id: payload.task_id as number,
              task_name: payload.task_name as string || `Task ${payload.task_id}`,
              image_base64: payload.image_base64 as string,
            }
          ]
        }))
        break

      case 'report_generated':
        console.log(`[App] 📝 收到报告: ${(payload.report as string)?.length || 0} 字符`)
        setResult(prev => ({
          ...prev,
          report: payload.report as string,
          images: prev?.images || []
        }))
        break

      case 'agent_completed':
        console.log('[App] 🎉 Agent 执行完成!')
        setAppState('completed')
        setCurrentTaskId(undefined)
        // 检查是否因达到迭代上限而结束
        if (payload.reached_max_iterations) {
          console.warn(`[App] ⚠️ 达到最大迭代次数，${payload.incomplete_tasks_count} 个任务未完成`)
          setError(copy.error.maxIterations(payload.incomplete_tasks_count))
        }
        // 自动切换到报告 Tab
        setRightPanelTab('report')
        if (payload.final_report) {
          setResult(prev => ({
            report: payload.final_report as string,
            images: (payload.images as AnalysisResult['images']) || prev?.images || []
          }))
        }
        break

      case 'agent_warning':
        console.warn('[App] ⚠️ Agent 警告:', payload.warning)
        setError(payload.warning as string)
        break

      case 'agent_error':
        console.error('[App] 💥 Agent 错误:', payload.error)
        setAppState('error')
        setError(payload.error as string)
        break

      case 'agent_stopped':
        console.log('[App] ⏹️ Agent 已停止')
        setAppState('stopped')
        break

      case 'phase_change':
        console.log(`[App] 📍 阶段变更: ${payload.phase}`)
        break

      case 'tool_call':
        console.log(`[App] 🔧 工具调用: ${payload.tool}`)
        break

      case 'tool_result':
        console.log(`[App] 📊 工具结果: ${payload.tool} - ${payload.status}`)
        break

      case 'log':
        console.log(`[App] 📝 日志: ${payload.message}`)
        break

      default:
        console.log(`[App] 未处理事件类型: ${type}`)
    }
  }, [copy])
  const { isConnected, events, clearEvents } = useWebSocket(sessionId, {
    onEvent: handleEvent,
    onConnect: () => {
      console.log('[App] 🟢 WebSocket 已连接')
    },
    onDisconnect: () => {
      console.log('[App] 🔴 WebSocket 已断开')
    },
    onError: (error) => {
      console.error('[App] ⚠️ WebSocket 错误:', error)
    }
  })

  // 开始分析
  const handleStartAnalysis = async () => {
    if (!selectedFile || !userRequest.trim()) return

    console.log('========================================')
    console.log('[App] 开始分析流程')
    console.log('[App] 文件:', selectedFile.name, '大小:', selectedFile.size)
    console.log('[App] 需求:', userRequest.slice(0, 100))
    console.log('========================================')

    setAppState('uploading')
    setError(null)
    setResult(null)
    setTasks([])
    setRightPanelTab('process')
    setSelectedTaskId('planning')
    setPlanningStatus('pending')
    clearEvents()

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('user_request', userRequest)

    try {
      console.log('[App] 📤 调用 /api/start...')
      const startTime = Date.now()
      
      const response = await fetch('/api/start', {
        method: 'POST',
        body: formData,
      })

      const apiDuration = Date.now() - startTime
      console.log(`[App] API 响应耗时: ${apiDuration}ms`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `${copy.error.server}: ${response.status}`)
      }

      const data = await response.json()
      console.log('[App] ✅ API 响应:', data)

      if (data.session_id) {
        console.log('[App] 🔗 准备连接 WebSocket, session:', data.session_id)
        // 先设置 processing 状态，然后设置 sessionId 触发 WebSocket 连接
        setAppState('processing')
        // 使用 setTimeout 确保状态更新后再设置 sessionId
        // 这样可以确保 UI 先切换到 processing 状态
        setTimeout(() => {
          console.log('[App] 🔌 触发 WebSocket 连接')
          setSessionId(data.session_id)
        }, 50)
      } else {
        throw new Error(copy.error.missingSession)
      }
    } catch (e) {
      console.error('[App] ❌ 启动分析失败:', e)
      setAppState('error')
      if (e instanceof TypeError && e.message.includes('fetch')) {
        setError(copy.error.backendOffline)
      } else {
        setError(e instanceof Error ? e.message : copy.error.unknown)
      }
    }
  }

  // 停止分析
  const handleStopAnalysis = async () => {
    if (!sessionId) return
    
    console.log('[App] ⏹️ 请求停止分析...')
    
    try {
      const response = await fetch(`/api/stop/${sessionId}`, {
        method: 'POST',
      })
      
      if (response.ok) {
        console.log('[App] ✅ 停止请求已发送')
        setAppState('stopped')
      } else {
        console.error('[App] ❌ 停止请求失败')
      }
    } catch (e) {
      console.error('[App] ❌ 停止请求出错:', e)
    }
  }

  // 重置
  const handleReset = () => {
    setAppState('idle')
    setSelectedFile(null)
    setUserRequest('')
    setSessionId(null)
    setTasks([])
    setCurrentTaskId(undefined)
    setResult(null)
    setError(null)
    setRightPanelTab('process')
    setSelectedTaskId('planning')
    setPlanningStatus('pending')
    clearEvents()
  }

  // 处理任务点击
  const handleTaskClick = useCallback((taskId: number | 'planning') => {
    setSelectedTaskId(taskId)
  }, [])

  // 实际的 planningStatus 应该根据事件动态计算
  const actualPlanningStatus = useMemo(() => {
    if (appState === 'idle' || appState === 'uploading') return 'pending'
    if (events.length === 0) return planningStatus
    return computePlanningStatus(events)
  }, [appState, events, planningStatus, computePlanningStatus])
  const isDarkTheme = theme === 'dark'
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  const toggleLocale = () => setLocale(prev => prev === 'zh' ? 'en' : 'zh')

  return (
    <div className="min-h-screen gradient-bg">
      {/* 头部 */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 shadow-sm shadow-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal text-foreground">
                {copy.appName}
              </h1>
              <p className="text-xs text-muted-foreground">
                {copy.tagline}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLocale}
              aria-label={copy.controls.language}
              title={copy.controls.language}
            >
              <Languages className="mr-2 h-4 w-4" />
              {locale === 'zh' ? copy.controls.chinese : copy.controls.english}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              aria-label={isDarkTheme ? copy.controls.light : copy.controls.dark}
              title={isDarkTheme ? copy.controls.light : copy.controls.dark}
            >
              {isDarkTheme ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {isDarkTheme ? copy.controls.light : copy.controls.dark}
            </Button>

            {/* 停止分析按钮 */}
            {appState === 'processing' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopAnalysis}
              >
                <StopCircle className="mr-2 h-4 w-4" />
                {copy.actions.stop}
              </Button>
            )}
            
            {/* 连接状态 */}
            {sessionId && (
              <div className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
                isConnected 
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              )}>
                {isConnected ? (
                  <><Wifi className="h-3 w-3" /> {copy.connection.connected}</>
                ) : (
                  <><WifiOff className="h-3 w-3" /> {copy.connection.connecting}</>
                )}
              </div>
            )}
            
            {/* 状态指示 */}
            <StatusBadge state={appState} labels={copy.status} />
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {appState === 'idle' || appState === 'uploading' ? (
          <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
            <div className="mb-8 text-center">
              <h2 className="mb-3 text-3xl font-semibold text-foreground">
                {copy.hero.title}
              </h2>
              <p className="text-muted-foreground">
                {copy.hero.description}
              </p>
            </div>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  {copy.upload.title}
                </CardTitle>
                <CardDescription>
                  {copy.upload.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload
                  locale={locale}
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile}
                  onClear={() => setSelectedFile(null)}
                />
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {copy.request.title}
                </CardTitle>
                <CardDescription>
                  {copy.request.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  placeholder={copy.request.placeholder}
                  className="h-32 w-full resize-none rounded-lg border border-border bg-secondary/30 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full"
              onClick={handleStartAnalysis}
              disabled={!selectedFile || !userRequest.trim() || appState === 'uploading'}
              isLoading={appState === 'uploading'}
            >
              {appState === 'uploading' ? copy.actions.starting : copy.actions.start}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-primary" />
                    {copy.panels.taskPlanning}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskList 
                    locale={locale}
                    tasks={tasks} 
                    currentTaskId={currentTaskId}
                    planningStatus={actualPlanningStatus}
                    onTaskClick={handleTaskClick}
                    selectedTaskId={selectedTaskId}
                  />
                </CardContent>
              </Card>

              {(appState === 'completed' || appState === 'error' || appState === 'stopped') && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleReset}
                >
                  {copy.actions.newAnalysis}
                </Button>
              )}
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div className="flex border-b border-border">
                <button
                  onClick={() => setRightPanelTab('process')}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                    rightPanelTab === 'process'
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutList className="h-4 w-4" />
                  {copy.panels.process}
                </button>
                <button
                  onClick={() => setRightPanelTab('report')}
                  disabled={!result?.report}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                    rightPanelTab === 'report'
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                    !result?.report && "cursor-not-allowed opacity-50"
                  )}
                >
                  <FileBarChart className="h-4 w-4" />
                  {copy.panels.report}
                  {result?.report && (
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                      {copy.panels.completed}
                    </span>
                  )}
                </button>
              </div>

              {rightPanelTab === 'process' ? (
                <Card className="glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Brain className="h-4 w-4 text-primary" />
                      {copy.panels.agentProcess}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AgentProcess 
                      locale={locale}
                      events={events} 
                      isConnected={isConnected}
                      currentTaskId={selectedTaskId}
                      onTaskClick={handleTaskClick}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass">
                  <CardContent className="pt-6">
                    <ReportViewer locale={locale} report={result?.report || ''} images={result?.images} />
                  </CardContent>
                </Card>
              )}

              {error && (
                <Card className="border-destructive/50 bg-destructive/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">{copy.error.title}</p>
                        <p className="mt-1 text-sm text-destructive/80">{error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {appState === 'stopped' && (
                <Card className="border-amber-500/50 bg-amber-500/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <StopCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                      <div>
                        <p className="font-medium text-amber-600 dark:text-amber-300">{copy.stopped.title}</p>
                        <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-200/80">
                          {copy.stopped.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="mt-16 border-t border-border/50 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-muted-foreground">
          <p>{copy.footer}</p>
        </div>
      </footer>
    </div>
  )
}

// 状态徽章组件
function StatusBadge({ state, labels }: { state: AppState; labels: Readonly<Record<AppState, string>> }) {
  const config: Record<AppState, { icon: typeof Loader2 | null; className: string; animate: boolean }> = {
    idle: { icon: null, className: 'bg-secondary text-muted-foreground', animate: false },
    uploading: { icon: Loader2, className: 'bg-primary/20 text-primary', animate: true },
    processing: { icon: Brain, className: 'bg-primary/20 text-primary', animate: true },
    completed: { icon: CheckCircle, className: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', animate: false },
    stopped: { icon: StopCircle, className: 'bg-amber-500/20 text-amber-700 dark:text-amber-300', animate: false },
    error: { icon: AlertCircle, className: 'bg-destructive/20 text-destructive', animate: false },
  }

  const { icon: Icon, className, animate } = config[state]

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
      className
    )}>
      {Icon && <Icon className={cn("h-3 w-3", animate && "animate-spin")} />}
      {labels[state]}
    </div>
  )
}

export default App
