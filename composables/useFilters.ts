import type { FilterConfig } from '~/types'
import { useEditorStore } from '~/stores/editor'
import { applyFiltersToSelected, applyFiltersToAllImages } from '~/utils/filterEffects'

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

  async function applyAllToSelected(fabric: any, canvas: any) {
    await applyFiltersToSelected(fabric, canvas, editorStore.filters)
  }

  async function applyAllToAll(fabric: any, canvas: any) {
    await applyFiltersToAllImages(fabric, canvas, editorStore.filters)
  }

  return {
    toggle,
    setIntensity,
    getActiveFilters,
    applyAllToSelected,
    applyAllToAll
  }
}
