import { useState, useCallback, useEffect } from 'react'
import { Brain, Moon, Sun, Languages } from 'lucide-react'
import { Button } from './components/ui/Button'
import { Sidebar } from './components/chat/Sidebar'
import { ChatArea } from './components/chat/ChatArea'
import { useConversationStore } from './store/useConversationStore'
import { useMultiAnalysis } from './hooks/useMultiAnalysis'
import type { Locale } from './lib/i18n'
import type { ChatMessage } from './types/chat'

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

      // Connect WebSocket and listen for events
      multi.connect(convId, sessionId)

      // Watch for completion and persist the report as a message
      const poll = setInterval(() => {
        const state = multi.statesRef.current[convId]
        if (!state) return
        if (state.status === 'completed' || state.status === 'error' || state.status === 'stopped') {
          clearInterval(poll)
          const newStatus = state.status === 'completed' ? 'ready' : state.status
          if (state.status === 'completed' && state.report) {
            const assistantMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: state.report,
              timestamp: Date.now(),
              images: state.images,
            }
            store.addMessage(convId, assistantMsg)
          }
          store.updateConversation(convId, { status: newStatus as 'ready' | 'error' | 'stopped' })
        }
      }, 500)
    } catch (e) {
      store.updateConversation(convId, { status: 'error' })
    }
  }, [store, multi])

  const handleFollowUp = useCallback(async (convId: string, question: string) => {
    const conv = store.conversations.find(c => c.id === convId)
    if (!conv?.datasetSessionId) return

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: question, timestamp: Date.now() }
    store.addMessage(convId, userMsg)

    // Optimistic streaming placeholder
    const assistantId = crypto.randomUUID()
    const placeholder: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true }
    store.addMessage(convId, placeholder)

    // Get last report for context
    const lastReport = [...conv.messages].reverse().find(m => m.role === 'assistant' && m.content.length > 100)?.content ?? ''

    try {
      const formData = new FormData()
      formData.append('question', question)
      formData.append('previous_report', lastReport)

      const res = await fetch(`/api/chat/${conv.datasetSessionId}`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()

      const chatSessionId: string = data.session_id

      // Connect a temporary WS for the follow-up (use a temp key)
      const tempKey = `chat_${convId}_${Date.now()}`
      multi.connect(tempKey, chatSessionId)

      const poll = setInterval(() => {
        const state = multi.statesRef.current[tempKey]
        if (!state) return
        if (state.status === 'completed' || state.status === 'error') {
          clearInterval(poll)
          multi.disconnect(tempKey)
          multi.clearState(tempKey)
          const answer = state.report || (state.error ? `Error: ${state.error}` : '')
          store.updateLastMessage(convId, { content: answer, isStreaming: false })
        }
      }, 300)
    } catch (e) {
      store.updateLastMessage(convId, {
        content: locale === 'zh' ? '追问失败，请重试。' : 'Failed to get answer. Please try again.',
        isStreaming: false,
      })
    }
  }, [store, multi, locale])

  const handleStop = useCallback(async (convId: string) => {
    const conv = store.conversations.find(c => c.id === convId)
    if (!conv?.datasetSessionId) return
    try {
      await fetch(`/api/stop/${conv.datasetSessionId}`, { method: 'POST' })
    } catch {}
    store.updateConversation(convId, { status: 'stopped' })
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
