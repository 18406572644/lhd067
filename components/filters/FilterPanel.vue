<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '~/stores/editor'
import type { FilterConfig } from '~/types'
import FilterPreview from './FilterPreview.vue'

const editorStore = useEditorStore()

const filterInfoMap: Record<string, { name: string; desc: string }> = {
  watercolor: { name: '水彩晕染', desc: '边缘柔和化 + 色彩饱和度微调' },
  diffuse: { name: '水彩扩散', desc: '边缘外扩半透明像素，模拟晕染' },
  texture: { name: '压花纹理', desc: '叠加纸纹纹理，增加质感' },
  vintage: { name: '复古怀旧', desc: '降低饱和度，增加褐色色调' },
}

const filters = computed(() => editorStore.filters)
const hasSelectedObject = computed(() => editorStore.selectedObjectId !== null)

const animatingType = ref<string | null>(null)

function onToggle(filter: FilterConfig) {
  if (!hasSelectedObject.value) {
    return
  }
  editorStore.toggleFilter(filter.id)
  if (!filter.enabled) {
    animatingType.value = filter.type
    setTimeout(() => {
      animatingType.value = null
    }, 400)
  }
}

function onIntensityChange(filter: FilterConfig, val: number) {
  editorStore.updateFilterIntensity(filter.id, val)
}
</script>

<template>
  <div class="w-72 bg-white/60 backdrop-blur rounded-2xl border border-herb-brown-light/30 p-4">
    <h2 class="font-display text-herb-brown text-lg mb-4">水彩滤镜</h2>
    
    <div v-if="!hasSelectedObject" class="text-center py-6 text-herb-brown/50 text-sm">
      <p class="mb-2">请先选择一个画布对象</p>
      <p class="text-xs">点击素材或上传图片以应用滤镜</p>
    </div>
    
    <div v-else class="space-y-3">
      <div
        v-for="filter in filters"
        :key="filter.id"
        class="rounded-xl p-3 transition-all duration-300"
        :class="[
          animatingType === filter.type ? 'animate-press-mold' : '',
        ]"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-display text-herb-brown text-sm">{{ filterInfoMap[filter.type]?.name || filter.type }}</span>
            <el-switch
              :model-value="filter.enabled"
              @change="onToggle(filter)"
              active-color="#A8D5BA"
            />
          </div>
          <p class="text-xs text-herb-brown/60">{{ filterInfoMap[filter.type]?.desc || '' }}</p>
          <FilterPreview
            :filter-type="filter.type"
            :intensity="filter.intensity"
            :enabled="filter.enabled"
          />
          <div v-if="filter.enabled" class="flex items-center gap-2">
            <span class="text-xs text-herb-brown/50 w-8">{{ filter.intensity }}</span>
            <el-slider
              :model-value="filter.intensity"
              :min="0"
              :max="100"
              @input="(val: number) => onIntensityChange(filter, val)"
              class="flex-1"
            />
          </div>
          <div v-else class="h-6" />
        </div>
      </div>
      
      <div class="text-xs text-herb-brown/40 text-center pt-2 border-t border-herb-brown-light/20">
        已启用 {{ filters.filter(f => f.enabled).length }} 个滤镜
      </div>
    </div>
  </div>
</template>
