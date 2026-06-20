import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(async () => {
  if (!process.client) return

  try {
    const mod: any = await import('fabric')
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
      console.log('[fabric.plugin] Fabric.js loaded successfully, version:', fabric.version)
      return {
        provide: {
          fabric
        }
      }
    } else {
      console.error('[fabric.plugin] Failed to extract fabric from module:', Object.keys(mod))
    }
  } catch (e) {
    console.error('[fabric.plugin] Error loading fabric:', e)
  }
})
