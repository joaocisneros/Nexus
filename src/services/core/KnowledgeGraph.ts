import type { Memory, ContextResult, KGNode, KGEdge, KGEnrichment } from '@/types'

export type { ContextResult }

export type { KGNode, KGEdge, KGEnrichment }

export class KnowledgeGraph {
  private nodes: Map<string, KGNode> = new Map()
  private edges: KGEdge[] = []

  async buildFromMemories(memories: Memory[]): Promise<void> {
    for (const memory of memories) {
      const concepts = this.extractConcepts(memory.content)
      this.addConcepts(concepts, memory.tags)
    }
  }

  private extractConcepts(text: string): string[] {
    // Extraer conceptos relevantes del texto
    const words = text
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)

    // Contar frecuencia
    const freq: Record<string, number> = {}
    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1
    }

    // Devolver palabras que aparecen más de una vez o conceptos técnicos
    const techTerms = ['react', 'typescript', 'javascript', 'api', 'node', 'database', 'frontend', 'backend', 'component', 'function', 'class', 'module', 'service', 'electron', 'vite', 'tailwind']

    return Object.entries(freq)
      .filter(([word, count]) => count > 1 || techTerms.includes(word))
      .map(([word]) => word)
  }

  private addConcepts(concepts: string[], tags: string[]): void {
    const allConcepts = [...new Set([...concepts, ...tags])]
    const now = new Date()

    // Agregar/actualizar nodos
    for (const concept of allConcepts) {
      const existing = this.nodes.get(concept)
      if (existing) {
        existing.frequency++
        existing.lastSeen = now
      } else {
        this.nodes.set(concept, {
          id: concept,
          label: concept,
          frequency: 1,
          firstSeen: now,
          lastSeen: now,
        })
      }
    }

    // Crear aristas entre conceptos que co-ocurren
    for (let i = 0; i < allConcepts.length; i++) {
      for (let j = i + 1; j < allConcepts.length; j++) {
        this.addEdge(allConcepts[i], allConcepts[j])
      }
    }
  }

  private addEdge(source: string, target: string): void {
    const existing = this.edges.find(
      e => (e.source === source && e.target === target) || (e.source === target && e.target === source)
    )

    if (existing) {
      existing.weight++
    } else {
      this.edges.push({ source, target, weight: 1 })
    }
  }

  async enrich(context: ContextResult): Promise<KGEnrichment> {
    const relatedConcepts: string[] = []
    const relevantNodes: Array<{ label: string; frequency: number }> = []

    // Buscar nodos relacionados con las keywords del contexto
    for (const keyword of context.keywords) {
      const node = this.nodes.get(keyword)
      if (node) {
        relevantNodes.push({ label: node.label, frequency: node.frequency })

        // Buscar nodos conectados
        const connected = this.edges
          .filter(e => e.source === keyword || e.target === keyword)
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 3)

        for (const edge of connected) {
          const related = edge.source === keyword ? edge.target : edge.source
          if (!relatedConcepts.includes(related)) {
            relatedConcepts.push(related)
          }
        }
      }
    }

    return {
      nodes: relevantNodes.slice(0, 10),
      relatedConcepts: relatedConcepts.slice(0, 10),
    }
  }

  async addKnowledge(data: { source: string; content: string; relation: string; context: ContextResult }): Promise<void> {
    const concepts = this.extractConcepts(data.content)
    const relationConcepts = typeof data.relation === 'string'
      ? this.extractConcepts(data.relation)
      : []

    this.addConcepts([...concepts, ...relationConcepts], [])
  }

  async findPatterns(): Promise<Array<{ description: string; frequency: number }>> {
    const patterns: Array<{ description: string; frequency: number }> = []

    // Encontrar nodos más frecuentes
    const sortedNodes = Array.from(this.nodes.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)

    for (const node of sortedNodes) {
      if (node.frequency >= 3) {
        // Encontrar conexiones fuertes
        const strongConnections = this.edges
          .filter(e => (e.source === node.id || e.target === node.id) && e.weight >= 2)
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 3)

        const connectedTo = strongConnections.map(e =>
          e.source === node.id ? e.target : e.source
        )

        patterns.push({
          description: `"${node.label}" frecuentemente conectado con: ${connectedTo.join(', ') || 'sin conexiones fuertes'}`,
          frequency: node.frequency,
        })
      }
    }

    return patterns
  }

  async countNodes(): Promise<number> {
    return this.nodes.size
  }
}
