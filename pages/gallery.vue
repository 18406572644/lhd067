<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMaterialStore } from '~/stores/material'
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'
import type { PlantMaterial } from '~/types'
import MaterialCard from '~/components/materials/MaterialCard.vue'
import MaterialCategory from '~/components/materials/MaterialCategory.vue'
import { ArrowLeft, Search } from 'lucide-vue-next'

const materialStore = useMaterialStore()
const editorStore = useEditorStore()
const projectStore = useProjectStore()
const router = useRouter()

onMounted(() => {
  materialStore.loadMaterials()
})

const categories = computed(() => materialStore.categories)
const filtered = computed(() => materialStore.filteredMaterials)

function selectCategory(key: string) {
  materialStore.setCategory(key === materialStore.selectedCategory ? null : key)
}

function createWithMaterial(material: PlantMaterial) {
  const p = projectStore.createProject()
  projectStore.setCurrentProject(p.id)
  router.push(`/editor/${p.id}`)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-10">
    <div class="mb-8">
      <NuxtLink to="/" class="inline-flex items-center gap-1 text-herb-brown/60 font-serif text-sm hover:text-herb-green-dark transition-colors mb-4">
        <ArrowLeft :size="16" />
        <span>返回工作台</span>
      </NuxtLink>
      <h1 class="font-display text-3xl text-herb-brown mb-2">
        植物素材库
      </h1>
      <p class="text-herb-brown/60 font-serif">
        30+ 种水彩手绘风格植物压花素材
      </p>
    </div>

    <div class="w-full max-w-md mb-6">
      <el-input
        v-model="materialStore.searchQuery"
        placeholder="搜索植物名称或标签..."
        clearable
        size="large"
      >
        <template #prefix>
          <Search :size="18" class="text-herb-brown-light" />
        </template>
      </el-input>
    </div>

    <div class="flex flex-wrap gap-2 mb-8">
      <MaterialCategory
        v-for="category in categories"
        :key="category.key"
        :category="category"
        :active="materialStore.selectedCategory === category.key"
        @select="selectCategory"
      />
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <MaterialCard
        v-for="(material, index) in filtered"
        :key="material.id"
        :material="material"
        :index="index"
        @add-to-canvas="createWithMaterial"
      />
    </div>

    <div v-if="filtered.length === 0" class="text-center py-16">
      <p class="font-serif text-herb-brown/40">
        暂无匹配的素材，试试其他关键词或分类
      </p>
    </div>
  </div>
</template>
