import { defineStore } from 'pinia'
import type { PlantMaterial, MaterialCategory, UserMaterial, UserMaterialStoreStats } from '~/types'
import { getMaterials, getCategories } from '~/mock/api'
import { categories } from '~/mock/materials'
import {
  addUserMaterial as dbAddUserMaterial,
  updateUserMaterial as dbUpdateUserMaterial,
  deleteUserMaterial as dbDeleteUserMaterial,
  getAllUserMaterials,
  getStats as dbGetStats,
} from '~/utils/userMaterialDB'
import type { UserMaterialCategory } from '~/types'

export const userMaterialCategories: MaterialCategory[] = [
  { key: 'flower', label: '花卉', icon: 'Flower2' },
  { key: 'leaf', label: '叶片', icon: 'Leaf' },
  { key: 'grass', label: '草类', icon: 'Wheat' },
  { key: 'fruit', label: '果实', icon: 'Cherry' },
  { key: 'branch', label: '枝条', icon: 'TreePine' },
  { key: 'fern', label: '蕨类', icon: 'Palmtree' },
  { key: 'other', label: '其他', icon: 'Folder' },
]

export const useMaterialStore = defineStore('material', {
  state: () => ({
    materials: [] as PlantMaterial[],
    categories: [] as MaterialCategory[],
    userMaterials: [] as UserMaterial[],
    userCategories: userMaterialCategories,
    selectedCategory: null as string | null,
    userSelectedCategory: null as string | null,
    searchQuery: '',
    userSearchQuery: '',
    storeStats: null as UserMaterialStoreStats | null,
    loadingUserMaterials: false,
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
    },

    filteredUserMaterials(state): UserMaterial[] {
      return state.userMaterials.filter(m => {
        const matchCategory = !state.userSelectedCategory || m.category === state.userSelectedCategory
        const matchSearch = !state.userSearchQuery ||
          m.name.includes(state.userSearchQuery) ||
          m.tags.some(t => t.includes(state.userSearchQuery))
        return matchCategory && matchSearch
      })
    },
  },

  actions: {
    async loadMaterials() {
      const [materialsData, categoriesData] = await Promise.all([
        getMaterials(),
        getCategories()
      ])
      this.materials = materialsData.map(m => ({ ...m, type: 'builtin' }))
      this.categories = categoriesData.length > 0 ? categoriesData : categories
    },

    async loadUserMaterials() {
      if (!import.meta.client) return
      this.loadingUserMaterials = true
      try {
        this.userMaterials = await getAllUserMaterials()
        await this.refreshStats()
      } finally {
        this.loadingUserMaterials = false
      }
    },

    async refreshStats() {
      if (!import.meta.client) return
      try {
        this.storeStats = await dbGetStats()
      } catch (e) {
        console.error('Failed to get store stats:', e)
      }
    },

    async addUserMaterial(
      material: Omit<UserMaterial, 'id' | 'createdAt' | 'updatedAt' | 'type'>
    ): Promise<UserMaterial> {
      const result = await dbAddUserMaterial(material)
      await this.loadUserMaterials()
      return result
    },

    async updateUserMaterial(
      id: string,
      patch: Partial<Omit<UserMaterial, 'id' | 'createdAt' | 'type'>>
    ): Promise<UserMaterial> {
      const result = await dbUpdateUserMaterial(id, patch)
      await this.loadUserMaterials()
      return result
    },

    async deleteUserMaterial(id: string): Promise<void> {
      await dbDeleteUserMaterial(id)
      await this.loadUserMaterials()
    },

    setSearch(query: string) {
      this.searchQuery = query
    },

    setUserSearch(query: string) {
      this.userSearchQuery = query
    },

    setCategory(category: string | null) {
      this.selectedCategory = category
    },

    setUserCategory(category: UserMaterialCategory | null) {
      this.userSelectedCategory = category
    },

    userMaterialToPlantMaterial(um: UserMaterial): PlantMaterial {
      return {
        id: um.id,
        name: um.name,
        category: um.category === 'other' ? 'flower' : (um.category as PlantMaterial['category']),
        thumbnail: um.thumbnail,
        svgData: um.format === 'svg' ? um.data : '',
        tags: um.tags,
        type: 'user',
      }
    },
  }
})
