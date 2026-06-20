export function extractPlantOutline(imageData: ImageData): ImageData {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const result = new ImageData(new Uint8ClampedArray(data), width, height)
  const out = result.data

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r > 230 && g > 230 && b > 230) {
      out[i + 3] = 0
    }
  }

  const alphaCopy = new Uint8ClampedArray(out.length)
  for (let i = 0; i < out.length; i++) {
    alphaCopy[i] = out[i]
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4 + 3
      let sum = 0
      let count = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4 + 3
          sum += alphaCopy[nIdx]
          count++
        }
      }
      out[idx] = Math.round(sum / count)
    }
  }

  return result
}

export function removeBackground(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const processed = extractPlantOutline(imageData)
  const newCanvas = document.createElement('canvas')
  newCanvas.width = canvas.width
  newCanvas.height = canvas.height
  const newCtx = newCanvas.getContext('2d')!
  newCtx.putImageData(processed, 0, 0)
  return newCanvas
}

export function applyWatercolorEffect(canvas: HTMLCanvasElement, intensity: number): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!
  const width = canvas.width
  const height = canvas.height
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = width
  resultCanvas.height = height
  const resultCtx = resultCanvas.getContext('2d')!
  resultCtx.drawImage(canvas, 0, 0)

  const resultImageData = resultCtx.getImageData(0, 0, width, height)
  const result = resultImageData.data

  const spreadDistance = Math.floor((intensity / 100) * 8) + 1
  const seed = Date.now()

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      if (data[idx + 3] > 0) {
        const spreadCount = Math.floor((intensity / 100) * 5) + 2
        for (let s = 0; s < spreadCount; s++) {
          const angle = ((seed + idx * 7 + s * 13) % 360) * (Math.PI / 180)
          const dist = ((seed + idx * 3 + s * 17) % spreadDistance) + 1
          const nx = Math.round(x + Math.cos(angle) * dist)
          const ny = Math.round(y + Math.sin(angle) * dist)
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = (ny * width + nx) * 4
            const fadeAlpha = Math.max(0, data[idx + 3] * (1 - dist / (spreadDistance + 1)) * 0.4)
            if (result[nIdx + 3] < fadeAlpha) {
              const colorVar = ((seed + s * 31 + nx * 7) % 21) - 10
              result[nIdx] = Math.min(255, Math.max(0, data[idx] + colorVar))
              result[nIdx + 1] = Math.min(255, Math.max(0, data[idx + 1] + colorVar))
              result[nIdx + 2] = Math.min(255, Math.max(0, data[idx + 2] + colorVar))
              result[nIdx + 3] = Math.min(255, Math.round(fadeAlpha))
            }
          }
        }
      }
    }
  }

  resultCtx.putImageData(resultImageData, 0, 0)
  return resultCanvas
}

export function applyDiffuseEffect(canvas: HTMLCanvasElement, intensity: number): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!
  const width = canvas.width
  const height = canvas.height
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const radius = Math.floor((intensity / 100) * 5) + 1

  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = width
  resultCanvas.height = height
  const resultCtx = resultCanvas.getContext('2d')!
  const resultImageData = resultCtx.createImageData(width, height)
  const result = resultImageData.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let totalR = 0
      let totalG = 0
      let totalB = 0
      let totalA = 0
      let weightSum = 0

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const dist = Math.sqrt(dx * dx + dy * dy)
            const weight = Math.exp(-(dist * dist) / (2 * radius * radius))
            const nIdx = (ny * width + nx) * 4
            totalR += data[nIdx] * weight
            totalG += data[nIdx + 1] * weight
            totalB += data[nIdx + 2] * weight
            totalA += data[nIdx + 3] * weight
            weightSum += weight
          }
        }
      }

      const idx = (y * width + x) * 4
      let r = totalR / weightSum
      let g = totalG / weightSum
      let b = totalB / weightSum
      const a = totalA / weightSum

      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      const satFactor = 1 - (intensity / 100) * 0.3
      r = gray + (r - gray) * satFactor
      g = gray + (g - gray) * satFactor
      b = gray + (b - gray) * satFactor

      r = Math.min(255, r + (intensity / 100) * 10)
      g = Math.min(255, g + (intensity / 100) * 5)

      result[idx] = Math.min(255, Math.max(0, Math.round(r)))
      result[idx + 1] = Math.min(255, Math.max(0, Math.round(g)))
      result[idx + 2] = Math.min(255, Math.max(0, Math.round(b)))
      result[idx + 3] = Math.min(255, Math.max(0, Math.round(a)))
    }
  }

  resultCtx.putImageData(resultImageData, 0, 0)
  return resultCanvas
}

export function applyTextureEffect(canvas: HTMLCanvasElement, intensity: number): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!
  const width = canvas.width
  const height = canvas.height
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const normalizedIntensity = intensity / 100

  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = width
  resultCanvas.height = height
  const resultCtx = resultCanvas.getContext('2d')!
  const resultImageData = resultCtx.createImageData(width, height)
  const result = resultImageData.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      let r = data[idx]
      let g = data[idx + 1]
      let b = data[idx + 2]
      const a = data[idx + 3]

      const noise = (Math.random() - 0.5) * 40 * normalizedIntensity
      r = Math.min(255, Math.max(0, r + noise))
      g = Math.min(255, Math.max(0, g + noise))
      b = Math.min(255, Math.max(0, b + noise))

      const edgeDistX = Math.min(x, width - 1 - x) / (width * 0.15)
      const edgeDistY = Math.min(y, height - 1 - y) / (height * 0.15)
      const edgeFactor = Math.min(edgeDistX, edgeDistY, 1)
      const edgeDarken = 1 - (1 - edgeFactor) * 0.3 * normalizedIntensity
      r *= edgeDarken
      g *= edgeDarken
      b *= edgeDarken

      let emboss = 0
      if (x > 0 && y > 0 && x < width - 1 && y < height - 1) {
        const leftIdx = (y * width + (x - 1)) * 4
        const topIdx = ((y - 1) * width + x) * 4
        const rightIdx = (y * width + (x + 1)) * 4
        const bottomIdx = ((y + 1) * width + x) * 4
        const leftGray = 0.299 * data[leftIdx] + 0.587 * data[leftIdx + 1] + 0.114 * data[leftIdx + 2]
        const topGray = 0.299 * data[topIdx] + 0.587 * data[topIdx + 1] + 0.114 * data[topIdx + 2]
        const rightGray = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2]
        const bottomGray = 0.299 * data[bottomIdx] + 0.587 * data[bottomIdx + 1] + 0.114 * data[bottomIdx + 2]
        emboss = (rightGray - leftGray) + (bottomGray - topGray)
      }
      const embossFactor = emboss * normalizedIntensity * 0.5
      r = Math.min(255, Math.max(0, r + embossFactor))
      g = Math.min(255, Math.max(0, g + embossFactor))
      b = Math.min(255, Math.max(0, b + embossFactor))

      result[idx] = Math.round(r)
      result[idx + 1] = Math.round(g)
      result[idx + 2] = Math.round(b)
      result[idx + 3] = a
    }
  }

  resultCtx.putImageData(resultImageData, 0, 0)
  return resultCanvas
}

export function applyVintageEffect(canvas: HTMLCanvasElement, intensity: number): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!
  const width = canvas.width
  const height = canvas.height
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const normalizedIntensity = intensity / 100
  const centerX = width / 2
  const centerY = height / 2
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)

  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = width
  resultCanvas.height = height
  const resultCtx = resultCanvas.getContext('2d')!
  const resultImageData = resultCtx.createImageData(width, height)
  const result = resultImageData.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      let r = data[idx]
      let g = data[idx + 1]
      let b = data[idx + 2]
      const a = data[idx + 3]

      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      const satFactor = 1 - normalizedIntensity * 0.5
      r = gray + (r - gray) * satFactor
      g = gray + (g - gray) * satFactor
      b = gray + (b - gray) * satFactor

      r = Math.min(255, r + 40 * normalizedIntensity)
      g = Math.min(255, g + 20 * normalizedIntensity)
      b = Math.max(0, b - 20 * normalizedIntensity)

      const dx = x - centerX
      const dy = y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const vignetteFactor = 1 - (dist / maxDist) * (dist / maxDist) * normalizedIntensity * 0.8
      r *= vignetteFactor
      g *= vignetteFactor
      b *= vignetteFactor

      result[idx] = Math.min(255, Math.max(0, Math.round(r)))
      result[idx + 1] = Math.min(255, Math.max(0, Math.round(g)))
      result[idx + 2] = Math.min(255, Math.max(0, Math.round(b)))
      result[idx + 3] = a
    }
  }

  resultCtx.putImageData(resultImageData, 0, 0)
  return resultCanvas
}

export function imageFileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const maxSize = 800
      let drawWidth = img.width
      let drawHeight = img.height
      if (drawWidth > maxSize || drawHeight > maxSize) {
        const scale = maxSize / Math.max(drawWidth, drawHeight)
        drawWidth = Math.round(drawWidth * scale)
        drawHeight = Math.round(drawHeight * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = drawWidth
      canvas.height = drawHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, drawWidth, drawHeight)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

interface Pixel {
  r: number
  g: number
  b: number
  a: number
  idx: number
}

function kmeans(pixels: Pixel[], k: number, maxIterations: number = 10): { centroids: number[][]; assignments: number[] } {
  const sampleSize = Math.min(pixels.length, 1000)
  const centroids: number[][] = []
  for (let i = 0; i < k; i++) {
    const randIdx = Math.floor(Math.random() * sampleSize)
    const p = pixels[randIdx]
    centroids.push([p.r, p.g, p.b])
  }

  let assignments = new Array(pixels.length).fill(0)
  let hasChanged = true
  let iter = 0

  while (hasChanged && iter < maxIterations) {
    hasChanged = false
    iter++

    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i]
      let minDist = Infinity
      let minCluster = 0
      for (let j = 0; j < k; j++) {
        const c = centroids[j]
        const dr = p.r - c[0]
        const dg = p.g - c[1]
        const db = p.b - c[2]
        const dist = dr * dr + dg * dg + db * db
        if (dist < minDist) {
          minDist = dist
          minCluster = j
        }
      }
      if (assignments[i] !== minCluster) {
        assignments[i] = minCluster
        hasChanged = true
      }
    }

    const sums = new Array(k).fill(0).map(() => [0, 0, 0, 0])
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i]
      const a = assignments[i]
      sums[a][0] += p.r
      sums[a][1] += p.g
      sums[a][2] += p.b
      sums[a][3]++
    }
    for (let j = 0; j < k; j++) {
      if (sums[j][3] > 0) {
        centroids[j] = [
          sums[j][0] / sums[j][3],
          sums[j][1] / sums[j][3],
          sums[j][2] / sums[j][3]
        ]
      }
    }
  }

  return { centroids, assignments }
}

export function removeBackgroundKmeans(
  canvas: HTMLCanvasElement,
  tolerance: number = 30
): { canvas: HTMLCanvasElement; mask: Uint8ClampedArray } {
  const ctx = canvas.getContext('2d')!
  const width = canvas.width
  const height = canvas.height
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const pixels: Pixel[] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      pixels.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        a: data[i + 3],
        idx: i
      })
    }
  }

  if (pixels.length === 0) {
    return { canvas, mask: new Uint8ClampedArray(width * height).fill(255) }
  }

  const k = Math.min(4, Math.max(2, Math.floor(pixels.length / 5000)))
  const { centroids, assignments } = kmeans(pixels, k)

  const edgePixels = new Set<number>()
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      edgePixels.add(y * width + x)
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, width - 1]) {
      edgePixels.add(y * width + x)
    }
  }

  const clusterEdgeCounts = new Array(k).fill(0)
  const clusterTotalCounts = new Array(k).fill(0)
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i]
    const pixelIdx = Math.floor(p.idx / 4)
    const a = assignments[i]
    clusterTotalCounts[a]++
    if (edgePixels.has(pixelIdx)) {
      clusterEdgeCounts[a]++
    }
  }

  let bgCluster = 0
  let maxEdgeRatio = 0
  for (let j = 0; j < k; j++) {
    const ratio = clusterEdgeCounts[j] / Math.max(1, clusterTotalCounts[j])
    const brightness = (centroids[j][0] + centroids[j][1] + centroids[j][2]) / 3
    const score = ratio * 0.6 + (brightness / 255) * 0.4
    if (score > maxEdgeRatio) {
      maxEdgeRatio = score
      bgCluster = j
    }
  }

  const result = new ImageData(new Uint8ClampedArray(data), width, height)
  const out = result.data
  const mask = new Uint8ClampedArray(width * height)

  const tolSq = (tolerance / 100) * 18000
  const bgCentroid = centroids[bgCluster]

  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i]
    const a = assignments[i]
    const pixelIdx = Math.floor(p.idx / 4)

    if (a === bgCluster) {
      out[p.idx + 3] = 0
      mask[pixelIdx] = 0
    } else {
      const dr = p.r - bgCentroid[0]
      const dg = p.g - bgCentroid[1]
      const db = p.b - bgCentroid[2]
      const distSq = dr * dr + dg * dg + db * db

      if (distSq < tolSq) {
        const alpha = Math.round((distSq / tolSq) * 255)
        out[p.idx + 3] = alpha
        mask[pixelIdx] = alpha
      } else {
        mask[pixelIdx] = 255
      }
    }
  }

  const newCanvas = document.createElement('canvas')
  newCanvas.width = width
  newCanvas.height = height
  const newCtx = newCanvas.getContext('2d')!
  newCtx.putImageData(result, 0, 0)

  return { canvas: newCanvas, mask }
}

export function applyFeather(
  canvas: HTMLCanvasElement,
  mask: Uint8ClampedArray,
  feather: number
): HTMLCanvasElement {
  if (feather <= 0) return canvas

  const width = canvas.width
  const height = canvas.height
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const featheredMask = new Uint8ClampedArray(mask.length)
  const radius = feather

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      let sum = 0
      let count = 0

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > radius) continue
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const weight = 1 - dist / radius
            sum += mask[ny * width + nx] * weight
            count += weight
          }
        }
      }

      featheredMask[idx] = count > 0 ? Math.round(sum / count) : 0
    }
  }

  const result = new ImageData(new Uint8ClampedArray(data), width, height)
  const out = result.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIdx = y * width + x
      const dataIdx = pixelIdx * 4
      const maskVal = featheredMask[pixelIdx]
      const originalAlpha = data[dataIdx + 3]
      out[dataIdx + 3] = Math.round(originalAlpha * (maskVal / 255))
    }
  }

  const newCanvas = document.createElement('canvas')
  newCanvas.width = width
  newCanvas.height = height
  const newCtx = newCanvas.getContext('2d')!
  newCtx.putImageData(result, 0, 0)
  return newCanvas
}

export function applyBrushStroke(
  canvas: HTMLCanvasElement,
  mask: Uint8ClampedArray,
  points: { x: number; y: number }[],
  brushSize: number,
  brushMode: 'keep' | 'remove'
): { canvas: HTMLCanvasElement; mask: Uint8ClampedArray } {
  const width = canvas.width
  const height = canvas.height
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const newMask = new Uint8ClampedArray(mask)

  for (const point of points) {
    const px = Math.round(point.x)
    const py = Math.round(point.y)
    const r = brushSize

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > r) continue
        const nx = px + dx
        const ny = py + dy
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const pixelIdx = ny * width + nx
          const falloff = 1 - dist / r
          if (brushMode === 'remove') {
            newMask[pixelIdx] = Math.max(0, Math.round(newMask[pixelIdx] * (1 - falloff)))
          } else {
            newMask[pixelIdx] = Math.min(255, Math.round(newMask[pixelIdx] + (255 - newMask[pixelIdx]) * falloff))
          }
        }
      }
    }
  }

  const result = new ImageData(new Uint8ClampedArray(data), width, height)
  const out = result.data

  for (let i = 0; i < newMask.length; i++) {
    const dataIdx = i * 4
    const originalAlpha = data[dataIdx + 3]
    out[dataIdx + 3] = Math.round(originalAlpha * (newMask[i] / 255))
  }

  const newCanvas = document.createElement('canvas')
  newCanvas.width = width
  newCanvas.height = height
  const newCtx = newCanvas.getContext('2d')!
  newCtx.putImageData(result, 0, 0)

  return { canvas: newCanvas, mask: newMask }
}

export function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(canvas)
    }
    img.onerror = () => reject(new Error('Failed to load image from data URL'))
    img.src = dataUrl
  })
}

export function createInitialMask(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height).fill(255)
}
