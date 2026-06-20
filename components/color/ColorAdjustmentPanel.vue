<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEditorStore } from '~/stores/editor'
import type { ColorAdjustment, ColorPalette } from '~/types'
import { plantPalettes } from '~/mock/palettes'
import { RotateCcw, Palette, Sliders, Globe, Leaf } from 'lucide-vue-next'

const props = defineProps<{
  mode: 'object' | 'global'
}>()

const emit = defineEmits<{
  apply: [adjustment: ColorAdjustment, isGlobal: boolean]
  reset: [isGlobal: boolean]
}>()

const editorStore = useEditorStore()

const isGlobalMode = computed(() => props.mode === 'global')

const localAdjustment = ref<ColorAdjustment>({
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0
})

const appliedPaletteId = ref<string | null>(null)

const hasSelectedObject = computed(() => editorStore.selectedObjectId !== null)

const adjustment = computed({
  get: () => {
    if (isGlobalMode.value) {
      return editorStore.globalColorAdjustment
    }
    if (editorStore.selectedObjectId) {
      const state = editorStore.getObjectColorState(editorStore.selectedObjectId)
      return state.adjustment
    }
    return { hue: 0, saturation: 0, brightness: 0, contrast: 0 }
  },
  set: (val: ColorAdjustment) => {
    if (isGlobalMode.value) {
      editorStore.updateGlobalColorAdjustment(val)
    } else if (editorStore.selectedObjectId) {
      editorStore.updateObjectColorAdjustment(editorStore.selectedObjectId, val)
    }
  }
})

const currentPaletteId = computed(() => {
  if (isGlobalMode.value) {
    return editorStore.globalAppliedPaletteId
  }
  if (editorStore.selectedObjectId) {
    const state = editorStore.getObjectColorState(editorStore.selectedObjectId)
    return state.appliedPaletteId
  }
  return null
})

const isModified = computed(() => {
  const adj = adjustment.value
  return adj.hue !== 0 || adj.saturation !== 0 || adj.brightness !== 0 || adj.contrast !== 0
})

watch(
  () => editorStore.selectedObjectId,
  (newId) => {
    if (newId && !isGlobalMode.value) {
      const state = editorStore.getObjectColorState(newId)
      localAdjustment.value = { ...state.adjustment }
      appliedPaletteId.value = state.appliedPaletteId
    }
  },
  { immediate: true }
)

function handleHueChange(val: number) {
  adjustment.value = { ...adjustment.value, hue: val }
  appliedPaletteId.value = null
  emit('apply', adjustment.value, isGlobalMode.value)
}

function handleSaturationChange(val: number) {
  adjustment.value = { ...adjustment.value, saturation: val }
  appliedPaletteId.value = null
  emit('apply', adjustment.value, isGlobalMode.value)
}

function handleBrightnessChange(val: number) {
  adjustment.value = { ...adjustment.value, brightness: val }
  appliedPaletteId.value = null
  emit('apply', adjustment.value, isGlobalMode.value)
}

function handleContrastChange(val: number) {
  adjustment.value = { ...adjustment.value, contrast: val }
  appliedPaletteId.value = null
  emit('apply', adjustment.value, isGlobalMode.value)
}

function applyPalette(palette: ColorPalette) {
  adjustment.value = { ...palette.adjustment }
  appliedPaletteId.value = palette.id
  
  if (isGlobalMode.value) {
    editorStore.setGlobalColorPalette(palette.id, palette.adjustment)
  } else if (editorStore.selectedObjectId) {
    editorStore.setObjectColorPalette(editorStore.selectedObjectId, palette.id, palette.adjustment)
  }
  
  emit('apply', palette.adjustment, isGlobalMode.value)
}

function handleReset() {
  adjustment.value = { hue: 0, saturation: 0, brightness: 0, contrast: 0 }
  appliedPaletteId.value = null
  
  if (isGlobalMode.value) {
    editorStore.resetGlobalColor()
  } else if (editorStore.selectedObjectId) {
    editorStore.resetObjectColor(editorStore.selectedObjectId)
  }
  
  emit('reset', isGlobalMode.value)
}
</script>

<template>
  <div class="bg-white/60 backdrop-blur rounded-2xl p-4 border border-herb-brown-light/30">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <Sliders :size="18" class="text-herb-green" />
        <h3 class="font-display text-herb-brown text-base">
          {{ isGlobalMode ? '整体调色' : '色彩调节' }}
        </h3>
      </div>
      <div
        v-if="isGlobalMode"
        class="flex items-center gap-1 px-2 py-0.5 bg-herb-green/20 rounded-full text-xs text-herb-green-dark"
      >
        <Globe :size="12" />
        <span>全局</span>
      </div>
    </div>

    <div
      v-if="!isGlobalMode && !hasSelectedObject"
      class="text-center py-6 text-herb-brown/50 text-sm"
    >
      <Leaf :size="32" class="mx-auto mb-2 opacity-40" />
      <p class="mb-1">请先选择一个画布对象</p>
      <p class="text-xs">点击素材或上传图片以调节色彩</p>
    </div>

    <div v-else class="space-y-4">
      <div class="space-y-3">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs text-herb-brown/70">色相 (Hue)</label>
            <span class="text-xs text-herb-brown/60">{{ adjustment.hue }}°</span>
          </div>
          <el-slider
            :model-value="adjustment.hue"
            :min="-180"
            :max="180"
            @input="handleHueChange"
            :marks="{ '-180': '-180', '0': '0', '180': '180' }"
            :show-tooltip="false"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs text-herb-brown/70">饱和度 (Saturation)</label>
            <span class="text-xs text-herb-brown/60">{{ adjustment.saturation > 0 ? '+' : '' }}{{ adjustment.saturation }}%</span>
          </div>
          <el-slider
            :model-value="adjustment.saturation"
            :min="-100"
            :max="100"
            @input="handleSaturationChange"
            :marks="{ '-100': '-100', '0': '0', '100': '100' }"
            :show-tooltip="false"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs text-herb-brown/70">亮度 (Brightness)</label>
            <span class="text-xs text-herb-brown/60">{{ adjustment.brightness > 0 ? '+' : '' }}{{ adjustment.brightness }}%</span>
          </div>
          <el-slider
            :model-value="adjustment.brightness"
            :min="-100"
            :max="100"
            @input="handleBrightnessChange"
            :marks="{ '-100': '-100', '0': '0', '100': '100' }"
            :show-tooltip="false"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs text-herb-brown/70">对比度 (Contrast)</label>
            <span class="text-xs text-herb-brown/60">{{ adjustment.contrast > 0 ? '+' : '' }}{{ adjustment.contrast }}%</span>
          </div>
          <el-slider
            :model-value="adjustment.contrast"
            :min="-100"
            :max="100"
            @input="handleContrastChange"
            :marks="{ '-100': '-100', '0': '0', '100': '100' }"
            :show-tooltip="false"
          />
        </div>
      </div>

      <div class="pt-2 border-t border-herb-brown-light/20">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1.5">
            <Palette :size="14" class="text-herb-green" />
            <span class="text-xs text-herb-brown/70 font-medium">植物主题调色板</span>
          </div>
          <button
            v-if="isModified"
            class="flex items-center gap-1 px-2 py-1 text-xs text-herb-pink hover:bg-herb-pink/10 rounded-lg transition-colors"
            @click="handleReset"
          >
            <RotateCcw :size="12" />
            <span>重置</span>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="palette in plantPalettes"
            :key="palette.id"
            class="p-2 rounded-xl cursor-pointer transition-all border-2"
            :class="[
              currentPaletteId === palette.id
                ? 'border-herb-green bg-herb-green/10'
                : 'border-transparent bg-white/40 hover:bg-herb-green/5'
            ]"
            @click="applyPalette(palette)"
          >
            <div class="flex gap-0.5 mb-1.5">
              <div
                v-for="(color, idx) in palette.previewColors"
                :key="idx"
                class="flex-1 h-4 rounded-sm"
                :style="{ backgroundColor: color }"
              />
            </div>
            <div class="text-xs text-herb-brown font-medium truncate">
              {{ palette.name }}
            </div>
            <div class="text-[10px] text-herb-brown/50 truncate">
              {{ palette.description }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="isModified"
        class="flex items-center justify-between pt-2 border-t border-herb-brown-light/20"
      >
        <div class="text-xs text-herb-brown/50">
          已调整色彩参数
        </div>
        <button
          class="flex items-center gap-1 px-3 py-1.5 text-xs text-herb-pink bg-herb-pink/10 hover:bg-herb-pink/20 rounded-lg transition-colors"
          @click="handleReset"
        >
          <RotateCcw :size="12" />
          <span>恢复原始颜色</span>
        </button>
      </div>
    </div>
  </div>
</template>
