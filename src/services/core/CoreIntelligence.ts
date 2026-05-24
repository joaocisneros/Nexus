import { HybridAIService } from '../ai/service'
import { MemoryManager } from './MemoryManager'
import { ContextBuilder } from './ContextBuilder'
import { KnowledgeGraph } from './KnowledgeGraph'
import { buildMainPrompt, SYSTEM_AUTO_IMPROVE, SYSTEM_PATTERN_LEARN, SYSTEM_ERROR_CORRECTION } from '../prompts/NexusPrompts'
import type { CoreConfig, Thought, Action, BrainResponse, ContextResult } from '@/types'

export type { CoreConfig, Thought, Action }

export class CoreIntelligence {
  private ai: HybridAIService
  private memory: MemoryManager
  private context: ContextBuilder
  private knowledge: KnowledgeGraph
  private thoughts: Thought[] = []
  private actions: Action[] = []
  private enableBackgroundLearning: boolean

  constructor(config: CoreConfig) {
    this.ai = new HybridAIService(config)
    this.memory = new MemoryManager()
    this.context = new ContextBuilder()
    this.knowledge = new KnowledgeGraph()
    this.enableBackgroundLearning = config.enableBackgroundLearning ?? false

    this.initializeBrain()
  }

  private async initializeBrain() {
    await this.memory.loadMemories()
    await this.knowledge.buildFromMemories(this.memory.getAllMemories())
    if (this.enableBackgroundLearning) {
      this.setupReasoning()
    }
  }

  private setupReasoning() {
    setInterval(() => {
      this.reflectOnActions()
    }, 30000)

    setInterval(() => {
      this.learnFromPatterns()
    }, 300000)
  }

  async process(input: string, type: 'chat' | 'command' | 'analysis'): Promise<{
    result: string
    reasoning: string
    context: {
      relevantMemories: number
      knowledgeNodes: number
      processingTime: number
      source?: string
    }
  }> {
    const startTime = Date.now()

    try {
      // 1. Pensar
      const thought = await this.think(input, type)
      this.thoughts.push(thought)

      // 2. Recordar
      const memories = await this.memory.findRelevantMemories(input)
      const context = await this.context.build(memories, input)

      // 3. Conocer
      const knowledge = await this.knowledge.enrich(context)

      // 4. Actuar — usar el nuevo cerebro (Local + Web + AI)
      const brainResult = await this.executeAction(input, context, knowledge)

      // 5. Aprender
      await this.learn(input, brainResult, context)

      // Registrar acción
      const action: Action = {
        id: Date.now().toString(),
        type,
        input,
        output: brainResult,
        timestamp: new Date(),
        success: true,
      }
      this.actions.push(action)

      return {
        result: brainResult.result,
        reasoning: brainResult.reasoning || thought.content,
        context: {
          relevantMemories: memories.length,
          knowledgeNodes: knowledge.nodes?.length || 0,
          processingTime: Date.now() - startTime,
          source: brainResult.source,
        },
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      await this.learnFromError(input, err)

      const action: Action = {
        id: Date.now().toString(),
        type,
        input,
        output: null,
        timestamp: new Date(),
        success: false,
      }
      this.actions.push(action)

      throw error
    }
  }

  async processStream(
    input: string,
    onChunk: (chunk: string) => void
  ): Promise<{
    result: string
    reasoning: string
    context: { relevantMemories: number; knowledgeNodes: number; processingTime: number; source?: string }
  }> {
    const startTime = Date.now()

    // 1. Pensar
    const thought = await this.think(input, 'chat')
    this.thoughts.push(thought)

    // 2. Recordar
    const memories = await this.memory.findRelevantMemories(input)
    const context = await this.context.build(memories, input)

    // 3. Conocer
    const knowledge = await this.knowledge.enrich(context)

    // 4. Detectar OSINT antes de intentar AI
    let fullResult = ''
    let source = 'ai'
    const isOSINT = this.isOSINTQuery(input)

    if (isOSINT) {
      // Route through brain process (QueryRouter handles OSINT)
      try {
        const brainResult = await this.executeAction(input, context, knowledge)
        fullResult = brainResult.result
        source = brainResult.source
        onChunk(fullResult)
      } catch (err) {
        const errMsg = (err as Error).message || ''
        if (/cr[eé]dito|insuficiente|credit|plan/i.test(errMsg)) {
          fullResult = '### Créditos insuficientes\n\n' +
            'Tu plan no tiene créditos para esta consulta.\n\n' +
            '**Gratis (Tier 1):** DNI básico, RUC básico\n' +
            '**Con créditos (Tier 2):** DNI Full, Familia, Teléfono, Celular, Placa, Nombre\n\n' +
            'Configura tu token o agrega créditos en CODART.'
        } else {
          fullResult = 'Error en consulta OSINT. Verifica tu token en Configuración.'
        }
        onChunk(fullResult)
      }
    } else {
      // Normal AI stream
      try {
        const systemPrompt = this.buildSystemPrompt(context, knowledge)
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: input },
        ]
        await this.ai.stream(messages, (chunk) => {
          fullResult += chunk
          onChunk(chunk)
        })
        source = 'ai'
      } catch {
        // Fallback: usar brain process sin streaming
        const brainResult = await this.executeAction(input, context, knowledge)
        fullResult = brainResult.result
        source = brainResult.source
        onChunk(fullResult)
      }
    }

    // 5. Aprender (en background, no bloquear)
    const brainResponse: BrainResponse = {
      result: fullResult,
      reasoning: thought.content,
      source: source as BrainResponse['source'],
      context: { relevantMemories: 0, knowledgeNodes: 0, processingTime: 0, layer: ['ai'] },
    }
    this.learn(input, brainResponse, context).catch(() => {})

    const action: Action = {
      id: Date.now().toString(),
      type: 'chat',
      input,
      output: brainResponse,
      timestamp: new Date(),
      success: true,
    }
    this.actions.push(action)

    return {
      result: fullResult,
      reasoning: thought.content,
      context: {
        relevantMemories: memories.length,
        knowledgeNodes: knowledge.nodes?.length || 0,
        processingTime: Date.now() - startTime,
        source,
      },
    }
  }

  private async think(input: string, type: string): Promise<Thought> {
    const inputLower = input.toLowerCase()
    let reasoning = ''
    let confidence = 0.7

    if (type === 'chat') {
      reasoning = 'Consulta de chat detectada. '
      if (inputLower.includes('?')) reasoning += 'El usuario hace una pregunta. '
      if (inputLower.includes('cómo') || inputLower.includes('como')) reasoning += 'Busca instrucciones o guía. '
      if (inputLower.includes('por qué') || inputLower.includes('porque')) reasoning += 'Busca explicación o justificación. '
    } else if (type === 'command') {
      reasoning = 'Comando directo detectado. El usuario espera una acción concreta.'
      confidence = 0.8
    } else if (type === 'analysis') {
      reasoning = 'Solicitud de análisis. Se requiere razonamiento profundo y estructurado.'
      confidence = 0.85
    }

    if (input.length > 200) {
      reasoning += ' Entrada compleja, requiere respuesta detallada.'
      confidence += 0.05
    }

    return {
      id: Date.now().toString(),
      type: 'reasoning',
      content: reasoning || 'Razonamiento local completado',
      timestamp: new Date(),
      confidence: Math.min(confidence, 1),
      context: { type, input },
    }
  }

  private async executeAction(input: string, context: ContextResult, knowledge: { nodes: Array<{ label: string; frequency: number }>; relatedConcepts: string[] }): Promise<BrainResponse> {
    // Intentar el nuevo cerebro integrado (Local + Web + AI routing)
    try {
      const brainResult = await window.electron.brain.process(input, context?.type || 'chat')
      if (brainResult.success && brainResult.result) {
        return brainResult.result as BrainResponse
      }
    } catch {
      // brain:process fallo, usar fallback directo
    }

    // Fallback: intentar AI directamente (backward compatibility)
    try {
      const systemPrompt = this.buildSystemPrompt(context, knowledge)
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: input },
      ]
      const result = await this.ai.chat(messages)
      return {
        result,
        reasoning: 'AI direct fallback',
        source: 'ai',
        context: {
          relevantMemories: context?.relevantMemories?.length || 0,
          knowledgeNodes: knowledge?.nodes?.length || 0,
          processingTime: 0,
          layer: ['ai'],
        },
      }
    } catch {
      // Último recurso: mensaje de ayuda
      return {
        result: 'NEXUS no pudo procesar tu consulta. Configura un servicio de IA o intenta una consulta más simple.\n\n**Cosas que puedo hacer sin IA:**\n- Saludar y conversar\n- Analizar tu proyecto\n- Leer archivos del sistema\n- Buscar en internet\n- Información del sistema',
        reasoning: 'All layers failed',
        source: 'local',
        context: {
          relevantMemories: 0,
          knowledgeNodes: 0,
          processingTime: 0,
          layer: ['local'],
          error: true,
        },
      }
    }
  }

  private isOSINTQuery(input: string): boolean {
    const cleaned = input.trim()
    // 8 digits = DNI
    if (/\b\d{8}\b/.test(cleaned)) return true
    // 11 digits = RUC
    if (/\b\d{11}\b/.test(cleaned)) return true
    // 9 digits starting with 9 = cell
    if (/\b9\d{8}\b/.test(cleaned)) return true
    // 6-7 alphanumeric = plate
    if (/\b[A-Z0-9]{6,7}\b/i.test(cleaned) && /[A-Z]/i.test(cleaned) && /\d/.test(cleaned)) return true
    // OSINT keywords
    if (/\b(dni|ruc|placa|telefono|celular|reniec|sunat|familia|osint)\b/i.test(cleaned)) return true
    return false
  }

  private buildSystemPrompt(context: ContextResult, knowledge: { nodes: Array<{ label: string; frequency: number }>; relatedConcepts: string[] }): string {
    return buildMainPrompt({
      relevantMemories: context?.relevantMemories?.length || 0,
      knowledgeNodes: knowledge?.nodes?.length || 0,
      type: context?.type,
      summary: context?.summary,
      relatedConcepts: knowledge?.relatedConcepts,
    })
  }

  private async learn(input: string, result: BrainResponse, context: ContextResult) {
    // Guardar conversación
    await this.memory.saveMemory({
      type: 'conversation',
      content: JSON.stringify({ input, result: result.result, source: result.source }),
      importance: this.calculateImportance(input, result),
      tags: this.extractTags(input, result),
    })

    // Guardar resultados web como memorias separadas
    if (result.webResults && result.webResults.length > 0) {
      for (const webResult of result.webResults.slice(0, 3)) {
        await this.memory.saveMemory({
          type: 'web_search',
          content: `${webResult.title}: ${webResult.snippet} [${webResult.url}]`,
          importance: 6,
          tags: [...this.extractTags(input, result), 'web'],
        })
      }
    }

    // Actualizar grafo de conocimiento
    await this.knowledge.addKnowledge({
      source: 'conversation',
      content: input,
      relation: result.result,
      context,
    })
  }

  private calculateImportance(input: string, result: BrainResponse): number {
    let importance = 5
    if (input.length > 200) importance += 2
    if (result.context?.error) importance += 3
    if (result.source === 'web+ai') importance += 1
    return Math.min(importance, 10)
  }

  private extractTags(input: string, result: BrainResponse): string[] {
    const tags: string[] = []
    const lower = input.toLowerCase()

    const tagMap: Record<string, string[]> = {
      'code': ['código', 'codigo', 'programar', 'función', 'funcion', 'clase', 'typescript', 'javascript', 'react', 'componente', 'api', 'backend', 'frontend'],
      'debug': ['bug', 'error', 'arreglar', 'corregir', 'fix', 'fallo', 'problema'],
      'architecture': ['arquitectura', 'estructura', 'diseño', 'patrón', 'patron', 'microservicio', 'modular'],
      'optimization': ['optimizar', 'rendimiento', 'performance', 'velocidad', 'mejorar'],
      'analysis': ['analizar', 'analiza', 'revisar', 'revisa', 'examinar', 'evaluar'],
      'documentation': ['documentar', 'documenta', 'readme', 'docs', 'explicar'],
      'security': ['seguridad', 'security', 'validar', 'permisos', 'riesgo'],
      'web': ['buscar', 'search', 'internet', 'web', 'página', 'noticias'],
      'ai': ['inteligencia artificial', 'ia', 'modelo', 'openai', 'ollama', 'gpt', 'llm'],
    }

    for (const [tag, keywords] of Object.entries(tagMap)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          tags.push(tag)
          break
        }
      }
    }

    if (result.context?.error) tags.push('error')
    if (result.webResults?.length) tags.push('web')

    return [...new Set(tags)]
  }

  private async reflectOnActions() {
    if (this.actions.length < 3) return

    const recentActions = this.actions.slice(-10)
    const failures = recentActions.filter(a => !a.success)
    if (recentActions.length < 3 && failures.length === 0) return

    try {
      const prompt = `Analiza estas acciones recientes y sugiere mejoras:\n\n${recentActions.map(action => `- ${action.type}: ${action.success ? 'éxito' : 'fallo'} | input: ${JSON.stringify(action.input).slice(0, 100)}`).join('\n')}\n\nSugiere mejoras concretas para el sistema.`

      const improvement = await this.ai.chat([
        { role: 'system', content: SYSTEM_AUTO_IMPROVE },
        { role: 'user', content: prompt },
      ])

      await this.memory.saveMemory({
        type: 'learning',
        content: improvement,
        importance: 8,
        tags: ['improvement', 'reflection'],
      })
    } catch {
      // Reflexión local sin IA
      const sources = recentActions.map(a => {
        const output = a.output as { source?: string } | null
        return output?.source || 'unknown'
      })
      await this.memory.saveMemory({
        type: 'learning',
        content: `Reflexión local: ${failures.length} fallos de ${recentActions.length} acciones recientes. Tipos: ${recentActions.map(a => a.type).join(', ')}. Fuentes: ${[...new Set(sources)].join(', ')}`,
        importance: 6,
        tags: ['reflection', 'local'],
      })
    }
  }

  private async learnFromPatterns() {
    try {
      const patterns = await this.knowledge.findPatterns()
      if (patterns.length > 0) {
        const prompt = `Basado en estos patrones, ¿qué debería aprender?\n\n${patterns.map(p => `- ${p.description}: ${p.frequency} veces`).join('\n')}`

        const learning = await this.ai.chat([
          { role: 'system', content: SYSTEM_PATTERN_LEARN },
          { role: 'user', content: prompt },
        ])

        await this.memory.saveMemory({
          type: 'learning',
          content: learning,
          importance: 9,
          tags: ['pattern', 'learning'],
        })
      }
    } catch {
      // Fallo en aprendizaje de patrones, no es crítico
    }
  }

  private async learnFromError(input: string, error: Error) {
    await this.memory.saveMemory({
      type: 'error',
      content: JSON.stringify({ input, error: error.message }),
      importance: 10,
      tags: ['error', 'learning'],
    })

    try {
      const fix = await this.ai.chat([
        { role: 'system', content: SYSTEM_ERROR_CORRECTION },
        { role: 'user', content: `Error: ${error.message}\nEntrada: ${input}\nSugiere cómo evitar este error.` },
      ])

      await this.memory.saveMemory({
        type: 'learning',
        content: fix,
        importance: 9,
        tags: ['error', 'fix'],
      })
    } catch {
      // No se pudo generar fix con IA
    }
  }

  getThoughts(): Thought[] {
    return this.thoughts
  }

  getActions(): Action[] {
    return this.actions
  }

  async getStatus(): Promise<{
    thoughts: number
    actions: number
    memories: number
    knowledgeNodes: number
    lastReflection: Date | null
  }> {
    return {
      thoughts: this.thoughts.length,
      actions: this.actions.length,
      memories: await this.memory.countMemories(),
      knowledgeNodes: await this.knowledge.countNodes(),
      lastReflection: this.thoughts[this.thoughts.length - 1]?.timestamp || null,
    }
  }
}
