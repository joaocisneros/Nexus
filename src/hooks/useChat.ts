import { useChatStore } from '@/store/chatStore'
import { sendMessageStream } from '@/services/nexus'
import { toast } from 'sonner'

export function useChat() {
  const { addMessage, setTyping, setStreaming, appendStreamChunk, isTyping, isStreaming, streamingContent } = useChatStore()

  const send = async (message: string) => {
    addMessage({ role: 'user', content: message, type: 'text' })
    setTyping(true)
    setStreaming(true)

    try {
      const response = await sendMessageStream(message, (chunk) => {
        appendStreamChunk(chunk)
      })

      // Finalize: add the complete message
      setStreaming(false)
      addMessage({ role: 'ai', content: response.result, type: 'text' })
    } catch {
      setStreaming(false)
      toast.error('Error al procesar tu mensaje')
      addMessage({
        role: 'ai',
        content: 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.',
        type: 'text',
      })
    } finally {
      setTyping(false)
    }
  }

  return { send, isTyping, isStreaming, streamingContent }
}
