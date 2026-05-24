import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, User, Building2, Phone, Car, Users, FileText, X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface OsintQuickSearchProps {
  onSearch: (query: string) => void
  compact?: boolean
}

type QueryType = {
  id: string
  label: string
  icon: React.ReactNode
  placeholder: string
  prefix: string
  color: string
  tier: 'free' | 'credit'
}

const QUERY_TYPES: QueryType[] = [
  {
    id: 'dni',
    label: 'DNI',
    icon: <User className="h-4 w-4" />,
    placeholder: 'Ej: 70057895',
    prefix: '',
    color: 'text-emerald-400',
    tier: 'free',
  },
  {
    id: 'ruc',
    label: 'RUC',
    icon: <Building2 className="h-4 w-4" />,
    placeholder: 'Ej: 20123456789',
    prefix: '',
    color: 'text-blue-400',
    tier: 'free',
  },
  {
    id: 'dni-full',
    label: 'DNI Full',
    icon: <FileText className="h-4 w-4" />,
    placeholder: 'Ej: 70057895',
    prefix: 'dni full ',
    color: 'text-amber-400',
    tier: 'credit',
  },
  {
    id: 'family',
    label: 'Familia',
    icon: <Users className="h-4 w-4" />,
    placeholder: 'Ej: 70057895',
    prefix: 'familia ',
    color: 'text-purple-400',
    tier: 'credit',
  },
  {
    id: 'phone',
    label: 'Teléfono',
    icon: <Phone className="h-4 w-4" />,
    placeholder: 'Ej: 70057895',
    prefix: 'telefono ',
    color: 'text-cyan-400',
    tier: 'credit',
  },
  {
    id: 'cell',
    label: 'Celular',
    icon: <Phone className="h-4 w-4" />,
    placeholder: 'Ej: 987654321',
    prefix: '',
    color: 'text-sky-400',
    tier: 'credit',
  },
  {
    id: 'plate',
    label: 'Placa',
    icon: <Car className="h-4 w-4" />,
    placeholder: 'Ej: ABC123',
    prefix: '',
    color: 'text-orange-400',
    tier: 'credit',
  },
  {
    id: 'name',
    label: 'Nombre',
    icon: <Search className="h-4 w-4" />,
    placeholder: 'Ej: Cisneros Maldonado, Joao',
    prefix: '',
    color: 'text-pink-400',
    tier: 'credit',
  },
]

export function OsintQuickSearch({ onSearch, compact = false }: OsintQuickSearchProps) {
  const [selected, setSelected] = useState<QueryType | null>(null)
  const [inputValue, setInputValue] = useState('')

  const handleSelect = (type: QueryType) => {
    if (selected?.id === type.id) {
      setSelected(null)
      setInputValue('')
    } else {
      setSelected(type)
      setInputValue('')
    }
  }

  const handleSubmit = () => {
    if (!inputValue.trim() || !selected) return
    const query = `${selected.prefix}${inputValue.trim()}`
    onSearch(query)
    setInputValue('')
    setSelected(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setSelected(null)
      setInputValue('')
    }
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
          <Search className="h-3.5 w-3.5" />
          <span>Consultas OSINT directas</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Tier 1 gratis
          </span>
        </div>
      )}

      {/* Query type buttons */}
      <div className={cn(
        'grid gap-2',
        compact ? 'grid-cols-4' : 'grid-cols-4'
      )}>
        {QUERY_TYPES.map((type) => (
          <motion.button
            key={type.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(type)}
            className={cn(
              'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-200',
              selected?.id === type.id
                ? 'bg-card border-primary/40 shadow-lg shadow-primary/10'
                : 'bg-card/40 border-border/30 hover:bg-card/70 hover:border-border/60'
            )}
          >
            <div className={cn(
              'p-2 rounded-lg transition-colors',
              selected?.id === type.id
                ? 'bg-primary/15 text-primary'
                : 'bg-muted/40 text-muted-foreground'
            )}>
              {type.icon}
            </div>
            <span className={cn(
              'text-[11px] font-medium transition-colors',
              selected?.id === type.id ? 'text-foreground' : 'text-muted-foreground/80'
            )}>
              {type.label}
            </span>
            {type.tier === 'free' ? (
              <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                Gratis
              </span>
            ) : (
              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">
                Créditos
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Input field (appears when type is selected) */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 p-1 bg-card/60 rounded-xl border border-border/40">
              <div className={cn('pl-3', selected.color)}>
                {selected.icon}
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selected.placeholder}
                autoFocus
                className="flex-1 bg-transparent py-2.5 px-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={!inputValue.trim()}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-medium transition-all',
                    inputValue.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed'
                  )}
                >
                  Buscar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setSelected(null); setInputValue('') }}
                  className="p-2 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </div>
            </div>
            {selected.tier === 'credit' && (
              <p className="text-[10px] text-amber-400/70 mt-1.5 px-2">
                Esta consulta requiere créditos CODART (Tier 2)
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
