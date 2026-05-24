export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIService {
  chat(messages: AIMessage[]): Promise<string>
  stream(messages: AIMessage[], onChunk: (chunk: string) => void): Promise<void>
}
