import { useState, useRef, useCallback } from 'react'
import type { AgentEvent } from './useWebSocket'
import type { Task } from '../components/TaskList'
import type { ChatImage } from '../types/chat'

export interface AnalysisState {
  status: 'analyzing' | 'completed' | 'error' | 'stopped'
  events: AgentEvent[]
  tasks: Task[]
  currentTaskId?: number
  planningStatus: 'pending' | 'in_progress' | 'completed'
  report: string
  images: ChatImage[]
  error?: string
  isConnected: boolean
}

const initialState = (): AnalysisState => ({
  status: 'analyzing',
  events: [],
  tasks: [],
  planningStatus: 'pending',
  report: '',
  images: [],
  isConnected: false,
})

export function useMultiAnalysis() {
  const [states, setStates] = useState<Record<string, AnalysisState>>({})
  const statesRef = useRef<Record<string, AnalysisState>>({})
  statesRef.current = states
  const wsRef = useRef<Map<string, WebSocket>>(new Map())
  const heartbeatRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  const activeCount = Object.values(states).filter(s => s.status === 'analyzing').length

  const update = useCallback((convId: string, patch: Partial<AnalysisState> | ((prev: AnalysisState) => Partial<AnalysisState>)) => {
    setStates(prev => {
      const current = prev[convId] ?? initialState()
      const delta = typeof patch === 'function' ? patch(current) : patch
      return { ...prev, [convId]: { ...current, ...delta } }
    })
  }, [])

  const handleEvent = useCallback((convId: string, event: AgentEvent) => {
    const { type, payload } = event

    update(convId, prev => {
      const next: Partial<AnalysisState> = {
        events: [...prev.events, event],
      }

      switch (type) {
        case 'connected':
          return { ...next, isConnected: true, planningStatus: 'in_progress' }

        case 'tasks_planned':
          return { ...next, tasks: (payload.tasks as Task[]) || [] }

        case 'tasks_updated': {
          const updatedTasks = (payload.tasks as Task[]) || []
          if (payload.source === 'tool') next.planningStatus = 'completed'
          const inProgress = updatedTasks.find(t => t.status === 'in_progress')
          if (inProgress) next.currentTaskId = inProgress.id as number
          if (payload.source === 'llm') {
            next.tasks = updatedTasks.map((t, i) => ({ ...(prev.tasks[i] || {}), ...t, status: t.status as Task['status'] }))
          } else {
            next.tasks = updatedTasks
          }
          return next
        }

        case 'task_started':
          return {
            ...next,
            currentTaskId: payload.task_id as number,
            tasks: prev.tasks.map(t => t.id === payload.task_id ? { ...t, status: 'in_progress' as const } : t),
          }

        case 'task_completed':
          return {
            ...next,
            tasks: prev.tasks.map(t => t.id === payload.task_id ? { ...t, status: 'completed' as const, error: undefined } : t),
          }

        case 'task_failed':
          return {
            ...next,
            tasks: prev.tasks.map(t => t.id === payload.task_id ? { ...t, status: 'failed' as const, error: payload.error as string } : t),
          }

        case 'image_generated':
          return {
            ...next,
            images: [...prev.images, {
              task_id: payload.task_id as number,
              task_name: (payload.task_name as string) || `Task ${payload.task_id}`,
              image_base64: payload.image_base64 as string,
            }],
          }

        case 'report_generated':
          return { ...next, report: payload.report as string }

        case 'agent_completed':
          return {
            ...next,
            status: 'completed',
            currentTaskId: undefined,
            report: (payload.final_report as string) || prev.report,
            images: (payload.images as ChatImage[]) || prev.images,
          }

        case 'agent_stopped':
          return { ...next, status: 'stopped' }

        case 'agent_error':
          return { ...next, status: 'error', error: payload.error as string }

        default:
          return next
      }
    })
  }, [update])

  const connect = useCallback((convId: string, sessionId: string) => {
    if (wsRef.current.has(convId)) return

    setStates(prev => ({ ...prev, [convId]: initialState() }))

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/${sessionId}`)
    wsRef.current.set(convId, ws)

    ws.onopen = () => {
      update(convId, { isConnected: true })
      const hb = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 25000)
      heartbeatRef.current.set(convId, hb)
    }

    ws.onmessage = (e) => {
      try {
        const data: AgentEvent = JSON.parse(e.data)
        if (data.type !== 'heartbeat' && data.type !== 'pong') {
          handleEvent(convId, data)
        }
      } catch {}
    }

    ws.onclose = () => {
      wsRef.current.delete(convId)
      const hb = heartbeatRef.current.get(convId)
      if (hb) { clearInterval(hb); heartbeatRef.current.delete(convId) }
      update(convId, { isConnected: false })
    }

    ws.onerror = () => update(convId, { isConnected: false })
  }, [update, handleEvent])

  const disconnect = useCallback((convId: string) => {
    const ws = wsRef.current.get(convId)
    if (ws) { ws.close(1000, 'done'); wsRef.current.delete(convId) }
    const hb = heartbeatRef.current.get(convId)
    if (hb) { clearInterval(hb); heartbeatRef.current.delete(convId) }
  }, [])

  const clearState = useCallback((convId: string) => {
    setStates(prev => { const n = { ...prev }; delete n[convId]; return n })
  }, [])

  return { states, statesRef, activeCount, connect, disconnect, clearState }
}
