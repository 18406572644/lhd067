import type { FilterConfig, ColorAdjustment } from '~/types'

console.log('[filterEffects.ts v3] LOADED - COLOR ADJUSTMENT 2026-06-20')

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return [h * 360, s * 100, l * 100]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360
  s /= 100
  l /= 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function adjustHue(r: number, g: number, b: number, hueDelta: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b)
  let newH = h + hueDelta
  if (newH > 180) newH -= 360
  if (newH < -180) newH += 360
  if (newH < 0) newH += 360
  return hslToRgb(newH, s, l)
}

function adjustSaturation(r: number, g: number, b: number, satDelta: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b)
  let newS = s + satDelta
  newS = Math.max(0, Math.min(100, newS))
  return hslToRgb(h, newS, l)
}

function adjustBrightness(r: number, g: number, b: number, brightDelta: number): [number, number, number] {
  const factor = 1 + brightDelta / 100
  return [
    Math.min(255, Math.max(0, Math.round(r * factor))),
    Math.min(255, Math.max(0, Math.round(g * factor))),
    Math.min(255, Math.max(0, Math.round(b * factor)))
  ]
}

function adjustContrast(r: number, g: number, b: number, contrastDelta: number): [number, number, number] {
  const factor = (259 * (contrastDelta + 255)) / (255 * (259 - contrastDelta))
  return [
    Math.min(255, Math.max(0, Math.round(factor * (r - 128) + 128))),
    Math.min(255, Math.max(0, Math.round(factor * (g - 128) + 128))),
    Math.min(255, Math.max(0, Math.round(factor * (b - 128) + 128)))
  ]
}

export function processColorAdjustment(pixels: ImageData, adjustment: ColorAdjustment) {
  const data = pixels.data
  const { hue, saturation, brightness, contrast } = adjustment

  const hasHue = hue !== 0
  const hasSaturation = saturation !== 0
  const hasBrightness = brightness !== 0
  const hasContrast = contrast !== 0

  if (!hasHue && !hasSaturation && !hasBrightness && !hasContrast) {
    return
  }

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue

    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]

    if (hasHue) {
      ;[r, g, b] = adjustHue(r, g, b, hue)
    }
    if (hasSaturation) {
      ;[r, g, b] = adjustSaturation(r, g, b, saturation)
    }
    if (hasBrightness) {
      ;[r, g, b] = adjustBrightness(r, g, b, brightness)
    }
    if (hasContrast) {
      ;[r, g, b] = adjustContrast(r, g, b, contrast)
    }

    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
}

let _isApplyingFilters = false
let _pendingApplyArgs: any[] | null = null

async function _runApplyWithLock(args: any[]): Promise<void> {
  const [fabric, canvas, filters, onObjectReplaced] = args
  try {
    await _applyFiltersToSelectedImpl(fabric, canvas, filters, onObjectReplaced)
  } finally {
    _isApplyingFilters = false
    if (_pendingApplyArgs) {
      const nextArgs = _pendingApplyArgs
      _pendingApplyArgs = null
      _isApplyingFilters = true
      _runApplyWithLock(nextArgs)
    }
  }
}

export async function applyFiltersToSelected(
  fabric: any,
  canvas: any,
  filters: FilterConfig[],
  onObjectReplaced?: (newId: string) => void
): Promise<void> {
  if (_isApplyingFilters) {
    console.log('[filterEffects V2] SKIP: filter apply in progress, queuing latest call')
    _pendingApplyArgs = [fabric, canvas, filters, onObjectReplaced]
    return
  }
  _isApplyingFilters = true
  await _runApplyWithLock([fabric, canvas, filters, onObjectReplaced])
}

const WATERCOLOR_KERNEL = [
  0.0625, 0.125, 0.0625,
  0.125,  0.25,  0.125,
  0.0625, 0.125, 0.0625
]

const EDGE_SOBEL_X = [
  -1, 0, 1,
  -2, 0, 2,
  -1, 0, 1
]

const EDGE_SOBEL_Y = [
  -1, -2, -1,
   0,  0,  0,
   1,  2,  1
]

let textureCanvas: HTMLCanvasElement | null = null

function ensureTextureCanvas() {
  if (textureCanvas) return textureCanvas
  const size = 512
  textureCanvas = document.createElement('canvas')
  textureCanvas.width = size
  textureCanvas.height = size
  const ctx = textureCanvas.getContext('2d')!
  const imgData = ctx.createImageData(size, size)
  const data = imgData.data
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.floor(Math.random() * 255)
    const base = 240 + Math.random() * 10
    const grain = (Math.random() - 0.5) * 40
    data[i] = Math.min(255, Math.max(0, base + grain))
    data[i + 1] = Math.min(255, Math.max(0, base - 10 + grain * 0.9))
    data[i + 2] = Math.min(255, Math.max(0, base - 20 + grain * 0.8))
    data[i + 3] = 15 + Math.random() * 25
  }
  ctx.putImageData(imgData, 0, 0)
  return textureCanvas
}

function createCustomFilter(
  name: string,
  processFn: (pixels: ImageData, intensity: number) => void
) {
  return class CustomFilter {
    intensity: number
    type: string
    
    constructor(options: { intensity: number }) {
      this.intensity = options.intensity
      this.type = name
    }
    
    applyTo2d(ctx: CanvasRenderingContext2D, opt_imageEl?: HTMLImageElement | HTMLCanvasElement) {
      const canvas = opt_imageEl || ctx.canvas
      const width = canvas.width
      const height = canvas.height
      const imageData = ctx.getImageData(0, 0, width, height)
      processFn(imageData, this.intensity)
      ctx.putImageData(imageData, 0, 0)
    }
    
    applyTo(options: { ctx: CanvasRenderingContext2D; webgl: boolean; sourceWidth: number; sourceHeight: number; targetCanvas: HTMLCanvasElement }) {
      const ctx = options.ctx
      const canvas = options.targetCanvas || ctx.canvas
      if (!canvas) return
      const width = options.sourceWidth || canvas.width
      const height = options.sourceHeight || canvas.height
      const imageData = ctx.getImageData(0, 0, width, height)
      processFn(imageData, this.intensity)
      ctx.putImageData(imageData, 0, 0)
    }
    
    isNeutralState() {
      return this.intensity <= 0
    }
    
    toObject() {
      return { type: this.type, intensity: this.intensity }
    }
  }
}

const WatercolorBlendFilter = createCustomFilter('WatercolorBlend', (pixels, intensity) => {
  const norm = intensity / 100
  const data = pixels.data
  const w = pixels.width
  const h = pixels.height
  
  const temp = new Uint8ClampedArray(data)
  
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4
      
      let r = 0, g = 0, b = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = ((y + ky) * w + (x + kx)) * 4
          const kw = WATERCOLOR_KERNEL[(ky + 1) * 3 + (kx + 1)]
          r += temp[kidx] * kw
          g += temp[kidx + 1] * kw
          b += temp[kidx + 2] * kw
        }
      }
      
      const satFactor = 1 - 0.3 * norm
      const brightnessFactor = 1 + 0.05 * norm
      
      const gray = r * 0.299 + g * 0.587 + b * 0.114
      
      data[idx] = Math.min(255, (r * satFactor + gray * (1 - satFactor)) * brightnessFactor)
      data[idx + 1] = Math.min(255, (g * satFactor + gray * (1 - satFactor)) * brightnessFactor)
      data[idx + 2] = Math.min(255, (b * satFactor + gray * (1 - satFactor)) * brightnessFactor)
    }
  }
})

const WatercolorDiffuseFilter = createCustomFilter('WatercolorDiffuse', (pixels, intensity) => {
  const norm = intensity / 100
  const data = pixels.data
  const w = pixels.width
  const h = pixels.height
  
  const temp = new Uint8ClampedArray(data)
  
  const edgeStrength = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      let gx = 0, gy = 0
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = (y + ky) * w + (x + kx)
          const kwx = EDGE_SOBEL_X[(ky + 1) * 3 + (kx + 1)]
          const kwy = EDGE_SOBEL_Y[(ky + 1) * 3 + (kx + 1)]
          const gray = temp[kidx * 4] * 0.299 + temp[kidx * 4 + 1] * 0.587 + temp[kidx * 4 + 2] * 0.114
          gx += gray * kwx
          gy += gray * kwy
        }
      }
      edgeStrength[idx] = Math.sqrt(gx * gx + gy * gy) / 255
    }
  }
  
  const maxDist = Math.floor(3 + norm * 5)
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      
      if (data[idx + 3] < 20) continue
      
      const edge = edgeStrength[y * w + x]
      if (edge < 0.15) continue
      
      const spread = Math.min(maxDist, Math.floor(edge * maxDist * 2))
      
      for (let dy = -spread; dy <= spread; dy++) {
        for (let dx = -spread; dx <= spread; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > spread) continue
          
          const nidx = (ny * w + nx) * 4
          const alpha = (1 - dist / spread) * norm * 0.6 * edge
          
          data[nidx] = Math.min(255, data[nidx] * (1 - alpha) + data[idx] * alpha)
          data[nidx + 1] = Math.min(255, data[nidx + 1] * (1 - alpha) + data[idx + 1] * alpha)
          data[nidx + 2] = Math.min(255, data[nidx + 2] * (1 - alpha) + data[idx + 2] * alpha)
          data[nidx + 3] = Math.min(255, Math.max(data[nidx + 3], data[idx + 3] * alpha * 0.8))
        }
      }
    }
  }
})

const PaperTextureFilter = createCustomFilter('PaperTexture', (pixels, intensity) => {
  const norm = intensity / 100
  const data = pixels.data
  const w = pixels.width
  const h = pixels.height
  
  const texCanvas = ensureTextureCanvas()
  const texCtx = texCanvas.getContext('2d')!
  const texData = texCtx.getImageData(0, 0, texCanvas.width, texCanvas.height).data
  const texW = texCanvas.width
  const texH = texCanvas.height
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      if (data[idx + 3] < 10) continue
      
      const tx = x % texW
      const ty = y % texH
      const tidx = (ty * texW + tx) * 4
      
      const texGray = (texData[tidx] + texData[tidx + 1] + texData[tidx + 2]) / 3 / 255
      const texAlpha = texData[tidx + 3] / 255 * norm
      
      const contrastFactor = 1 + 0.2 * norm
      const mid = 128
      
      data[idx] = Math.min(255, Math.max(0, 
        (data[idx] - mid) * contrastFactor + mid + (texGray - 0.5) * 40 * norm
      ))
      data[idx + 1] = Math.min(255, Math.max(0, 
        (data[idx + 1] - mid) * contrastFactor + mid + (texGray - 0.5) * 38 * norm
      ))
      data[idx + 2] = Math.min(255, Math.max(0, 
        (data[idx + 2] - mid) * contrastFactor + mid + (texGray - 0.5) * 36 * norm
      ))
      
      const embossAmount = texAlpha * 30
      if (y > 0 && x > 0) {
        const prevIdx = ((y - 1) * w + (x - 1)) * 4
        const diff = (data[idx] - data[prevIdx]) * 0.1
        data[idx] = Math.min(255, Math.max(0, data[idx] + diff * embossAmount))
        data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + diff * embossAmount * 0.9))
        data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + diff * embossAmount * 0.8))
      }
    }
  }
})

const VintageFilter = createCustomFilter('Vintage', (pixels, intensity) => {
  const norm = intensity / 100
  const data = pixels.data
  
  const sepiaR = 112 * norm
  const sepiaG = 66 * norm
  const sepiaB = 20 * norm
  const satFactor = 1 - 0.4 * norm
  const contrastFactor = 1 + 0.15 * norm
  const brightFactor = 1 - 0.05 * norm
  
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue
    
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]
    
    const gray = r * 0.299 + g * 0.587 + b * 0.114
    
    r = r * satFactor + gray * (1 - satFactor)
    g = g * satFactor + gray * (1 - satFactor)
    b = b * satFactor + gray * (1 - satFactor)
    
    r = (r - 128) * contrastFactor + 128
    g = (g - 128) * contrastFactor + 128
    b = (b - 128) * contrastFactor + 128
    
    r = r * brightFactor + sepiaR
    g = g * brightFactor + sepiaG
    b = b * brightFactor + sepiaB
    
    r = Math.min(255, Math.max(0, r))
    g = Math.min(255, Math.max(0, g))
    b = Math.min(255, Math.max(0, b))
    
    const vignetteX = ((i / 4) % pixels.width) / pixels.width - 0.5
    const vignetteY = (Math.floor(i / 4 / pixels.width)) / pixels.height - 0.5
    const vignetteDist = Math.sqrt(vignetteX * vignetteX + vignetteY * vignetteY)
    const vignetteAmount = Math.max(0, (vignetteDist - 0.3) * 2) * norm * 0.4
    
    data[i] = Math.min(255, Math.max(0, r * (1 - vignetteAmount)))
    data[i + 1] = Math.min(255, Math.max(0, g * (1 - vignetteAmount)))
    data[i + 2] = Math.min(255, Math.max(0, b * (1 - vignetteAmount)))
  }
})

export function createWatercolorFilter(intensity: number) {
  return new WatercolorBlendFilter({ intensity })
}

export function createDiffuseFilter(intensity: number) {
  return new WatercolorDiffuseFilter({ intensity })
}

export function createTextureFilter(intensity: number) {
  return new PaperTextureFilter({ intensity })
}

export function createVintageFilter(intensity: number) {
  return new VintageFilter({ intensity })
}

export async function convertGroupToImage(fabric: any, canvas: any, group: any): Promise<any> {
  return new Promise((resolve) => {
    const originalLeft = group.left
    const originalTop = group.top
    const originalScaleX = group.scaleX || 1
    const originalScaleY = group.scaleY || 1
    const originalAngle = group.angle
    const originalOriginX = group.originX || 'center'
    const originalOriginY = group.originY || 'center'
    console.log('[convertGroupToImage V2] group.width:', group.width, 'group.height:', group.height, 'scale:', originalScaleX, 'x', originalScaleY)
    
    const bounds = group.getBoundingRect()
    let canvasWidth = Math.ceil(bounds.width)
    let canvasHeight = Math.ceil(bounds.height)
    console.log('[convertGroupToImage V2] bounds:', bounds.width, 'x', bounds.height)
    
    if (canvasWidth < 50 || canvasHeight < 50) {
      const gWidth = (group.width || 0) * Math.abs(originalScaleX)
      const gHeight = (group.height || 0) * Math.abs(originalScaleY)
      console.log('[convertGroupToImage V2] bounds too small, trying group.width*scale:', gWidth, 'x', gHeight)
      if (gWidth > 50 && gHeight > 50) {
        canvasWidth = Math.ceil(gWidth)
        canvasHeight = Math.ceil(gHeight)
      } else {
        canvasWidth = Math.max(canvasWidth, 200)
        canvasHeight = Math.max(canvasHeight, 200)
        console.log('[convertGroupToImage V2] Using fallback size:', canvasWidth, 'x', canvasHeight)
      }
    }
    console.log('[convertGroupToImage V2] Final canvas size:', canvasWidth, 'x', canvasHeight)
    
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvasWidth
    tempCanvas.height = canvasHeight
    
    const allObjects = canvas.getObjects()
    const otherObjects = allObjects.filter((o: any) => o !== group)
    
    otherObjects.forEach((o: any) => canvas.remove(o))
    
    const vpt = canvas.viewportTransform
    canvas.setViewportTransform([1, 0, 0, 1, -bounds.left, -bounds.top])
    
    canvas.renderAll()
    
    const mainCanvasEl = canvas.toCanvasElement()
    const ctx = tempCanvas.getContext('2d')!
    ctx.drawImage(
      mainCanvasEl,
      0, 0, tempCanvas.width, tempCanvas.height,
      0, 0, tempCanvas.width, tempCanvas.height
    )
    
    canvas.setViewportTransform(vpt)
    
    otherObjects.forEach((o: any) => canvas.add(o))
    
    group.set({
      left: originalLeft,
      top: originalTop,
      scaleX: originalScaleX,
      scaleY: originalScaleY,
      angle: originalAngle,
      originX: originalOriginX,
      originY: originalOriginY
    })
    
    canvas.renderAll()
    
    const dataUrl = tempCanvas.toDataURL('image/png')
    console.log('[convertGroupToImage V2] dataUrl length:', dataUrl.length)
    
    fabric.Image.fromURL(dataUrl, (img: any) => {
      img.set({
        left: originalLeft,
        top: originalTop,
        scaleX: originalScaleX,
        scaleY: originalScaleY,
        angle: originalAngle,
        originX: originalOriginX,
        originY: originalOriginY,
        id: group.id,
        filters: []
      })
      
      img._originalWidth = tempCanvas.width
      img._originalHeight = tempCanvas.height
      console.log('[convertGroupToImage V2] img created, _originalWidth/_originalHeight set to:', img._originalWidth, 'x', img._originalHeight)
      
      canvas.remove(group)
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.renderAll()
      console.log('[convertGroupToImage V2] img added to canvas, objects:', canvas.getObjects().length)
      
      resolve(img)
    }, { crossOrigin: 'anonymous' })
  })
}

export async function ensureImageObject(fabric: any, canvas: any, obj: any): Promise<any> {
  if (obj.type === 'image' || obj instanceof fabric.Image) {
    return obj
  }
  
  if (obj.type === 'group' || obj instanceof fabric.Group) {
    return await convertGroupToImage(fabric, canvas, obj)
  }
  
  return obj
}

export function createFilterByType(type: FilterConfig['type'], intensity: number) {
  switch (type) {
    case 'watercolor':
      return createWatercolorFilter(intensity)
    case 'diffuse':
      return createDiffuseFilter(intensity)
    case 'texture':
      return createTextureFilter(intensity)
    case 'vintage':
      return createVintageFilter(intensity)
    default:
      return null
  }
}

function applyFilterProcessors(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filterConfigs: FilterConfig[]
) {
  let imageData = ctx.getImageData(0, 0, width, height)
  
  for (const filterConfig of filterConfigs) {
    if (!filterConfig.enabled) continue
    
    switch (filterConfig.type) {
      case 'watercolor':
        processWatercolorDirect(imageData, filterConfig.intensity)
        break
      case 'diffuse':
        processDiffuseDirect(imageData, filterConfig.intensity)
        break
      case 'texture':
        processTextureDirect(imageData, filterConfig.intensity)
        break
      case 'vintage':
        processVintageDirect(imageData, filterConfig.intensity)
        break
    }
  }
  
  ctx.putImageData(imageData, 0, 0)
}

function processWatercolorDirect(pixels: ImageData, intensity: number) {
  const norm = intensity / 100
  const data = pixels.data
  const w = pixels.width
  const h = pixels.height
  
  const temp = new Uint8ClampedArray(data)
  
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4
      
      let r = 0, g = 0, b = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = ((y + ky) * w + (x + kx)) * 4
          const kw = WATERCOLOR_KERNEL[(ky + 1) * 3 + (kx + 1)]
          r += temp[kidx] * kw
          g += temp[kidx + 1] * kw
          b += temp[kidx + 2] * kw
        }
      }
      
      const satFactor = 1 - 0.3 * norm
      const brightnessFactor = 1 + 0.05 * norm
      
      const gray = r * 0.299 + g * 0.587 + b * 0.114
      
      data[idx] = Math.min(255, (r * satFactor + gray * (1 - satFactor)) * brightnessFactor)
      data[idx + 1] = Math.min(255, (g * satFactor + gray * (1 - satFactor)) * brightnessFactor)
      data[idx + 2] = Math.min(255, (b * satFactor + gray * (1 - satFactor)) * brightnessFactor)
    }
  }
}

function processDiffuseDirect(pixels: ImageData, intensity: number) {
  const norm = intensity / 100
  const data = pixels.data
  const w = pixels.width
  const h = pixels.height
  
  const temp = new Uint8ClampedArray(data)
  
  const edgeStrength = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      let gx = 0, gy = 0
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = (y + ky) * w + (x + kx)
          const kwx = EDGE_SOBEL_X[(ky + 1) * 3 + (kx + 1)]
          const kwy = EDGE_SOBEL_Y[(ky + 1) * 3 + (kx + 1)]
          const gray = temp[kidx * 4] * 0.299 + temp[kidx * 4 + 1] * 0.587 + temp[kidx * 4 + 2] * 0.114
          gx += gray * kwx
          gy += gray * kwy
        }
      }
      edgeStrength[idx] = Math.sqrt(gx * gx + gy * gy) / 255
    }
  }
  
  const maxDist = Math.floor(3 + norm * 5)
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      
      if (data[idx + 3] < 20) continue
      
      const edge = edgeStrength[y * w + x]
      if (edge < 0.15) continue
      
      const spread = Math.min(maxDist, Math.floor(edge * maxDist * 2))
      
      for (let dy = -spread; dy <= spread; dy++) {
        for (let dx = -spread; dx <= spread; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > spread) continue
          
          const nidx = (ny * w + nx) * 4
          const alpha = (1 - dist / spread) * norm * 0.6 * edge
          
          data[nidx] = Math.min(255, data[nidx] * (1 - alpha) + data[idx] * alpha)
          data[nidx + 1] = Math.min(255, data[nidx + 1] * (1 - alpha) + data[idx + 1] * alpha)
          data[nidx + 2] = Math.min(255, data[nidx + 2] * (1 - alpha) + data[idx + 2] * alpha)
          data[nidx + 3] = Math.min(255, Math.max(data[nidx + 3], data[idx + 3] * alpha * 0.8))
        }
      }
    }
  }
}

function processTextureDirect(pixels: ImageData, intensity: number) {
  const norm = intensity / 100
  const data = pixels.data
  const w = pixels.width
  const h = pixels.height
  
  const texCanvas = ensureTextureCanvas()
  const texCtx = texCanvas.getContext('2d')!
  const texData = texCtx.getImageData(0, 0, texCanvas.width, texCanvas.height).data
  const texW = texCanvas.width
  const texH = texCanvas.height
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      if (data[idx + 3] < 10) continue
      
      const tx = x % texW
      const ty = y % texH
      const tidx = (ty * texW + tx) * 4
      
      const texGray = (texData[tidx] + texData[tidx + 1] + texData[tidx + 2]) / 3 / 255
      const texAlpha = texData[tidx + 3] / 255 * norm
      
      const contrastFactor = 1 + 0.2 * norm
      const mid = 128
      
      data[idx] = Math.min(255, Math.max(0, 
        (data[idx] - mid) * contrastFactor + mid + (texGray - 0.5) * 40 * norm
      ))
      data[idx + 1] = Math.min(255, Math.max(0, 
        (data[idx + 1] - mid) * contrastFactor + mid + (texGray - 0.5) * 38 * norm
      ))
      data[idx + 2] = Math.min(255, Math.max(0, 
        (data[idx + 2] - mid) * contrastFactor + mid + (texGray - 0.5) * 36 * norm
      ))
      
      const embossAmount = texAlpha * 30
      if (y > 0 && x > 0) {
        const prevIdx = ((y - 1) * w + (x - 1)) * 4
        const diff = (data[idx] - data[prevIdx]) * 0.1
        data[idx] = Math.min(255, Math.max(0, data[idx] + diff * embossAmount))
        data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + diff * embossAmount * 0.9))
        data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + diff * embossAmount * 0.8))
      }
    }
  }
}

function processVintageDirect(pixels: ImageData, intensity: number) {
  const norm = intensity / 100
  const data = pixels.data
  
  const sepiaR = 112 * norm
  const sepiaG = 66 * norm
  const sepiaB = 20 * norm
  const satFactor = 1 - 0.4 * norm
  const contrastFactor = 1 + 0.15 * norm
  const brightFactor = 1 - 0.05 * norm
  
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue
    
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]
    
    const gray = r * 0.299 + g * 0.587 + b * 0.114
    
    r = r * satFactor + gray * (1 - satFactor)
    g = g * satFactor + gray * (1 - satFactor)
    b = b * satFactor + gray * (1 - satFactor)
    
    r = (r - 128) * contrastFactor + 128
    g = (g - 128) * contrastFactor + 128
    b = (b - 128) * contrastFactor + 128
    
    r = r * brightFactor + sepiaR
    g = g * brightFactor + sepiaG
    b = b * brightFactor + sepiaB
    
    r = Math.min(255, Math.max(0, r))
    g = Math.min(255, Math.max(0, g))
    b = Math.min(255, Math.max(0, b))
    
    const vignetteX = ((i / 4) % pixels.width) / pixels.width - 0.5
    const vignetteY = (Math.floor(i / 4 / pixels.width)) / pixels.height - 0.5
    const vignetteDist = Math.sqrt(vignetteX * vignetteX + vignetteY * vignetteY)
    const vignetteAmount = Math.max(0, (vignetteDist - 0.3) * 2) * norm * 0.4
    
    data[i] = Math.min(255, Math.max(0, r * (1 - vignetteAmount)))
    data[i + 1] = Math.min(255, Math.max(0, g * (1 - vignetteAmount)))
    data[i + 2] = Math.min(255, Math.max(0, b * (1 - vignetteAmount)))
  }
}

async function _applyFiltersToSelectedImpl(
  fabric: any,
  canvas: any,
  filters: FilterConfig[],
  onObjectReplaced?: (newId: string) => void
): Promise<void> {
  console.log('[filterEffects V2] applyFiltersToSelected CALLED')
  if (!canvas || !fabric) {
    console.log('[filterEffects V2] EXIT: no canvas or fabric')
    return
  }
  
  const activeObject = canvas.getActiveObject()
  if (!activeObject) {
    console.log('[filterEffects V2] EXIT: no active object')
    return
  }
  console.log('[filterEffects V2] Active object:', activeObject.type, activeObject.id)
  
  const originalType = activeObject.type
  const originalId = activeObject.id
  const imageObj = await ensureImageObject(fabric, canvas, activeObject)
  if (!imageObj) {
    console.log('[filterEffects V2] EXIT: ensureImageObject returned null')
    return
  }
  console.log('[filterEffects V2] Image object ensured:', imageObj.type, imageObj.id)
  console.log('[filterEffects V2] _originalWidth/_originalHeight:', imageObj._originalWidth, 'x', imageObj._originalHeight)
  
  const wasConverted = (originalType === 'group' || originalType instanceof fabric.Group) && 
                       (imageObj.type === 'image' || imageObj instanceof fabric.Image)
  
  if ((imageObj.id !== originalId || wasConverted) && onObjectReplaced) {
    console.log('[filterEffects V2] Object converted, calling onObjectReplaced:', imageObj.id)
    onObjectReplaced(imageObj.id)
  }
  
  if (!imageObj.getElement || !imageObj.setElement) {
    console.warn('[filterEffects] Image object does not support element manipulation')
    return
  }
  
  if (!imageObj._originalElement) {
    imageObj._originalElement = imageObj.getElement()
    console.log('[filterEffects V2] Saved _originalElement for first time:', imageObj._originalElement.tagName)
  }
  const sourceElement = imageObj._originalElement
  if (!sourceElement) {
    console.log('[filterEffects V2] EXIT: sourceElement is null')
    return
  }
  console.log('[filterEffects V2] sourceElement:', sourceElement.tagName, 'natural:', sourceElement.naturalWidth, 'x', sourceElement.naturalHeight, 'elWidth:', sourceElement.width, 'x', sourceElement.height)
  
  const width = imageObj._originalWidth || sourceElement.naturalWidth || sourceElement.width
  const height = imageObj._originalHeight || sourceElement.naturalHeight || sourceElement.height
  if (!width || !height) {
    console.log('[filterEffects V2] EXIT: invalid dimensions', width, 'x', height)
    return
  }
  console.log('[filterEffects V2] Using dimensions:', width, 'x', height)
  
  const processCanvas = document.createElement('canvas')
  processCanvas.width = width
  processCanvas.height = height
  const processCtx = processCanvas.getContext('2d')!
  processCtx.drawImage(sourceElement, 0, 0, width, height)
  
  const activeFilters = filters.filter(f => f.enabled)
  console.log('[filterEffects V2] Active filters count:', activeFilters.length)
  
  if (activeFilters.length === 0) {
    console.log('[filterEffects V2] FAST RESTORE PATH: no active filters, restoring original')
    const origW = imageObj._originalWidth || width
    const origH = imageObj._originalHeight || height
    console.log('[filterEffects V2] Restore dimensions:', origW, 'x', origH)
    
    const restoreCanvas = document.createElement('canvas')
    restoreCanvas.width = origW
    restoreCanvas.height = origH
    const restoreCtx = restoreCanvas.getContext('2d')!
    
    try {
      restoreCtx.drawImage(sourceElement, 0, 0, origW, origH)
      console.log('[filterEffects V2] drawImage OK')
    } catch (e: any) {
      console.log('[filterEffects V2] drawImage error, using fallback:', e.message)
      const sw = sourceElement.naturalWidth || sourceElement.width || origW
      const sh = sourceElement.naturalHeight || sourceElement.height || origH
      restoreCtx.drawImage(sourceElement, 0, 0, sw, sh, 0, 0, origW, origH)
    }
    
    const restoreDataUrl = restoreCanvas.toDataURL('image/png')
    console.log('[filterEffects V2] Restore dataUrl length:', restoreDataUrl.length)
    
    await new Promise<void>((resolve) => {
      fabric.Image.fromURL(restoreDataUrl, (restoredImg: any) => {
        console.log('[filterEffects V2] Restored image loaded, adding to canvas')
        restoredImg.set({
          left: imageObj.left,
          top: imageObj.top,
          scaleX: imageObj.scaleX,
          scaleY: imageObj.scaleY,
          angle: imageObj.angle,
          originX: imageObj.originX || 'center',
          originY: imageObj.originY || 'center',
          opacity: imageObj.opacity,
          id: imageObj.id
        })
        
        restoredImg._originalElement = imageObj._originalElement
        restoredImg._originalWidth = imageObj._originalWidth || origW
        restoredImg._originalHeight = imageObj._originalHeight || origH
        
        console.log('[filterEffects V2] Removing old image, adding restored image, total objects before:', canvas.getObjects().length)
        canvas.remove(imageObj)
        console.log('[filterEffects V2] After remove, objects:', canvas.getObjects().length)
        canvas.add(restoredImg)
        console.log('[filterEffects V2] After add, objects:', canvas.getObjects().length)
        canvas.setActiveObject(restoredImg)
        canvas.renderAll()
        
        resolve()
      }, { crossOrigin: 'anonymous' })
    })
    console.log('[filterEffects V2] FAST RESTORE COMPLETE')
    return
  }
  
  console.log('[filterEffects V2] FILTER APPLY PATH: processing', activeFilters.length, 'filters')
  applyFilterProcessors(processCtx, width, height, activeFilters)
  
  const newDataUrl = processCanvas.toDataURL('image/png')
  console.log('[filterEffects V2] Filtered dataUrl length:', newDataUrl.length)
  
  await new Promise<void>((resolve) => {
    fabric.Image.fromURL(newDataUrl, (newImg: any) => {
      console.log('[filterEffects V2] Filtered image loaded, adding to canvas')
      newImg.set({
        left: imageObj.left,
        top: imageObj.top,
        scaleX: imageObj.scaleX,
        scaleY: imageObj.scaleY,
        angle: imageObj.angle,
        originX: imageObj.originX || 'center',
        originY: imageObj.originY || 'center',
        opacity: imageObj.opacity,
        id: imageObj.id
      })
      
      newImg._originalElement = imageObj._originalElement
      newImg._originalWidth = imageObj._originalWidth || width
      newImg._originalHeight = imageObj._originalHeight || height
      console.log('[filterEffects V2] newImg inherited _originalWidth/_originalHeight:', newImg._originalWidth, 'x', newImg._originalHeight)
      
      console.log('[filterEffects V2] Removing old, adding new, objects before:', canvas.getObjects().length)
      canvas.remove(imageObj)
      console.log('[filterEffects V2] After remove:', canvas.getObjects().length)
      canvas.add(newImg)
      console.log('[filterEffects V2] After add:', canvas.getObjects().length)
      canvas.setActiveObject(newImg)
      canvas.renderAll()
      
      resolve()
    }, { crossOrigin: 'anonymous' })
  })
  console.log('[filterEffects V2] FILTER APPLY COMPLETE')
}

export async function applyFiltersToAllImages(
  fabric: any,
  canvas: any,
  filters: FilterConfig[]
): Promise<void> {
  if (!canvas || !fabric) return
  
  const objects = canvas.getObjects()
  const activeFilters = filters.filter(f => f.enabled)
  
  for (const obj of objects) {
    if (obj.type !== 'image' && !(obj instanceof fabric.Image)) continue
    
    if (!obj.getElement || !obj.setElement) continue
    
    if (!obj._originalElement) {
      obj._originalElement = obj.getElement()
    }
    const sourceElement = obj._originalElement
    if (!sourceElement) continue
    
    const width = obj._originalWidth || sourceElement.naturalWidth || sourceElement.width
    const height = obj._originalHeight || sourceElement.naturalHeight || sourceElement.height
    if (!width || !height) continue
    
    const processCanvas = document.createElement('canvas')
    processCanvas.width = width
    processCanvas.height = height
    const processCtx = processCanvas.getContext('2d')!
    processCtx.drawImage(sourceElement, 0, 0, width, height)
    
    if (activeFilters.length === 0) {
      const origW = obj._originalWidth || width
      const origH = obj._originalHeight || height
      
      const restoreCanvas = document.createElement('canvas')
      restoreCanvas.width = origW
      restoreCanvas.height = origH
      const restoreCtx = restoreCanvas.getContext('2d')!
      
      try {
        restoreCtx.drawImage(sourceElement, 0, 0, origW, origH)
      } catch (e) {
        const sw = sourceElement.naturalWidth || sourceElement.width || origW
        const sh = sourceElement.naturalHeight || sourceElement.height || origH
        restoreCtx.drawImage(sourceElement, 0, 0, sw, sh, 0, 0, origW, origH)
      }
      
      const restoreDataUrl = restoreCanvas.toDataURL('image/png')
      const originalLeft = obj.left
      const originalTop = obj.top
      const originalScaleX = obj.scaleX
      const originalScaleY = obj.scaleY
      const originalAngle = obj.angle
      const originalOriginX = obj.originX || 'center'
      const originalOriginY = obj.originY || 'center'
      const originalOpacity = obj.opacity
      const originalId = obj.id
      const origElementRef = obj._originalElement
      const origWidthRef = obj._originalWidth || width
      const origHeightRef = obj._originalHeight || height
      
      await new Promise<void>((resolve) => {
        fabric.Image.fromURL(restoreDataUrl, (restoredImg: any) => {
          restoredImg.set({
            left: originalLeft,
            top: originalTop,
            scaleX: originalScaleX,
            scaleY: originalScaleY,
            angle: originalAngle,
            originX: originalOriginX,
            originY: originalOriginY,
            opacity: originalOpacity,
            id: originalId
          })
          
          restoredImg._originalElement = origElementRef
          restoredImg._originalWidth = origWidthRef
          restoredImg._originalHeight = origHeightRef
          
          canvas.remove(obj)
          canvas.add(restoredImg)
          resolve()
        }, { crossOrigin: 'anonymous' })
      })
      continue
    }
    
    applyFilterProcessors(processCtx, width, height, activeFilters)
    
    const newDataUrl = processCanvas.toDataURL('image/png')
    const originalLeft = obj.left
    const originalTop = obj.top
    const originalScaleX = obj.scaleX
    const originalScaleY = obj.scaleY
    const originalAngle = obj.angle
    const originalOriginX = obj.originX || 'center'
    const originalOriginY = obj.originY || 'center'
    const originalOpacity = obj.opacity
    const originalId = obj.id
    const origElementRef = obj._originalElement
    const origWidthRef = obj._originalWidth || width
    const origHeightRef = obj._originalHeight || height
    
    await new Promise<void>((resolve) => {
      fabric.Image.fromURL(newDataUrl, (newImg: any) => {
        newImg.set({
          left: originalLeft,
          top: originalTop,
          scaleX: originalScaleX,
          scaleY: originalScaleY,
          angle: originalAngle,
          originX: originalOriginX,
          originY: originalOriginY,
          opacity: originalOpacity,
          id: originalId
        })
        
        newImg._originalElement = origElementRef
        newImg._originalWidth = origWidthRef
        newImg._originalHeight = origHeightRef
        
        canvas.remove(obj)
        canvas.add(newImg)
        resolve()
      }, { crossOrigin: 'anonymous' })
    })
  }
  
  canvas.renderAll()
}

async function applyColorAdjustmentToImage(
  fabric: any,
  canvas: any,
  obj: any,
  adjustment: ColorAdjustment,
  activeFilters: FilterConfig[]
): Promise<void> {
  if (!obj.getElement || !obj.setElement) return

  if (!obj._originalElement) {
    obj._originalElement = obj.getElement()
  }
  const sourceElement = obj._originalElement
  if (!sourceElement) return

  const width = obj._originalWidth || sourceElement.naturalWidth || sourceElement.width
  const height = obj._originalHeight || sourceElement.naturalHeight || sourceElement.height
  if (!width || !height) return

  const processCanvas = document.createElement('canvas')
  processCanvas.width = width
  processCanvas.height = height
  const processCtx = processCanvas.getContext('2d')!
  processCtx.drawImage(sourceElement, 0, 0, width, height)

  const hasColorAdjustment = adjustment.hue !== 0 || adjustment.saturation !== 0 || 
    adjustment.brightness !== 0 || adjustment.contrast !== 0
  const hasActiveFilters = activeFilters.length > 0

  if (!hasColorAdjustment && !hasActiveFilters) {
    const origW = obj._originalWidth || width
    const origH = obj._originalHeight || height

    const restoreCanvas = document.createElement('canvas')
    restoreCanvas.width = origW
    restoreCanvas.height = origH
    const restoreCtx = restoreCanvas.getContext('2d')!

    try {
      restoreCtx.drawImage(sourceElement, 0, 0, origW, origH)
    } catch (e) {
      const sw = sourceElement.naturalWidth || sourceElement.width || origW
      const sh = sourceElement.naturalHeight || sourceElement.height || origH
      restoreCtx.drawImage(sourceElement, 0, 0, sw, sh, 0, 0, origW, origH)
    }

    const restoreDataUrl = restoreCanvas.toDataURL('image/png')
    const originalLeft = obj.left
    const originalTop = obj.top
    const originalScaleX = obj.scaleX
    const originalScaleY = obj.scaleY
    const originalAngle = obj.angle
    const originalOriginX = obj.originX || 'center'
    const originalOriginY = obj.originY || 'center'
    const originalOpacity = obj.opacity
    const originalId = obj.id
    const origElementRef = obj._originalElement
    const origWidthRef = obj._originalWidth || width
    const origHeightRef = obj._originalHeight || height

    await new Promise<void>((resolve) => {
      fabric.Image.fromURL(restoreDataUrl, (restoredImg: any) => {
        restoredImg.set({
          left: originalLeft,
          top: originalTop,
          scaleX: originalScaleX,
          scaleY: originalScaleY,
          angle: originalAngle,
          originX: originalOriginX,
          originY: originalOriginY,
          opacity: originalOpacity,
          id: originalId
        })

        restoredImg._originalElement = origElementRef
        restoredImg._originalWidth = origWidthRef
        restoredImg._originalHeight = origHeightRef

        canvas.remove(obj)
        canvas.add(restoredImg)
        resolve()
      }, { crossOrigin: 'anonymous' })
    })
    return
  }

  if (hasActiveFilters) {
    applyFilterProcessors(processCtx, width, height, activeFilters)
  }

  if (hasColorAdjustment) {
    const imageData = processCtx.getImageData(0, 0, width, height)
    processColorAdjustment(imageData, adjustment)
    processCtx.putImageData(imageData, 0, 0)
  }

  const newDataUrl = processCanvas.toDataURL('image/png')
  const originalLeft = obj.left
  const originalTop = obj.top
  const originalScaleX = obj.scaleX
  const originalScaleY = obj.scaleY
  const originalAngle = obj.angle
  const originalOriginX = obj.originX || 'center'
  const originalOriginY = obj.originY || 'center'
  const originalOpacity = obj.opacity
  const originalId = obj.id
  const origElementRef = obj._originalElement
  const origWidthRef = obj._originalWidth || width
  const origHeightRef = obj._originalHeight || height

  await new Promise<void>((resolve) => {
    fabric.Image.fromURL(newDataUrl, (newImg: any) => {
      newImg.set({
        left: originalLeft,
        top: originalTop,
        scaleX: originalScaleX,
        scaleY: originalScaleY,
        angle: originalAngle,
        originX: originalOriginX,
        originY: originalOriginY,
        opacity: originalOpacity,
        id: originalId
      })

      newImg._originalElement = origElementRef
      newImg._originalWidth = origWidthRef
      newImg._originalHeight = origHeightRef

      canvas.remove(obj)
      canvas.add(newImg)
      resolve()
    }, { crossOrigin: 'anonymous' })
  })
}

let _isApplyingColor = false
let _pendingColorArgs: any[] | null = null

async function _runApplyColorWithLock(args: any[]): Promise<void> {
  const [fabric, canvas, adjustment, filters, isGlobal, onObjectReplaced] = args
  try {
    await _applyColorAdjustmentImpl(fabric, canvas, adjustment, filters, isGlobal, onObjectReplaced)
  } finally {
    _isApplyingColor = false
    if (_pendingColorArgs) {
      const nextArgs = _pendingColorArgs
      _pendingColorArgs = null
      _isApplyingColor = true
      _runApplyColorWithLock(nextArgs)
    }
  }
}

export async function applyColorAdjustment(
  fabric: any,
  canvas: any,
  adjustment: ColorAdjustment,
  filters: FilterConfig[],
  isGlobal: boolean = false,
  onObjectReplaced?: (newId: string) => void
): Promise<void> {
  if (_isApplyingColor) {
    console.log('[ColorAdjustment] SKIP: apply in progress, queuing latest call')
    _pendingColorArgs = [fabric, canvas, adjustment, filters, isGlobal, onObjectReplaced]
    return
  }
  _isApplyingColor = true
  await _runApplyColorWithLock([fabric, canvas, adjustment, filters, isGlobal, onObjectReplaced])
}

async function _applyColorAdjustmentImpl(
  fabric: any,
  canvas: any,
  adjustment: ColorAdjustment,
  filters: FilterConfig[],
  isGlobal: boolean,
  onObjectReplaced?: (newId: string) => void
): Promise<void> {
  console.log('[ColorAdjustment] applyColorAdjustment CALLED, isGlobal:', isGlobal)
  if (!canvas || !fabric) return

  const activeFilters = filters.filter(f => f.enabled)

  if (isGlobal) {
    const objects = canvas.getObjects()
    for (const obj of objects) {
      if (obj.type === 'image' || obj instanceof fabric.Image) {
        await applyColorAdjustmentToImage(fabric, canvas, obj, adjustment, activeFilters)
      }
    }
    canvas.renderAll()
    return
  }

  const activeObject = canvas.getActiveObject()
  if (!activeObject) {
    console.log('[ColorAdjustment] EXIT: no active object')
    return
  }
  console.log('[ColorAdjustment] Active object:', activeObject.type, activeObject.id)

  const originalType = activeObject.type
  const originalId = activeObject.id
  const imageObj = await ensureImageObject(fabric, canvas, activeObject)
  if (!imageObj) {
    console.log('[ColorAdjustment] EXIT: ensureImageObject returned null')
    return
  }

  const wasConverted = (originalType === 'group' || originalType instanceof fabric.Group) && 
                       (imageObj.type === 'image' || imageObj instanceof fabric.Image)

  if ((imageObj.id !== originalId || wasConverted) && onObjectReplaced) {
    console.log('[ColorAdjustment] Object converted, calling onObjectReplaced:', imageObj.id)
    onObjectReplaced(imageObj.id)
  }

  await applyColorAdjustmentToImage(fabric, canvas, imageObj, adjustment, activeFilters)
  
  const afterObj = canvas.getActiveObject()
  if (afterObj) {
    canvas.setActiveObject(afterObj)
  }
  canvas.renderAll()
  console.log('[ColorAdjustment] applyColorAdjustment COMPLETE')
}
