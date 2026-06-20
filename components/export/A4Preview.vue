<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import type { CanvasObjectData, SpecimenLabel, ExportSettings, FilterConfig } from '~/types'
import { processColorAdjustment, processWatercolorDirect, processDiffuseDirect, processTextureDirect, processVintageDirect } from '~/utils/filterEffects'

const props = defineProps<{
  canvasObjects?: CanvasObjectData[]
  labels?: SpecimenLabel[]
  showBorder?: boolean
  borderStyle?: 'none' | 'simple' | 'botanical'
  filters?: FilterConfig[]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

let fabric: any = null
let canvas: any = null
let resizeObserver: ResizeObserver | null = null

const A4_RATIO = 210 / 297
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

async function waitForFabric(maxAttempts = 100, intervalMs = 50): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const w = window as any
    if (w.fabric && typeof w.fabric.Canvas === 'function') {
      return w.fabric
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  return null
}

async function initCanvas() {
  if (!import.meta.client || !canvasRef.value || !containerRef.value) return

  try {
    fabric = await waitForFabric()
    if (!fabric) return

    const containerWidth = containerRef.value.clientWidth
    const canvasHeight = containerWidth / A4_RATIO

    canvas = new fabric.StaticCanvas(canvasRef.value, {
      backgroundColor: '#FAF8F5',
      width: containerWidth,
      height: canvasHeight
    })

    resizeObserver = new ResizeObserver(() => {
      if (!canvas || !containerRef.value) return
      const w = containerRef.value.clientWidth
      const h = w / A4_RATIO
      const scale = w / canvas.getWidth()
      canvas.setDimensions({ width: w, height: h })
      canvas.setZoom(scale)
      canvas.renderAll()
    })
    resizeObserver.observe(containerRef.value)

    renderContent()
  } catch (e) {
    console.error('[A4Preview] init error:', e)
  }
}

async function renderContent() {
  if (!canvas || !fabric) return

  canvas.clear()
  canvas.setBackgroundColor('#FAF8F5', () => {})

  const objects = props.canvasObjects || []
  for (const objData of objects) {
    try {
      if (objData.type === 'material' && objData.svgData) {
        const group = await new Promise<any>((resolve) => {
          fabric.loadSVGFromString(objData.svgData, (objs: any[], opts: any) => {
            resolve(fabric.util.groupSVGElements(objs, opts))
          })
        })
        if (group) {
          group.set({
            left: objData.x,
            top: objData.y,
            scaleX: objData.scaleX,
            scaleY: objData.scaleY,
            angle: objData.angle,
            opacity: objData.opacity,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
          })
          canvas.add(group)
        }
      } else if (objData.type === 'uploaded' && objData.imageData) {
        const img = await new Promise<any>((resolve) => {
          fabric.Image.fromURL(objData.imageData, (i: any) => resolve(i), { crossOrigin: 'anonymous' })
        })
        if (img) {
          img.set({
            left: objData.x,
            top: objData.y,
            scaleX: objData.scaleX,
            scaleY: objData.scaleY,
            angle: objData.angle,
            opacity: objData.opacity,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
          })
          canvas.add(img)
        }
      }
    } catch (e) {
      console.error('[A4Preview] Error rendering object:', objData.id, e)
    }
  }

  if (props.showBorder && props.borderStyle && props.borderStyle !== 'none') {
    addBorder()
  }

  canvas.renderAll()
}

function addBorder() {
  if (!canvas || !fabric) return

  const width = canvas.getWidth()
  const height = canvas.getHeight()
  const padding = width * 0.04

  if (props.borderStyle === 'simple') {
    const rect = new fabric.Rect({
      left: padding,
      top: padding,
      width: width - padding * 2,
      height: height - padding * 2,
      fill: 'transparent',
      stroke: '#B8A88A',
      strokeWidth: 1.5,
      selectable: false,
      evented: false
    })
    canvas.add(rect)
  } else if (props.borderStyle === 'botanical') {
    const outerRect = new fabric.Rect({
      left: padding,
      top: padding,
      width: width - padding * 2,
      height: height - padding * 2,
      fill: 'transparent',
      stroke: '#B8A88A',
      strokeWidth: 1,
      selectable: false,
      evented: false
    })
    canvas.add(outerRect)

    const innerPadding = padding * 1.5
    const innerRect = new fabric.Rect({
      left: innerPadding,
      top: innerPadding,
      width: width - innerPadding * 2,
      height: height - innerPadding * 2,
      fill: 'transparent',
      stroke: '#B8A88A',
      strokeWidth: 0.5,
      selectable: false,
      evented: false
    })
    canvas.add(innerRect)

    const cornerSize = padding * 1.2
    const cornerPositions = [
      { x: padding, y: padding, angle: 0 },
      { x: width - padding, y: padding, angle: 90 },
      { x: width - padding, y: height - padding, angle: 180 },
      { x: padding, y: height - padding, angle: 270 }
    ]

    cornerPositions.forEach(pos => {
      const path = new fabric.Path(
        `M 0 ${cornerSize * 0.6} L 0 0 L ${cornerSize * 0.6} 0`,
        {
          left: pos.x,
          top: pos.y,
          angle: pos.angle,
          stroke: '#8B7355',
          strokeWidth: 1.5,
          fill: 'transparent',
          selectable: false,
          evented: false
        }
      )
      canvas.add(path)
    })
  }
}

function mmToPx(mm: number, dpi: number): number {
  return (dpi * mm) / 25.4
}

function drawLabelsToCanvas(ctx: CanvasRenderingContext2D, labels: SpecimenLabel[], canvasWidth: number, canvasHeight: number, dpi: number) {
  if (!labels || labels.length === 0) return

  const paddingMm = 15
  const paddingPx = mmToPx(paddingMm, dpi)
  const labelWidthMm = 80
  const labelWidthPx = mmToPx(labelWidthMm, dpi)
  const labelSpacingMm = 8
  const labelSpacingPx = mmToPx(labelSpacingMm, dpi)

  const bottomMarginMm = 20
  const bottomY = canvasHeight - mmToPx(bottomMarginMm, dpi)

  const startX = paddingPx
  let currentX = startX
  let currentY = bottomY
  let maxHeightInRow = 0

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]
    const labelHeight = drawSingleLabel(ctx, label, currentX, currentY, labelWidthPx, dpi)

    maxHeightInRow = Math.max(maxHeightInRow, labelHeight)

    currentX += labelWidthPx + labelSpacingPx

    if (currentX + labelWidthPx > canvasWidth - paddingPx && i < labels.length - 1) {
      currentX = startX
      currentY -= maxHeightInRow + labelSpacingPx
      maxHeightInRow = 0
    }
  }
}

function drawSingleLabel(ctx: CanvasRenderingContext2D, label: SpecimenLabel, x: number, y: number, width: number, dpi: number): number {
  const borderWidth = Math.max(1, dpi / 300)
  const padding = mmToPx(3, dpi)
  const fontSizeLg = mmToPx(5, dpi)
  const fontSizeMd = mmToPx(3.5, dpi)
  const fontSizeSm = mmToPx(2.8, dpi)
  const fontSizeXs = mmToPx(2.2, dpi)
  const lineHeight = 1.4

  let currentY = y
  let totalHeight = padding * 2

  ctx.save()

  ctx.fillStyle = 'rgba(250, 248, 245, 0.95)'
  ctx.strokeStyle = 'rgba(184, 168, 138, 0.5)'
  ctx.lineWidth = borderWidth

  ctx.beginPath()
  const radius = mmToPx(2, dpi)
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + 1000)
  ctx.lineTo(x, y + 1000)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  currentY += padding

  ctx.fillStyle = '#6B5B4E'
  ctx.font = `${fontSizeLg}px "Ma Shan Zheng", cursive`
  ctx.textBaseline = 'top'
  const plantName = label.plantName || '未命名'
  ctx.fillText(plantName, x + padding, currentY)
  currentY += fontSizeLg * lineHeight
  totalHeight += fontSizeLg * lineHeight

  ctx.fillStyle = 'rgba(107, 91, 78, 0.8)'
  ctx.font = `italic ${fontSizeMd}px "Noto Serif SC", serif`
  const scientificName = label.scientificName || '—'
  ctx.fillText(scientificName, x + padding, currentY)
  currentY += fontSizeMd * lineHeight + mmToPx(2, dpi)
  totalHeight += fontSizeMd * lineHeight + mmToPx(2, dpi)

  ctx.fillStyle = 'rgba(107, 91, 78, 0.7)'
  ctx.font = `${fontSizeSm}px "Noto Sans SC", sans-serif`

  if (label.collectionLocation) {
    const text = `📍 ${label.collectionLocation}`
    ctx.fillText(text, x + padding, currentY)
    currentY += fontSizeSm * lineHeight
    totalHeight += fontSizeSm * lineHeight
  }

  if (label.collectionDate) {
    const text = `📅 ${label.collectionDate}`
    ctx.fillText(text, x + padding, currentY)
    currentY += fontSizeSm * lineHeight
    totalHeight += fontSizeSm * lineHeight
  }

  if (label.collectorName) {
    const text = `👤 ${label.collectorName}`
    ctx.fillText(text, x + padding, currentY)
    currentY += fontSizeSm * lineHeight
    totalHeight += fontSizeSm * lineHeight
  }

  if (label.notes) {
    currentY += mmToPx(1.5, dpi)
    totalHeight += mmToPx(1.5, dpi)

    ctx.strokeStyle = 'rgba(184, 168, 138, 0.3)'
    ctx.lineWidth = borderWidth * 0.5
    ctx.beginPath()
    ctx.moveTo(x + padding, currentY)
    ctx.lineTo(x + width - padding, currentY)
    ctx.stroke()

    currentY += mmToPx(1.5, dpi)
    totalHeight += mmToPx(1.5, dpi)

    ctx.fillStyle = 'rgba(107, 91, 78, 0.5)'
    ctx.font = `${fontSizeXs}px "Noto Sans SC", sans-serif`

    const words = label.notes.split('')
    let line = ''
    const maxWidth = width - padding * 2

    for (const char of words) {
      const testLine = line + char
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, x + padding, currentY)
        line = char
        currentY += fontSizeXs * lineHeight
        totalHeight += fontSizeXs * lineHeight
      } else {
        line = testLine
      }
    }
    if (line) {
      ctx.fillText(line, x + padding, currentY)
      totalHeight += fontSizeXs * lineHeight
    }
  }

  totalHeight += padding

  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + totalHeight - radius)
  ctx.quadraticCurveTo(x + width, y + totalHeight, x + width - radius, y + totalHeight)
  ctx.lineTo(x + radius, y + totalHeight)
  ctx.quadraticCurveTo(x, y + totalHeight, x, y + totalHeight - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.stroke()

  ctx.restore()

  return totalHeight
}

function drawBorderToCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, style: 'none' | 'simple' | 'botanical', dpi: number) {
  if (style === 'none') return

  const paddingMm = 8
  const padding = mmToPx(paddingMm, dpi)
  const borderWidth = Math.max(1.5, dpi / 200)

  ctx.save()

  if (style === 'simple') {
    ctx.strokeStyle = '#B8A88A'
    ctx.lineWidth = borderWidth
    ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2)
  } else if (style === 'botanical') {
    ctx.strokeStyle = '#B8A88A'
    ctx.lineWidth = borderWidth * 0.7
    ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2)

    const innerPadding = padding * 1.5
    ctx.lineWidth = borderWidth * 0.3
    ctx.strokeRect(innerPadding, innerPadding, width - innerPadding * 2, height - innerPadding * 2)

    const cornerSize = padding * 1.2
    const cornerPositions = [
      { x: padding, y: padding, angle: 0 },
      { x: width - padding, y: padding, angle: 90 },
      { x: width - padding, y: height - padding, angle: 180 },
      { x: padding, y: height - padding, angle: 270 }
    ]

    ctx.strokeStyle = '#8B7355'
    ctx.lineWidth = borderWidth

    cornerPositions.forEach(pos => {
      ctx.save()
      ctx.translate(pos.x, pos.y)
      ctx.rotate((pos.angle * Math.PI) / 180)

      ctx.beginPath()
      ctx.moveTo(0, cornerSize * 0.6)
      ctx.lineTo(0, 0)
      ctx.lineTo(cornerSize * 0.6, 0)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, cornerSize * 0.3)
      ctx.lineTo(cornerSize * 0.15, cornerSize * 0.15)
      ctx.lineTo(cornerSize * 0.3, 0)
      ctx.stroke()

      ctx.restore()
    })
  }

  ctx.restore()
}

function applyFiltersToCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, filters: FilterConfig[]) {
  if (!filters || filters.length === 0) return

  const activeFilters = filters.filter(f => f.enabled)
  if (activeFilters.length === 0) return

  const imageData = ctx.getImageData(0, 0, width, height)

  for (const filterConfig of activeFilters) {
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

async function getHighResExport(settings: ExportSettings): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    if (!fabric) {
      reject(new Error('Fabric not initialized'))
      return
    }

    try {
      const dpi = settings.dpi || 300
      const a4WidthPx = Math.round(mmToPx(A4_WIDTH_MM, dpi))
      const a4HeightPx = Math.round(mmToPx(A4_HEIGHT_MM, dpi))
      const quality = settings.format === 'jpg' ? (settings.quality || 90) / 100 : undefined

      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = a4WidthPx
      exportCanvas.height = a4HeightPx
      const exportCtx = exportCanvas.getContext('2d')!

      if (settings.format === 'jpg') {
        exportCtx.fillStyle = '#FFFFFF'
        exportCtx.fillRect(0, 0, a4WidthPx, a4HeightPx)
      } else {
        exportCtx.fillStyle = '#FAF8F5'
        exportCtx.fillRect(0, 0, a4WidthPx, a4HeightPx)
      }

      const tempCanvas = document.createElement('canvas')
      const tempFabricCanvas = new fabric.StaticCanvas(tempCanvas, {
        width: a4WidthPx,
        height: a4HeightPx,
        backgroundColor: 'transparent'
      })

      const objects = props.canvasObjects || []
      for (const objData of objects) {
        try {
          if (objData.type === 'material' && objData.svgData) {
            const group = await new Promise<any>((resolve) => {
              fabric.loadSVGFromString(objData.svgData, (objs: any[], opts: any) => {
                resolve(fabric.util.groupSVGElements(objs, opts))
              })
            })
            if (group) {
              const originalCanvasWidth = canvas?.getWidth() || 800
              const originalCanvasHeight = canvas?.getHeight() || 1131
              const scaleX = a4WidthPx / originalCanvasWidth
              const scaleY = a4HeightPx / originalCanvasHeight

              group.set({
                left: objData.x * scaleX,
                top: objData.y * scaleY,
                scaleX: objData.scaleX * scaleX,
                scaleY: objData.scaleY * scaleY,
                angle: objData.angle,
                opacity: objData.opacity,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
              })
              tempFabricCanvas.add(group)
            }
          } else if (objData.type === 'uploaded' && objData.imageData) {
            const img = await new Promise<any>((resolve) => {
              fabric.Image.fromURL(objData.imageData, (i: any) => resolve(i), { crossOrigin: 'anonymous' })
            })
            if (img) {
              const originalCanvasWidth = canvas?.getWidth() || 800
              const originalCanvasHeight = canvas?.getHeight() || 1131
              const scaleX = a4WidthPx / originalCanvasWidth
              const scaleY = a4HeightPx / originalCanvasHeight

              img.set({
                left: objData.x * scaleX,
                top: objData.y * scaleY,
                scaleX: objData.scaleX * scaleX,
                scaleY: objData.scaleY * scaleY,
                angle: objData.angle,
                opacity: objData.opacity,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
              })
              tempFabricCanvas.add(img)
            }
          }
        } catch (e) {
          console.error('[getHighResExport] Error rendering object:', objData.id, e)
        }
      }

      tempFabricCanvas.renderAll()

      const fabricDataUrl = tempFabricCanvas.toDataURL({ format: 'png' })
      const fabricImg = new Image()
      fabricImg.src = fabricDataUrl
      await new Promise((res, rej) => {
        fabricImg.onload = res
        fabricImg.onerror = rej
      })

      exportCtx.drawImage(fabricImg, 0, 0, a4WidthPx, a4HeightPx)

      tempFabricCanvas.dispose()

      if (settings.showBorder && settings.borderStyle && settings.borderStyle !== 'none') {
        drawBorderToCanvas(exportCtx, a4WidthPx, a4HeightPx, settings.borderStyle, dpi)
      }

      if (props.labels && props.labels.length > 0) {
        drawLabelsToCanvas(exportCtx, props.labels, a4WidthPx, a4HeightPx, dpi)
      }

      if (props.filters && props.filters.length > 0) {
        applyFiltersToCanvas(exportCtx, a4WidthPx, a4HeightPx, props.filters)
      }

      let dataUrl: string
      if (settings.format === 'jpg') {
        dataUrl = exportCanvas.toDataURL('image/jpeg', quality)
      } else {
        dataUrl = exportCanvas.toDataURL('image/png')
      }

      const byteString = atob(dataUrl.split(',')[1])
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0]
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }

      resolve(new Blob([ab], { type: mimeString }))
    } catch (e) {
      reject(e)
    }
  })
}

defineExpose({
  get canvas() { return canvas },
  getHighResExport,
  renderContent
})

onMounted(() => {
  if (import.meta.client) {
    initCanvas()
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  canvas?.dispose()
})

watch(
  () => [props.canvasObjects, props.showBorder, props.borderStyle],
  () => {
    if (canvas && fabric) {
      renderContent()
    }
  },
  { deep: true }
)
</script>

<template>
  <div class="flex flex-col items-center w-full">
    <div
      ref="containerRef"
      class="relative w-full max-w-[420px] shadow-2xl rounded-sm overflow-hidden paper-texture"
      :class="[
        showBorder && borderStyle === 'simple' ? 'border border-herb-brown-light/30' : '',
        showBorder && borderStyle === 'botanical' ? 'border border-herb-brown-light/40' : ''
      ]"
    >
      <canvas ref="canvasRef" class="block w-full" />
    </div>
    <p class="text-xs text-herb-brown/40 mt-3 font-serif">
      A4 竖版 · 210mm × 297mm
    </p>
  </div>
</template>

<style scoped>
.paper-texture {
  background-image:
    linear-gradient(135deg, rgba(107, 91, 78, 0.015) 0%, transparent 50%),
    radial-gradient(ellipse at 30% 20%, rgba(245, 240, 232, 0.3) 0%, transparent 50%);
  background-color: #FAF8F5;
}
</style>
