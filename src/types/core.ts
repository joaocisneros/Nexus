export interface CoreConfig {
  openaiApiKey?: string
  openaiModel?: string
  ollamaHost?: string
  memoryPath?: string
  enableBackgroundLearning?: boolean
}

export interface Thought {
  id: string
  type: 'reasoning' | 'decision' | 'learning' | 'planning'
  content: string
  timestamp: Date
  confidence: number
  context: unknown
}

export interface Action {
  id: string
  type: 'chat' | 'command' | 'analysis' | 'memorize' | 'create' | 'optimize'
  input: unknown
  output: unknown
  timestamp: Date
  success: boolean
}
