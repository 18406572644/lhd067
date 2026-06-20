<script setup lang="ts">
import { useEditorStore } from '~/stores/editor'
import {
  Layers,
  Leaf,
  Type,
  Eye,
  EyeOff,
  X,
  Lock,
  Unlock,
  Group,
  Ungroup,
  FolderOpen
} from 'lucide-vue-next'

const editorStore = useEditorStore()
const fabricCanvasRef = inject<Ref<any>>('fabricCanvasRef', ref(null))

const visibleMap = ref<Record<string, boolean>>({})
const editingId = ref<string | null>(null)
const editingName = ref('')

function toggleVisibility(id: string) {
  visibleMap.value[id] = !visibleMap.value[id]
  const canvas = fabricCanvasRef.value?.canvas
  if (canvas) {
    const obj = canvas.getObjects().find((o: any) => o.id === id)
    if (obj) {
      obj.set({ visible: isVisible(id) })
      canvas.renderAll()
    }
  }
}

function isVisible(id: string) {
  return visibleMap.value[id] !== false
}

function isLocked(id: string) {
  const obj = editorStore.canvasObjects.find(o => o.id === id)
  return obj?.locked === true
}

function toggleLock(id: string) {
  const obj = editorStore.canvasObjects.find(o => o.id === id)
  const wasLocked = obj?.locked === true
  editorStore.toggleObjectLock(id)
  if (fabricCanvasRef.value) {
    fabricCanvasRef.value.applyLockState(id, !wasLocked)
  }
}

function handleLayerClick(id: string, event: MouseEvent) {
  const obj = editorStore.canvasObjects.find(o => o.id === id)
  if (obj?.locked) return

  if (event.shiftKey) {
    editorStore.toggleObjectSelection(id)
    if (fabricCanvasRef.value) {
      fabricCanvasRef.value.selectObjectsById(editorStore.selectedObjectIds)
    }
  } else {
    editorStore.selectObject(id)
  }
}

function isSelected(id: string) {
  return editorStore.selectedObjectIds.includes(id)
}

function startRename(id: string, currentName: string) {
  const obj = editorStore.canvasObjects.find(o => o.id === id)
  if (obj?.locked) return
  editingId.value = id
  editingName.value = currentName
}

function finishRename() {
  if (editingId.value && editingName.value.trim()) {
    editorStore.renameObject(editingId.value, editingName.value.trim())
  }
  editingId.value = null
  editingName.value = ''
}

function cancelRename() {
  editingId.value = null
  editingName.value = ''
}

function handleGroup() {
  if (fabricCanvasRef.value) {
    fabricCanvasRef.value.groupSelectedObjects()
  }
}

function handleUngroup() {
  if (fabricCanvasRef.value) {
    fabricCanvasRef.value.ungroupSelectedObject()
  }
}

function getObjectDisplayName(obj: any) {
  if (obj.type === 'text') return (obj.text || '文字').slice(0, 8)
  if (obj.isGroup) return obj.name || `组合`
  return obj.name || `素材 ${obj.id.slice(-4)}`
}

function canGroup() {
  return editorStore.selectedObjectIds.length >= 2
}

function canUngroup() {
  if (editorStore.selectedObjectIds.length !== 1) return false
  const obj = editorStore.canvasObjects.find(o => o.id === editorStore.selectedObjectIds[0])
  return obj?.isGroup === true
}

const flatLayerList = computed(() => {
  return [...editorStore.canvasObjects].reverse()
})
</script>

<template>
  <div class="bg-white/60 backdrop-blur rounded-xl p-3 max-h-80 overflow-y-auto">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-display text-herb-brown text-base">图层</h3>
      <div class="flex items-center gap-1">
        <el-tooltip content="组合" placement="bottom" :disabled="!canGroup()">
          <button
            class="p-1 rounded transition-colors"
            :class="canGroup() ? 'hover:bg-herb-green/20 text-herb-brown' : 'text-herb-brown/30 cursor-not-allowed'"
            :disabled="!canGroup()"
            @click="handleGroup"
          >
            <Group :size="14" />
          </button>
        </el-tooltip>
        <el-tooltip content="取消组合" placement="bottom" :disabled="!canUngroup()">
          <button
            class="p-1 rounded transition-colors"
            :class="canUngroup() ? 'hover:bg-herb-green/20 text-herb-brown' : 'text-herb-brown/30 cursor-not-allowed'"
            :disabled="!canUngroup()"
            @click="handleUngroup"
          >
            <Ungroup :size="14" />
          </button>
        </el-tooltip>
      </div>
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
        v-for="object in flatLayerList"
        :key="object.id"
        class="flex items-center gap-1.5 p-1.5 rounded-lg transition-all cursor-pointer"
        :class="[
          isSelected(object.id)
            ? 'bg-herb-green/20 border border-herb-green/40'
            : 'hover:bg-herb-green/10 border border-transparent',
          object.locked ? 'opacity-60' : ''
        ]"
        @click="handleLayerClick(object.id, $event)"
      >
        <div
          class="w-8 h-8 rounded flex items-center justify-center shrink-0 overflow-hidden"
          :class="object.isGroup ? 'bg-herb-pink/20' : 'bg-herb-green-light/30'"
        >
          <template v-if="object.thumbnail">
            <img
              :src="object.thumbnail"
              class="w-full h-full object-contain"
              alt=""
            />
          </template>
          <template v-else>
            <FolderOpen v-if="object.isGroup" :size="16" class="text-herb-pink" />
            <Type v-else-if="object.type === 'text'" :size="16" class="text-herb-green-dark" />
            <Leaf v-else :size="16" class="text-herb-green-dark" />
          </template>
        </div>

        <div
          v-if="editingId === object.id"
          class="flex-1 min-w-0"
          @click.stop
        >
          <input
            v-model="editingName"
            class="w-full text-sm bg-white/80 border border-herb-green/40 rounded px-1.5 py-0.5 text-herb-brown outline-none focus:border-herb-green"
            @keydown.enter="finishRename"
            @keydown.escape="cancelRename"
            @blur="finishRename"
            autofocus
          />
        </div>
        <span
          v-else
          class="flex-1 text-sm text-herb-brown truncate"
          :class="object.isGroup ? 'italic' : ''"
          @dblclick.stop="startRename(object.id, getObjectDisplayName(object))"
        >
          {{ getObjectDisplayName(object) }}
        </span>

        <button
          class="p-1 rounded hover:bg-herb-green/20 transition-colors shrink-0"
          :class="object.locked ? 'text-herb-pink' : 'text-herb-brown/40 hover:text-herb-brown'"
          @click.stop="toggleLock(object.id)"
        >
          <Lock v-if="object.locked" :size="12" />
          <Unlock v-else :size="12" />
        </button>

        <button
          class="p-1 rounded hover:bg-herb-green/20 text-herb-brown/40 hover:text-herb-green-dark transition-colors shrink-0"
          @click.stop="toggleVisibility(object.id)"
        >
          <Eye v-if="isVisible(object.id)" :size="12" />
          <EyeOff v-else :size="12" />
        </button>

        <button
          class="p-1 rounded hover:bg-herb-pink/30 text-herb-brown/40 hover:text-herb-pink transition-colors shrink-0"
          :class="object.locked ? 'opacity-30 pointer-events-none' : ''"
          @click.stop="object.locked ? null : editorStore.removeCanvasObject(object.id)"
        >
          <X :size="12" />
        </button>
      </div>
    </div>
  </div>
</template>
