import { Sidebar } from './Sidebar'
import { MainContent } from './MainContent'
import { RightPanel } from './RightPanel'
import { ProjectsView } from '@/views/ProjectsView'
import { TerminalView } from '@/views/TerminalView'
import { MemoryView } from '@/views/MemoryView'
import { MonitorView } from '@/views/MonitorView'
import { SettingsView } from '@/views/SettingsView'
import { WorkflowsView } from '@/views/WorkflowsView'
import { PromptsView } from '@/views/PromptsView'
import { GoalsView } from '@/views/GoalsView'
import { GitlawbView } from '@/views/GitlawbView'
import { useSidebar } from '@/hooks'

export function AppLayout() {
  const { sidebarOpen, toggleSidebar, rightPanelOpen, toggleRightPanel, activeView } = useSidebar()

  const renderView = () => {
    switch (activeView) {
      case 'projects':
        return <ProjectsView />
      case 'terminal':
        return <TerminalView />
      case 'memory':
        return <MemoryView />
      case 'goals':
        return <GoalsView />
      case 'workflows':
        return <WorkflowsView />
      case 'image-prompts':
        return <PromptsView />
      case 'monitor':
        return <MonitorView />
      case 'gitlawb':
        return <GitlawbView />
      case 'settings':
        return <SettingsView />
      case 'chat':
      default:
        return (
          <MainContent
            sidebarOpen={sidebarOpen}
            onToggleRightPanel={toggleRightPanel}
          />
        )
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      <div className="flex-1 min-w-0">
        {renderView()}
      </div>

      {activeView === 'chat' && (
        <RightPanel
          isOpen={rightPanelOpen}
          onClose={toggleRightPanel}
        />
      )}
    </div>
  )
}
