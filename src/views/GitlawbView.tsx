import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Network, User, Globe, Database, Users,
  Zap, RefreshCw, Plus, Copy, Check,
  Activity, Share2
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { GitlawbStatus, GitlawbRepo, GitlawbAgent, GitlawbEvent } from '@/types/gitlawb'

type Tab = 'status' | 'repos' | 'agents' | 'events' | 'tools'

export function GitlawbView() {
  const [activeTab, setActiveTab] = useState<Tab>('status')
  const [status, setStatus] = useState<GitlawbStatus | null>(null)
  const [repos, setRepos] = useState<GitlawbRepo[]>([])
  const [agents, setAgents] = useState<GitlawbAgent[]>([])
  const [events, setEvents] = useState<GitlawbEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [newRepoName, setNewRepoName] = useState('')
  const [newRepoDesc, setNewRepoDesc] = useState('')
  const [showCreateRepo, setShowCreateRepo] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const res = await window.electron.gitlawb.status()
      if (res.success && res.result) setStatus(res.result)
    } catch { /* ignore */ }
  }, [])

  const loadRepos = useCallback(async () => {
    try {
      const res = await window.electron.gitlawb.repoList()
      if (res.success) setRepos(res.result || [])
    } catch { /* ignore */ }
  }, [])

  const loadAgents = useCallback(async () => {
    try {
      const res = await window.electron.gitlawb.agentList()
      if (res.success) setAgents(res.result || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadStatus()
    // Subscribe to events
    const unsub = window.electron.gitlawb.onEvent?.((event: unknown) => {
      const evt = event as GitlawbEvent
      setEvents(prev => [evt, ...prev].slice(0, 100))
    })
    return () => { unsub?.() }
  }, [])

  useEffect(() => {
    if (activeTab === 'repos') loadRepos()
    if (activeTab === 'agents') loadAgents()
  }, [activeTab])

  const handleConnect = async () => {
    setLoading(true)
    try {
      const res = await window.electron.gitlawb.connect()
      if (res.success && res.result) {
        setStatus(res.result)
        loadRepos()
        loadAgents()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) return
    setLoading(true)
    try {
      const res = await window.electron.gitlawb.repoCreate(newRepoName, newRepoDesc)
      if (res.success && res.result) {
        setRepos(prev => [...prev, res.result!])
        setNewRepoName('')
        setNewRepoDesc('')
        setShowCreateRepo(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopyDID = () => {
    if (status?.identity?.did) {
      navigator.clipboard.writeText(status.identity.did)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'status', label: 'Estado', icon: <Activity className="h-4 w-4" /> },
    { id: 'repos', label: 'Repos', icon: <Database className="h-4 w-4" /> },
    { id: 'agents', label: 'Agentes', icon: <Users className="h-4 w-4" /> },
    { id: 'events', label: 'Eventos', icon: <Zap className="h-4 w-4" /> },
    { id: 'tools', label: 'Herramientas', icon: <Share2 className="h-4 w-4" /> },
  ]

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/50 flex items-center justify-between bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Network className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">gitlawb</h2>
            <p className="text-xs text-muted-foreground/70">
              Red git descentralizada para agentes IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status?.connected ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              Desconectado
            </span>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleConnect}
            disabled={loading}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg border transition-all',
              status?.connected
                ? 'bg-card/60 border-border/30 text-muted-foreground hover:bg-card'
                : 'bg-primary/15 border-primary/30 text-primary hover:bg-primary/20'
            )}
          >
            {loading ? 'Conectando...' : status?.connected ? 'Reconectar' : 'Conectar'}
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-6 py-2 border-b border-border/30 flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all',
              activeTab === tab.id
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-card/40'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'events' && events.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/15 text-primary">
                {events.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'status' && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Identity card */}
              <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Identidad DID
                  </h3>
                  {status?.identity && (
                    <button
                      onClick={handleCopyDID}
                      className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </div>
                {status?.identity ? (
                  <div className="space-y-2">
                    <code className="block text-xs text-primary/80 bg-primary/5 p-2 rounded-lg break-all">
                      {status.identity.did}
                    </code>
                    <p className="text-[10px] text-muted-foreground/50">
                      Creado: {new Date(status.identity.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50">
                    No se generó identidad. Conecta para crear una.
                  </p>
                )}
              </div>

              {/* Node info */}
              {status?.node && (
                <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-blue-400" />
                    Nodo
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'URL', value: status.node.url },
                      { label: 'Versión', value: status.node.version },
                      { label: 'Peers', value: String(status.node.peers) },
                      { label: 'Repos', value: String(status.node.repos) },
                      { label: 'Agentes', value: String(status.node.agents) },
                      { label: 'Uptime', value: status.node.uptime },
                    ].map(item => (
                      <div key={item.label} className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">{item.label}</span>
                        <span className="text-xs text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {status?.error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400">{status.error}</p>
                </div>
              )}

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('repos')}
                  className="p-3 rounded-xl bg-card/50 border border-border/30 hover:border-primary/20 transition-all text-left"
                >
                  <Database className="h-4 w-4 text-blue-400 mb-1" />
                  <p className="text-xs font-medium text-foreground">Repos</p>
                  <p className="text-[10px] text-muted-foreground/50">{repos.length} repositorios</p>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('agents')}
                  className="p-3 rounded-xl bg-card/50 border border-border/30 hover:border-primary/20 transition-all text-left"
                >
                  <Users className="h-4 w-4 text-purple-400 mb-1" />
                  <p className="text-xs font-medium text-foreground">Agentes</p>
                  <p className="text-[10px] text-muted-foreground/50">{agents.length} en la red</p>
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'repos' && (
            <motion.div
              key="repos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Repositorios</h3>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadRepos}
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-card/40 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateRepo(!showCreateRepo)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Nuevo
                  </motion.button>
                </div>
              </div>

              {/* Create repo form */}
              <AnimatePresence>
                {showCreateRepo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 rounded-xl bg-card/50 border border-border/30 space-y-2">
                      <input
                        type="text"
                        value={newRepoName}
                        onChange={e => setNewRepoName(e.target.value)}
                        placeholder="Nombre del repo"
                        className="w-full px-3 py-2 text-xs bg-card/60 rounded-lg border border-border/30 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30"
                      />
                      <input
                        type="text"
                        value={newRepoDesc}
                        onChange={e => setNewRepoDesc(e.target.value)}
                        placeholder="Descripción (opcional)"
                        className="w-full px-3 py-2 text-xs bg-card/60 rounded-lg border border-border/30 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setShowCreateRepo(false)}
                          className="px-3 py-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                          Cancelar
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleCreateRepo}
                          disabled={!newRepoName.trim() || loading}
                          className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Crear
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Repo list */}
              {repos.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/40">No hay repositorios</p>
                  <p className="text-[10px] text-muted-foreground/30 mt-1">Crea uno o conecta a la red</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {repos.map(repo => (
                    <div
                      key={repo.id}
                      className="p-3 rounded-xl bg-card/50 border border-border/30 hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-foreground">{repo.name}</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">{repo.description}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/40">
                          {repo.refs || 0} refs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'agents' && (
            <motion.div
              key="agents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Agentes en la red</h3>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadAgents}
                  className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-card/40 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              {agents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/40">No se encontraron agentes</p>
                  <p className="text-[10px] text-muted-foreground/30 mt-1">Conecta a la red para descubrir agentes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {agents.map(agent => (
                    <div
                      key={agent.did}
                      className="p-3 rounded-xl bg-card/50 border border-border/30 hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-[10px] text-primary/70 break-all">{agent.did}</code>
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded',
                          agent.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted-foreground/10 text-muted-foreground/50'
                        )}>
                          {agent.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities.map(cap => (
                          <span key={cap} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/70">
                            {cap}
                          </span>
                        ))}
                      </div>
                      {agent.trustScore !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground/50">Trust:</span>
                          <div className="flex-1 h-1 rounded-full bg-muted-foreground/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/40"
                              style={{ width: `${Math.min(100, agent.trustScore)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground/50">{agent.trustScore}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Eventos en tiempo real</h3>
                <button
                  onClick={() => setEvents([])}
                  className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  Limpiar
                </button>
              </div>

              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/40">Sin eventos</p>
                  <p className="text-[10px] text-muted-foreground/30 mt-1">Los eventos de la red aparecerán aquí</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-xl bg-card/50 border border-border/30"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{event.type}</span>
                        <span className="text-[10px] text-muted-foreground/40">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-[10px] text-muted-foreground/60 overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'tools' && (
            <motion.div
              key="tools"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-medium text-foreground">Herramientas MCP expuestas</h3>

              <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                <p className="text-xs text-muted-foreground/60 mb-3">
                  NEXUS expone estas herramientas a la red gitlawb via MCP:
                </p>
                <div className="space-y-2">
                  {[
                    { name: 'nexus_osint_dni', desc: 'Consulta DNI via CODART', tier: 'Tier 1' },
                    { name: 'nexus_osint_ruc', desc: 'Consulta RUC via CODART', tier: 'Tier 1' },
                    { name: 'nexus_memory_search', desc: 'Buscar en memoria persistente', tier: 'Gratis' },
                    { name: 'nexus_memory_save', desc: 'Guardar memoria', tier: 'Gratis' },
                    { name: 'nexus_brain_process', desc: 'Procesar query con brain', tier: 'Gratis' },
                    { name: 'nexus_workflow_execute', desc: 'Ejecutar workflow', tier: 'Gratis' },
                    { name: 'nexus_goal_start', desc: 'Iniciar goal autónomo', tier: 'Gratis' },
                  ].map(tool => (
                    <div key={tool.name} className="flex items-center justify-between p-2 rounded-lg bg-card/30">
                      <div>
                        <code className="text-xs text-primary/80">{tool.name}</code>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{tool.desc}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {tool.tier}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
