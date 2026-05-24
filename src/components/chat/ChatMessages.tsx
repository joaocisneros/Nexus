import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/utils/cn'
import { useChatStore } from '@/store/chatStore'

export function ChatMessages() {
  const { messages, isTyping, isStreaming, streamingContent } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isTyping, streamingContent])

  return (
    <div className="space-y-4 px-2">
      <AnimatePresence>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'flex gap-3 items-end',
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mb-6',
                message.role === 'user'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {message.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>

            {/* Message bubble */}
            <div
              className={cn(
                'max-w-[80%] break-words rounded-2xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-primary/10 border border-primary/20 text-foreground'
                  : 'bg-muted/50 border border-border/50 text-foreground'
              )}
            >
              <div className="text-sm leading-relaxed">
                {message.role === 'ai' ? (
                  <div className="prose prose-sm prose-invert max-w-none
                    prose-p:mb-2 prose-p:last:mb-0
                    prose-headings:mb-2 prose-headings:mt-3 prose-headings:text-foreground
                    prose-pre:bg-muted/80 prose-pre:rounded-lg prose-pre:p-3 prose-pre:border prose-pre:border-border/50
                    prose-code:text-primary prose-code:bg-muted/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                    prose-a:text-primary prose-a:underline prose-a:underline-offset-2
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-ul:list-disc prose-ol:list-decimal
                    prose-li:ml-4 prose-li:mb-1
                    prose-blockquote:border-l-primary prose-blockquote:pl-4 prose-blockquote:italic">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">
                    {message.content}
                  </div>
                )}
              </div>
              <div className={cn(
                'text-[10px] mt-2 opacity-50',
                message.role === 'user' ? 'text-right' : 'text-left'
              )}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Streaming response */}
        {isStreaming && streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 items-end"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-6">
              <Bot className="h-4 w-4" />
            </div>
            <div className="max-w-[80%] break-words rounded-2xl px-4 py-3 bg-muted/50 border border-border/50">
              <div className="prose prose-sm prose-invert max-w-none
                prose-p:mb-2 prose-p:last:mb-0
                prose-headings:mb-2 prose-headings:mt-3 prose-headings:text-foreground
                prose-pre:bg-muted/80 prose-pre:rounded-lg prose-pre:p-3 prose-pre:border prose-pre:border-border/50
                prose-code:text-primary prose-code:bg-muted/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                prose-a:text-primary prose-a:underline prose-a:underline-offset-2
                prose-strong:text-foreground prose-strong:font-semibold
                prose-ul:list-disc prose-ol:list-decimal
                prose-li:ml-4 prose-li:mb-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {streamingContent}
                </ReactMarkdown>
              </div>
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block w-2 h-4 bg-primary ml-0.5 align-middle"
              />
            </div>
          </motion.div>
        )}

        {/* Typing indicator */}
        {isTyping && !isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 items-end"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-6">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted/50 border border-border/50 rounded-2xl px-4 py-3">
              <div className="flex gap-1.5 items-center">
                {[0, 0.1, 0.2].map((delay, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay }}
                    className="w-2 h-2 bg-muted-foreground/60 rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  )
}
