import { motion, AnimatePresence } from 'framer-motion'
import { Target, CheckCircle2, Circle, Loader2, XCircle, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useChatStore, type GoalStep } from '@/store/chatStore'

export function GoalMode() {
  const { currentGoal, clearGoal } = useChatStore()

  if (!currentGoal) return null

  const statusColors = {
    idle: 'text-muted-foreground',
    planning: 'text-yellow-400',
    executing: 'text-blue-400',
    reviewing: 'text-purple-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
  }

  const statusLabels = {
    idle: 'Inactivo',
    planning: 'Planificando',
    executing: 'Ejecutando',
    reviewing: 'Revisando',
    completed: 'Completado',
    failed: 'Fallido',
  }

  const progress = currentGoal.steps.length > 0
    ? Math.round((currentGoal.steps.filter(s => s.status === 'completed').length / currentGoal.steps.length) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-border/50 bg-card/30 backdrop-blur-sm"
    >
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-6 h-6 rounded-lg flex items-center justify-center',
              currentGoal.status === 'completed' ? 'bg-green-500/15' :
              currentGoal.status === 'failed' ? 'bg-red-500/15' :
              'bg-primary/15'
            )}>
              {currentGoal.status === 'executing' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : currentGoal.status === 'completed' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              ) : currentGoal.status === 'failed' ? (
                <XCircle className="h-3.5 w-3.5 text-red-400" />
              ) : (
                <Target className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{currentGoal.objective}</p>
              <p className={cn('text-[10px]', statusColors[currentGoal.status])}>
                {statusLabels[currentGoal.status]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{progress}%</span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={clearGoal}
              className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </motion.button>
          </div>
        </div>

        {/* Progress bar */}
        {currentGoal.steps.length > 0 && (
          <div className="h-1 bg-muted/50 rounded-full mb-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                currentGoal.status === 'completed' ? 'bg-green-400' :
                currentGoal.status === 'failed' ? 'bg-red-400' :
                'bg-primary'
              )}
            />
          </div>
        )}

        {/* Steps */}
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          <AnimatePresence>
            {currentGoal.steps.map((step, i) => (
              <StepItem key={step.id} step={step} index={i} isActive={i === currentGoal.currentStepIndex} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

function StepItem({ step, index, isActive }: { step: GoalStep; index: number; isActive: boolean }) {
  const icon = step.status === 'completed' ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
  ) : step.status === 'in_progress' ? (
    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
  ) : step.status === 'failed' ? (
    <XCircle className="h-3.5 w-3.5 text-red-400" />
  ) : (
    <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors',
        isActive && 'bg-primary/5 border border-primary/10',
        step.status === 'completed' && 'opacity-60'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs leading-relaxed',
          step.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground/80'
        )}>
          {step.description}
        </p>
        {step.result && step.status === 'failed' && (
          <p className="text-[10px] text-red-400/80 mt-0.5">{step.result}</p>
        )}
      </div>
      {isActive && (
        <ChevronRight className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
      )}
    </motion.div>
  )
}
