let fabricNS: any = null
let loadPromise: Promise<any> | null = null

async function pollWindowFabric(maxAttempts = 50, intervalMs = 50): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    if (typeof window !== 'undefined' && (window as any).fabric && typeof (window as any).fabric.Canvas === 'function') {
      return (window as any).fabric
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  return null
}

async function loadFabric(): Promise<any> {
  if (fabricNS) return fabricNS
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    if (import.meta.client) {
      const fromWindow = await pollWindowFabric()
      if (fromWindow) {
        fabricNS = fromWindow
        console.log('[useFabric] Loaded from window.fabric, version:', fabricNS.version)
        return fabricNS
      }
    }

    try {
      const mod: any = await import('fabric')
      if (mod.fabric && typeof mod.fabric.Canvas === 'function') {
        fabricNS = mod.fabric
      } else if (mod.default && typeof mod.default.Canvas === 'function') {
        fabricNS = mod.default
      } else if (mod.default && mod.default.fabric && typeof mod.default.fabric.Canvas === 'function') {
        fabricNS = mod.default.fabric
      } else if (typeof mod.Canvas === 'function') {
        fabricNS = mod
      }
      if (fabricNS && import.meta.client) {
        ;(window as any).fabric = fabricNS
      }
    } catch (e) {
      console.error('[useFabric] Dynamic import failed:', e)
    }

    if (!fabricNS && import.meta.client) {
      fabricNS = (window as any).fabric
    }

    if (!fabricNS) {
      console.error('[useFabric] Failed to load Fabric.js completely')
      throw new Error('Failed to load Fabric.js')
    }

    return fabricNS
  })()

  return loadPromise
}

export function useFabric() {
  async function createCanvas(
    el: HTMLCanvasElement,
    options?: any
  ): Promise<any | null> {
    if (!import.meta.client || !el) return null
    const fabric = await loadFabric()
    return new fabric.Canvas(el, options)
  }

  async function loadSVG(svgData: string): Promise<any> {
    const fabric = await loadFabric()
    return new Promise((resolve, reject) => {
      if (!import.meta.client) {
        reject(new Error('loadSVG can only be called on client'))
        return
      }
      fabric.loadSVGFromString(svgData, (objects: any[], options: any) => {
        const group = fabric.util.groupSVGElements(objects, options)
        resolve(group)
      })
    })
  }

  async function loadImage(dataUrl: string): Promise<any> {
    const fabric = await loadFabric()
    return new Promise((resolve, reject) => {
      if (!import.meta.client) {
        reject(new Error('loadImage can only be called on client'))
        return
      }
      fabric.Image.fromURL(dataUrl, (img: any) => {
        resolve(img)
      }, { crossOrigin: 'anonymous' })
    })
  }

  async function getFabricNS(): Promise<any> {
    return await loadFabric()
  }

  return {
    createCanvas,
    loadSVG,
    loadImage,
    getFabricNS,
  }
}
