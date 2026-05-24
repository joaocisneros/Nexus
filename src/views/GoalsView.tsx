import { useState, useEffect, useCallback } from 'react'
import { Target, Loader2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'

interface GoalStep {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  result?: string
}

interface Goal {
  id: string
  objective: string
  steps: GoalStep[]
  status: string
  createdAt: string
  completedAt?: string
  summary?: string
}

export function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [objective, setObjective] = useState('')
  const [creating, setCreating] = useState(false)

  const loadGoals = useCallback(async () => {
    try {
      const res = await window.electron.goal.list()
      if (res.success) setGoals(res.result as Goal[])
    } catch { /* empty */ }
  }, [])

  useEffect(() => { loadGoals() }, [loadGoals])

  const handleStartGoal = async () => {
    if (!objective.trim()) return
    setCreating(true)
    try {
      const res = await window.electron.goal.start(objective)
      if (res.success) {
        setObjective('')
        await loadGoals()
      }
    } catch { /* empty */ }
    setCreating(false)
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />
      case 'executing': return <Loader2 className="h-4 w-4 text-primary animate-spin" />
      case 'planning': return <Loader2 className="h-4 w-4 text-cyan-500 animate-spin" />
      default: return <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
    }
  }

  const activeGoals = goals.filter(g => g.status === 'executing' || g.status === 'planning')
  const completedGoals = goals.filter(g => g.status === 'completed' || g.status === 'failed' || g.status === 'cancelled')

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">Objetivos Autónomos</h2>
        <p className="text-sm text-muted-foreground">Protocolo ACP — ejecución autónoma multi-paso</p>
      </div>

      {/* Create goal */}
      <div className="glass-card p-4 rounded-lg mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartGoal()}
            placeholder="Describe un objetivo complejo... (ej: Analiza mi proyecto y sugiere mejoras)"
            className="flex-1 bg-transparent border-none outline-none text-foreground text-sm placeholder:text-muted-foreground"
            disabled={creating}
          />
          <button
            onClick={handleStartGoal}
            disabled={creating || !objective.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
            Iniciar
          </button>
        </div>
      </div>

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Activos</h3>
          <div className="space-y-3">
            {activeGoals.map((goal) => (
              <div key={goal.id} className="glass-card p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {statusIcon(goal.status)}
                    <span className="text-sm font-medium text-foreground">{goal.objective}</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                  <div
                    className="bg-primary rounded-full h-1.5 transition-all duration-500"
                    style={{ width: `${goal.steps.length > 0 ? (goal.steps.filter(s => s.status === 'completed').length / goal.steps.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="space-y-1.5">
                  {goal.steps.map((step) => (
                    <div key={step.id} className="flex items-start gap-2 text-xs">
                      {step.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />}
                      {step.status === 'failed' && <XCircle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />}
                      {step.status === 'in_progress' && <Loader2 className="h-3 w-3 text-primary animate-spin mt-0.5 flex-shrink-0" />}
                      {step.status === 'pending' && <div className="h-3 w-3 rounded-full border border-muted-foreground/30 mt-0.5 flex-shrink-0" />}
                      {step.status === 'skipped' && <div className="h-3 w-3 rounded-full bg-muted mt-0.5 flex-shrink-0" />}
                      <span className={step.status === 'completed' ? 'text-foreground' : step.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}>
                        {step.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Historial</h3>
          <div className="space-y-3">
            {completedGoals.map((goal) => (
              <div key={goal.id} className="glass-card p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(goal.status)}
                    <span className="text-sm text-foreground">{goal.objective}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{goal.steps.filter(s => s.status === 'completed').length}/{goal.steps.length} pasos</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                {goal.summary && (
                  <p className="text-xs text-muted-foreground ml-6 mt-1">{goal.summary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay objetivos creados</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Describe un objetivo complejo y NEXUS lo ejecutará autónomamente</p>
          </div>
        </div>
      )}
    </div>
  )
}
