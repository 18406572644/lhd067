<script setup lang="ts">
import type { PlantMaterial, CanvasObjectData } from '~/types'
import { useEditorStore } from '~/stores/editor'
import { applyFiltersToSelected, applyColorAdjustment } from '~/utils/filterEffects'
import type { ColorAdjustment } from '~/types'
import { useFabric } from '~/composables/useFabric'

const emit = defineEmits<{
  'object-added': [object: any]
  'object-removed': [object: any]
  'object-modified': [object: any]
  'object-selected': [object: any]
}>()

const editorStore = useEditorStore()
const { getFabricNS } = useFabric()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const isInitializing = ref(true)
const initError = ref<string | null>(null)

let canvas: any = null
let fabric: any = null
let resizeObserver: ResizeObserver | null = null
let filterApplyTimeout: ReturnType<typeof setTimeout> | null = null
let isSyncingFromStore = false
let guideLines: any[] = []
let hideGuidesTimeout: ReturnType<typeof setTimeout> | null = null

const ALIGN_THRESHOLD = 5
const GUIDE_COLOR = '#22c55e'

async function initCanvas() {
  if (!import.meta.client || !canvasRef.value || !containerRef.value) return

  try {
    fabric = await getFabricNS()
    if (!fabric) {
      initError.value = 'Fabric.js 加载失败，请刷新页面'
      isInitializing.value = false
      return
    }
    console.log('[FabricCanvas] Fabric loaded, version:', fabric.version)

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
        const updates: any = {
          x: obj.left,
          y: obj.top,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          angle: obj.angle,
          opacity: obj.opacity
        }
        if (obj.type === 'i-text') {
          updates.text = obj.text
          updates.fontFamily = obj.fontFamily
          updates.fontSize = obj.fontSize
          updates.fill = obj.fill
          updates.fontWeight = obj.fontWeight
          updates.fontStyle = obj.fontStyle
          updates.underline = obj.underline
          updates.textAlign = obj.textAlign
          updates.lineHeight = obj.lineHeight
          updates.charSpacing = obj.charSpacing
        }
        editorStore.updateCanvasObject(obj.id, updates)
        emit('object-modified', obj)
      }
    })

    canvas.on('text:changed', (e: any) => {
      if (isSyncingFromStore) return
      const obj = e.target
      if (obj && obj.id) {
        editorStore.updateCanvasObject(obj.id, {
          text: obj.text
        })
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

    canvas.on('object:moving', (e: any) => {
      handleObjectMoving(e)
    })

    canvas.on('object:modified', () => {
      scheduleHideGuides()
    })

    canvas.on('mouse:up', () => {
      scheduleHideGuides()
    })

    canvas.on('selection:cleared', () => {
      scheduleHideGuides()
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

function getObjectBounds(obj: any) {
  obj.setCoords()
  const tl = obj.aCoords.tl
  const tr = obj.aCoords.tr
  const br = obj.aCoords.br
  const bl = obj.aCoords.bl
  return {
    left: tl.x,
    right: br.x,
    top: tl.y,
    bottom: br.y,
    centerX: (tl.x + br.x) / 2,
    centerY: (tl.y + br.y) / 2
  }
}

function clearGuideLines() {
  guideLines.forEach((line: any) => {
    if (canvas.contains(line)) {
      canvas.remove(line)
    }
  })
  guideLines = []
}

function drawGuideLine(type: 'vertical' | 'horizontal', position: number, bounds: any) {
  if (!fabric || !canvas) return
  const zoom = canvas.getZoom()
  const offset = 40 / zoom
  let line: any
  if (type === 'vertical') {
    line = new fabric.Line(
      [position, bounds.top - offset, position, bounds.bottom + offset],
      {
        stroke: GUIDE_COLOR,
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        fill: GUIDE_COLOR
      }
    )
  } else {
    line = new fabric.Line(
      [bounds.left - offset, position, bounds.right + offset, position],
      {
        stroke: GUIDE_COLOR,
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        fill: GUIDE_COLOR
      }
    )
  }
  canvas.add(line)
  guideLines.push(line)
}

function scheduleHideGuides() {
  if (hideGuidesTimeout) {
    clearTimeout(hideGuidesTimeout)
  }
  hideGuidesTimeout = setTimeout(() => {
    clearGuideLines()
    canvas?.renderAll()
  }, 200)
}

function handleObjectMoving(e: any) {
  if (!canvas || !fabric || !e.target) return
  if (isSyncingFromStore) return

  if (hideGuidesTimeout) {
    clearTimeout(hideGuidesTimeout)
    hideGuidesTimeout = null
  }

  const activeObj = e.target
  const activeBounds = getObjectBounds(activeObj)

  const allObjects = canvas.getObjects().filter((o: any) =>
    o !== activeObj &&
    !guideLines.includes(o) &&
    o.visible !== false &&
    o.selectable !== false
  )

  const snapEnabled = editorStore.snapAlignmentEnabled

  const canvasWidth = canvas.getWidth()
  const canvasHeight = canvas.getHeight()
  const canvasCenterX = canvasWidth / 2
  const canvasCenterY = canvasHeight / 2

  const alignmentMatches: Array<{
    type: 'vertical' | 'horizontal'
    position: number
    offset: number
    axis: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom'
  }> = []

  allObjects.forEach((otherObj: any) => {
    const otherBounds = getObjectBounds(otherObj)
    const axes = [
      { active: 'left', other: 'left', type: 'vertical' },
      { active: 'left', other: 'centerX', type: 'vertical' },
      { active: 'left', other: 'right', type: 'vertical' },
      { active: 'centerX', other: 'left', type: 'vertical' },
      { active: 'centerX', other: 'centerX', type: 'vertical' },
      { active: 'centerX', other: 'right', type: 'vertical' },
      { active: 'right', other: 'left', type: 'vertical' },
      { active: 'right', other: 'centerX', type: 'vertical' },
      { active: 'right', other: 'right', type: 'vertical' },
      { active: 'top', other: 'top', type: 'horizontal' },
      { active: 'top', other: 'centerY', type: 'horizontal' },
      { active: 'top', other: 'bottom', type: 'horizontal' },
      { active: 'centerY', other: 'top', type: 'horizontal' },
      { active: 'centerY', other: 'centerY', type: 'horizontal' },
      { active: 'centerY', other: 'bottom', type: 'horizontal' },
      { active: 'bottom', other: 'top', type: 'horizontal' },
      { active: 'bottom', other: 'centerY', type: 'horizontal' },
      { active: 'bottom', other: 'bottom', type: 'horizontal' }
    ] as const

    axes.forEach(({ active, other, type }) => {
      const activeVal = activeBounds[active]
      const otherVal = otherBounds[other]
      const diff = otherVal - activeVal
      if (Math.abs(diff) < ALIGN_THRESHOLD) {
        alignmentMatches.push({
          type,
          position: otherVal,
          offset: diff,
          axis: active
        })
      }
    })
  })

  const canvasAxes: Array<{
    active: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom'
    other: number
    type: 'vertical' | 'horizontal'
  }> = [
    { active: 'left', other: 0, type: 'vertical' },
    { active: 'centerX', other: canvasCenterX, type: 'vertical' },
    { active: 'right', other: canvasWidth, type: 'vertical' },
    { active: 'top', other: 0, type: 'horizontal' },
    { active: 'centerY', other: canvasCenterY, type: 'horizontal' },
    { active: 'bottom', other: canvasHeight, type: 'horizontal' }
  ]

  canvasAxes.forEach(({ active, other, type }) => {
    const activeVal = activeBounds[active]
    const diff = other - activeVal
    if (Math.abs(diff) < ALIGN_THRESHOLD) {
      alignmentMatches.push({
        type,
        position: other,
        offset: diff,
        axis: active
      })
    }
  })

  clearGuideLines()

  if (alignmentMatches.length === 0) {
    canvas.renderAll()
    return
  }

  const usedPositions: { vertical: Set<number>; horizontal: Set<number> } = {
    vertical: new Set(),
    horizontal: new Set()
  }

  const axisSnaps: Record<string, number> = {}

  alignmentMatches
    .sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset))
    .forEach(match => {
      if (snapEnabled) {
        if (!axisSnaps[match.axis]) {
          axisSnaps[match.axis] = match.offset
        }
      }
      const posKey = Math.round(match.position)
      if (!usedPositions[match.type].has(posKey)) {
        usedPositions[match.type].add(posKey)
        drawGuideLine(match.type, match.position, activeBounds)
      }
    })

  if (snapEnabled) {
    let offsetX = 0
    let offsetY = 0

    if (axisSnaps.left) offsetX += axisSnaps.left
    else if (axisSnaps.centerX) offsetX += axisSnaps.centerX
    else if (axisSnaps.right) offsetX += axisSnaps.right

    if (axisSnaps.top) offsetY += axisSnaps.top
    else if (axisSnaps.centerY) offsetY += axisSnaps.centerY
    else if (axisSnaps.bottom) offsetY += axisSnaps.bottom

    if (offsetX !== 0 || offsetY !== 0) {
      activeObj.set({
        left: activeObj.left + offsetX,
        top: activeObj.top + offsetY
      })
      activeObj.setCoords()
    }
  }

  canvas.renderAll()
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

function addTextObject(options?: {
  text?: string
  fontFamily?: string
  fontSize?: number
  fill?: string
  fontWeight?: string
  fontStyle?: string
  underline?: boolean
  textAlign?: string
  lineHeight?: number
  charSpacing?: number
}) {
  if (!canvas || !fabric) return

  const center = canvas.getCenter()
  const objId = 'obj_' + Date.now()

  const textObj = new fabric.IText(options?.text || '双击编辑文字', {
    left: center.left,
    top: center.top,
    originX: 'center',
    originY: 'center',
    id: objId,
    fontFamily: options?.fontFamily || 'Noto Sans SC',
    fontSize: options?.fontSize || 28,
    fill: options?.fill || '#6B5B4E',
    fontWeight: options?.fontWeight || 'normal',
    fontStyle: options?.fontStyle || 'normal',
    underline: options?.underline || false,
    textAlign: options?.textAlign || 'left',
    lineHeight: options?.lineHeight || 1.4,
    charSpacing: options?.charSpacing || 0,
    editable: true
  })

  animateEntrance(textObj)
  canvas.add(textObj)
  canvas.setActiveObject(textObj)
  canvas.renderAll()

  editorStore.selectObject(textObj.id)
  emit('object-added', textObj)

  editorStore.addCanvasObject({
    id: textObj.id,
    type: 'text',
    x: textObj.left!,
    y: textObj.top!,
    scaleX: textObj.scaleX!,
    scaleY: textObj.scaleY!,
    angle: textObj.angle!,
    opacity: textObj.opacity!,
    zIndex: canvas.getObjects().indexOf(textObj),
    name: '文字',
    text: textObj.text,
    fontFamily: textObj.fontFamily,
    fontSize: textObj.fontSize,
    fill: textObj.fill as string,
    fontWeight: textObj.fontWeight as string,
    fontStyle: textObj.fontStyle as string,
    underline: textObj.underline as boolean,
    textAlign: textObj.textAlign as string,
    lineHeight: textObj.lineHeight as number,
    charSpacing: textObj.charSpacing as number
  })
}

function updateTextObject(props: Record<string, any>) {
  if (!canvas || !fabric) return
  const active = canvas.getActiveObject() as any
  if (!active || active.type !== 'i-text' || !active.id) return

  active.set(props)
  canvas.renderAll()

  editorStore.updateCanvasObject(active.id, {
    text: active.text,
    fontFamily: active.fontFamily,
    fontSize: active.fontSize,
    fill: active.fill,
    fontWeight: active.fontWeight,
    fontStyle: active.fontStyle,
    underline: active.underline,
    textAlign: active.textAlign,
    lineHeight: active.lineHeight,
    charSpacing: active.charSpacing,
    scaleX: active.scaleX,
    scaleY: active.scaleY,
    angle: active.angle,
    opacity: active.opacity,
    x: active.left,
    y: active.top
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
        [...canvasIds].every((id: string) => storeIds.has(id))) {
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
        } else if (objData.type === 'text') {
          const textObj = new fabric.IText(objData.text || '双击编辑文字', {
            left: objData.x,
            top: objData.y,
            originX: 'center',
            originY: 'center',
            id: objData.id,
            fontFamily: objData.fontFamily || 'Noto Sans SC',
            fontSize: objData.fontSize || 28,
            fill: objData.fill || '#6B5B4E',
            fontWeight: objData.fontWeight || 'normal',
            fontStyle: objData.fontStyle || 'normal',
            underline: objData.underline || false,
            textAlign: objData.textAlign || 'left',
            lineHeight: objData.lineHeight || 1.4,
            charSpacing: objData.charSpacing || 0,
            scaleX: objData.scaleX,
            scaleY: objData.scaleY,
            angle: objData.angle,
            opacity: objData.opacity,
            editable: true
          })
          canvas.add(textObj)
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
let colorApplyTimeout: ReturnType<typeof setTimeout> | null = null

async function handleApplyColorAdjustment(adjustment: ColorAdjustment, isGlobal: boolean = false) {
  if (!canvas || !fabric) return

  if (colorApplyTimeout) {
    clearTimeout(colorApplyTimeout)
  }

  colorApplyTimeout = setTimeout(async () => {
    isSyncingFromStore = true
    try {
      await applyColorAdjustment(fabric, canvas, adjustment, editorStore.filters, isGlobal, (newId) => {
        editorStore.selectObject(newId)
      })
    } catch (e) {
      console.error('[FabricCanvas] Error applying color adjustment:', e)
    } finally {
      setTimeout(() => {
        isSyncingFromStore = false
      }, 100)
    }
  }, 50)
}

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
  addTextObject,
  updateTextObject,
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
  replaceSelectedImage,
  applyColorAdjustment: handleApplyColorAdjustment
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
  if (colorApplyTimeout) {
    clearTimeout(colorApplyTimeout)
  }
  if (hideGuidesTimeout) {
    clearTimeout(hideGuidesTimeout)
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
