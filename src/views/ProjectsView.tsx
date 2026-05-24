import { useState, useEffect } from 'react'
import { Folder, FileCode, Package, GitBranch } from 'lucide-react'

export function ProjectsView() {
  const [analysis, setAnalysis] = useState<{
    path: string
    totalFiles: number
    totalLines: number
    languages: Record<string, number>
    frameworks: string[]
    structure: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const analyzeProject = async () => {
    setLoading(true)
    try {
      const result = await window.electron.brain.analyzeProject()
      if (result.success && result.result) {
        setAnalysis(result.result)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    analyzeProject()
  }, [])

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Proyectos</h2>
          <p className="text-sm text-muted-foreground">Análisis del proyecto actual</p>
        </div>
        <button
          onClick={analyzeProject}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Analizando...' : 'Re-analizar'}
        </button>
      </div>

      {analysis ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-lg">
              <Folder className="h-5 w-5 text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{analysis.totalFiles}</p>
              <p className="text-xs text-muted-foreground">Archivos</p>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <FileCode className="h-5 w-5 text-cyan-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{analysis.totalLines.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Líneas de código</p>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <Package className="h-5 w-5 text-green-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{Object.keys(analysis.languages).length}</p>
              <p className="text-xs text-muted-foreground">Lenguajes</p>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <GitBranch className="h-5 w-5 text-orange-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{analysis.frameworks.length}</p>
              <p className="text-xs text-muted-foreground">Frameworks</p>
            </div>
          </div>

          <div className="glass-card p-4 rounded-lg">
            <h3 className="text-sm font-medium text-foreground mb-3">Lenguajes</h3>
            <div className="space-y-2">
              {Object.entries(analysis.languages)
                .sort(([, a], [, b]) => b - a)
                .map(([lang, count]) => {
                  const total = Object.values(analysis.languages).reduce((s, v) => s + v, 0)
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={lang} className="flex items-center gap-3">
                      <span className="text-sm text-foreground w-28">{lang}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                    </div>
                  )
                })}
            </div>
          </div>

          {analysis.frameworks.length > 0 && (
            <div className="glass-card p-4 rounded-lg">
              <h3 className="text-sm font-medium text-foreground mb-3">Frameworks detectados</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.frameworks.map((fw) => (
                  <span key={fw} className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                    {fw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card p-4 rounded-lg">
            <h3 className="text-sm font-medium text-foreground mb-3">Estructura</h3>
            <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{analysis.structure}</pre>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">
            {loading ? 'Analizando proyecto...' : 'No se pudo analizar el proyecto'}
          </p>
        </div>
      )}
    </div>
  )
}
