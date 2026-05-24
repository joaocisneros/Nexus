import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Bot } from 'lucide-react'
import { ChatMessages } from '../components/chat/ChatMessages'
import { ChatInput } from '../components/chat/ChatInput'
import { OsintQuickSearch } from '../components/osint/OsintQuickSearch'
import { useChat } from '@/hooks'
import { useChatStore } from '@/store/chatStore'

interface MainContentProps {
  sidebarOpen: boolean
  onToggleRightPanel: () => void
}

export function MainContent({ sidebarOpen, onToggleRightPanel }: MainContentProps) {
  const { send, isTyping } = useChat()
  const { messages, clearMessages } = useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isTyping])

  const isEmpty = messages.length === 0

  return (
    <motion.div
      initial={{ width: 'calc(100% - 60px)' }}
      animate={{
        width: sidebarOpen ? 'calc(100% - 240px)' : 'calc(100% - 60px)'
      }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col h-full"
    >
      {/* Chat header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/50 flex items-center justify-between bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Bot className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">NEXUS</h2>
            <p className="text-xs text-muted-foreground/70">
              {isTyping ? (
                <span className="text-primary/80">Escribiendo...</span>
              ) : (
                'Asistente IA personal'
              )}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearMessages}
            className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground/50"
            title="Limpiar chat"
          >
            <Trash2 className="h-4 w-4" />
          </motion.button>
        )}
      </div>

      {/* Messages area or Welcome */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center px-6 pb-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-md"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <Bot className="h-8 w-8 text-primary/70" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                Hola, soy NEXUS
              </h1>
              <p className="text-sm text-muted-foreground/70 mb-8 leading-relaxed">
                Tu asistente de IA personal. Puedo ayudarte a analizar código, responder preguntas, buscar en internet y más.
              </p>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { title: 'Analizar código', desc: 'Revisa tu proyecto actual' },
                  { title: 'Buscar información', desc: 'Consulta internet' },
                  { title: 'Optimizar funciones', desc: 'Mejora el rendimiento' },
                  { title: 'Documentar', desc: 'Genera documentación' },
                ].map((suggestion, i) => (
                  <motion.button
                    key={suggestion.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i, duration: 0.3 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => send(`Ayúdame a ${suggestion.title.toLowerCase()}`)}
                    className="p-3 rounded-xl bg-card/50 border border-border/40 hover:border-primary/30 hover:bg-card transition-all text-left group"
                  >
                    <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      {suggestion.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {suggestion.desc}
                    </p>
                  </motion.button>
                ))}
              </div>

              {/* OSINT Quick Search */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="mt-6 w-full max-w-lg"
              >
                <OsintQuickSearch onSearch={send} />
              </motion.div>
            </motion.div>
          </div>
        ) : (
          <div className="p-4">
            <ChatMessages />
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 p-4 border-t border-border/50 bg-card/20 backdrop-blur-sm">
        <ChatInput
          onSend={send}
          onToggleRightPanel={onToggleRightPanel}
        />
      </div>
    </motion.div>
  )
}
