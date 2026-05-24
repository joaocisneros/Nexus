import { useState, useEffect, useCallback } from 'react'
import { Brain, Database, Network, Search, Trash2 } from 'lucide-react'

interface StoredMemory {
  id: string
  type: string
  content: string
  importance: number
  tags: string[]
  timestamp: string
}

interface KnowledgeGraph {
  nodes: Array<{ id: string; label: string; frequency: number }>
  edges: Array<{ source: string; target: string; weight: number }>
}

export function MemoryView() {
  const [memories, setMemories] = useState<StoredMemory[]>([])
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [totalCount, setTotalCount] = useState(0)

  const loadMemories = useCallback(async () => {
    try {
      const { electron } = window
      if (!electron?.memory) return

      const [countRes, graphRes] = await Promise.all([
        electron.memory.count(),
        electron.memory.knowledgeGraph(),
      ])

      if (countRes.success) setTotalCount(countRes.result as number)
      if (graphRes.success) setKnowledgeGraph(graphRes.result as KnowledgeGraph)

      if (searchTerm) {
        const searchRes = await electron.memory.search(searchTerm, 50)
        if (searchRes.success) setMemories(searchRes.result as StoredMemory[])
      } else {
        const allRes = await electron.memory.recent(50)
        if (allRes.success) setMemories(allRes.result as StoredMemory[])
      }
    } catch {
      // Fallback: try localStorage
      try {
        const stored = localStorage.getItem('nexus-memories')
        if (stored) {
          const parsed = JSON.parse(stored)
          setMemories(Array.isArray(parsed) ? parsed : [])
          setTotalCount(Array.isArray(parsed) ? parsed.length : 0)
        }
      } catch { /* empty */ }
    }
  }, [searchTerm])

  useEffect(() => {
    loadMemories()
    const interval = setInterval(loadMemories, 10000)
    return () => clearInterval(interval)
  }, [loadMemories])

  const handleDelete = async (id: string) => {
    try {
      const { electron } = window
      if (electron?.memory?.delete) {
        await electron.memory.delete(id)
        await loadMemories()
      }
    } catch { /* empty */ }
  }

  const sortedMemories = [...memories].sort(
    (a, b) => (b.importance || 0) - (a.importance || 0)
  )

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">Memoria</h2>
        <p className="text-sm text-muted-foreground">Sistema de memoria contextual con SQLite + FTS5</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 rounded-lg">
          <Database className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{totalCount || memories.length}</p>
          <p className="text-xs text-muted-foreground">Memorias (SQLite)</p>
        </div>
        <div className="glass-card p-4 rounded-lg">
          <Network className="h-5 w-5 text-cyan-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{knowledgeGraph?.nodes?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Nodos de conocimiento</p>
        </div>
        <div className="glass-card p-4 rounded-lg">
          <Brain className="h-5 w-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{knowledgeGraph?.edges?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Conexiones</p>
        </div>
      </div>

      <div className="glass-card p-3 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en memorias (FTS5)..."
            className="flex-1 bg-transparent border-none outline-none text-foreground text-sm placeholder:text-muted-foreground"
          />
          <span className="text-xs text-muted-foreground">{sortedMemories.length} resultados</span>
        </div>
      </div>

      <div className="space-y-2">
        {sortedMemories.slice(0, 50).map((memory) => (
          <div key={memory.id} className="glass-card p-3 rounded-lg group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {memory.type || 'unknown'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Importancia: {memory.importance || 0}/10
                </span>
                <button
                  onClick={() => handleDelete(memory.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/20"
                  title="Eliminar"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            </div>
            <p className="text-sm text-foreground line-clamp-2">{memory.content}</p>
            {memory.tags && memory.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(Array.isArray(memory.tags) ? memory.tags : JSON.parse(memory.tags as unknown as string)).map((tag: string) => (
                  <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {sortedMemories.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No hay memorias almacenadas</p>
        )}
      </div>
    </div>
  )
}
