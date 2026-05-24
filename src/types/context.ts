import type { Memory } from './memory'

export interface ContextResult {
  relevantMemories: Memory[]
  keywords: string[]
  type: 'chat' | 'analysis' | 'code' | 'search' | 'command'
  summary: string
}
