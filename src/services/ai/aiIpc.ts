import OpenAI from 'openai'
import { Ollama } from 'ollama'
import type { AIMessage } from '@/types'

let openaiClient: OpenAI | null = null
let ollamaClient: Ollama | null = null
let openGatewayClient: OpenAI | null = null
let openGatewayModel: string = 'mimo-v2-pro'

export function initializeAI(config: { openaiApiKey?: string; ollamaHost?: string; openGatewayKey?: string; openGatewayUrl?: string; openGatewayModel?: string }) {
  if (config.openaiApiKey) {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey })
  }
  if (config.ollamaHost) {
    ollamaClient = new Ollama({ host: config.ollamaHost })
  }
  if (config.openGatewayKey) {
    openGatewayClient = new OpenAI({
      apiKey: config.openGatewayKey,
      baseURL: config.openGatewayUrl || 'https://opengateway.gitlawb.com/v1',
    })
    if (config.openGatewayModel) {
      openGatewayModel = config.openGatewayModel
    }
  }
}

export async function aiChat(messages: AIMessage[]): Promise<string> {
  if (openGatewayClient) {
    const completion = await openGatewayClient.chat.completions.create({
      model: openGatewayModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      max_tokens: 2000,
    })
    return completion.choices[0]?.message?.content || 'No response'
  }

  if (openaiClient) {
    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      max_tokens: 2000,
    })
    return completion.choices[0]?.message?.content || 'No response'
  }

  if (ollamaClient) {
    const response = await ollamaClient.chat({
      model: 'llama2',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
    })
    return response.message.content
  }

  throw new Error('No AI service available')
}

export async function aiStream(
  messages: AIMessage[],
  onChunk: (chunk: string) => void
): Promise<void> {
  if (openGatewayClient) {
    const stream = await openGatewayClient.chat.completions.create({
      model: openGatewayModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: 0.7,
    })
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) onChunk(content)
    }
    return
  }

  if (openaiClient) {
    const stream = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: 0.7,
    })
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) onChunk(content)
    }
    return
  }

  if (ollamaClient) {
    const response = await ollamaClient.chat({
      model: 'llama2',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
    })
    for await (const chunk of response) {
      if (chunk.message?.content) onChunk(chunk.message.content)
    }
    return
  }

  throw new Error('No AI service available')
}
