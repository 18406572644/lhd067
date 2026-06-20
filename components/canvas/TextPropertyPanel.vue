<script setup lang="ts">
import { useEditorStore } from '~/stores/editor'
import { FONT_FAMILY_OPTIONS, TEXT_PRESET_STYLES } from '~/types'
import type { TextPresetStyle } from '~/types'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles
} from 'lucide-vue-next'

const emit = defineEmits<{
  'update-text': [props: Record<string, any>]
}>()

const editorStore = useEditorStore()

const selectedTextObject = computed(() => {
  if (!editorStore.selectedObjectId) return null
  const obj = editorStore.canvasObjects.find(o => o.id === editorStore.selectedObjectId)
  if (obj && obj.type === 'text') return obj
  return null
})

const fontFamily = computed({
  get: () => selectedTextObject.value?.fontFamily || 'Noto Sans SC',
  set: (val: string) => emit('update-text', { fontFamily: val })
})

const fontSize = computed({
  get: () => selectedTextObject.value?.fontSize || 28,
  set: (val: number) => emit('update-text', { fontSize: val })
})

const fill = computed({
  get: () => selectedTextObject.value?.fill || '#6B5B4E',
  set: (val: string) => emit('update-text', { fill: val })
})

const fontWeight = computed({
  get: () => selectedTextObject.value?.fontWeight || 'normal',
  set: (val: string) => emit('update-text', { fontWeight: val })
})

const fontStyle = computed({
  get: () => selectedTextObject.value?.fontStyle || 'normal',
  set: (val: string) => emit('update-text', { fontStyle: val })
})

const underline = computed({
  get: () => selectedTextObject.value?.underline || false,
  set: (val: boolean) => emit('update-text', { underline: val })
})

const textAlign = computed({
  get: () => selectedTextObject.value?.textAlign || 'left',
  set: (val: string) => emit('update-text', { textAlign: val })
})

const lineHeight = computed({
  get: () => selectedTextObject.value?.lineHeight || 1.4,
  set: (val: number) => emit('update-text', { lineHeight: val })
})

const charSpacing = computed({
  get: () => selectedTextObject.value?.charSpacing || 0,
  set: (val: number) => emit('update-text', { charSpacing: val })
})

function toggleBold() {
  emit('update-text', { fontWeight: fontWeight.value === 'bold' ? 'normal' : 'bold' })
}

function toggleItalic() {
  emit('update-text', { fontStyle: fontStyle.value === 'italic' ? 'normal' : 'italic' })
}

function toggleUnderline() {
  emit('update-text', { underline: !underline.value })
}

function applyPreset(preset: TextPresetStyle) {
  emit('update-text', {
    fontFamily: preset.fontFamily,
    fontSize: preset.fontSize,
    fontWeight: preset.fontWeight,
    fontStyle: preset.fontStyle,
    underline: preset.underline,
    fill: preset.fill,
    lineHeight: preset.lineHeight,
    charSpacing: preset.charSpacing,
    textAlign: preset.textAlign
  })
}
</script>

<template>
  <div
    v-if="selectedTextObject"
    class="bg-white/60 backdrop-blur rounded-2xl p-4 border border-herb-brown-light/30"
  >
    <h3 class="font-display text-herb-brown mb-3">文字属性</h3>

    <div class="space-y-4">
      <div>
        <label class="text-xs text-herb-brown/70 block mb-1.5">预设样式</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="preset in TEXT_PRESET_STYLES"
            :key="preset.id"
            class="px-2.5 py-1.5 text-xs rounded-lg border border-herb-brown-light/40 hover:bg-herb-green/20 hover:border-herb-green/50 text-herb-brown transition-all flex items-center gap-1"
            @click="applyPreset(preset)"
          >
            <Sparkles :size="12" class="text-herb-green-dark shrink-0" />
            {{ preset.name }}
          </button>
        </div>
      </div>

      <div>
        <label class="text-xs text-herb-brown/70 block mb-1.5">字体</label>
        <el-select
          :model-value="fontFamily"
          class="w-full"
          @update:model-value="fontFamily = $event"
        >
          <el-option
            v-for="opt in FONT_FAMILY_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <div class="flex gap-3">
        <div class="flex-1">
          <label class="text-xs text-herb-brown/70 block mb-1.5">字号</label>
          <el-input-number
            :model-value="fontSize"
            :min="8"
            :max="200"
            :step="1"
            size="small"
            class="w-full"
            @update:model-value="fontSize = $event"
          />
        </div>
        <div class="w-20">
          <label class="text-xs text-herb-brown/70 block mb-1.5">颜色</label>
          <el-color-picker
            :model-value="fill"
            size="small"
            @update:model-value="fill = $event"
          />
        </div>
      </div>

      <div>
        <label class="text-xs text-herb-brown/70 block mb-1.5">样式</label>
        <div class="flex items-center gap-1">
          <button
            class="w-9 h-9 flex items-center justify-center rounded-lg transition-all text-sm"
            :class="fontWeight === 'bold' ? 'bg-herb-green/30 text-herb-green-dark' : 'hover:bg-herb-green/15 text-herb-brown/70'"
            @click="toggleBold"
          >
            <Bold :size="16" />
          </button>
          <button
            class="w-9 h-9 flex items-center justify-center rounded-lg transition-all text-sm"
            :class="fontStyle === 'italic' ? 'bg-herb-green/30 text-herb-green-dark' : 'hover:bg-herb-green/15 text-herb-brown/70'"
            @click="toggleItalic"
          >
            <Italic :size="16" />
          </button>
          <button
            class="w-9 h-9 flex items-center justify-center rounded-lg transition-all text-sm"
            :class="underline ? 'bg-herb-green/30 text-herb-green-dark' : 'hover:bg-herb-green/15 text-herb-brown/70'"
            @click="toggleUnderline"
          >
            <Underline :size="16" />
          </button>

          <div class="w-px h-6 bg-herb-brown-light/30 mx-1" />

          <button
            class="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
            :class="textAlign === 'left' ? 'bg-herb-green/30 text-herb-green-dark' : 'hover:bg-herb-green/15 text-herb-brown/70'"
            @click="textAlign = 'left'"
          >
            <AlignLeft :size="16" />
          </button>
          <button
            class="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
            :class="textAlign === 'center' ? 'bg-herb-green/30 text-herb-green-dark' : 'hover:bg-herb-green/15 text-herb-brown/70'"
            @click="textAlign = 'center'"
          >
            <AlignCenter :size="16" />
          </button>
          <button
            class="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
            :class="textAlign === 'right' ? 'bg-herb-green/30 text-herb-green-dark' : 'hover:bg-herb-green/15 text-herb-brown/70'"
            @click="textAlign = 'right'"
          >
            <AlignRight :size="16" />
          </button>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-xs text-herb-brown/70">行距</label>
          <span class="text-xs text-herb-brown/60">{{ lineHeight.toFixed(1) }}</span>
        </div>
        <el-slider
          :model-value="lineHeight"
          :min="0.8"
          :max="3"
          :step="0.1"
          @input="lineHeight = $event"
        />
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-xs text-herb-brown/70">字距</label>
          <span class="text-xs text-herb-brown/60">{{ charSpacing }}</span>
        </div>
        <el-slider
          :model-value="charSpacing"
          :min="-200"
          :max="800"
          :step="10"
          @input="charSpacing = $event"
        />
      </div>
    </div>
  </div>
</template>
