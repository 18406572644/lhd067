import type { PlantMaterial } from '~/types'

export function useMaterials() {
  const materialStore = useMaterialStore()

  async function loadAll() {
    await materialStore.loadMaterials()
  }

  function filterByCategory(category: string | null): PlantMaterial[] {
    if (!category) {
      return materialStore.materials
    }
    return materialStore.materials.filter(m => m.category === category)
  }

  function search(query: string): PlantMaterial[] {
    if (!query) {
      return materialStore.materials
    }
    const lowerQuery = query.toLowerCase()
    return materialStore.materials.filter(m =>
      m.name.toLowerCase().includes(lowerQuery) ||
      m.tags.some(t => t.toLowerCase().includes(lowerQuery))
    )
  }

  return {
    loadAll,
    filterByCategory,
    search
  }
}
