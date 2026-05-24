import { motion, AnimatePresence } from 'framer-motion'
import {
  MessagesSquare,
  Folder,
  Terminal,
  Brain,
  Monitor,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bot,
  Zap,
  ImageIcon,
  Target,
  Network
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSidebar } from '@/hooks'
import type { ViewId } from '@/store/chatStore'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { activeView, setActiveView } = useSidebar()

  const menuItems: Array<{ id: ViewId; icon: typeof MessagesSquare; label: string }> = [
    { id: 'chat', icon: MessagesSquare, label: 'Chat' },
    { id: 'projects', icon: Folder, label: 'Proyectos' },
    { id: 'terminal', icon: Terminal, label: 'Terminal' },
    { id: 'memory', icon: Brain, label: 'Memoria' },
    { id: 'goals', icon: Target, label: 'Objetivos' },
    { id: 'workflows', icon: Zap, label: 'Workflows' },
    { id: 'image-prompts', icon: ImageIcon, label: 'Prompts' },
    { id: 'gitlawb', icon: Network, label: 'Gitlawb' },
    { id: 'monitor', icon: Monitor, label: 'Monitor' },
    { id: 'settings', icon: Settings, label: 'Config' },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={false}
        animate={{ width: isOpen ? '240px' : '60px' }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'h-full bg-card border-r border-border flex flex-col',
          'transition-colors duration-200',
          isOpen ? 'w-60' : 'w-16'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <Bot className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-foreground">NEXUS</h1>
            </motion.div>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {isOpen ? (
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveView(item.id)}
              className={cn(
                'w-full p-3 rounded-lg flex items-center gap-3',
                'text-left transition-colors duration-200',
                activeView === item.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'sidebar-item text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', activeView === item.id ? 'text-primary' : 'text-muted-foreground')} />
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn('text-sm font-medium', activeView === item.id ? 'text-primary' : 'text-foreground')}
                >
                  {item.label}
                </motion.span>
              )}
            </motion.button>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">J</span>
              </div>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <p className="text-sm font-medium text-foreground">Joao</p>
                  <p className="text-xs text-muted-foreground">Pro</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}