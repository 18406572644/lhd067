import { defineNuxtPlugin } from '#app'

let fabricPromise: Promise<any> | null = null

function loadFabricModule(): Promise<any> {
  if (fabricPromise) return fabricPromise

  fabricPromise = import('fabric').then((mod: any) => {
    let fabric: any = null
    if (mod.fabric && typeof mod.fabric.Canvas === 'function') {
      fabric = mod.fabric
    } else if (mod.default && typeof mod.default.Canvas === 'function') {
      fabric = mod.default
    } else if (mod.default && mod.default.fabric && typeof mod.default.fabric.Canvas === 'function') {
      fabric = mod.default.fabric
    } else if (typeof mod.Canvas === 'function') {
      fabric = mod
    }
    if (fabric) {
      ;(window as any).fabric = fabric
      console.log('[fabric.plugin] Fabric.js loaded, version:', fabric.version)
    } else {
      console.error('[fabric.plugin] Failed to extract fabric from module')
    }
    return fabric
  }).catch((e) => {
    console.error('[fabric.plugin] Error loading fabric:', e)
    return null
  })

  return fabricPromise
}

export default defineNuxtPlugin(() => {
  const promise = loadFabricModule()
  return {
    provide: {
      fabricReady: promise,
    }
  }
})
