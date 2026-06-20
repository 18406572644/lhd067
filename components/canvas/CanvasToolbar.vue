<script setup lang="ts">
import { useEditorStore } from '~/stores/editor'
import { useProjectStore } from '~/stores/project'
import {
  Upload,
  Tag,
  Undo2,
  Redo2,
  Trash2,
  ZoomOut,
  ZoomIn,
  Maximize,
  Save,
  Download
} from 'lucide-vue-next'

const emit = defineEmits<{
  'upload-photo': []
  'add-label': []
  'zoom-in': []
  'zoom-out': []
  'fit-screen': []
  'undo': []
  'redo': []
  'delete-selected': []
  'save': []
  'export': []
}>()

const editorStore = useEditorStore()
const projectStore = useProjectStore()
const router = useRouter()

const hasSelection = computed(() => !!editorStore.selectedObjectId)

function handleSave() {
  emit('save')
}

function handleExport() {
  if (projectStore.getCurrentProject) {
    router.push(`/export/${projectStore.getCurrentProject.id}`)
  }
}
</script>

<template>
  <div class="flex items-center gap-1 bg-white/70 backdrop-blur rounded-xl px-3 py-2">
    <el-tooltip content="上传植物照片" placement="bottom">
      <button
        class="hover:bg-herb-green/20 rounded-lg p-2 transition-all text-herb-brown"
        @click="emit('upload-photo')"
      >
        <Upload :size="18" />
      </button>
    </el-tooltip>

    <el-tooltip content="添加标本标签" placement="bottom">
      <button
        class="hover:bg-herb-green/20 rounded-lg p-2 transition-all text-herb-brown"
        @click="emit('add-label')"
      >
        <Tag :size="18" />
      </button>
    </el-tooltip>

    <div class="w-px h-6 bg-herb-brown-light/30 mx-1" />

    <el-tooltip content="撤销" placement="bottom">
      <button
        class="hover:bg-herb-green/20 rounded-lg p-2 transition-all text-herb-brown"
        @click="emit('undo')"
      >
        <Undo2 :size="18" />
      </button>
    </el-tooltip>

    <el-tooltip content="重做" placement="bottom">
      <button
        class="hover:bg-herb-green/20 rounded-lg p-2 transition-all text-herb-brown"
        @click="emit('redo')"
      >
        <Redo2 :size="18" />
      </button>
    </el-tooltip>

    <el-tooltip content="删除所选" placement="bottom">
      <button
        class="rounded-lg p-2 transition-all"
        :class="hasSelection ? 'hover:bg-herb-green/20 text-herb-brown' : 'text-herb-brown/30 cursor-not-allowed'"
        :disabled="!hasSelection"
        @click="emit('delete-selected')"
      >
        <Trash2 :size="18" />
      </button>
    </el-tooltip>

    <div class="w-px h-6 bg-herb-brown-light/30 mx-1" />

    <el-tooltip content="缩小" placement="bottom">
      <button
        class="hover:bg-herb-green/20 rounded-lg p-2 transition-all text-herb-brown"
        @click="emit('zoom-out')"
      >
        <ZoomOut :size="18" />
      </button>
    </el-tooltip>

    <span class="text-sm text-herb-brown/70 font-sans min-w-[48px] text-center">100%</span>

    <el-tooltip content="放大" placement="bottom">
      <button
        class="hover:bg-herb-green/20 rounded-lg p-2 transition-all text-herb-brown"
        @click="emit('zoom-in')"
      >
        <ZoomIn :size="18" />
      </button>
    </el-tooltip>

    <el-tooltip content="适应屏幕" placement="bottom">
      <button
        class="hover:bg-herb-green/20 rounded-lg p-2 transition-all text-herb-brown"
        @click="emit('fit-screen')"
      >
        <Maximize :size="18" />
      </button>
    </el-tooltip>

    <div class="w-px h-6 bg-herb-brown-light/30 mx-1" />

    <el-tooltip content="保存方案" placement="bottom">
      <button
        class="hover:bg-herb-green/20 rounded-lg p-2 transition-all text-herb-brown"
        @click="handleSave"
      >
        <Save :size="18" />
      </button>
    </el-tooltip>

    <el-tooltip content="导出打印" placement="bottom">
      <button
        class="hover:bg-herb-green/20 rounded-lg p-2 transition-all text-herb-brown"
        @click="handleExport"
      >
        <Download :size="18" />
      </button>
    </el-tooltip>
  </div>
</template>
