import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('NEXUS ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold text-foreground mb-2">Algo salió mal</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              {this.state.error?.message || 'Error desconocido'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
