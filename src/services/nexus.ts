/// <reference types="vite/client" />

import { CoreIntelligence } from './core/CoreIntelligence'

let instance: CoreIntelligence | null = null

export function getNexus(): CoreIntelligence {
  if (!instance) {
    instance = new CoreIntelligence({
      openaiModel: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4',
      ollamaHost: import.meta.env.VITE_OLLAMA_HOST || 'http://localhost:11434',
      enableBackgroundLearning: import.meta.env.VITE_ENABLE_BACKGROUND_LEARNING === 'true',
    })
  }
  return instance
}

export async function sendMessage(input: string) {
  const nexus = getNexus()
  return await nexus.process(input, 'chat')
}

export async function sendMessageStream(
  input: string,
  onChunk: (chunk: string) => void
) {
  const nexus = getNexus()
  return await nexus.processStream(input, onChunk)
}

export async function getNexusStatus() {
  try {
    const nexus = getNexus()
    return await nexus.getStatus()
  } catch {
    return {
      thoughts: 0,
      actions: 0,
      memories: 0,
      knowledgeNodes: 0,
      lastReflection: null,
    }
  }
}
