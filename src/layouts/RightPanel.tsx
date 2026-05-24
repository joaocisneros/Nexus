import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Database,
  Activity,
  FileText,
  Clock,
  Settings as SettingsIcon
} from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { getNexusStatus } from '@/services/nexus'

interface RightPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface NexusStatus {
  thoughts: number
  actions: number
  memories: number
  knowledgeNodes: number
  lastReflection: Date | null
}

export function RightPanel({ isOpen, onClose }: RightPanelProps) {
  const { currentModel, messages } = useChatStore()
  const [status, setStatus] = useState<NexusStatus | null>(null)

  useEffect(() => {
    if (isOpen) {
      getNexusStatus().then(setStatus)
    }
  }, [isOpen, messages.length])

  const panels = [
    {
      id: 'status',
      icon: Activity,
      title: 'Estado IA',
      content: (
        <div className="space-y-4">
          <div className="glass-card p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Modelo Activo</span>
              <span className="text-xs text-primary font-medium">{currentModel}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }} />
            </div>
          </div>

          <div className="glass-card p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Mensajes</span>
              <span className="text-xs text-primary font-medium">{messages.length}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${Math.min((messages.length / 100) * 100, 100)}%` }} />
            </div>
          </div>

          <div className="glass-card p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Velocidad</span>
              <span className="text-xs text-green-500 font-medium">Activa</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">Pipeline cerebral conectado</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'memory',
      icon: Database,
      title: 'Memoria IA',
      content: (
        <div className="space-y-3">
          <div className="glass-card p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Memorias almacenadas</p>
            <p className="text-sm">{status?.memories ?? 0} memorias</p>
          </div>
          <div className="glass-card p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Nodos de conocimiento</p>
            <p className="text-sm">{status?.knowledgeNodes ?? 0} nodos</p>
          </div>
          <div className="glass-card p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Pensamientos</p>
            <p className="text-sm">{status?.thoughts ?? 0} procesados</p>
          </div>
        </div>
      )
    },
    {
      id: 'tasks',
      icon: Clock,
      title: 'Tareas Activas',
      content: (
        <div className="space-y-2">
          {status?.actions ? (
            <div className="glass-card p-2 rounded-lg">
              <p className="text-xs font-medium text-foreground">Acciones ejecutadas</p>
              <p className="text-xs text-muted-foreground">{status.actions} completadas</p>
            </div>
          ) : (
            <div className="glass-card p-2 rounded-lg">
              <p className="text-xs text-muted-foreground">Sin tareas activas</p>
            </div>
          )}
          <div className="glass-card p-2 rounded-lg">
            <p className="text-xs font-medium text-foreground">Reflexiones</p>
            <p className="text-xs text-muted-foreground">{status?.thoughts ?? 0} procesadas</p>
          </div>
        </div>
      )
    }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border z-50 p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Panel Contextual</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-accent transition-colors"
              >
                <SettingsIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              {panels.map((panel) => (
                <div key={panel.id} className="glass-card rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <panel.icon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium text-foreground">{panel.title}</h4>
                  </div>
                  {panel.content}
                </div>
              ))}
            </div>

            <div className="mt-6 glass-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium text-foreground">Logs Rápidos</h4>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Acciones: {status?.actions ?? 0}</p>
                <p>• Mensajes: {messages.length}</p>
                <p>• Modelo: {currentModel}</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}