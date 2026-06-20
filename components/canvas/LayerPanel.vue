<script setup lang="ts">
import { useEditorStore } from '~/stores/editor'
import {
  Layers,
  GripVertical,
  Leaf,
  Eye,
  EyeOff,
  X
} from 'lucide-vue-next'

const editorStore = useEditorStore()

const visibleMap = ref<Record<string, boolean>>({})

function toggleVisibility(id: string) {
  visibleMap.value[id] = !visibleMap.value[id]
}

function isVisible(id: string) {
  return visibleMap.value[id] !== false
}
</script>

<template>
  <div class="bg-white/60 backdrop-blur rounded-xl p-3 max-h-80 overflow-y-auto">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-display text-herb-brown text-base">图层</h3>
    </div>

    <div
      v-if="editorStore.canvasObjects.length === 0"
      class="text-center py-6 text-herb-brown/40 text-sm"
    >
      <Layers :size="40" class="mx-auto mb-2 opacity-40" />
      <p>暂无图层</p>
    </div>

    <div v-else class="flex flex-col gap-1">
      <div
        v-for="object in [...editorStore.canvasObjects].reverse()"
        :key="object.id"
        class="flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer"
        :class="editorStore.selectedObjectId === object.id
          ? 'bg-herb-green/20 border border-herb-green/40'
          : 'hover:bg-herb-green/10'"
        @click="editorStore.selectObject(object.id)"
      >
        <GripVertical :size="14" class="text-herb-brown/30 shrink-0" />

        <div class="w-8 h-8 rounded flex items-center justify-center bg-herb-green-light/30 shrink-0">
          <Leaf :size="16" class="text-herb-green-dark" />
        </div>

        <span class="flex-1 text-sm text-herb-brown truncate">
          {{ object.name || `素材 ${object.id.slice(-4)}` }}
        </span>

        <button
          class="p-1 rounded hover:bg-herb-green/20 text-herb-brown/40 hover:text-herb-green-dark transition-colors shrink-0"
          @click.stop="toggleVisibility(object.id)"
        >
          <Eye v-if="isVisible(object.id)" :size="14" />
          <EyeOff v-else :size="14" />
        </button>

        <button
          class="p-1 rounded hover:bg-herb-pink/30 text-herb-brown/40 hover:text-herb-pink transition-colors shrink-0"
          @click.stop="editorStore.removeCanvasObject(object.id)"
        >
          <X :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>
