import { LocalBrain } from './LocalBrain'
import { WebSearchService } from '../web/WebSearchService'
import { aiChat } from '../ai/aiIpc'
import { smartQuery } from '../osint/OSSINTService'
import { buildWebSynthesisPrompt, SYSTEM_AI_FALLBACK } from '../prompts/NexusPrompts'
import type { RoutingDecision, SystemCapabilities, BrainResponse, WebSearchResult, ContextResult } from '@/types'

export class QueryRouter {
  private localBrain: LocalBrain
  private webSearch: WebSearchService
  private capabilities: SystemCapabilities

  constructor(capabilities: SystemCapabilities) {
    this.localBrain = new LocalBrain()
    this.webSearch = new WebSearchService()
    this.capabilities = capabilities
  }

  async route(input: string, contextType?: string): Promise<RoutingDecision> {
    const context: ContextResult = {
      relevantMemories: [],
      keywords: [],
      type: (contextType as ContextResult['type']) || 'chat',
      summary: '',
    }

    // Step 1: Try local brain
    const localResult = await this.localBrain.handle(input)
    if (localResult && localResult.confidence >= 0.8) {
      return {
        layers: ['local'],
        reason: `Local brain handled with confidence ${localResult.confidence}`,
        localResult,
      }
    }

    // Step 1.5: Check if this is an OSINT query (DNI, RUC, phone, plate)
    if (this.isOSINTQuery(input)) {
      return {
        layers: ['osint'],
        reason: 'OSINT data query detected',
      }
    }

    // Step 1.6: Check if this is a gitlawb query
    if (this.isGitlawbQuery(input)) {
      return {
        layers: ['gitlawb'],
        reason: 'gitlawb network query detected',
      }
    }

    // Step 2: Check if web search is needed
    const needsWeb = this.webSearch.shouldSearchWeb(input, context)
    if (needsWeb) {
      if (this.capabilities.aiAvailable) {
        return {
          layers: ['web', 'ai'],
          reason: 'Web search + AI synthesis',
          localResult: localResult || undefined,
        }
      }
      return {
        layers: ['web', 'local'],
        reason: 'Web search + local formatting',
        localResult: localResult || undefined,
      }
    }

    // Step 3: Check if AI is needed for complex queries
    if (this.capabilities.aiAvailable) {
      const isComplex = input.length > 50 || (input.includes('?') && input.split(' ').length > 8)
      if (isComplex || contextType === 'analysis' || contextType === 'code') {
        return {
          layers: ['ai'],
          reason: 'Complex query requiring AI',
          localResult: localResult || undefined,
        }
      }
    }

    // Step 4: Fallback
    if (localResult && localResult.confidence >= 0.5) {
      return {
        layers: ['local'],
        reason: 'Local fallback with lower confidence',
        localResult,
      }
    }

    return {
      layers: [],
      reason: 'No handler available',
    }
  }

  async execute(input: string, decision: RoutingDecision): Promise<BrainResponse> {
    const startTime = Date.now()
    let result = ''
    let reasoning = ''
    let source: BrainResponse['source'] = 'local'
    let webResults: WebSearchResult[] | undefined

    for (const layer of decision.layers) {
      switch (layer) {
        case 'osint': {
          try {
            const osintResult = await smartQuery(input)
            if (osintResult.type === 'unknown') {
              result = (osintResult.data as { message: string }).message
            } else {
              result = this.formatOSINTResult(osintResult.type, osintResult.data, osintResult.query)
            }
            reasoning = `OSINT query: ${osintResult.type}`
            source = 'local'
          } catch (error) {
            const errMsg = (error as Error).message || ''
            if (/cr[eé]dito|insuficiente|credit|plan/i.test(errMsg)) {
              result = `### Créditos insuficientes\n\n` +
                `Tu plan actual no tiene créditos para esta consulta.\n\n` +
                `**Consultas gratuitas (Tier 1):**\n` +
                `- DNI básico (8 dígitos)\n` +
                `- RUC básico (11 dígitos)\n\n` +
                `**Consultas con créditos (Tier 2):**\n` +
                `- DNI Full, Familia, Teléfono por DNI\n` +
                `- Celular, Placa, Búsqueda por nombre\n\n` +
                `Para agregar créditos, visita el panel de CODART o actualiza tu plan.`
            } else {
              result = `Error en consulta OSINT: ${errMsg}`
            }
            reasoning = 'OSINT query failed'
            source = 'local'
          }
          break
        }

        case 'local': {
          if (decision.localResult) {
            result = decision.localResult.content
            reasoning = `Local brain: ${decision.localResult.source}`
            source = 'local'
          }
          break
        }

        case 'web': {
          try {
            // Search DuckDuckGo + Wikipedia in parallel
            const [ddgResults, wikiResult] = await Promise.all([
              this.webSearch.searchDuckDuckGo(input, 5),
              this.webSearch.searchWikipedia(input),
            ])

            webResults = ddgResults

            if (decision.layers.includes('ai')) {
              // Format web context for AI
              let webContext = ''
              if (wikiResult) {
                webContext += `**Wikipedia - ${wikiResult.title}:**\n${wikiResult.extract}\n\n`
              }
              if (ddgResults.length > 0) {
                webContext += '**Resultados de búsqueda:**\n'
                for (const r of ddgResults) {
                  webContext += `- **${r.title}**: ${r.snippet}\n  Fuente: ${r.url}\n`
                }
              }

              try {
                result = await aiChat([
                  {
                    role: 'system',
                    content: buildWebSynthesisPrompt(webContext),
                  },
                  { role: 'user', content: input },
                ])
                reasoning = 'AI synthesized web search results'
                source = 'web+ai'
              } catch {
                // AI failed, format web results locally
                result = this.formatWebResults(input, wikiResult, ddgResults)
                reasoning = 'AI unavailable, formatted web results'
                source = 'web+local'
              }
            } else {
              // No AI, format results locally
              result = this.formatWebResults(input, wikiResult, ddgResults)
              reasoning = 'Web search formatted locally'
              source = 'web+local'
            }
          } catch (error) {
            result = `Error buscando en internet: ${(error as Error).message}`
            reasoning = 'Web search failed'
            source = 'local'
          }
          break
        }

        case 'ai': {
          try {
            result = await aiChat([
              { role: 'system', content: SYSTEM_AI_FALLBACK },
              { role: 'user', content: input },
            ])
            reasoning = 'AI direct response'
            source = 'ai'
          } catch (error) {
            // AI failed, use local fallback
            if (decision.localResult) {
              result = decision.localResult.content
              reasoning = 'AI failed, local fallback'
              source = 'local'
            } else {
              result = 'No pude procesar tu consulta. No hay servicio de IA configurado y el cerebro local no puede manejar esta consulta compleja.'
              reasoning = 'All layers failed'
              source = 'local'
            }
          }
          break
        }

        case 'gitlawb': {
          try {
            // Detect gitlawb-related queries
            const lowerInput = input.toLowerCase()
            if (/\b(sincronizar|sync|memoria|agents|agentes|repositorio|repo)\b/i.test(lowerInput)) {
              // Sync memory
              const { syncMemory } = await import('../gitlawb/MemorySync')
              const syncResult = await syncMemory()
              result = `### Sync completado\n\n- **Pushed:** ${syncResult.pushed} memorias\n- **Pulled:** ${syncResult.pulled} memorias\n${syncResult.error ? `- **Error:** ${syncResult.error}` : '- Sin errores'}`
              reasoning = 'gitlawb memory sync'
              source = 'local'
            } else if (/\b(buscar agente|find agent|descubrir|discover)\b/i.test(lowerInput)) {
              // List agents
              const agents = await (await import('../gitlawb/GitlawbService')).listAgents()
              result = `### Agentes encontrados (${agents.length})\n\n` +
                agents.map(a => `- **${a.did.slice(0, 20)}...** — Trust: ${(a.trustScore * 100).toFixed(0)}% — Caps: ${a.capabilities.join(', ')}`).join('\n')
              reasoning = 'gitlawb agent discovery'
              source = 'local'
            } else if (/\b(delegar|delegate|tarea|task)\b/i.test(lowerInput)) {
              result = 'Para delegar una tarea, usa la vista Gitlawb o el panel de agentes. Especifica el agente objetivo y la tarea.'
              reasoning = 'gitlawb delegation guidance'
              source = 'local'
            } else {
              result = '### Gitlawb\n\nOperaciones disponibles:\n- **Sync memoria** — sincroniza memorias con la red\n- **Buscar agentes** — descubre agentes en la red\n- **Delegar tarea** — envía una tarea a otro agente\n- **Crear repo** — crea un repositorio en gitlawb\n\nUsa la vista **Gitlawb** en el sidebar para acceso completo.'
              reasoning = 'gitlawb help'
              source = 'local'
            }
          } catch (error) {
            result = `Error en gitlawb: ${(error as Error).message}`
            reasoning = 'gitlawb operation failed'
            source = 'local'
          }
          break
        }
      }
    }

    // If no layer produced a result
    if (!result) {
      result = decision.localResult?.content ||
        'Puedo ayudarte con:\n- **Saludos** y conversación básica\n- **Preguntas** que pueda buscar en internet\n- **Análisis** de tu proyecto\n- **Leer archivos** del sistema\n- **Información** del sistema\n\nIntenta reformular tu pregunta o configura un servicio de IA para respuestas más avanzadas.'
      reasoning = 'Fallback help message'
      source = 'local'
    }

    return {
      result,
      reasoning,
      source,
      webResults,
      context: {
        relevantMemories: 0,
        knowledgeNodes: 0,
        processingTime: Date.now() - startTime,
        layer: decision.layers,
      },
    }
  }

  private isOSINTQuery(input: string): boolean {
    const cleaned = input.replace(/^(buscar|consultar|dame|info|datos|informaci[oó]n)\s+(de\s+|del\s+|sobre\s+)?/i, '').trim()
    // DNI: 8 digits
    if (/^\d{8}$/.test(cleaned)) return true
    // RUC: 11 digits
    if (/^\d{11}$/.test(cleaned)) return true
    // Cell: 9 digits starting with 9
    if (/^9\d{8}$/.test(cleaned)) return true
    // Plate: 6-7 alphanumeric
    if (/^[A-Z0-9]{6,7}$/i.test(cleaned) && /[A-Z]/i.test(cleaned) && /\d/.test(cleaned)) return true
    // Explicit OSINT keywords
    if (/\b(dni|ruc|placa|telefono|celular|reniec|sunat)\b/i.test(input)) return true
    // Near-miss: only digits, looks like a DNI/RUC attempt but wrong length
    if (/^\d{7,12}$/.test(cleaned) && cleaned.length !== 8 && cleaned.length !== 11) return true
    // Near-miss: digits with common prefixes/suffixes (e.g., "107005789510")
    if (/^\d{9,14}$/.test(cleaned)) return true
    return false
  }

  private isGitlawbQuery(input: string): boolean {
    return /\b(gitlawb|git\s+lawb|sincronizar\s+memoria|sync\s+memoria|buscar\s+agentes|find\s+agents|delegar\s+tarea|delegate\s+task|crear\s+repo|create\s+repo|red\s+descentralizada|decentralized\s+network)\b/i.test(input)
  }

  private formatWebResults(
    query: string,
    wiki: { title: string; extract: string; url: string; thumbnail?: string } | null,
    results: WebSearchResult[],
  ): string {
    let md = ''

    if (wiki) {
      md += `### ${wiki.title} (Wikipedia)\n\n${wiki.extract}\n\n[Más información](${wiki.url})\n\n`
    }

    if (results.length > 0) {
      md += `### Resultados de búsqueda para: "${query}"\n\n`
      for (const r of results.slice(0, 5)) {
        md += `**${r.title}**\n${r.snippet}\n[${r.url}](${r.url})\n\n`
      }
    }

    if (!wiki && results.length === 0) {
      md += `No encontré resultados para "${query}". Intenta con otros términos de búsqueda.`
    }

    return md.trim()
  }

  private formatOSINTResult(type: string, data: unknown, query: string): string {
    const d = data as Record<string, unknown>
    const result = d?.result as Record<string, unknown> | undefined
    const r = result || d

    const field = (key: string): string => {
      const val = r?.[key]
      if (val === undefined || val === null || val === '' || val === 'Data in credit') return ''
      return String(val)
    }

    const line = (label: string, key: string): string => {
      const val = field(key)
      return val ? `**${label}:** ${val}` : ''
    }

    switch (type) {
      case 'dni': {
        const name = field('full_name') || [field('first_name'), field('first_last_name'), field('second_last_name')].filter(Boolean).join(' ')
        let md = `### DNI ${query}\n\n`
        if (name) md += `**${name}**\n\n`
        md += line('Documento', 'document_number') + '\n'
        md += line('Tipo', 'document_type') + '\n'
        md += line('Nacionalidad', 'nationality') + '\n'
        md += line('Nacimiento', 'birth_date') + '\n'
        md += line('Género', 'gender') + '\n'
        // Fields that require credits
        if (!field('address') && !field('phone')) {
          md += `\n---\n*Dirección, teléfono, email requieren **DNI Full** (créditos). Usa: \`dni full ${query}\`*`
        }
        return md
      }

      case 'dni_full': {
        const name = field('full_name') || [field('first_name'), field('first_last_name'), field('second_last_name')].filter(Boolean).join(' ')
        let md = `### DNI Full ${query}\n\n`
        if (name) md += `**${name}**\n\n`
        const fields = [
          ['Documento', 'document_number'],
          ['Nacimiento', 'birth_date'],
          ['Género', 'gender'],
          ['Nacionalidad', 'nationality'],
          ['Dirección', 'address'],
          ['Distrito', 'district'],
          ['Provincia', 'province'],
          ['Departamento', 'department'],
          ['Teléfono', 'phone'],
          ['Email', 'email'],
        ] as const
        for (const [label, key] of fields) {
          const l = line(label, key)
          if (l) md += l + '\n'
        }
        return md
      }

      case 'ruc': {
        let md = `### RUC ${query}\n\n`
        const name = field('razon_social') || field('nombre') || field('full_name')
        if (name) md += `**${name}**\n\n`
        const fields = [
          ['Estado', 'estado'] as const,
          ['Condición', 'condicion'] as const,
          ['Dirección', 'direccion'] as const,
          ['Distrito', 'distrito'] as const,
          ['Provincia', 'provincia'] as const,
          ['Departamento', 'departamento'] as const,
          ['Actividad', 'actividad'] as const,
        ]
        for (const [label, key] of fields) {
          const l = line(label, key)
          if (l) md += l + '\n'
        }
        if (Object.keys(r || {}).length === 0) {
          md += '```json\n' + JSON.stringify(data, null, 2) + '\n```'
        }
        return md
      }

      case 'phone_cell': {
        let md = `### Celular ${query}\n\n`
        const fields = [
          ['Nombre', 'nombre'] as const,
          ['Documento', 'documento'] as const,
          ['Operador', 'operador'] as const,
          ['Tipo', 'tipo'] as const,
        ]
        let hasFields = false
        for (const [label, key] of fields) {
          const l = line(label, key)
          if (l) { md += l + '\n'; hasFields = true }
        }
        if (!hasFields) {
          md += '```json\n' + JSON.stringify(data, null, 2) + '\n```'
        }
        return md
      }

      case 'family': {
        let md = `### Familia — DNI ${query}\n\n`
        if (Array.isArray(r)) {
          for (const member of r.slice(0, 10)) {
            const m = member as Record<string, unknown>
            md += `- **${m.nombre || m.name || 'Desconocido'}** (${m.vinculo || m.relacion || m.relation || '?'})\n`
          }
        } else {
          md += '```json\n' + JSON.stringify(data, null, 2) + '\n```'
        }
        return md
      }

      case 'plate': {
        let md = `### Placa ${query.toUpperCase()}\n\n`
        const fields = [
          ['Marca', 'marca'] as const,
          ['Modelo', 'modelo'] as const,
          ['Año', 'año'] as const,
          ['Color', 'color'] as const,
          ['Serie', 'serie'] as const,
          ['Motor', 'motor'] as const,
          ['Propietario', 'propietario'] as const,
        ]
        let hasFields = false
        for (const [label, key] of fields) {
          const l = line(label, key)
          if (l) { md += l + '\n'; hasFields = true }
        }
        if (!hasFields) {
          md += '```json\n' + JSON.stringify(data, null, 2) + '\n```'
        }
        return md
      }

      case 'name_search': {
        let md = `### Búsqueda: "${query}"\n\n`
        if (Array.isArray(r)) {
          for (const person of r.slice(0, 5)) {
            const p = person as Record<string, unknown>
            md += `- **${p.nombre || p.full_name || 'Desconocido'}** — DNI: ${p.documento || p.dni || '?'}\n`
          }
        } else {
          md += '```json\n' + JSON.stringify(data, null, 2) + '\n```'
        }
        return md
      }

      default:
        return `### Resultado OSINT (${type})\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
    }
  }
}
