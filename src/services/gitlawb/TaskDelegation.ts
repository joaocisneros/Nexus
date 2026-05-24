import * as GitlawbService from './GitlawbService'

export interface DelegatedTask {
  id: string
  targetDid: string
  task: string
  capabilities: string[]
  status: 'pending' | 'accepted' | 'completed' | 'failed'
  result?: unknown
  createdAt: string
  completedAt?: string
}

const activeTasks = new Map<string, DelegatedTask>()

export async function delegateTask(
  targetDid: string,
  task: string,
  capabilities: string[]
): Promise<DelegatedTask> {
  const taskId = await GitlawbService.delegateTask(targetDid, task, capabilities)

  const delegated: DelegatedTask = {
    id: taskId,
    targetDid,
    task,
    capabilities,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  activeTasks.set(taskId, delegated)
  return delegated
}

export async function reportResult(taskId: string, result: unknown): Promise<void> {
  await GitlawbService.reportTaskResult(taskId, result)

  const task = activeTasks.get(taskId)
  if (task) {
    task.status = 'completed'
    task.result = result
    task.completedAt = new Date().toISOString()
  }
}

export function getActiveTasks(): DelegatedTask[] {
  return Array.from(activeTasks.values())
}

export function getTask(taskId: string): DelegatedTask | undefined {
  return activeTasks.get(taskId)
}
