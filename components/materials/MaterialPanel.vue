<script setup lang="ts">
import type { PlantMaterial } from '~/types'
import { useMaterialStore } from '~/stores/material'
import { Search, Upload } from '@element-plus/icons-vue'

const materialStore = useMaterialStore()

const fileInput = ref<HTMLInputElement | null>(null)

const emit = defineEmits<{
  'add-to-canvas': [material: PlantMaterial]
  'upload-photo': [file: File]
}>()

onMounted(() => {
  materialStore.loadMaterials()
})

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    emit('upload-photo', file)
    target.value = ''
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}
</script>

<template>
  <div class="w-72 bg-white/60 backdrop-blur rounded-2xl border border-herb-brown-light/30 p-4 h-full overflow-y-auto flex flex-col gap-3">
    <h2 class="font-display text-herb-brown text-lg">植物素材</h2>

    <el-input
      :model-value="materialStore.searchQuery"
      placeholder="搜索素材..."
      clearable
      :prefix-icon="Search"
      @update:model-value="materialStore.setSearch"
    />

    <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <MaterialCategory
        v-for="cat in materialStore.categories"
        :key="cat.key"
        :category="cat"
        :active="materialStore.selectedCategory === cat.key"
        @select="materialStore.setCategory"
      />
    </div>

    <div class="grid grid-cols-2 gap-3 flex-1 content-start">
      <MaterialCard
        v-for="(mat, idx) in materialStore.filteredMaterials"
        :key="mat.id"
        :material="mat"
        :index="idx"
        @add-to-canvas="emit('add-to-canvas', $event)"
      />
    </div>

    <div class="mt-auto pt-2">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFileChange"
      />
      <el-button
        class="w-full"
        :icon="Upload"
        @click="triggerFileInput"
      >
        上传植物照片
      </el-button>
    </div>
  </div>
</template>
