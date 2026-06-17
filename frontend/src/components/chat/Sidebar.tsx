import { Plus, MessageSquare, Trash2, Loader2, CheckCircle, AlertCircle, StopCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/chat'

interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  activeAnalysisCount: number
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  locale: 'zh' | 'en'
}

const statusIcon = {
  new: null,
  uploading: <Loader2 className="w-3 h-3 animate-spin text-primary" />,
  analyzing: <Loader2 className="w-3 h-3 animate-spin text-primary" />,
  ready: <CheckCircle className="w-3 h-3 text-green-400" />,
  error: <AlertCircle className="w-3 h-3 text-destructive" />,
  stopped: <StopCircle className="w-3 h-3 text-amber-400" />,
}

export function Sidebar({ conversations, activeId, activeAnalysisCount, onSelect, onCreate, onDelete, locale }: SidebarProps) {
  const canCreate = activeAnalysisCount < 3
  const label = locale === 'zh'
    ? { new: '新对话', limit: '最多同时进行 3 个分析', empty: '暂无对话' }
    : { new: 'New Chat', limit: 'Max 3 concurrent analyses', empty: 'No conversations yet' }

  return (
    <div className="flex flex-col h-full w-60 border-r border-border bg-card/50 shrink-0">
      <div className="p-3 border-b border-border">
        <button
          onClick={onCreate}
          disabled={!canCreate}
          title={!canCreate ? label.limit : label.new}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            canCreate
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-60'
          )}
        >
          <Plus className="w-4 h-4" />
          {label.new}
          {activeAnalysisCount > 0 && (
            <span className="ml-auto text-xs opacity-70">{activeAnalysisCount}/3</span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-8">{label.empty}</p>
        )}
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm',
              activeId === conv.id
                ? 'bg-primary/15 text-foreground'
                : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{conv.title}</span>
            <span className="shrink-0">{statusIcon[conv.status]}</span>
            <button
              onClick={e => {
                e.stopPropagation()
                const msg = locale === 'zh' ? '确定删除这个对话吗？' : 'Delete this conversation?'
                if (window.confirm(msg)) onDelete(conv.id)
              }}
              className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
