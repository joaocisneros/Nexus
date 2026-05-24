import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppLayout } from './layouts/AppLayout'
import './App.css'

function App() {
  // Auto-load saved OSINT token on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('nexus-osint-token')
    if (savedToken) {
      window.electron.osint.setToken(savedToken).catch(() => {})
    } else {
      const defaultToken = import.meta.env.VITE_CODART_TOKEN || ''
      if (defaultToken) {
        localStorage.setItem('nexus-osint-token', defaultToken)
        window.electron.osint.setToken(defaultToken).catch(() => {})
      }
    }
  }, [])

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen bg-background">
        <AppLayout />
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          className="font-sans"
        />
      </div>
    </ErrorBoundary>
  )
}

export default App
