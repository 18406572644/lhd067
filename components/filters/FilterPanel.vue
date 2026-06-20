<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '~/stores/editor'
import type { FilterConfig } from '~/types'
import FilterPreview from './FilterPreview.vue'

const editorStore = useEditorStore()

const filterDefs: { type: FilterConfig['type']; name: string; desc: string }[] = [
  { type: 'watercolor', name: '水彩晕染', desc: '模拟水彩颜料晕开扩散的效果' },
  { type: 'diffuse', name: '水彩扩散', desc: '柔和的扩散模糊效果' },
  { type: 'texture', name: '压花纹理', desc: '添加纸张纹理和压花质感' },
  { type: 'vintage', name: '复古标本', desc: '年代感的复古标本外观' },
]

const filters = computed(() => editorStore.filters)

const animatingType = ref<FilterConfig['type'] | null>(null)

function onToggle(filter: FilterConfig) {
  editorStore.toggleFilter(filter.type)
  if (!filter.enabled) {
    animatingType.value = filter.type
    setTimeout(() => {
      animatingType.value = null
    }, 400)
  }
}

function onIntensityChange(filter: FilterConfig, val: number) {
  editorStore.updateFilterIntensity(filter.type, val)
}
</script>

<template>
  <div class="w-72 bg-white/60 backdrop-blur rounded-2xl border border-herb-brown-light/30 p-4">
    <h2 class="font-display text-herb-brown text-lg mb-4">水彩滤镜</h2>
    <div class="space-y-3">
      <div
        v-for="def in filterDefs"
        :key="def.type"
        class="rounded-xl p-3 transition-all duration-300"
        :class="[
          animatingType === def.type ? 'animate-press-mold' : '',
        ]"
      >
        <template v-if="filters.find(f => f.type === def.type)" :key="def.type">
          <div
            v-for="filter in [filters.find(f => f.type === def.type)!]"
            :key="filter.type"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-display text-herb-brown text-sm">{{ def.name }}</span>
              <el-switch
                :model-value="filter.enabled"
                @change="onToggle(filter)"
                active-color="#A8D5BA"
              />
            </div>
            <p class="text-xs text-herb-brown/60 mb-2">{{ def.desc }}</p>
            <FilterPreview
              :filter-type="filter.type"
              :intensity="filter.intensity"
              :enabled="filter.enabled"
              class="mb-2"
            />
            <el-slider
              v-if="filter.enabled"
              :model-value="filter.intensity"
              :min="0"
              :max="100"
              @input="(val: number) => onIntensityChange(filter, val)"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
