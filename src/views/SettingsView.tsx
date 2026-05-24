import { useState, useEffect } from 'react'
import { Monitor, Globe, Brain, Zap, Shield, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'

export function SettingsView() {
  const { currentModel, setCurrentModel } = useChatStore()
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('nexus-theme') as 'dark' | 'light') || 'dark'
  })
  const [osintToken, setOsintToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')

  useEffect(() => {
    const saved = localStorage.getItem('nexus-osint-token')
    if (saved) {
      setOsintToken(saved)
      window.electron.osint.setToken(saved)
      setTokenStatus('ok')
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('nexus-theme', theme)
  }, [theme])

  const handleSaveToken = async () => {
    if (!osintToken.trim()) return
    localStorage.setItem('nexus-osint-token', osintToken)
    await window.electron.osint.setToken(osintToken)
    // Test with a simple DNI query
    setTokenStatus('testing')
    try {
      const res = await window.electron.osint.dni('00000000')
      setTokenStatus(res.success ? 'ok' : 'error')
    } catch {
      setTokenStatus('error')
    }
  }

  const models = [
    { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', description: 'Modelo más avanzado' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', description: 'Rápido y eficiente' },
    { id: 'llama2', name: 'Llama 2', provider: 'Ollama (local)', description: 'Ejecución local, sin costo' },
  ]

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">Configuración</h2>
        <p className="text-sm text-muted-foreground">Ajustes de NEXUS</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* AI Model */}
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Modelo de IA</h3>
          </div>
          <div className="space-y-2">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => setCurrentModel(model.id)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  currentModel === model.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-accent border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{model.name}</p>
                    <p className="text-xs text-muted-foreground">{model.provider} — {model.description}</p>
                  </div>
                  {currentModel === model.id && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="h-5 w-5 text-cyan-500" />
            <h3 className="text-sm font-medium text-foreground">Apariencia</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Tema</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-3 py-1 rounded-lg bg-muted/50 border border-border text-sm text-foreground hover:bg-accent transition-colors capitalize"
            >
              {theme === 'dark' ? 'Oscuro' : 'Claro'}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-green-500" />
            <h3 className="text-sm font-medium text-foreground">Funcionalidades</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Búsqueda web</span>
              <span className="text-xs text-green-500">Activa</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Cerebro local</span>
              <span className="text-xs text-green-500">Activa</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Aprendizaje en background</span>
              <span className="text-xs text-muted-foreground">Desactivado</span>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-orange-500" />
            <h3 className="text-sm font-medium text-foreground">Idioma</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Idioma de la interfaz</span>
            <span className="text-sm text-muted-foreground">Español</span>
          </div>
        </div>

        {/* CODART OSINT Token */}
        <div className="glass-card p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-medium text-foreground">CODART API Token (OSINT)</h3>
            {tokenStatus === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {tokenStatus === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Necesario para consultas DNI, RUC, teléfonos y placas.{' '}
            <a href="https://api-codart.cgrt.org" target="_blank" rel="noopener" className="text-primary underline">
              Obtener token gratis
            </a>
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showToken ? 'text' : 'password'}
                value={osintToken}
                onChange={(e) => { setOsintToken(e.target.value); setTokenStatus('idle') }}
                placeholder="Pega tu token de CODART aquí..."
                className="w-full px-3 py-2 pr-10 rounded-lg bg-muted/50 border border-border text-sm text-foreground outline-none focus:border-primary/50"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={handleSaveToken}
              disabled={!osintToken.trim() || tokenStatus === 'testing'}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {tokenStatus === 'testing' ? 'Verificando...' : 'Guardar'}
            </button>
          </div>
          {tokenStatus === 'error' && (
            <p className="text-xs text-red-500 mt-2">Token inválido o error de conexión</p>
          )}
          {tokenStatus === 'ok' && (
            <p className="text-xs text-green-500 mt-2">Token configurado correctamente</p>
          )}
        </div>
      </div>
    </div>
  )
}
