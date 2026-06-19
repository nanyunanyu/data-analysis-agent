import { useState, useCallback, useEffect, useRef } from 'react'
import { Brain, Moon, Sun, Languages } from 'lucide-react'
import { Button } from './components/ui/Button'
import { Sidebar } from './components/chat/Sidebar'
import { ChatArea } from './components/chat/ChatArea'
import { useConversationStore } from './store/useConversationStore'
import { useMultiAnalysis } from './hooks/useMultiAnalysis'
import type { Locale } from './lib/i18n'
import type { ChatMessage, ChatImage } from './types/chat'

type Theme = 'light' | 'dark'

function App() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme) || 'dark'
  )
  const [locale, setLocale] = useState<Locale>(() =>
    (localStorage.getItem('locale') as Locale) || 'zh'
  )

  const store = useConversationStore()
  const multi = useMultiAnalysis()

  // Tracks the backend session currently *running* for each conversation.
  // For initial analysis this equals datasetSessionId; for a follow-up it is
  // the freshly-created chat session id. Used so "Stop" targets the right one.
  const runningSessionRef = useRef<Record<string, string>>({})

  // Shared watcher: poll a conversation's analysis state until it reaches a
  // terminal status, then persist the report as a chat message. Covers
  // completed / error / stopped, with a hard timeout failsafe so the UI can
  // never get stuck on "思考中" if events are lost or the socket drops.
  const watchCompletion = useCallback((convId: string) => {
    const startedAt = Date.now()
    const MAX_WAIT_MS = 10 * 60 * 1000 // 10 minutes

    const finish = (newStatus: 'ready' | 'error' | 'stopped', report: string, images: ChatImage[] | undefined, errMsg?: string) => {
      clearInterval(poll)
      multi.disconnect(convId)
      const zh = (localStorage.getItem('locale') || 'zh') === 'zh'
      let content = report
      if (!content) {
        if (newStatus === 'error') content = (zh ? '分析出错：' : 'Analysis error: ') + (errMsg || (zh ? '未知错误' : 'unknown error'))
        else if (newStatus === 'stopped') content = zh ? '分析已停止。' : 'Analysis stopped.'
        else content = zh ? '本次未生成报告内容，请换个问法重试。' : 'No report was produced. Please try rephrasing.'
      }
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
        images: images ?? undefined,
      }
      store.addMessage(convId, assistantMsg)
      store.updateConversation(convId, { status: newStatus })
      delete runningSessionRef.current[convId]
      multi.clearState(convId)
    }

    const poll = setInterval(() => {
      const state = multi.statesRef.current[convId]
      // Timeout failsafe — never hang forever
      if (Date.now() - startedAt > MAX_WAIT_MS) {
        finish('error', '', undefined, 'timeout')
        return
      }
      if (!state) return
      if (state.status === 'completed') {
        finish('ready', state.report, state.images)
      } else if (state.status === 'stopped') {
        finish('stopped', state.report, state.images)
      } else if (state.status === 'error') {
        finish('error', state.report, state.images, state.error)
      }
    }, 400)
  }, [multi, store])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('locale', locale)
  }, [locale])

  // Auto-select or auto-create on first load
  useEffect(() => {
    if (store.conversations.length === 0) {
      const conv = store.createConversation()
      setActiveId(conv.id)
    } else if (!activeId) {
      setActiveId(store.conversations[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = useCallback(() => {
    const conv = store.createConversation()
    setActiveId(conv.id)
  }, [store])

  const handleDelete = useCallback((id: string) => {
    multi.disconnect(id)
    multi.clearState(id)
    store.deleteConversation(id)
    if (activeId === id) {
      const remaining = store.conversations.filter(c => c.id !== id)
      if (remaining.length > 0) {
        setActiveId(remaining[0].id)
      } else {
        // Last conversation deleted — create a new one
        const conv = store.createConversation()
        setActiveId(conv.id)
      }
    }
  }, [multi, store, activeId])

  const handleStartAnalysis = useCallback(async (convId: string, file: File, request: string) => {
    store.updateConversation(convId, { status: 'uploading' })

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `📎 **${file.name}**\n\n${request}`,
      timestamp: Date.now(),
    }
    store.addMessage(convId, userMsg)

    // Update title
    const title = request.slice(0, 30) + (request.length > 30 ? '...' : '')
    store.updateConversation(convId, { title, datasetName: file.name })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_request', request)

    try {
      const res = await fetch('/api/start', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.text().catch(() => '')
        throw new Error(err || `Server error ${res.status}`)
      }
      const data = await res.json()
      const sessionId: string = data.session_id

      store.updateConversation(convId, { status: 'analyzing', datasetSessionId: sessionId })
      runningSessionRef.current[convId] = sessionId

      // Ensure no stale connection lingers for this conversation, then connect.
      multi.disconnect(convId)
      multi.clearState(convId)
      multi.connect(convId, sessionId)

      // Watch for completion and persist the report as a message
      watchCompletion(convId)
    } catch (e) {
      store.updateConversation(convId, { status: 'error' })
    }
  }, [store, multi, watchCompletion])

  const handleFollowUp = useCallback(async (convId: string, question: string) => {
    const conv = store.conversations.find(c => c.id === convId)
    if (!conv?.datasetSessionId) return

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: question, timestamp: Date.now() }
    store.addMessage(convId, userMsg)

    // Get last report for context
    const lastReport = [...conv.messages].reverse().find(m => m.role === 'assistant' && m.content.length > 100)?.content ?? ''

    // Switch to analyzing so the live AnalysisView (progress/tasks) shows,
    // exactly like the initial analysis — no more silent "思考中".
    store.updateConversation(convId, { status: 'analyzing' })

    try {
      const formData = new FormData()
      formData.append('question', question)
      formData.append('previous_report', lastReport)

      const res = await fetch(`/api/chat/${conv.datasetSessionId}`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()

      const chatSessionId: string = data.session_id
      runningSessionRef.current[convId] = chatSessionId

      // Reuse the conversation id as the analysis key (clear any stale conn first)
      multi.disconnect(convId)
      multi.clearState(convId)
      multi.connect(convId, chatSessionId)

      watchCompletion(convId)
    } catch (e) {
      store.updateConversation(convId, { status: 'ready' })
      store.addMessage(convId, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: locale === 'zh' ? '追问失败，请重试。' : 'Failed to get answer. Please try again.',
        timestamp: Date.now(),
      })
    }
  }, [store, multi, locale, watchCompletion])

  const handleStop = useCallback(async (convId: string) => {
    const sessionId = runningSessionRef.current[convId]
      ?? store.conversations.find(c => c.id === convId)?.datasetSessionId
    if (!sessionId) return
    try {
      await fetch(`/api/stop/${sessionId}`, { method: 'POST' })
    } catch {}
    // Let the agent_stopped event drive the final state via watchCompletion;
    // do not force 'stopped' here or the report message would be skipped.
  }, [store])

  const activeConv = store.conversations.find(c => c.id === activeId) ?? null
  const activeAnalysisState = activeId ? (multi.states[activeId] ?? null) : null

  return (
    <div className="h-screen flex flex-col gradient-bg">
      {/* Header */}
      <header className="h-12 border-b border-border/70 bg-card/80 backdrop-blur-xl flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            {locale === 'zh' ? '数据分析 Agent' : 'Data Analysis Agent'}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLocale(l => l === 'zh' ? 'en' : 'zh')} className="h-7 px-2">
            <Languages className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="h-7 px-2">
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          conversations={store.conversations}
          activeId={activeId}
          activeAnalysisCount={multi.activeCount}
          onSelect={setActiveId}
          onCreate={handleCreate}
          onDelete={handleDelete}
          locale={locale}
        />
        <ChatArea
          conversation={activeConv}
          analysisState={activeAnalysisState}
          locale={locale}
          onStartAnalysis={handleStartAnalysis}
          onFollowUp={handleFollowUp}
          onStop={handleStop}
        />
      </div>
    </div>
  )
}

export default App
