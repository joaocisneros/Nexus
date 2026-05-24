import { useChatStore } from '@/store/chatStore'
import type { ViewId } from '@/store/chatStore'

export function useSidebar() {
  const sidebarOpen = useChatStore((state) => state.sidebarOpen)
  const toggleSidebar = useChatStore((state) => state.toggleSidebar)
  const rightPanelOpen = useChatStore((state) => state.rightPanelOpen)
  const toggleRightPanel = useChatStore((state) => state.toggleRightPanel)
  const activeView = useChatStore((state) => state.activeView)
  const setActiveView = useChatStore((state) => state.setActiveView)

  return {
    sidebarOpen,
    toggleSidebar,
    rightPanelOpen,
    toggleRightPanel,
    activeView,
    setActiveView: (view: ViewId) => setActiveView(view),
  }
}
