/**
 * ImagePromptService — Catálogo de prompts para generación de imágenes
 * Categorías, búsqueda y plantillas predefinidas
 */

export interface ImagePrompt {
  id: string
  title: string
  prompt: string
  negativePrompt?: string
  category: string
  style: string
  tags: string[]
  aspectRatio: string
  quality: 'draft' | 'standard' | 'high'
}

const IMAGE_PROMPTS: ImagePrompt[] = [
  // === REALISMO ===
  {
    id: 'photo-portrait',
    title: 'Retrato Fotográfico Realista',
    prompt: 'Professional portrait photography of {subject}, studio lighting, shallow depth of field, 85mm lens, sharp focus on eyes, soft bokeh background, natural skin texture, magazine quality',
    negativePrompt: 'cartoon, illustration, painting, blurry, distorted, oversaturated',
    category: 'realismo',
    style: 'photography',
    tags: ['retrato', 'fotografía', 'realista', 'studio'],
    aspectRatio: '3:4',
    quality: 'high',
  },
  {
    id: 'photo-landscape',
    title: 'Paisaje Natural',
    prompt: 'Breathtaking landscape photography of {location}, golden hour lighting, dramatic clouds, vibrant colors, ultra-wide angle, National Geographic style, 4K resolution, HDR',
    negativePrompt: 'cartoon, illustration, painting, blurry, oversaturated, artificial',
    category: 'realismo',
    style: 'photography',
    tags: ['paisaje', 'naturaleza', 'fotografía', 'golden hour'],
    aspectRatio: '16:9',
    quality: 'high',
  },
  {
    id: 'photo-product',
    title: 'Producto Comercial',
    prompt: 'Professional product photography of {product}, clean white background, studio lighting setup, soft shadows, commercial advertisement quality, sharp details, color accurate',
    negativePrompt: 'blurry, low quality, distorted, cartoon, illustration',
    category: 'realismo',
    style: 'photography',
    tags: ['producto', 'comercial', 'publicidad', 'studio'],
    aspectRatio: '1:1',
    quality: 'high',
  },

  // === ARTE DIGITAL ===
  {
    id: 'digital-concept',
    title: 'Concept Art Fantástico',
    prompt: 'Epic concept art of {subject}, digital painting, highly detailed, dramatic lighting, cinematic composition, trending on ArtStation, by Greg Rutkowski and Alphonse Mucha',
    negativePrompt: 'photograph, realistic, blurry, low quality, deformed',
    category: 'arte-digital',
    style: 'concept-art',
    tags: ['concept art', 'fantasía', 'digital', 'épico'],
    aspectRatio: '16:9',
    quality: 'high',
  },
  {
    id: 'digital-anime',
    title: 'Estilo Anime',
    prompt: 'High quality anime illustration of {character}, vibrant colors, detailed eyes, dynamic pose, cherry blossom background, studio Ghibli inspired, clean linework, cel shading',
    negativePrompt: 'realistic, photograph, 3d render, blurry, low quality, western cartoon',
    category: 'arte-digital',
    style: 'anime',
    tags: ['anime', 'manga', 'ilustración', 'japonés'],
    aspectRatio: '3:4',
    quality: 'standard',
  },
  {
    id: 'digital-pixel',
    title: 'Pixel Art Retro',
    prompt: 'Pixel art of {subject}, 16-bit style, retro game aesthetic, vibrant limited palette, clean pixel edges, detailed sprite work, nostalgic SNES/Genesis era',
    category: 'arte-digital',
    style: 'pixel-art',
    tags: ['pixel art', 'retro', 'videojuegos', '8bit', '16bit'],
    negativePrompt: 'realistic, photograph, 3d, high resolution, smooth gradients',
    aspectRatio: '1:1',
    quality: 'standard',
  },

  // === 3D ===
  {
    id: '3d-render',
    title: 'Render 3D Realista',
    prompt: 'Photorealistic 3D render of {subject}, octane render, volumetric lighting, ray tracing, subsurface scattering, 8K textures, cinema 4D quality, product visualization',
    negativePrompt: 'flat, 2d, illustration, cartoon, low poly, blurry',
    category: '3d',
    style: '3d-render',
    tags: ['3d', 'render', 'octane', 'realista', 'cinema4d'],
    aspectRatio: '16:9',
    quality: 'high',
  },
  {
    id: '3d-lowpoly',
    title: 'Low Poly Estilizado',
    prompt: 'Low poly art of {subject}, geometric shapes, soft pastel colors, clean edges, minimalist aesthetic, isometric view, 3D illustration, ambient occlusion',
    negativePrompt: 'realistic, photograph, high detail, complex textures, noisy',
    category: '3d',
    style: 'low-poly',
    tags: ['low poly', 'minimalista', 'isométrico', 'geométrico'],
    aspectRatio: '1:1',
    quality: 'standard',
  },

  // === ARQUITECTURA ===
  {
    id: 'arch-interior',
    title: 'Diseño de Interiores',
    prompt: 'Modern interior design visualization of {space}, Scandinavian minimalist style, natural materials, warm lighting, architectural photography, 4K, clean lines, plants decoration',
    negativePrompt: 'cluttered, messy, dark, blurry, cartoon, illustration',
    category: 'arquitectura',
    style: 'interior',
    tags: ['interior', 'diseño', 'minimalista', 'moderno', 'arquitectura'],
    aspectRatio: '16:9',
    quality: 'high',
  },
  {
    id: 'arch-exterior',
    title: 'Arquitectura Exterior',
    prompt: 'Architectural visualization of {building}, contemporary design, glass and concrete facade, sunset golden hour lighting, drone perspective, photorealistic, urban context',
    negativePrompt: 'cartoon, illustration, sketch, blurry, low quality',
    category: 'arquitectura',
    style: 'exterior',
    tags: ['arquitectura', 'exterior', 'edificio', 'moderno'],
    aspectRatio: '16:9',
    quality: 'high',
  },

  // === UI/UX ===
  {
    id: 'ui-dashboard',
    title: 'Dashboard UI',
    prompt: 'Modern dashboard UI design for {purpose}, clean layout, data visualization charts, dark theme with accent colors, glassmorphism cards, minimalist icons, Figma quality, 4K screen',
    negativePrompt: 'cluttered, busy, old style, skeuomorphic, low quality',
    category: 'ui-ux',
    style: 'dashboard',
    tags: ['ui', 'dashboard', 'diseño', 'web', 'modern'],
    aspectRatio: '16:9',
    quality: 'high',
  },
  {
    id: 'ui-mobile',
    title: 'App Móvil',
    prompt: 'Mobile app UI screens for {app}, iOS/Android design system, smooth gradients, micro-interactions shown, clean typography, modern card layout, prototype quality',
    negativePrompt: 'web, desktop, old style, cluttered, blurry',
    category: 'ui-ux',
    style: 'mobile',
    tags: ['mobile', 'app', 'ui', 'ios', 'android'],
    aspectRatio: '9:16',
    quality: 'standard',
  },

  // === LOGOS ===
  {
    id: 'logo-minimal',
    title: 'Logo Minimalista',
    prompt: 'Minimalist logo design for {brand}, clean geometric shapes, single color or duotone, scalable vector style, white background, professional branding, modern typography',
    negativePrompt: 'complex, detailed, photorealistic, 3d, shadow, gradient, busy',
    category: 'logos',
    style: 'minimalista',
    tags: ['logo', 'branding', 'minimalista', 'vector'],
    aspectRatio: '1:1',
    quality: 'high',
  },
  {
    id: 'logo-abstract',
    title: 'Logo Abstracto',
    prompt: 'Abstract logo for {concept}, flowing organic shapes, gradient colors, modern tech aesthetic, creative brand identity, versatile design, professional quality',
    negativePrompt: 'photorealistic, 3d, complex illustration, text heavy',
    category: 'logos',
    style: 'abstracto',
    tags: ['logo', 'abstracto', 'moderno', 'tech'],
    aspectRatio: '1:1',
    quality: 'high',
  },

  // === TEXTURAS ===
  {
    id: 'texture-seamless',
    title: 'Textura Seamless',
    prompt: 'Seamless tileable texture of {material}, high resolution, consistent lighting, no visible seams, PBR ready, 4K, detailed surface imperfections',
    category: 'texturas',
    style: 'texture',
    tags: ['textura', 'seamless', 'tileable', 'pbr', 'material'],
    negativePrompt: 'seams visible, inconsistent lighting, blurry, low resolution',
    aspectRatio: '1:1',
    quality: 'high',
  },
]

class ImagePromptService {
  private prompts: ImagePrompt[] = [...IMAGE_PROMPTS]

  getAll(): ImagePrompt[] {
    return this.prompts
  }

  getById(id: string): ImagePrompt | undefined {
    return this.prompts.find(p => p.id === id)
  }

  getByCategory(category: string): ImagePrompt[] {
    return this.prompts.filter(p => p.category === category)
  }

  getCategories(): Array<{ id: string; name: string; count: number }> {
    const categories = new Map<string, number>()
    for (const p of this.prompts) {
      categories.set(p.category, (categories.get(p.category) || 0) + 1)
    }
    return Array.from(categories.entries()).map(([id, count]) => ({
      id,
      name: this.categoryName(id),
      count,
    }))
  }

  search(query: string): ImagePrompt[] {
    const lower = query.toLowerCase()
    return this.prompts.filter(p =>
      p.title.toLowerCase().includes(lower) ||
      p.prompt.toLowerCase().includes(lower) ||
      p.tags.some(t => t.toLowerCase().includes(lower)) ||
      p.category.toLowerCase().includes(lower) ||
      p.style.toLowerCase().includes(lower)
    )
  }

  getByStyle(style: string): ImagePrompt[] {
    return this.prompts.filter(p => p.style === style)
  }

  getByQuality(quality: ImagePrompt['quality']): ImagePrompt[] {
    return this.prompts.filter(p => p.quality === quality)
  }

  /**
   * Fill template variables in a prompt
   */
  fillTemplate(promptId: string, variables: Record<string, string>): string {
    const prompt = this.getById(promptId)
    if (!prompt) return ''

    let filled = prompt.prompt
    for (const [key, value] of Object.entries(variables)) {
      filled = filled.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
    return filled
  }

  private categoryName(id: string): string {
    const names: Record<string, string> = {
      'realismo': 'Realismo Fotográfico',
      'arte-digital': 'Arte Digital',
      '3d': 'Modelado 3D',
      'arquitectura': 'Arquitectura',
      'ui-ux': 'UI/UX Design',
      'logos': 'Logos y Branding',
      'texturas': 'Texturas',
    }
    return names[id] || id
  }
}

const service = new ImagePromptService()

import { ipcMain } from 'electron'

export function registerImagePromptHandlers() {
  ipcMain.handle('image-prompts:all', async () => {
    return { success: true, result: service.getAll() }
  })

  ipcMain.handle('image-prompts:categories', async () => {
    return { success: true, result: service.getCategories() }
  })

  ipcMain.handle('image-prompts:by-category', async (_event, category: string) => {
    return { success: true, result: service.getByCategory(category) }
  })

  ipcMain.handle('image-prompts:search', async (_event, query: string) => {
    return { success: true, result: service.search(query) }
  })

  ipcMain.handle('image-prompts:get', async (_event, id: string) => {
    const prompt = service.getById(id)
    return prompt
      ? { success: true, result: prompt }
      : { success: false, error: 'Prompt not found' }
  })

  ipcMain.handle('image-prompts:fill', async (_event, promptId: string, variables: Record<string, string>) => {
    const filled = service.fillTemplate(promptId, variables)
    return filled
      ? { success: true, result: filled }
      : { success: false, error: 'Prompt not found' }
  })
}
