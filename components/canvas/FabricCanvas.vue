<script setup lang="ts">
import type { PlantMaterial, CanvasObjectData } from '~/types'
import { useEditorStore } from '~/stores/editor'
import { applyFiltersToSelected } from '~/utils/filterEffects'

const emit = defineEmits<{
  'object-added': [object: any]
  'object-removed': [object: any]
  'object-modified': [object: any]
  'object-selected': [object: any]
}>()

const editorStore = useEditorStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const isInitializing = ref(true)
const initError = ref<string | null>(null)

let canvas: any = null
let fabric: any = null
let resizeObserver: ResizeObserver | null = null
let filterApplyTimeout: ReturnType<typeof setTimeout> | null = null
let isSyncingFromStore = false

async function waitForFabric(maxAttempts = 100, intervalMs = 50): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const w = window as any
    if (w.fabric && typeof w.fabric.Canvas === 'function') {
      console.log('[FabricCanvas] Found fabric on window, version:', w.fabric.version)
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
    if (!fabric) {
      initError.value = 'Fabric.js 加载失败，请刷新页面'
      isInitializing.value = false
      return
    }

    canvas = new fabric.Canvas(canvasRef.value, {
      backgroundColor: '#FAFAF5',
      selectionColor: 'rgba(168, 213, 186, 0.3)',
      selectionBorderColor: '#A8D5BA',
      selectionLineWidth: 2
    })

    canvas.setDimensions({
      width: containerRef.value.clientWidth,
      height: containerRef.value.clientHeight
    })

    fabric.Object.prototype.set({
      borderColor: '#A8D5BA',
      cornerColor: '#C5B3D8',
      cornerSize: 10,
      transparentCorners: false,
      cornerStyle: 'circle'
    })

    canvas.on('object:selected', (e: any) => {
      if (isSyncingFromStore) return
      const obj = e.target
      if (obj && obj.id) {
        editorStore.selectObject(obj.id)
        emit('object-selected', obj)
      }
    })

    canvas.on('object:modified', (e: any) => {
      if (isSyncingFromStore) return
      const obj = e.target
      if (obj && obj.id) {
        editorStore.updateCanvasObject(obj.id, {
          x: obj.left,
          y: obj.top,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          angle: obj.angle,
          opacity: obj.opacity
        })
        emit('object-modified', obj)
      }
    })

    canvas.on('object:removed', (e: any) => {
      if (isSyncingFromStore) return
      const obj = e.target
      if (obj && obj.id) {
        editorStore.removeCanvasObject(obj.id)
      }
      emit('object-removed', obj)
    })

    resizeObserver = new ResizeObserver(() => {
      if (!canvas || !containerRef.value) return
      canvas.setDimensions({
        width: containerRef.value.clientWidth,
        height: containerRef.value.clientHeight
      })
      canvas.renderAll()
    })
    resizeObserver.observe(containerRef.value)

    document.addEventListener('keydown', handleKeyDown)

    console.log('[FabricCanvas] Canvas initialized successfully')
    isInitializing.value = false
  } catch (e: any) {
    console.error('[FabricCanvas] init error:', e)
    initError.value = e?.message || '画布初始化失败'
    isInitializing.value = false
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const activeElement = document.activeElement
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      return
    }
    removeSelected()
  }
}

function animateEntrance(obj: any) {
  if (!fabric) return
  obj.set({ scaleX: 0, scaleY: 0, opacity: 0 })
  obj.animate('scaleX', 1, {
    duration: 600,
    easing: fabric.util.ease.easeOutBack,
    onChange: () => canvas?.renderAll()
  })
  obj.animate('scaleY', 1, {
    duration: 600,
    easing: fabric.util.ease.easeOutBack,
    onChange: () => canvas?.renderAll()
  })
  obj.animate('opacity', 1, {
    duration: 500,
    easing: fabric.util.ease.easeOutCubic,
    onChange: () => canvas?.renderAll()
  })
}

async function addMaterial(material: PlantMaterial, position?: { x: number; y: number }) {
  if (!canvas || !fabric) return

  const matWithImg = material as any
  const isPngUserMaterial = matWithImg.format === 'png' && matWithImg.imageData

  const center = canvas.getCenter()
  const posX = position?.x ?? center.left
  const posY = position?.y ?? center.top
  const objId = 'obj_' + Date.now()

  if (isPngUserMaterial) {
    const img = await new Promise<any>((resolve) => {
      fabric.Image.fromURL(matWithImg.imageData, (i: any) => resolve(i), { crossOrigin: 'anonymous' })
    })
    if (!img) return

    const maxSize = 200
    if (img.width! > img.height!) {
      img.scaleToWidth(maxSize)
    } else {
      img.scaleToHeight(maxSize)
    }

    img.set({
      left: posX,
      top: posY,
      originX: 'center',
      originY: 'center',
      id: objId
    })

    animateEntrance(img)
    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.renderAll()

    editorStore.selectObject(img.id)
    emit('object-added', img)

    editorStore.addCanvasObject({
      id: img.id,
      materialId: material.id,
      type: 'uploaded',
      x: img.left!,
      y: img.top!,
      scaleX: img.scaleX!,
      scaleY: img.scaleY!,
      angle: img.angle!,
      opacity: img.opacity!,
      zIndex: canvas.getObjects().indexOf(img),
      name: material.name,
      imageData: matWithImg.imageData
    })
    return
  }

  if (!material.svgData) return

  const group = await new Promise<any>((resolve) => {
    fabric.loadSVGFromString(material.svgData, (objects: any[], options: any) => {
      resolve(fabric.util.groupSVGElements(objects, options))
    })
  })
  if (!group) return

  group.scaleToWidth(120)

  group.set({
    left: posX,
    top: posY,
    originX: 'center',
    originY: 'center',
    id: objId
  })

  animateEntrance(group)
  canvas.add(group)
  canvas.setActiveObject(group)
  canvas.renderAll()
  
  editorStore.selectObject(group.id)

  emit('object-added', group)

  editorStore.addCanvasObject({
    id: group.id,
    materialId: material.id,
    type: 'material',
    x: group.left!,
    y: group.top!,
    scaleX: group.scaleX!,
    scaleY: group.scaleY!,
    angle: group.angle!,
    opacity: group.opacity!,
    zIndex: canvas.getObjects().indexOf(group),
    name: material.name,
    svgData: material.svgData
  })
}

async function addUploadedImage(dataUrl: string) {
  if (!canvas || !fabric) return

  const img = await new Promise<any>((resolve) => {
    fabric.Image.fromURL(dataUrl, (i: any) => resolve(i), { crossOrigin: 'anonymous' })
  })
  if (!img) return

  const maxSize = 200
  if (img.width! > img.height!) {
    img.scaleToWidth(maxSize)
  } else {
    img.scaleToHeight(maxSize)
  }

  const center = canvas.getCenter()
  img.set({
    left: center.left,
    top: center.top,
    originX: 'center',
    originY: 'center',
    id: 'obj_' + Date.now()
  })

  animateEntrance(img)
  canvas.add(img)
  canvas.setActiveObject(img)
  canvas.renderAll()
  
  editorStore.selectObject(img.id)

  emit('object-added', img)

  editorStore.addCanvasObject({
    id: img.id,
    type: 'uploaded',
    x: img.left!,
    y: img.top!,
    scaleX: img.scaleX!,
    scaleY: img.scaleY!,
    angle: img.angle!,
    opacity: img.opacity!,
    zIndex: canvas.getObjects().indexOf(img),
    name: '上传图片',
    imageData: dataUrl
  })
}

function getCanvasData() {
  return canvas?.toJSON() ?? {}
}

function clearCanvas() {
  canvas?.clear()
  canvas?.setBackgroundColor('#FAFAF5', () => canvas?.renderAll())
  editorStore.resetEditor()
}

function zoomIn() {
  if (!canvas) return
  const zoom = canvas.getZoom()
  canvas.setZoom(zoom + 0.1)
}

function zoomOut() {
  if (!canvas) return
  const zoom = canvas.getZoom()
  canvas.setZoom(Math.max(0.1, zoom - 0.1))
}

function fitToScreen() {
  if (!canvas) return
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
}

function removeSelected() {
  if (!canvas) return
  const activeObjects = canvas.getActiveObjects()
  if (activeObjects.length > 0) {
    activeObjects.forEach(obj => canvas!.remove(obj))
    canvas.discardActiveObject()
    canvas.renderAll()
  }
}

function undo() {
}

function redo() {
}

function updateSelectedObject(props: any) {
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (active) {
    active.set(props)
    canvas.renderAll()
  }
}

async function loadCanvasFromStore() {
  if (!canvas || !fabric) return
  if (isSyncingFromStore) return

  isSyncingFromStore = true
  try {
    const objects = canvas.getObjects()
    const storeObjects = editorStore.canvasObjects

    const canvasIds = new Set(objects.map((o: any) => o.id))
    const storeIds = new Set(storeObjects.map(o => o.id))

    if (canvasIds.size === storeIds.size &&
        [...canvasIds].every(id => storeIds.has(id))) {
      return
    }

    canvas.clear()
    canvas.setBackgroundColor('#FAFAF5', () => {})

    for (const objData of storeObjects) {
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
              id: objData.id
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
              id: objData.id
            })
            canvas.add(img)
          }
        }
      } catch (e) {
        console.error('[FabricCanvas] Error restoring object:', objData.id, e)
      }
    }

    canvas.renderAll()

    if (editorStore.selectedObjectId) {
      const activeObj = canvas.getObjects().find((o: any) => o.id === editorStore.selectedObjectId)
      if (activeObj) {
        canvas.setActiveObject(activeObj)
        canvas.renderAll()
      }
    }
  } finally {
    isSyncingFromStore = false
  }
}

let isApplyingFilters = false

async function applyFilters() {
  console.log('[FabricCanvas V2] applyFilters triggered, filters:', JSON.stringify(editorStore.filters.map((f:any)=>`${f.type}:${f.enabled}`)))
  if (!canvas || !fabric) return
  
  if (filterApplyTimeout) {
    clearTimeout(filterApplyTimeout)
  }
  
  filterApplyTimeout = setTimeout(async () => {
    console.log('[FabricCanvas V2] applyFilters debounce fired')
    isApplyingFilters = true
    isSyncingFromStore = true
    try {
      const activeObj = canvas.getActiveObject()
      console.log('[FabricCanvas V2] Active object before apply:', activeObj ? `${activeObj.type} ${activeObj.id}` : 'NONE')
      await applyFiltersToSelected(fabric, canvas, editorStore.filters, (newId) => {
        console.log('[FabricCanvas V2] Object replaced callback, newId:', newId)
        editorStore.selectObject(newId)
      })
      const afterObj = canvas.getActiveObject()
      console.log('[FabricCanvas V2] Active object after apply:', afterObj ? `${afterObj.type} ${afterObj.id}` : 'NONE')
      console.log('[FabricCanvas V2] Total objects on canvas:', canvas.getObjects().length)
    } catch (e) {
      console.error('[FabricCanvas] Error applying filters:', e)
    } finally {
      setTimeout(() => {
        isApplyingFilters = false
        isSyncingFromStore = false
      }, 100)
    }
  }, 50)
}

async function replaceSelectedImage(dataUrl: string): Promise<{ scaleX: number; scaleY: number } | null> {
  if (!canvas || !fabric) return null

  const activeObj = canvas.getActiveObject()
  if (!activeObj || !activeObj.id) return null

  isSyncingFromStore = true
  try {
    const newImg = await new Promise<any>((resolve) => {
      fabric.Image.fromURL(dataUrl, (i: any) => resolve(i), { crossOrigin: 'anonymous' })
    })
    if (!newImg) return null

    const visualWidth = activeObj.width * activeObj.scaleX
    const visualHeight = activeObj.height * activeObj.scaleY
    const newScaleX = visualWidth / newImg.width
    const newScaleY = visualHeight / newImg.height

    const objId = activeObj.id
    const objLeft = activeObj.left
    const objTop = activeObj.top
    const objAngle = activeObj.angle
    const objOpacity = activeObj.opacity
    const objOriginX = activeObj.originX
    const objOriginY = activeObj.originY

    canvas.remove(activeObj)
    canvas.add(newImg)

    newImg.set({
      left: objLeft,
      top: objTop,
      scaleX: newScaleX,
      scaleY: newScaleY,
      angle: objAngle,
      opacity: objOpacity,
      originX: objOriginX,
      originY: objOriginY,
      id: objId
    })

    newImg.setCoords()
    canvas.setActiveObject(newImg)
    canvas.renderAll()

    return { scaleX: newScaleX, scaleY: newScaleY }
  } catch (e) {
    console.error('[FabricCanvas] replaceSelectedImage error:', e)
    return null
  } finally {
    setTimeout(() => {
      isSyncingFromStore = false
    }, 100)
  }
}

defineExpose({
  get canvas() { return canvas },
  addMaterial,
  addUploadedImage,
  getCanvasData,
  clearCanvas,
  zoomIn,
  zoomOut,
  fitToScreen,
  removeSelected,
  undo,
  redo,
  updateSelectedObject,
  applyFilters,
  replaceSelectedImage
})

onMounted(() => {
  if (import.meta.client) {
    initCanvas()
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('keydown', handleKeyDown)
  if (filterApplyTimeout) {
    clearTimeout(filterApplyTimeout)
  }
  canvas?.dispose()
})

watch(
  () => editorStore.canvasObjects,
  () => {
    if (canvas && fabric) {
      loadCanvasFromStore()
    }
  }
)

watch(
  () => editorStore.selectedObjectId,
  (newId) => {
    if (!canvas || !fabric) return
    const objects = canvas.getObjects()
    const target = objects.find((o: any) => o.id === newId)
    if (target) {
      canvas.setActiveObject(target)
      canvas.renderAll()
    } else if (!newId) {
      canvas.discardActiveObject()
      canvas.renderAll()
    }
  }
)

watch(
  () => editorStore.filters,
  () => {
    applyFilters()
  },
  { deep: true }
)
</script>

<template>
  <div
    ref="containerRef"
    class="relative flex-1 min-h-0 bg-herb-cream-dark/30 rounded-2xl overflow-hidden"
  >
    <canvas
      ref="canvasRef"
      id="fabric-canvas"
      class="w-full h-full"
    />
    <div
      v-if="isInitializing"
      class="absolute inset-0 flex items-center justify-center bg-herb-cream/80 backdrop-blur-sm"
    >
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-herb-green border-t-transparent rounded-full animate-spin" />
        <span class="font-display text-herb-brown text-sm">画布加载中...</span>
      </div>
    </div>
    <div
      v-if="initError"
      class="absolute inset-0 flex items-center justify-center bg-herb-cream/90 backdrop-blur-sm"
    >
      <div class="flex flex-col items-center gap-3 text-center px-6">
        <span class="text-4xl">⚠️</span>
        <p class="font-display text-herb-brown text-sm">{{ initError }}</p>
      </div>
    </div>
  </div>
</template>
