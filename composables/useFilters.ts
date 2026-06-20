import type { FilterConfig } from '~/types'

export function useFilters() {
  const editorStore = useEditorStore()

  function toggle(type: string) {
    const filter = editorStore.filters.find(f => f.type === type)
    if (filter) {
      editorStore.toggleFilter(filter.id)
    }
  }

  function setIntensity(type: string, value: number) {
    const filter = editorStore.filters.find(f => f.type === type)
    if (filter) {
      editorStore.updateFilterIntensity(filter.id, value)
    }
  }

  function getActiveFilters(): FilterConfig[] {
    return editorStore.filters.filter(f => f.enabled)
  }

  function applyAllToCanvas(canvas: any) {
    const activeFilters = getActiveFilters()
    for (const filter of activeFilters) {
      console.log('Applying filter:', filter.type, 'intensity:', filter.intensity)
    }
  }

  return {
    toggle,
    setIntensity,
    getActiveFilters,
    applyAllToCanvas
  }
}
