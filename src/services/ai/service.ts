import type { AIMessage, AIService } from '@/types'

export class HybridAIService implements AIService {
  constructor(_config?: { openaiApiKey?: string; openaiModel?: string; ollamaHost?: string }) {
    // Config no longer needed in renderer — main process handles AI routing
  }

  async chat(messages: AIMessage[]): Promise<string> {
    const result = await window.electron.ai.chat(messages)
    if (!result.success) {
      throw new Error(result.error || 'AI chat failed')
    }
    return result.result!
  }

  async stream(messages: AIMessage[], onChunk: (chunk: string) => void): Promise<void> {
    const cleanup: Array<() => void> = []

    const streamPromise = new Promise<void>((resolve, reject) => {
      cleanup.push(
        window.electron.ai.onStreamChunk(onChunk)
      )
      cleanup.push(
        window.electron.ai.onStreamEnd(() => {
          cleanup.forEach(fn => fn())
          resolve()
        })
      )
      cleanup.push(
        window.electron.ai.onStreamError((error) => {
          cleanup.forEach(fn => fn())
          reject(new Error(error))
        })
      )
    })

    const result = await window.electron.ai.stream(messages)
    if (!result.success) {
      cleanup.forEach(fn => fn())
      throw new Error(result.error || 'AI stream failed')
    }

    return streamPromise
  }
}
