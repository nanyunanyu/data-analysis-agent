import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Upload, FileSpreadsheet, X, Loader2, Brain, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '../ui/Button'
import { ReportViewer } from '../ReportViewer'
import { AnalysisView } from './AnalysisView'
import { cn } from '@/lib/utils'
import type { Conversation, ChatMessage } from '@/types/chat'
import type { AnalysisState } from '@/hooks/useMultiAnalysis'
import type { Locale } from '@/lib/i18n'

interface ChatAreaProps {
  conversation: Conversation | null
  analysisState: AnalysisState | null
  locale: Locale
  onStartAnalysis: (convId: string, file: File, request: string) => Promise<void>
  onFollowUp: (convId: string, question: string) => Promise<void>
  onStop: (convId: string) => void
}

export function ChatArea({ conversation, analysisState, locale, onStartAnalysis, onFollowUp, onStop }: ChatAreaProps) {
  const [file, setFile] = useState<File | null>(null)
  const [input, setInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isNew = !conversation || conversation.status === 'new'
  const isAnalyzing = conversation?.status === 'analyzing' || conversation?.status === 'uploading'
  const isReady = conversation?.status === 'ready' || conversation?.status === 'stopped'
  const isError = conversation?.status === 'error'
  const hasMessages = (conversation?.messages.length ?? 0) > 0

  const zh = locale === 'zh'
  const t = {
    placeholder: isNew
      ? (zh ? '描述您的分析需求...' : 'Describe your analysis request...')
      : (zh ? '继续追问...' : 'Ask a follow-up question...'),
    uploadHint: zh ? '先上传数据文件，然后描述分析需求' : 'Upload a data file and describe what to analyze',
    startBtn: zh ? '开始分析' : 'Start Analysis',
    sendBtn: zh ? '发送' : 'Send',
    dragHint: zh ? '拖放文件到这里' : 'Drop file here',
    chooseFile: zh ? '选择文件' : 'Choose file',
    welcome: zh ? '上传数据，开始智能分析' : 'Upload data to start AI analysis',
    welcomeSub: zh ? '支持 Excel (.xlsx, .xls) 和 CSV 格式' : 'Supports Excel (.xlsx, .xls) and CSV',
    error: zh ? '分析出错' : 'Analysis error',
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages.length, analysisState?.status])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }, [])

  const handleSend = async () => {
    if (!conversation || !input.trim()) return
    const text = input.trim()
    setInput('')

    if (isNew) {
      if (!file) return
      await onStartAnalysis(conversation.id, file, text)
      setFile(null)
    } else if (isReady) {
      await onFollowUp(conversation.id, text)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = isNew ? (!!file && !!input.trim()) : (isReady && !!input.trim())

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">{zh ? '选择或创建一个对话' : 'Select or create a conversation'}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasMessages && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
            <Brain className="w-12 h-12 opacity-30" />
            <p className="font-medium text-foreground">{t.welcome}</p>
            <p className="text-sm">{t.welcomeSub}</p>
          </div>
        )}

        {conversation.messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} locale={locale} />
        ))}

        {/* Analysis in progress */}
        {isAnalyzing && analysisState && (
          <div className="-mx-4">
            <AnalysisView
              state={analysisState}
              sessionId={conversation.datasetSessionId ?? ''}
              locale={locale}
              onStop={() => onStop(conversation.id)}
            />
          </div>
        )}

        {isError && !hasMessages && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {t.error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border p-3 space-y-2">
        {/* File drop zone (only for new conversations) */}
        {isNew && (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={cn(
              'relative rounded-lg border-2 border-dashed transition-colors',
              isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
              file ? 'p-2' : 'p-3 cursor-pointer'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1 truncate text-foreground">{file.name}</span>
                <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Upload className="w-4 h-4 shrink-0" />
                <span>{isDragging ? t.dragHint : t.uploadHint}</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="ml-auto text-primary hover:underline text-xs whitespace-nowrap"
                >
                  {t.chooseFile}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Text input + send */}
        {!isAnalyzing && (
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[38px] max-h-32"
              style={{ height: 'auto' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 128) + 'px'
              }}
            />
            <Button size="sm" onClick={handleSend} disabled={!canSend} className="self-end h-[38px]">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {zh ? 'Agent 分析中，完成后可继续追问...' : 'Analyzing... you can ask follow-ups once done.'}
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message, locale }: { message: ChatMessage; locale: Locale }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground text-sm">
          {message.content}
        </div>
      </div>
    )
  }

  // Assistant message — could be a full report or a short answer
  const isReport = message.content.length > 500 || message.images?.length

  if (isReport) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <ReportViewer
          locale={locale}
          report={message.content}
          images={message.images}
        />
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-2.5 text-sm">
        {message.isStreaming ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{locale === 'zh' ? '思考中...' : 'Thinking...'}</span>
          </div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm dark:prose-invert max-w-none">
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
