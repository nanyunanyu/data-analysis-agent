import React from 'react'
import { CheckCircle, Circle, Loader2, XCircle, SkipForward, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { taskListCopy, type Locale } from '@/lib/i18n'

export interface Task {
  id: number
  name: string
  description?: string
  type?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  code?: string
  error?: string
}

interface TaskListProps {
  tasks: Task[]
  currentTaskId?: number
  planningStatus: 'pending' | 'in_progress' | 'completed'
  onTaskClick?: (taskId: number | 'planning') => void
  selectedTaskId?: number | 'planning'
  locale?: Locale
}

const statusConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  borderColor: string
  animate?: boolean
}> = {
  pending: {
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-secondary',
    borderColor: 'border-border',
  },
  in_progress: {
    icon: Loader2,
    color: 'text-primary',
    bgColor: 'bg-primary/20',
    borderColor: 'border-primary/50',
    animate: true,
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
  },
  failed: {
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/20',
    borderColor: 'border-destructive/30',
  },
  skipped: {
    icon: SkipForward,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
  },
}

export function TaskList({ 
  tasks, 
  currentTaskId, 
  planningStatus, 
  onTaskClick,
  selectedTaskId,
  locale = 'zh'
}: TaskListProps) {
  const text = taskListCopy[locale]
  // 第0步：用户需求分析和任务规划
  const planningConfig = statusConfig[planningStatus]
  const PlanningIcon = planningConfig.icon
  const isPlanningSelected = selectedTaskId === 'planning'
  const isPlanningCurrent = planningStatus === 'in_progress'

  return (
    <div className="space-y-2">
      {/* 第0步：用户需求分析和任务规划 */}
      <div
        onClick={() => onTaskClick?.('planning')}
        className={cn(
          "relative p-3 rounded-lg border transition-all duration-300 cursor-pointer",
          isPlanningSelected
            ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
            : isPlanningCurrent
              ? "border-primary/50 bg-primary/5"
              : planningConfig.borderColor,
          "hover:bg-card/80",
          "animate-slide-up"
        )}
      >
        {/* 连接线 */}
        {tasks.length > 0 && (
          <div className="absolute left-[22px] top-[52px] w-0.5 h-4 bg-border" />
        )}
        
        <div className="flex items-center gap-3">
          {/* 状态图标 */}
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
            planningConfig.bgColor
          )}>
            <PlanningIcon className={cn(
              "w-4 h-4",
              planningConfig.color,
              planningConfig.animate && "animate-spin"
            )} />
          </div>
          
          {/* 任务内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground text-sm">
                {text.planningTitle}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {text.planningDescription}
            </p>
          </div>
          
          {/* 状态标签 */}
          <span className={cn(
            "text-xs px-2 py-0.5 rounded flex-shrink-0",
            planningConfig.bgColor,
            planningConfig.color
          )}>
            {text.status[planningStatus]}
          </span>
        </div>
      </div>

      {/* 任务列表为空时的提示 */}
      {tasks.length === 0 && planningStatus !== 'completed' && (
        <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
          {planningStatus === 'in_progress' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {text.planning}
            </span>
          ) : (
            text.waiting
          )}
        </div>
      )}

      {/* 任务列表 */}
      {tasks.map((task, index) => {
        const config = statusConfig[task.status]
        const Icon = config.icon
        const isCurrent = task.id === currentTaskId
        const isSelected = selectedTaskId === task.id
        
        return (
          <div
            key={task.id}
            onClick={() => onTaskClick?.(task.id)}
            className={cn(
              "relative p-3 rounded-lg border transition-all duration-300 cursor-pointer",
              isSelected
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                : isCurrent 
                  ? "border-primary/50 bg-primary/5" 
                  : config.borderColor,
              "hover:bg-card/80",
              "animate-slide-up"
            )}
            style={{ animationDelay: `${(index + 1) * 50}ms` }}
          >
            {/* 连接线 */}
            {index < tasks.length - 1 && (
              <div className="absolute left-[22px] top-[52px] w-0.5 h-4 bg-border" />
            )}
            
            <div className="flex items-center gap-3">
              {/* 状态图标 */}
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                config.bgColor
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  config.color,
                  config.animate && "animate-spin"
                )} />
              </div>
              
              {/* 任务内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">#{task.id}</span>
                  <span className="font-medium text-foreground text-sm truncate">
                    {task.name}
                  </span>
                  {task.type && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-secondary text-muted-foreground">
                      {text.types[task.type as keyof typeof text.types] || task.type}
                    </span>
                  )}
                </div>
                
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                )}
                
                {task.error && (
                  <p className="mt-1 text-xs text-destructive line-clamp-2">
                    {task.error}
                  </p>
                )}
              </div>
              
              {/* 状态标签 */}
              <span className={cn(
                "text-xs px-2 py-0.5 rounded flex-shrink-0",
                config.bgColor,
                config.color
              )}>
                {text.status[task.status]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
