const { $fabricReady } = useNuxtApp()

let fabricNS: any = null

async function loadFabric(): Promise<any> {
  if (fabricNS) return fabricNS
  try {
    fabricNS = await $fabricReady
  } catch (e) {
    console.error('[useFabric] fabricReady failed, fallback to window.fabric')
  }
  if (!fabricNS && import.meta.client) {
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
    if (fabricNS) {
      ;(window as any).fabric = fabricNS
    }
  }
  return fabricNS
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
