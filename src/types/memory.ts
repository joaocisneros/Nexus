export interface Memory {
  id: string
  type: 'conversation' | 'learning' | 'error' | 'preference' | 'context' | 'web_search' | 'web_content'
  content: string
  importance: number // 1-10
  tags: string[]
  timestamp: Date
}
