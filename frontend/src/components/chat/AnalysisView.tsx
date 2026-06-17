import { useState } from 'react'
import { LayoutList, Brain, StopCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { TaskList } from '../TaskList'
import { AgentProcess } from '../AgentProcess'
import { cn } from '@/lib/utils'
import type { AnalysisState } from '@/hooks/useMultiAnalysis'
import type { Locale } from '@/lib/i18n'

interface AnalysisViewProps {
  state: AnalysisState
  sessionId: string
  locale: Locale
  onStop: () => void
}

export function AnalysisView({ state, sessionId: _sessionId, locale, onStop }: AnalysisViewProps) {
  const [tab, setTab] = useState<'tasks' | 'process'>('process')
  const isRunning = state.status === 'analyzing'

  const label = locale === 'zh'
    ? { tasks: '任务列表', process: '执行过程', stop: '停止分析' }
    : { tasks: 'Tasks', process: 'Process', stop: 'Stop' }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-primary/20 bg-primary/10">
        <div className="flex gap-1">
          {(['tasks', 'process'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors',
                tab === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'tasks' ? <LayoutList className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
              {label[t]}
            </button>
          ))}
        </div>
        {isRunning && (
          <Button variant="destructive" size="sm" onClick={onStop} className="ml-auto h-6 text-xs px-2">
            <StopCircle className="w-3 h-3 mr-1" />
            {label.stop}
          </Button>
        )}
      </div>

      <div className="p-4 max-h-[600px] overflow-y-auto">
        {tab === 'tasks' ? (
          <TaskList
            locale={locale}
            tasks={state.tasks}
            currentTaskId={state.currentTaskId}
            planningStatus={state.planningStatus}
          />
        ) : (
          <AgentProcess
            locale={locale}
            events={state.events}
            isConnected={state.isConnected}
          />
        )}
      </div>
    </div>
  )
}
