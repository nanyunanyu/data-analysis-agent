import { useState, useCallback, useEffect } from 'react'
import type { Conversation, ChatMessage } from '../types/chat'

const STORAGE_KEY = 'data-analysis-conversations'
const MAX_CONVERSATIONS = 30

function load(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function save(conversations: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS)))
  } catch {}
}

export function useConversationStore() {
  const [conversations, setConversations] = useState<Conversation[]>(load)

  const persist = useCallback((updated: Conversation[]) => {
    setConversations(updated)
    save(updated)
  }, [])

  const createConversation = useCallback((): Conversation => {
    const conv: Conversation = {
      id: crypto.randomUUID(),
      title: '新对话',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      datasetSessionId: null,
      datasetName: null,
      status: 'new',
    }
    persist([conv, ...conversations])
    return conv
  }, [conversations, persist])

  const updateConversation = useCallback((id: string, patch: Partial<Conversation>) => {
    setConversations(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)
      save(updated)
      return updated
    })
  }, [])

  const addMessage = useCallback((convId: string, msg: ChatMessage) => {
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id !== convId) return c
        return { ...c, messages: [...c.messages, msg], updatedAt: Date.now() }
      })
      save(updated)
      return updated
    })
  }, [])

  const updateLastMessage = useCallback((convId: string, patch: Partial<ChatMessage>) => {
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id !== convId) return c
        const msgs = [...c.messages]
        if (msgs.length === 0) return c
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch }
        return { ...c, messages: msgs, updatedAt: Date.now() }
      })
      save(updated)
      return updated
    })
  }, [])

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id)
      save(updated)
      return updated
    })
  }, [])

  // Rehydrate: mark stale 'analyzing' conversations as 'error' on load
  useEffect(() => {
    const stale = conversations.filter(c => c.status === 'analyzing' || c.status === 'uploading')
    if (stale.length > 0) {
      setConversations(prev => {
        const updated = prev.map(c =>
          c.status === 'analyzing' || c.status === 'uploading'
            ? { ...c, status: 'error' as const }
            : c
        )
        save(updated)
        return updated
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { conversations, createConversation, updateConversation, addMessage, updateLastMessage, deleteConversation }
}
