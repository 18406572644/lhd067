import { fabric } from 'fabric'

export function createWatercolorFilter(intensity: number) {
  const normalized = intensity / 100
  return {
    brightness: 0.03 + normalized * 0.02,
    contrast: 0.05 + normalized * 0.05,
    saturation: -0.2 * normalized
  }
}

export function createDiffuseFilter(intensity: number) {
  return {
    blur: intensity * 0.05,
    brightness: 0.02
  }
}

export function createTextureFilter(intensity: number) {
  const normalized = intensity / 100
  return {
    contrast: 0.1 + normalized * 0.1,
    brightness: -0.03 - normalized * 0.02,
    noise: intensity * 0.5
  }
}

export function createVintageFilter(intensity: number) {
  const normalized = intensity / 100
  return {
    sepia: normalized * 0.6,
    brightness: -0.05,
    contrast: 0.1,
    saturation: -0.3 * normalized
  }
}

export function applyCanvasFilter(fabricCanvas: any, filterType: string, intensity: number): void {
  const objects = fabricCanvas.getObjects()

  objects.forEach((obj: any) => {
    if (obj.type === 'image' || obj instanceof fabric.Image) {
      obj.filters = []

      switch (filterType) {
        case 'watercolor': {
          const config = createWatercolorFilter(intensity)
          obj.filters.push(new fabric.Image.filters.Brightness({ brightness: config.brightness }))
          obj.filters.push(new fabric.Image.filters.Contrast({ contrast: config.contrast }))
          obj.filters.push(new fabric.Image.filters.Saturation({ saturation: config.saturation }))
          break
        }
        case 'diffuse': {
          const config = createDiffuseFilter(intensity)
          obj.filters.push(new fabric.Image.filters.Blur({ blur: config.blur }))
          obj.filters.push(new fabric.Image.filters.Brightness({ brightness: config.brightness }))
          break
        }
        case 'texture': {
          const config = createTextureFilter(intensity)
          obj.filters.push(new fabric.Image.filters.Contrast({ contrast: config.contrast }))
          obj.filters.push(new fabric.Image.filters.Brightness({ brightness: config.brightness }))
          obj.filters.push(new fabric.Image.filters.Noise({ noise: config.noise }))
          break
        }
        case 'vintage': {
          const config = createVintageFilter(intensity)
          obj.filters.push(new fabric.Image.filters.Sepia())
          obj.filters.push(new fabric.Image.filters.Brightness({ brightness: config.brightness }))
          obj.filters.push(new fabric.Image.filters.Contrast({ contrast: config.contrast }))
          obj.filters.push(new fabric.Image.filters.Saturation({ saturation: config.saturation }))
          break
        }
      }

      obj.applyFilters()
    }
  })

  fabricCanvas.renderAll()
}
