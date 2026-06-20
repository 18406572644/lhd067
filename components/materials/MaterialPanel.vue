<script setup lang="ts">
import type { PlantMaterial, UserMaterial } from '~/types'
import { useMaterialStore } from '~/stores/material'
import { Search, Upload } from '@element-plus/icons-vue'
import { Palette, User } from 'lucide-vue-next'

const materialStore = useMaterialStore()

const fileInput = ref<HTMLInputElement | null>(null)
const activeTab = ref<'builtin' | 'user'>('builtin')

const emit = defineEmits<{
  'add-to-canvas': [material: PlantMaterial]
  'upload-photo': [file: File]
}>()

onMounted(() => {
  materialStore.loadMaterials()
  if (import.meta.client) {
    materialStore.loadUserMaterials()
  }
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

function handleAddUserMaterial(userMat: UserMaterial) {
  const plantMat = materialStore.userMaterialToPlantMaterial(userMat)
  if (userMat.format === 'png') {
    ;(plantMat as any).imageData = userMat.data
    ;(plantMat as any).format = 'png'
  }
  emit('add-to-canvas', plantMat)
}
</script>

<template>
  <div class="w-72 bg-white/60 backdrop-blur rounded-2xl border border-herb-brown-light/30 p-4 h-full overflow-hidden flex flex-col gap-3">
    <h2 class="font-display text-herb-brown text-lg">植物素材</h2>

    <div class="flex bg-white/50 rounded-xl p-1 gap-1">
      <button
        :class="[
          'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-sm font-medium rounded-lg transition-all',
          activeTab === 'builtin'
            ? 'bg-herb-green/80 text-herb-brown'
            : 'text-herb-brown/60 hover:bg-herb-green/30'
        ]"
        @click="activeTab = 'builtin'"
      >
        <Palette :size="14" />
        内置素材
      </button>
      <button
        :class="[
          'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-sm font-medium rounded-lg transition-all',
          activeTab === 'user'
            ? 'bg-herb-green/80 text-herb-brown'
            : 'text-herb-brown/60 hover:bg-herb-green/30'
        ]"
        @click="activeTab = 'user'"
      >
        <User :size="14" />
        我的素材
      </button>
    </div>

    <div v-show="activeTab === 'builtin'" class="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
      <el-input
        :model-value="materialStore.searchQuery"
        placeholder="搜索素材..."
        clearable
        size="small"
        :prefix-icon="Search"
        @update:model-value="materialStore.setSearch"
      />

      <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-shrink-0">
        <MaterialCategory
          v-for="cat in materialStore.categories"
          :key="cat.key"
          :category="cat"
          :active="materialStore.selectedCategory === cat.key"
          @select="materialStore.setCategory"
        />
      </div>

      <div class="grid grid-cols-2 gap-3 flex-1 content-start overflow-y-auto pr-1">
        <MaterialCard
          v-for="(mat, idx) in materialStore.filteredMaterials"
          :key="mat.id"
          :material="mat"
          :index="idx"
          @add-to-canvas="emit('add-to-canvas', $event)"
        />
      </div>

      <div class="pt-2 mt-auto flex-shrink-0">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileChange"
        />
        <el-button
          class="w-full"
          size="small"
          :icon="Upload"
          @click="triggerFileInput"
        >
          上传植物照片
        </el-button>
      </div>
    </div>

    <div v-show="activeTab === 'user'" class="flex-1 overflow-hidden flex flex-col min-h-0">
      <UserMaterialPanel
        @add-user-material="handleAddUserMaterial"
      />
    </div>
  </div>
</template>
