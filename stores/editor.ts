import { defineStore } from 'pinia'
import type { CanvasObjectData, SpecimenLabel, FilterConfig, ExportSettings, DesignProject, BackgroundRemovalState } from '~/types'
import { useProjectStore } from './project'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    selectedObjectId: null as string | null,
    canvasObjects: [] as CanvasObjectData[],
    labels: [] as SpecimenLabel[],
    filters: [
      { id: 'watercolor', type: 'watercolor', intensity: 50, enabled: false },
      { id: 'diffuse', type: 'diffuse', intensity: 40, enabled: false },
      { id: 'texture', type: 'texture', intensity: 60, enabled: false },
      { id: 'vintage', type: 'vintage', intensity: 35, enabled: false }
    ] as FilterConfig[],
    exportSettings: {
      format: 'png' as const,
      dpi: 300 as const,
      showBorder: true,
      borderStyle: 'simple' as const
    } as ExportSettings,
    isDirty: false,
    bgRemoval: {
      mode: 'auto',
      tolerance: 30,
      feather: 0,
      brushMode: 'remove',
      brushSize: 20,
      isComparing: false,
      originalImageData: null,
      processedImageData: null,
      maskData: null
    } as BackgroundRemovalState
  }),

  actions: {
    addCanvasObject(obj: CanvasObjectData) {
      this.canvasObjects.push(obj)
      this.isDirty = true
    },

    removeCanvasObject(id: string) {
      this.canvasObjects = this.canvasObjects.filter(o => o.id !== id)
      if (this.selectedObjectId === id) {
        this.selectedObjectId = null
      }
      this.isDirty = true
    },

    updateCanvasObject(id: string, updates: Partial<CanvasObjectData>) {
      const obj = this.canvasObjects.find(o => o.id === id)
      if (obj) {
        Object.assign(obj, updates)
        this.isDirty = true
      }
    },

    selectObject(id: string | null) {
      this.selectedObjectId = id
    },

    addLabel(label: SpecimenLabel) {
      this.labels.push(label)
      this.isDirty = true
    },

    updateLabel(id: string, updates: Partial<SpecimenLabel>) {
      const label = this.labels.find(l => l.id === id)
      if (label) {
        Object.assign(label, updates)
        this.isDirty = true
      }
    },

    removeLabel(id: string) {
      this.labels = this.labels.filter(l => l.id !== id)
      this.isDirty = true
    },

    toggleFilter(id: string) {
      const filter = this.filters.find(f => f.id === id)
      if (filter) {
        filter.enabled = !filter.enabled
        this.isDirty = true
      }
    },

    updateFilterIntensity(id: string, intensity: number) {
      const filter = this.filters.find(f => f.id === id)
      if (filter) {
        filter.intensity = intensity
        this.isDirty = true
      }
    },

    setExportSettings(settings: Partial<ExportSettings>) {
      Object.assign(this.exportSettings, settings)
    },

    resetEditor() {
      this.selectedObjectId = null
      this.canvasObjects = []
      this.labels = []
      this.filters = [
        { id: 'watercolor', type: 'watercolor', intensity: 50, enabled: false },
        { id: 'diffuse', type: 'diffuse', intensity: 40, enabled: false },
        { id: 'texture', type: 'texture', intensity: 60, enabled: false },
        { id: 'vintage', type: 'vintage', intensity: 35, enabled: false }
      ]
      this.exportSettings = {
        format: 'png',
        dpi: 300,
        showBorder: true,
        borderStyle: 'simple'
      }
      this.bgRemoval = {
        mode: 'auto',
        tolerance: 30,
        feather: 0,
        brushMode: 'remove',
        brushSize: 20,
        isComparing: false,
        originalImageData: null,
        processedImageData: null,
        maskData: null
      }
      this.isDirty = false
    },

    setBgRemovalMode(mode: 'auto' | 'manual') {
      this.bgRemoval.mode = mode
    },

    setBgRemovalTolerance(tolerance: number) {
      this.bgRemoval.tolerance = tolerance
    },

    setBgRemovalFeather(feather: number) {
      this.bgRemoval.feather = feather
    },

    setBgRemovalBrushMode(brushMode: 'keep' | 'remove') {
      this.bgRemoval.brushMode = brushMode
    },

    setBgRemovalBrushSize(brushSize: number) {
      this.bgRemoval.brushSize = brushSize
    },

    setBgRemovalComparing(isComparing: boolean) {
      this.bgRemoval.isComparing = isComparing
    },

    setBgRemovalOriginalImage(dataUrl: string | null) {
      this.bgRemoval.originalImageData = dataUrl
    },

    setBgRemovalProcessedImage(dataUrl: string | null) {
      this.bgRemoval.processedImageData = dataUrl
    },

    setBgRemovalMask(mask: Uint8ClampedArray | null) {
      this.bgRemoval.maskData = mask
    },

    resetBgRemoval() {
      this.bgRemoval.tolerance = 30
      this.bgRemoval.feather = 0
      this.bgRemoval.isComparing = false
      this.bgRemoval.processedImageData = this.bgRemoval.originalImageData
      this.bgRemoval.maskData = null
    },

    loadFromProject(project: DesignProject) {
      this.canvasObjects = project.canvasData ? JSON.parse(project.canvasData) : []
      this.labels = [...project.labels]
      if (project.filters && project.filters.length > 0) {
        this.filters = project.filters.map(f => ({ ...f }))
      } else {
        this.filters = [
          { id: 'watercolor', type: 'watercolor', intensity: 50, enabled: false },
          { id: 'diffuse', type: 'diffuse', intensity: 40, enabled: false },
          { id: 'texture', type: 'texture', intensity: 60, enabled: false },
          { id: 'vintage', type: 'vintage', intensity: 35, enabled: false }
        ]
      }
      this.selectedObjectId = null
      this.isDirty = false
    },

    saveToProject() {
      const projectStore = useProjectStore()
      const project = projectStore.getCurrentProject
      if (!project) return
      projectStore.saveProject({
        ...project,
        canvasData: JSON.stringify(this.canvasObjects),
        labels: [...this.labels],
        filters: this.filters.map(f => ({ ...f })),
        updatedAt: new Date().toISOString()
      })
      this.isDirty = false
    }
  }
})
