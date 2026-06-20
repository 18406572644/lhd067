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
  type: 'material' | 'uploaded' | 'text'
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
  text?: string
  fontFamily?: string
  fontSize?: number
  fill?: string
  fontWeight?: string
  fontStyle?: string
  underline?: boolean
  textAlign?: string
  lineHeight?: number
  charSpacing?: number
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

export interface ColorAdjustment {
  hue: number
  saturation: number
  brightness: number
  contrast: number
}

export interface ColorPalette {
  id: string
  name: string
  description: string
  colors: string[]
  adjustment: ColorAdjustment
  previewColors: string[]
}

export interface ObjectColorState {
  objectId: string
  adjustment: ColorAdjustment
  appliedPaletteId: string | null
}

export const DEFAULT_COLOR_ADJUSTMENT: ColorAdjustment = {
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0
}

export interface TextPresetStyle {
  id: string
  name: string
  fontFamily: string
  fontSize: number
  fontWeight: string
  fontStyle: string
  underline: boolean
  fill: string
  lineHeight: number
  charSpacing: number
  textAlign: string
}

export const TEXT_PRESET_STYLES: TextPresetStyle[] = [
  {
    id: 'handwrite-title',
    name: '标题手写字',
    fontFamily: 'Ma Shan Zheng',
    fontSize: 48,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    fill: '#6B5B4E',
    lineHeight: 1.4,
    charSpacing: 0,
    textAlign: 'center'
  },
  {
    id: 'academic-italic',
    name: '学术名斜体',
    fontFamily: 'Noto Serif SC',
    fontSize: 24,
    fontWeight: 'normal',
    fontStyle: 'italic',
    underline: false,
    fill: '#4A4A4A',
    lineHeight: 1.3,
    charSpacing: 50,
    textAlign: 'left'
  },
  {
    id: 'collection-note',
    name: '采集信息小字',
    fontFamily: 'Noto Sans SC',
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    fill: '#888888',
    lineHeight: 1.6,
    charSpacing: 0,
    textAlign: 'left'
  },
  {
    id: 'song-title',
    name: '宋体标题',
    fontFamily: 'SimSun',
    fontSize: 36,
    fontWeight: 'bold',
    fontStyle: 'normal',
    underline: false,
    fill: '#333333',
    lineHeight: 1.4,
    charSpacing: 100,
    textAlign: 'center'
  },
  {
    id: 'heiti-label',
    name: '黑体标注',
    fontFamily: 'SimHei',
    fontSize: 20,
    fontWeight: 'bold',
    fontStyle: 'normal',
    underline: true,
    fill: '#6B5B4E',
    lineHeight: 1.5,
    charSpacing: 30,
    textAlign: 'left'
  }
]

export const FONT_FAMILY_OPTIONS = [
  { label: '手写风', value: 'Ma Shan Zheng' },
  { label: '宋体', value: 'SimSun' },
  { label: '黑体', value: 'SimHei' },
  { label: '楷体', value: 'KaiTi' },
  { label: '仿宋', value: 'FangSong' },
  { label: '衬线', value: 'Noto Serif SC' }
]
