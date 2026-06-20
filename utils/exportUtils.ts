import type { ExportSettings } from '~/types'

const A4_WIDTH = 2480
const A4_HEIGHT = 3508

export function generateA4Layout(
  fabricCanvas: any,
  options: { showBorder: boolean; borderStyle: string }
): HTMLCanvasElement {
  const a4Canvas = document.createElement('canvas')
  a4Canvas.width = A4_WIDTH
  a4Canvas.height = A4_HEIGHT
  const ctx = a4Canvas.getContext('2d')!

  ctx.fillStyle = '#fffef5'
  ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT)

  const canvasDataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 })
  const img = new Image()
  img.src = canvasDataUrl

  const drawContent = () => {
    const imgAspect = img.width / img.height
    const margin = 200
    const availWidth = A4_WIDTH - margin * 2
    const availHeight = A4_HEIGHT - margin * 2
    let drawWidth: number
    let drawHeight: number

    if (imgAspect > availWidth / availHeight) {
      drawWidth = availWidth
      drawHeight = availWidth / imgAspect
    } else {
      drawHeight = availHeight
      drawWidth = availHeight * imgAspect
    }

    const offsetX = (A4_WIDTH - drawWidth) / 2
    const offsetY = (A4_HEIGHT - drawHeight) / 2
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

    if (options.showBorder) {
      ctx.strokeStyle = options.borderStyle === 'double' ? '#8b7355' : '#a0926b'
      ctx.lineWidth = options.borderStyle === 'double' ? 3 : 2

      if (options.borderStyle === 'double') {
        ctx.strokeRect(margin - 20, margin - 20, A4_WIDTH - (margin - 20) * 2, A4_HEIGHT - (margin - 20) * 2)
        ctx.strokeRect(margin + 10, margin + 10, A4_WIDTH - (margin + 10) * 2, A4_HEIGHT - (margin + 10) * 2)
      } else if (options.borderStyle === 'dashed') {
        ctx.setLineDash([15, 8])
        ctx.strokeRect(margin, margin, A4_WIDTH - margin * 2, A4_HEIGHT - margin * 2)
        ctx.setLineDash([])
      } else {
        ctx.strokeRect(margin, margin, A4_WIDTH - margin * 2, A4_HEIGHT - margin * 2)
      }
    }
  }

  drawContent()
  return a4Canvas
}

export function exportCanvasAsImage(fabricCanvas: any, settings: ExportSettings): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const multiplier = settings.dpi / 96
      const quality = settings.format === 'jpg' ? (settings.quality || 90) / 100 : undefined
      const dataUrl = fabricCanvas.toDataURL({
        format: settings.format === 'jpg' ? 'jpeg' : 'png',
        quality: quality,
        multiplier
      })

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

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function createProjectThumbnail(fabricCanvas: any): string {
  return fabricCanvas.toDataURL({
    format: 'png',
    multiplier: 200 / Math.max(fabricCanvas.getWidth(), fabricCanvas.getHeight())
  })
}
