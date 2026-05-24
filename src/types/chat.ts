export interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: Date
  type?: 'text' | 'code' | 'file'
}
