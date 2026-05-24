import { useState, useEffect, useCallback } from 'react'
import { Search, Shuffle, Copy, Check, Tag } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface ImagePrompt {
  id: string
  title: string
  prompt: string
  negativePrompt?: string
  category: string
  style: string
  tags: string[]
  aspectRatio: string
  quality: string
}

interface CategoryInfo {
  id: string
  name: string
  count: number
}

export function PromptsView() {
  const [prompts, setPrompts] = useState<ImagePrompt[]>([])
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadPrompts = useCallback(async () => {
    try {
      const [allRes, catRes] = await Promise.all([
        window.electron.imagePrompts.all(),
        window.electron.imagePrompts.categories(),
      ])
      if (allRes.success) setPrompts(allRes.result as ImagePrompt[])
      if (catRes.success) setCategories(catRes.result as CategoryInfo[])
    } catch { /* empty */ }
  }, [])

  useEffect(() => { loadPrompts() }, [loadPrompts])

  const handleSearch = async (query: string) => {
    setSearchTerm(query)
    if (!query.trim()) {
      loadPrompts()
      return
    }
    try {
      const result = await window.electron.imagePrompts.search(query)
      if (result.success) setPrompts(result.result as ImagePrompt[])
    } catch { /* empty */ }
  }

  const handleRandom = async () => {
    try {
      const result = await window.electron.imagePrompts.all()
      if (result.success) {
        const all = result.result as ImagePrompt[]
        const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 3)
        setPrompts(shuffled)
      }
    } catch { /* empty */ }
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCategoryClick = async (cat: string) => {
    setSelectedCategory(cat)
    if (cat === 'all') {
      loadPrompts()
      return
    }
    try {
      const result = await window.electron.imagePrompts.byCategory(cat)
      if (result.success) setPrompts(result.result as ImagePrompt[])
    } catch { /* empty */ }
  }

  const categoryIcons: Record<string, string> = {
    'realismo': '\u{1F4F8}',
    'arte-digital': '\u{1F3A8}',
    '3d': '\u{1F9CA}',
    'arquitectura': '\u{1F3D7}',
    'ui-ux': '\u{1F5A5}',
    'logos': '\u{2728}',
    'texturas': '\u{1F9F1}',
  }

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">Image Prompts</h2>
        <p className="text-sm text-muted-foreground">Catálogo de prompts para generación de imágenes con IA</p>
      </div>

      {/* Search + Random */}
      <div className="flex gap-2 mb-4">
        <div className="glass-card flex-1 p-3 rounded-lg flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar prompts..."
            className="flex-1 bg-transparent outline-none text-foreground text-sm placeholder:text-muted-foreground"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRandom}
          className="glass-card px-3 rounded-lg flex items-center gap-2 text-sm text-primary hover:bg-primary/10 transition-colors"
        >
          <Shuffle className="h-4 w-4" />
          <span className="hidden sm:inline">Random</span>
        </motion.button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => handleCategoryClick('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            selectedCategory === 'all'
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'bg-muted/30 text-muted-foreground hover:text-foreground'
          )}
        >
          Todos ({categories.reduce((s, c) => s + c.count, 0)})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              selectedCategory === cat.id
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'bg-muted/30 text-muted-foreground hover:text-foreground'
            )}
          >
            {categoryIcons[cat.id] || '\u{1F4C1}'} {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Prompts grid */}
      <div className="grid gap-3">
        {prompts.map((prompt, i) => (
          <motion.div
            key={prompt.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass-card p-4 rounded-lg group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{categoryIcons[prompt.category] || '\u{1F4C1}'}</span>
                <span className="text-xs font-medium text-foreground">{prompt.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{prompt.aspectRatio}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{prompt.style}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{prompt.quality}</span>
              </div>
            </div>

            <p className="text-sm text-foreground/90 mb-3 leading-relaxed font-mono bg-muted/30 p-2 rounded">{prompt.prompt}</p>

            {prompt.negativePrompt && (
              <p className="text-xs text-destructive/60 mb-2">
                <span className="font-medium">Negative:</span> {prompt.negativePrompt}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {prompt.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground flex items-center gap-0.5">
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleCopy(prompt.id, prompt.prompt)}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              >
                {copiedId === prompt.id ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {prompts.length === 0 && (
        <div className="flex-1 flex items-center justify-center py-12">
          <p className="text-muted-foreground">No se encontraron prompts</p>
        </div>
      )}
    </div>
  )
}
