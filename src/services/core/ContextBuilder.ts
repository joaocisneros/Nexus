import type { Memory, ContextResult } from '@/types'

export type { ContextResult }

// Palabras clave para clasificar el tipo de consulta
const TYPE_KEYWORDS: Record<string, string[]> = {
  analysis: ['analizar', 'analiza', 'revisar', 'revisa', 'examinar', 'evaluar', 'diagnóstico', 'analisis'],
  code: ['código', 'codigo', 'programar', 'función', 'funcion', 'clase', 'método', 'metodo', 'bug', 'error', 'arreglar', 'optimizar', 'refactorizar', 'typescript', 'javascript', 'react', 'componente', 'api', 'endpoint'],
  search: ['buscar', 'busca', 'encontrar', 'encuentra', 'documentación', 'documentacion', 'cómo', 'como', 'qué', 'que', 'dónde', 'donde', 'cuál', 'cual'],
  command: ['ejecutar', 'ejecuta', 'correr', 'corre', 'instalar', 'instala', 'crear', 'crea', 'generar', 'genera', 'construir', 'construye'],
}

export class ContextBuilder {
  private recentActions: Array<{ input: string; timestamp: Date }> = []

  async build(memories: Memory[], input: string): Promise<ContextResult> {
    const keywords = this.extractKeywords(input)
    const type = this.classifyType(input)

    // Agregar a acciones recientes
    this.recentActions.push({ input, timestamp: new Date() })
    if (this.recentActions.length > 20) {
      this.recentActions = this.recentActions.slice(-20)
    }

    const summary = this.buildSummary(memories, input, type)

    return {
      relevantMemories: memories,
      keywords,
      type,
      summary,
    }
  }

  private extractKeywords(input: string): string[] {
    const stopWords = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
      'de', 'del', 'al', 'en', 'con', 'por', 'para', 'sin',
      'que', 'como', 'se', 'su', 'sus', 'es', 'son', 'está',
      'esta', 'están', 'estan', 'hay', 'muy', 'más', 'mas',
      'pero', 'o', 'y', 'a', 'e', 'mi', 'me', 'te', 'nos',
      'yo', 'tu', 'él', 'ella', 'ello', 'ellos', 'ellas',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'can',
      'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'it', 'its', 'this', 'that',
    ])

    return input
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  }

  private classifyType(input: string): ContextResult['type'] {
    const inputLower = input.toLowerCase()

    for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
      for (const kw of keywords) {
        if (inputLower.includes(kw)) {
          return type as ContextResult['type']
        }
      }
    }

    return 'chat'
  }

  private buildSummary(memories: Memory[], _input: string, type: string): string {
    const parts: string[] = []

    parts.push(`Tipo de consulta: ${type}`)

    if (memories.length > 0) {
      const topTags = memories
        .flatMap(m => m.tags)
        .reduce((acc, tag) => {
          acc[tag] = (acc[tag] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      const sortedTags = Object.entries(topTags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag)

      parts.push(`Temas relacionados: ${sortedTags.join(', ')}`)
      parts.push(`Memorias relevantes: ${memories.length}`)
    }

    if (this.recentActions.length > 1) {
      const recentTopics = this.recentActions
        .slice(-3)
        .map(a => a.input.slice(0, 50))
      parts.push(`Contexto reciente: ${recentTopics.join(' | ')}`)
    }

    return parts.join('. ')
  }
}
