import { useState, useEffect } from 'react'
import { Cpu, HardDrive, Activity, Clock } from 'lucide-react'

interface SystemInfo {
  platform: string
  arch: string
  nodeVersion: string
  electronVersion: string
  uptime: number
  totalMemory: number
  freeMemory: number
  cpus: number
}

export function MonitorView() {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [uptime, setUptime] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const result = await window.electron.brain.systemInfo()
        if (result.success && result.result) {
          setInfo(result.result)
          setUptime(Math.floor(result.result.uptime))
        }
      } catch {
        // ignore
      }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setUptime((u) => u + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
  }

  const memoryUsedPct = info
    ? Math.round(((info.totalMemory - info.freeMemory) / info.totalMemory) * 100)
    : 0

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">Monitor del Sistema</h2>
        <p className="text-sm text-muted-foreground">Estado en tiempo real del sistema</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4 rounded-lg">
          <Cpu className="h-5 w-5 text-primary mb-2" />
          <p className="text-lg font-bold text-foreground">{info?.cpus ?? '—'}</p>
          <p className="text-xs text-muted-foreground">CPUs</p>
        </div>
        <div className="glass-card p-4 rounded-lg">
          <HardDrive className="h-5 w-5 text-cyan-500 mb-2" />
          <p className="text-lg font-bold text-foreground">{memoryUsedPct}%</p>
          <p className="text-xs text-muted-foreground">RAM usada</p>
        </div>
        <div className="glass-card p-4 rounded-lg">
          <Clock className="h-5 w-5 text-green-500 mb-2" />
          <p className="text-lg font-bold text-foreground">{formatUptime(uptime)}</p>
          <p className="text-xs text-muted-foreground">Uptime</p>
        </div>
        <div className="glass-card p-4 rounded-lg">
          <Activity className="h-5 w-5 text-orange-500 mb-2" />
          <p className="text-lg font-bold text-foreground">{info?.platform ?? '—'}</p>
          <p className="text-xs text-muted-foreground">Plataforma</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-4 rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-3">Memoria RAM</h3>
          <div className="w-full bg-muted rounded-full h-4 mb-2">
            <div
              className="bg-primary h-4 rounded-full transition-all duration-500"
              style={{ width: `${memoryUsedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{info ? `${Math.round((info.totalMemory - info.freeMemory) / 1024 / 1024)}MB usados` : '—'}</span>
            <span>{info ? `${Math.round(info.totalMemory / 1024 / 1024)}MB total` : '—'}</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-3">Información del Sistema</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plataforma</span>
              <span className="text-foreground">{info?.platform ?? '—'} ({info?.arch ?? '—'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Node.js</span>
              <span className="text-foreground">{info?.nodeVersion ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Electron</span>
              <span className="text-foreground">{info?.electronVersion ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CPUs</span>
              <span className="text-foreground">{info?.cpus ?? '—'} núcleos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
