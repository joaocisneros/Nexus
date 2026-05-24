/**
 * WorkflowEngine — Automation templates inspired by n8n
 * Pre-built workflows for common tasks
 */

import { ipcMain } from 'electron'
import { aiChat } from '../ai/aiIpc'
import { getSQLiteMemoryStore } from '../memory/SQLiteMemoryStore'
import { buildWorkflowStepPrompt } from '../prompts/NexusPrompts'

export interface WorkflowStep {
  id: string
  name: string
  type: 'input' | 'process' | 'output' | 'condition' | 'loop'
  config: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: unknown
}

export interface Workflow {
  id: string
  name: string
  description: string
  category: 'analysis' | 'automation' | 'research' | 'coding' | 'memory'
  steps: WorkflowStep[]
  status: 'idle' | 'running' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  result?: unknown
}

// Pre-built workflow templates
const WORKFLOW_TEMPLATES: Array<Omit<Workflow, 'id' | 'status' | 'createdAt'>> = [
  {
    name: 'Análisis de Código',
    description: 'Analiza un archivo o directorio, identifica patrones, sugiere mejoras y genera documentación.',
    category: 'analysis',
    steps: [
      { id: 'read', name: 'Leer código', type: 'input', config: { source: 'file' }, status: 'pending' },
      { id: 'analyze', name: 'Analizar estructura', type: 'process', config: { ai: true }, status: 'pending' },
      { id: 'patterns', name: 'Detectar patrones', type: 'process', config: { ai: true }, status: 'pending' },
      { id: 'suggest', name: 'Sugerir mejoras', type: 'process', config: { ai: true }, status: 'pending' },
      { id: 'output', name: 'Generar reporte', type: 'output', config: { format: 'markdown' }, status: 'pending' },
    ],
  },
  {
    name: 'Investigación Web',
    description: 'Busca información en internet, sintetiza resultados y genera un resumen ejecutivo.',
    category: 'research',
    steps: [
      { id: 'search', name: 'Buscar en web', type: 'input', config: { source: 'web' }, status: 'pending' },
      { id: 'wikipedia', name: 'Consultar Wikipedia', type: 'process', config: { source: 'wikipedia' }, status: 'pending' },
      { id: 'synthesize', name: 'Sintetizar información', type: 'process', config: { ai: true }, status: 'pending' },
      { id: 'output', name: 'Generar resumen', type: 'output', config: { format: 'markdown' }, status: 'pending' },
    ],
  },
  {
    name: 'Consolidación de Memoria',
    description: 'Revisa memorias recientes, elimina duplicados, actualiza importancia y consolida conocimiento.',
    category: 'memory',
    steps: [
      { id: 'load', name: 'Cargar memorias', type: 'input', config: { source: 'memory' }, status: 'pending' },
      { id: 'dedup', name: 'Eliminar duplicados', type: 'process', config: { algorithm: 'similarity' }, status: 'pending' },
      { id: 'rank', name: 'Re-calificar importancia', type: 'process', config: { ai: true }, status: 'pending' },
      { id: 'consolidate', name: 'Consolidar patrones', type: 'process', config: { ai: true }, status: 'pending' },
      { id: 'output', name: 'Guardar resultado', type: 'output', config: { target: 'memory' }, status: 'pending' },
    ],
  },
  {
    name: 'Refactorización Asistida',
    description: 'Analiza código, identifica code smells, propone refactorización y genera el código mejorado.',
    category: 'coding',
    steps: [
      { id: 'read', name: 'Leer código fuente', type: 'input', config: { source: 'file' }, status: 'pending' },
      { id: 'smells', name: 'Detectar code smells', type: 'process', config: { ai: true }, status: 'pending' },
      { id: 'plan', name: 'Planificar refactor', type: 'process', config: { ai: true }, status: 'pending' },
      { id: 'generate', name: 'Generar código mejorado', type: 'process', config: { ai: true }, status: 'pending' },
      { id: 'output', name: 'Mostrar diff', type: 'output', config: { format: 'diff' }, status: 'pending' },
    ],
  },
  {
    name: 'Generación de Documentación',
    description: 'Lee el código fuente y genera documentación completa con ejemplos de uso.',
    category: 'automation',
    steps: [
      { id: 'read', name: 'Leer código', type: 'input', config: { source: 'file' }, status: 'pending' },
      { id: 'analyze', name: 'Analizar API', type: 'process', config: { ai: true }, status: 'pending' },
      { id: 'generate', name: 'Generar docs', type: 'process', config: { ai: true }, status: 'pending' },
      { id: 'output', name: 'Guardar documentación', type: 'output', config: { format: 'markdown', target: 'file' }, status: 'pending' },
    ],
  },
]

class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map()

  getTemplates(): Array<Omit<Workflow, 'id' | 'status' | 'createdAt'>> {
    return WORKFLOW_TEMPLATES
  }

  createWorkflow(templateIndex: number): Workflow {
    const template = WORKFLOW_TEMPLATES[templateIndex]
    if (!template) throw new Error('Template not found')

    const workflow: Workflow = {
      ...template,
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'idle',
      createdAt: new Date(),
      steps: template.steps.map(s => ({ ...s, status: 'pending' as const })),
    }

    this.workflows.set(workflow.id, workflow)
    return workflow
  }

  async executeWorkflow(workflowId: string, input?: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) throw new Error('Workflow not found')

    workflow.status = 'running'
    const memory = getSQLiteMemoryStore()

    for (const step of workflow.steps) {
      step.status = 'running'

      try {
        switch (step.type) {
          case 'input':
            step.result = input || '(no input provided)'
            break

          case 'process':
            if (step.config.ai) {
              const context = workflow.steps
                .filter(s => s.result)
                .map(s => `${s.name}: ${JSON.stringify(s.result).slice(0, 200)}`)
                .join('\n')

              step.result = await aiChat([
                {
                  role: 'system',
                  content: buildWorkflowStepPrompt(workflow.name, step.name),
                },
                { role: 'user', content: `Contexto:\n${context}\n\nTarea: ${step.name}\nInput adicional: ${input || 'ninguno'}` },
              ])
            } else {
              step.result = `Paso ${step.name} completado (sin AI)`
            }
            break

          case 'output':
            if (step.config.target === 'memory' && input) {
              memory.saveMemory({
                type: 'learning',
                content: `Workflow "${workflow.name}": ${JSON.stringify(workflow.steps.map(s => s.result)).slice(0, 500)}`,
                importance: 7,
                tags: ['workflow', workflow.category],
              })
            }
            step.result = 'Output generado'
            break

          case 'condition':
            step.result = true
            break

          case 'loop':
            step.result = 'Loop completado'
            break
        }

        step.status = 'completed'
      } catch (error) {
        step.status = 'failed'
        step.result = `Error: ${(error as Error).message}`
        workflow.status = 'failed'
        return workflow
      }
    }

    workflow.status = 'completed'
    workflow.completedAt = new Date()
    workflow.result = workflow.steps[workflow.steps.length - 1]?.result

    return workflow
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id)
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values())
  }
}

const engine = new WorkflowEngine()

export function registerWorkflowHandlers() {
  ipcMain.handle('workflow:templates', async () => {
    return { success: true, result: engine.getTemplates() }
  })

  ipcMain.handle('workflow:create', async (_event, templateIndex: number) => {
    try {
      const workflow = engine.createWorkflow(templateIndex)
      return { success: true, result: workflow }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('workflow:execute', async (_event, workflowId: string, input?: string) => {
    try {
      const result = await engine.executeWorkflow(workflowId, input)
      return { success: true, result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('workflow:list', async () => {
    return { success: true, result: engine.getAllWorkflows() }
  })

  ipcMain.handle('workflow:get', async (_event, id: string) => {
    const workflow = engine.getWorkflow(id)
    return workflow
      ? { success: true, result: workflow }
      : { success: false, error: 'Workflow not found' }
  })
}
