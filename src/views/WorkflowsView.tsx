import { useState, useEffect, useCallback } from 'react'
import { Play, Loader2, CheckCircle2, XCircle, Zap, ChevronRight } from 'lucide-react'

interface WorkflowTemplate {
  name: string
  description: string
  category: string
  steps: Array<{ id: string; name: string; type: string }>
}

interface WorkflowRun {
  id: string
  name: string
  description: string
  category: string
  status: string
  steps: Array<{ id: string; name: string; status: string; result?: unknown }>
  result?: unknown
}

export function WorkflowsView() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState<number | null>(null)
  const [executing, setExecuting] = useState<string | null>(null)
  const [input, setInput] = useState('')

  const loadTemplates = useCallback(async () => {
    try {
      const res = await window.electron.workflow.templates()
      if (res.success) setTemplates(res.result as WorkflowTemplate[])
    } catch { /* empty */ }
  }, [])

  const loadWorkflows = useCallback(async () => {
    try {
      const res = await window.electron.workflow.list()
      if (res.success) setWorkflows(res.result as WorkflowRun[])
    } catch { /* empty */ }
  }, [])

  useEffect(() => {
    loadTemplates()
    loadWorkflows()
  }, [loadTemplates, loadWorkflows])

  const handleCreate = async (index: number) => {
    setLoading(index)
    try {
      const res = await window.electron.workflow.create(index)
      if (res.success) {
        const workflow = res.result as WorkflowRun
        await loadWorkflows()
        setExecuting(workflow.id)
        await window.electron.workflow.execute(workflow.id, input || undefined)
        await loadWorkflows()
        setExecuting(null)
      }
    } catch { /* empty */ }
    setLoading(null)
  }

  const categoryIcons: Record<string, string> = {
    analysis: '🔍',
    research: '📚',
    memory: '🧠',
    coding: '💻',
    automation: '⚙️',
  }

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">Workflows</h2>
        <p className="text-sm text-muted-foreground">Automatizaciones inspiradas en n8n</p>
      </div>

      {/* Input for workflows */}
      <div className="glass-card p-3 rounded-lg mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Input para el workflow (archivo, tema, código...)"
          className="w-full bg-transparent border-none outline-none text-foreground text-sm placeholder:text-muted-foreground"
        />
      </div>

      {/* Templates */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Templates Disponibles</h3>
        <div className="grid grid-cols-1 gap-3">
          {templates.map((template, i) => (
            <button
              key={i}
              onClick={() => handleCreate(i)}
              disabled={loading === i}
              className="glass-card p-4 rounded-lg text-left hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{categoryIcons[template.category] || '⚡'}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{template.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                    <div className="flex gap-1 mt-2">
                      {template.steps.map((step) => (
                        <span key={step.id} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {step.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {loading === i ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Executed workflows */}
      {workflows.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Workflows Ejecutados</h3>
          <div className="space-y-3">
            {workflows.map((wf) => (
              <div key={wf.id} className="glass-card p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{wf.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {executing === wf.id && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                    {wf.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {wf.status === 'failed' && <XCircle className="h-4 w-4 text-destructive" />}
                    {wf.status === 'running' && <Play className="h-4 w-4 text-yellow-500 animate-pulse" />}
                    <span className="text-xs text-muted-foreground">{wf.status}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {wf.steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-2 text-xs">
                      {step.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                      {step.status === 'failed' && <XCircle className="h-3 w-3 text-destructive" />}
                      {step.status === 'running' && <Loader2 className="h-3 w-3 text-primary animate-spin" />}
                      {step.status === 'pending' && <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
                      <span className={step.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'}>
                        {step.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
