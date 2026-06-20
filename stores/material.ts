import { defineStore } from 'pinia'
import type { PlantMaterial, MaterialCategory } from '~/types'
import { getMaterials, getCategories } from '~/mock/api'
import { categories } from '~/mock/materials'

export const useMaterialStore = defineStore('material', {
  state: () => ({
    materials: [] as PlantMaterial[],
    categories: [] as MaterialCategory[],
    selectedCategory: null as string | null,
    searchQuery: ''
  }),

  getters: {
    filteredMaterials(state): PlantMaterial[] {
      return state.materials.filter(m => {
        const matchCategory = !state.selectedCategory || m.category === state.selectedCategory
        const matchSearch = !state.searchQuery ||
          m.name.includes(state.searchQuery) ||
          m.tags.some(t => t.includes(state.searchQuery))
        return matchCategory && matchSearch
      })
    }
  },

  actions: {
    async loadMaterials() {
      const [materialsData, categoriesData] = await Promise.all([
        getMaterials(),
        getCategories()
      ])
      this.materials = materialsData
      this.categories = categoriesData.length > 0 ? categoriesData : categories
    },

    setSearch(query: string) {
      this.searchQuery = query
    },

    setCategory(category: string | null) {
      this.selectedCategory = category
    }
  }
})
