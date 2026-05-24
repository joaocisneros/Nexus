import { useState, useRef, useEffect } from 'react'
import { Terminal as TerminalIcon, Play } from 'lucide-react'

interface HistoryEntry {
  id: number
  command: string
  output: string
  success: boolean
}

export function TerminalView() {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([
    { id: 0, command: '', output: 'NEXUS Terminal — Escribe un comando para empezar.\nComandos disponibles: help, clear, date, echo, sysinfo, capabilities', success: true },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const executeCommand = async () => {
    const cmd = input.trim()
    if (!cmd) return
    setInput('')

    const parts = cmd.split(/\s+/)
    const command = parts[0]
    const args = parts.slice(1)

    let output = ''
    let success = true

    try {
      if (command === 'help') {
        output = `Comandos disponibles:
  help          — Muestra esta ayuda
  clear         — Limpia el historial
  date          — Fecha y hora actual
  echo <texto>  — Muestra texto
  sysinfo       — Información del sistema (via IPC)
  capabilities  — Capacidades de NEXUS (via IPC)`
      } else if (command === 'clear') {
        setHistory([])
        return
      } else if (command === 'date') {
        output = new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'long' })
      } else if (command === 'echo') {
        output = args.join(' ')
      } else if (command === 'sysinfo') {
        const result = await window.electron.brain.systemInfo()
        if (result.success && result.result) {
          const info = result.result
          output = `Sistema: ${info.platform} ${info.arch}
Node: ${info.nodeVersion}
Electron: ${info.electronVersion}
Uptime: ${Math.round(info.uptime / 60)} min
RAM: ${Math.round(info.freeMemory / 1024 / 1024)}MB libre / ${Math.round(info.totalMemory / 1024 / 1024)}MB total
CPUs: ${info.cpus}`
        } else {
          output = `Error: ${result.error}`
          success = false
        }
      } else if (command === 'capabilities') {
        const result = await window.electron.brain.capabilities()
        if (result.success && result.result) {
          const caps = result.result
          output = `IA disponible: ${caps.aiAvailable ? 'Sí' : 'No'}
Web disponible: ${caps.webAvailable ? 'Sí' : 'No'}
Capacidades locales: ${caps.localCapabilities.join(', ')}`
        } else {
          output = `Error: ${result.error}`
          success = false
        }
      } else {
        output = `Comando no reconocido: ${command}\nEscribe "help" para ver comandos disponibles.`
        success = false
      }
    } catch (err) {
      output = `Error: ${err instanceof Error ? err.message : String(err)}`
      success = false
    }

    setHistory((prev) => [...prev, { id: Date.now(), command: cmd, output, success }])
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <TerminalIcon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Terminal</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-3">
        {history.map((entry) => (
          <div key={entry.id}>
            {entry.command && (
              <div className="flex items-center gap-2 text-foreground">
                <span className="text-primary">{'>'}</span>
                <span>{entry.command}</span>
              </div>
            )}
            {entry.output && (
              <pre className={`text-xs whitespace-pre-wrap mt-1 ${entry.success ? 'text-muted-foreground' : 'text-red-400'}`}>
                {entry.output}
              </pre>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-primary font-mono">{'>'}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
            placeholder="Escribe un comando..."
            className="flex-1 bg-transparent border-none outline-none text-foreground text-sm font-mono placeholder:text-muted-foreground"
            autoFocus
          />
          <button onClick={executeCommand} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <Play className="h-4 w-4 text-primary" />
          </button>
        </div>
      </div>
    </div>
  )
}
