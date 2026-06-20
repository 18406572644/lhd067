import type { FilterConfig } from '~/types'

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
    const originalScaleX = group.scaleX
    const originalScaleY = group.scaleY
    const originalAngle = group.angle
    const originalOriginX = group.originX || 'center'
    const originalOriginY = group.originY || 'center'
    
    const bounds = group.getBoundingRect()
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = Math.ceil(bounds.width)
    tempCanvas.height = Math.ceil(bounds.height)
    
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
      
      canvas.remove(group)
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.renderAll()
      
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

export async function applyFiltersToSelected(
  fabric: any,
  canvas: any,
  filters: FilterConfig[],
  onObjectReplaced?: (newId: string) => void
): Promise<void> {
  if (!canvas || !fabric) {
    return
  }
  
  const activeObject = canvas.getActiveObject()
  if (!activeObject) {
    return
  }
  
  const originalType = activeObject.type
  const originalId = activeObject.id
  const imageObj = await ensureImageObject(fabric, canvas, activeObject)
  if (!imageObj) {
    return
  }
  
  const wasConverted = (originalType === 'group' || originalType instanceof fabric.Group) && 
                       (imageObj.type === 'image' || imageObj instanceof fabric.Image)
  
  if ((imageObj.id !== originalId || wasConverted) && onObjectReplaced) {
    onObjectReplaced(imageObj.id)
  }
  
  if (!imageObj.getElement || !imageObj.setElement) {
    console.warn('[filterEffects] Image object does not support element manipulation')
    return
  }
  
  const originalElement = imageObj.getElement()
  if (!originalElement) {
    return
  }
  
  const width = originalElement.naturalWidth || originalElement.width
  const height = originalElement.naturalHeight || originalElement.height
  if (!width || !height) {
    return
  }
  
  const processCanvas = document.createElement('canvas')
  processCanvas.width = width
  processCanvas.height = height
  const processCtx = processCanvas.getContext('2d')!
  processCtx.drawImage(originalElement, 0, 0, width, height)
  
  const activeFilters = filters.filter(f => f.enabled)
  if (activeFilters.length > 0) {
    applyFilterProcessors(processCtx, width, height, activeFilters)
  }
  
  const newDataUrl = processCanvas.toDataURL('image/png')
  
  await new Promise<void>((resolve) => {
    fabric.Image.fromURL(newDataUrl, (newImg: any) => {
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
      
      canvas.remove(imageObj)
      canvas.add(newImg)
      canvas.setActiveObject(newImg)
      canvas.renderAll()
      
      if (onObjectReplaced) {
        onObjectReplaced(newImg.id)
      }
      
      resolve()
    }, { crossOrigin: 'anonymous' })
  })
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
    
    const originalElement = obj.getElement()
    if (!originalElement) continue
    
    const width = originalElement.naturalWidth || originalElement.width
    const height = originalElement.naturalHeight || originalElement.height
    if (!width || !height) continue
    
    const processCanvas = document.createElement('canvas')
    processCanvas.width = width
    processCanvas.height = height
    const processCtx = processCanvas.getContext('2d')!
    processCtx.drawImage(originalElement, 0, 0, width, height)
    
    if (activeFilters.length > 0) {
      applyFilterProcessors(processCtx, width, height, activeFilters)
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
        
        canvas.remove(obj)
        canvas.add(newImg)
        resolve()
      }, { crossOrigin: 'anonymous' })
    })
  }
  
  canvas.renderAll()
}
