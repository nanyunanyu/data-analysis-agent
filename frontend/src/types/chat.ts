export type ConversationStatus = 'new' | 'uploading' | 'analyzing' | 'ready' | 'error' | 'stopped'

export interface ChatImage {
  task_id: number
  task_name: string
  image_base64: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  images?: ChatImage[]
  isStreaming?: boolean
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  /** backend session id for the uploaded dataset (used for follow-up questions) */
  datasetSessionId: string | null
  datasetName: string | null
  status: ConversationStatus
}
