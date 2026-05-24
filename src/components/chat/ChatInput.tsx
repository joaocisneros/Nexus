import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Paperclip, Search, ChevronDown, ChevronUp, X, FileText, Image } from 'lucide-react'
import { cn } from '@/utils/cn'
import { OsintQuickSearch } from '../osint/OsintQuickSearch'

interface AttachedFile {
  name: string
  type: string
  size: number
  content: string
}

interface ChatInputProps {
  onSend: (message: string) => void
  onToggleRightPanel: () => void
}

export function ChatInput({ onSend, onToggleRightPanel }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [showOsint, setShowOsint] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'es-ES'

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('')
        setMessage(transcript)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognition.onerror = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        continue // Skip files > 5MB
      }

      const reader = new FileReader()
      reader.onload = () => {
        const content = typeof reader.result === 'string' ? reader.result : ''
        setAttachedFiles(prev => [...prev, {
          name: file.name,
          type: file.type,
          size: file.size,
          content,
        }])
      }

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file)
      } else {
        reader.readAsText(file)
      }
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = () => {
    if (!message.trim() && attachedFiles.length === 0) return

    let finalMessage = message.trim()

    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles.map(f => {
        if (f.type.startsWith('image/')) {
          return `[Imagen adjunta: ${f.name}]`
        }
        return `\n\n--- Archivo: ${f.name} ---\n${f.content.slice(0, 3000)}${f.content.length > 3000 ? '\n...[truncado]' : ''}`
      }).join('\n')

      finalMessage = finalMessage
        ? `${finalMessage}\n${fileContext}`
        : fileContext
    }

    if (finalMessage) {
      onSend(finalMessage)
      setMessage('')
      setAttachedFiles([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-3">
      {/* OSINT Quick Search Panel */}
      <AnimatePresence>
        {showOsint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-card/60 rounded-xl border border-border/30">
              <OsintQuickSearch onSearch={onSend} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowOsint(!showOsint)}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg transition-colors border flex items-center gap-1.5',
            showOsint
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'bg-muted/60 text-muted-foreground border-border/30 hover:bg-accent hover:text-foreground'
          )}
        >
          <Search className="h-3 w-3" />
          OSINT
          {showOsint ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </motion.button>
        {[
          { label: 'Analizar proyecto', msg: 'Analiza mi proyecto actual...' },
          { label: 'Optimizar código', msg: 'Optimiza mi código...' },
          { label: 'Documentar', msg: 'Documenta esto...' },
        ].map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setMessage(action.msg)
              textareaRef.current?.focus()
            }}
            className="px-3 py-1.5 text-xs bg-muted/60 text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors border border-border/30"
          >
            {action.label}
          </motion.button>
        ))}
      </div>

      {/* Attached files */}
      <AnimatePresence>
        {attachedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 flex-wrap overflow-hidden"
          >
            {attachedFiles.map((file, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card/60 rounded-lg border border-border/30 text-xs"
              >
                {file.type.startsWith('image/') ? (
                  <Image className="h-3 w-3 text-blue-400" />
                ) : (
                  <FileText className="h-3 w-3 text-primary/70" />
                )}
                <span className="text-foreground/80 max-w-[120px] truncate">{file.name}</span>
                <span className="text-muted-foreground/40 text-[10px]">
                  {(file.size / 1024).toFixed(0)}KB
                </span>
                <button
                  onClick={() => removeFile(i)}
                  className="p-0.5 rounded hover:bg-muted/40 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        multiple
        accept=".txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.html,.css,.csv,.xml,.yaml,.yml,.sh,.bat,.log,.pdf,.png,.jpg,.jpeg,.gif,.svg"
      />

      {/* Input area with buttons */}
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl transition-colors border',
            attachedFiles.length > 0
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground border-border/30'
          )}
          title="Adjuntar archivo"
        >
          <Paperclip className="h-4 w-4" />
        </motion.button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              adjustTextareaHeight()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            className={cn(
              'w-full min-h-[44px] max-h-32 px-4 py-3 bg-card border border-border rounded-xl',
              'resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
              'text-sm placeholder:text-muted-foreground/60 text-foreground',
              'transition-all duration-200'
            )}
            rows={1}
          />
        </div>

        {/* Voice button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (!recognitionRef.current) return
            if (isRecording) {
              recognitionRef.current.stop()
              setIsRecording(false)
            } else {
              setMessage('')
              recognitionRef.current.start()
              setIsRecording(true)
            }
          }}
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl transition-colors border',
            isRecording
              ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
              : 'bg-muted/60 text-muted-foreground border-border/30 hover:bg-accent hover:text-foreground'
          )}
          title={isRecording ? 'Detener grabación' : 'Grabar voz'}
        >
          <Mic className="h-4 w-4" />
        </motion.button>

        {/* Send button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={!message.trim() && attachedFiles.length === 0}
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 border',
            (message.trim() || attachedFiles.length > 0)
              ? 'bg-primary/90 text-primary-foreground border-primary/30 hover:bg-primary shadow-lg shadow-primary/20'
              : 'bg-muted/40 text-muted-foreground/40 border-border/20 cursor-not-allowed'
          )}
          title="Enviar mensaje"
        >
          <Send className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Context panel toggle */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onToggleRightPanel}
        className="w-full px-4 py-2.5 bg-muted/40 text-muted-foreground/70 rounded-xl hover:bg-accent hover:text-foreground transition-colors flex items-center justify-center gap-2 text-xs border border-border/20"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Panel contextual
      </motion.button>
    </div>
  )
}
