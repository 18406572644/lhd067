export type MaterialType = 'builtin' | 'user'

export type UserMaterialCategory = 'flower' | 'leaf' | 'grass' | 'fruit' | 'branch' | 'fern' | 'other'

export interface PlantMaterial {
  id: string
  name: string
  category: 'flower' | 'leaf' | 'grass' | 'fruit' | 'branch' | 'fern'
  thumbnail: string
  svgData: string
  tags: string[]
  type?: MaterialType
}

export interface UserMaterial {
  id: string
  name: string
  category: UserMaterialCategory
  format: 'svg' | 'png'
  thumbnail: string
  data: string
  tags: string[]
  size: number
  createdAt: number
  updatedAt: number
  type: 'user'
}

export interface UserMaterialStoreStats {
  totalSize: number
  count: number
  maxSize: number
}

export interface MaterialCategory {
  key: string
  label: string
  icon: string
}

export interface DesignProject {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  thumbnail: string
  canvasData: string
  labels: SpecimenLabel[]
  filters: FilterConfig[]
}

export interface SpecimenLabel {
  id: string
  plantName: string
  scientificName: string
  collectionLocation: string
  collectionDate: string
  collectorName: string
  notes: string
}

export interface FilterConfig {
  id: string
  type: 'watercolor' | 'diffuse' | 'texture' | 'vintage'
  intensity: number
  enabled: boolean
}

export interface CanvasObjectData {
  id: string
  materialId?: string
  type: 'material' | 'uploaded'
  x: number
  y: number
  scaleX: number
  scaleY: number
  angle: number
  opacity: number
  zIndex: number
  name?: string
  svgData?: string
  imageData?: string
}

export interface ExportSettings {
  format: 'png' | 'jpg'
  dpi: 150 | 300 | 600
  showBorder: boolean
  borderStyle: 'none' | 'simple' | 'botanical'
}

export type RemovalMode = 'auto' | 'manual'
export type BrushMode = 'keep' | 'remove'

export interface BackgroundRemovalState {
  mode: RemovalMode
  tolerance: number
  feather: number
  brushMode: BrushMode
  brushSize: number
  isComparing: boolean
  originalImageData: string | null
  processedImageData: string | null
  maskData: Uint8ClampedArray | null
}
