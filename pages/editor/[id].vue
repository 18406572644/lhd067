<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '~/stores/project'
import { useMaterialStore } from '~/stores/material'
import { useEditorStore } from '~/stores/editor'
import type { PlantMaterial } from '~/types'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Palette, Tag, Sparkles, Scissors, Type } from 'lucide-vue-next'
import { removeBackground, imageFileToCanvas } from '~/utils/imageProcess'
import type { ColorAdjustment } from '~/types'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const materialStore = useMaterialStore()
const editorStore = useEditorStore()

const fabricCanvasRef = ref()
const fileInputRef = ref<HTMLInputElement | null>(null)
const activeTab = ref<'materials' | 'labels' | 'filters' | 'bgremoval'>('materials')

provide('fabricCanvasRef', fabricCanvasRef)

const selectedTextObject = computed(() => {
  if (!selectedObject.value || selectedObject.value.type !== 'text') return null
  return selectedObject.value
})

const project = computed(() => projectStore.getCurrentProject)

const selectedObject = computed(() => {
  if (!editorStore.selectedObjectId) return null
  return editorStore.canvasObjects.find(o => o.id === editorStore.selectedObjectId) || null
})

onMounted(() => {
  if (import.meta.client) {
    projectStore.loadProjects()
    materialStore.loadMaterials()
    const id = route.params.id as string
    projectStore.setCurrentProject(id)
    nextTick(() => {
      if (project.value && project.value.canvasData) {
        editorStore.loadFromProject(project.value)
      }
    })
  }
})

function handleAddMaterial(mat: PlantMaterial) {
  fabricCanvasRef.value?.addMaterial(mat)
}

async function handleUploadPhoto() {
  fileInputRef.value?.click()
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const canvas = await imageFileToCanvas(file)
    const processed = removeBackground(canvas)
    const dataUrl = processed.toDataURL('image/png')
    fabricCanvasRef.value?.addUploadedImage(dataUrl)
  } catch (err) {
    ElMessage.error('图片处理失败')
  }
  target.value = ''
}

function handleSave() {
  editorStore.saveToProject()
  ElMessage.success('方案已保存')
}

function handleExport() {
  if (project.value) {
    router.push(`/export/${project.value.id}`)
  }
}

function handleBack() {
  router.push('/')
}

function handleDeleteSelected() {
  fabricCanvasRef.value?.removeSelected()
}

function handleGroup() {
  fabricCanvasRef.value?.groupSelectedObjects()
}

function handleUngroup() {
  fabricCanvasRef.value?.ungroupSelectedObject()
}

function handleAddText() {
  fabricCanvasRef.value?.addTextObject()
}

function handleUpdateText(props: Record<string, any>) {
  fabricCanvasRef.value?.updateTextObject(props)
}

function handleUpdateOpacity(val: number) {
  if (selectedObject.value) {
    editorStore.updateCanvasObject(selectedObject.value.id, { opacity: val / 100 })
    fabricCanvasRef.value?.updateSelectedObject({ opacity: val / 100 })
  }
}

function handleUpdateScale(val: number) {
  if (selectedObject.value) {
    editorStore.updateCanvasObject(selectedObject.value.id, { scaleX: val / 100, scaleY: val / 100 })
    fabricCanvasRef.value?.updateSelectedObject({ scaleX: val / 100, scaleY: val / 100 })
  }
}

async function handleBgRemovalApply(dataUrl: string) {
  const obj = selectedObject.value
  if (!obj || obj.type !== 'uploaded') return

  try {
    const result = await fabricCanvasRef.value?.replaceSelectedImage(dataUrl)
    if (result) {
      editorStore.updateCanvasObject(obj.id, {
        imageData: dataUrl,
        scaleX: result.scaleX,
        scaleY: result.scaleY
      })
      ElMessage.success('抠图效果已应用')
    } else {
      ElMessage.error('应用抠图效果失败')
    }
  } catch (e) {
    console.error('应用抠图效果失败:', e)
    ElMessage.error('应用抠图效果失败')
  }
}

function handleColorAdjustmentApply(adjustment: ColorAdjustment, isGlobal: boolean) {
  fabricCanvasRef.value?.applyColorAdjustment(adjustment, isGlobal)
}

function handleColorAdjustmentReset(isGlobal: boolean) {
  const defaultAdjustment: ColorAdjustment = { hue: 0, saturation: 0, brightness: 0, contrast: 0 }
  fabricCanvasRef.value?.applyColorAdjustment(defaultAdjustment, isGlobal)
  ElMessage.success(isGlobal ? '已重置所有对象色彩' : '已恢复原始颜色')
}

watch(project, (newProject) => {
  if (newProject && import.meta.client) {
    editorStore.loadFromProject(newProject)
  }
}, { immediate: false })
</script>

<template>
  <div class="h-[calc(100vh-57px)] flex flex-col gap-3 p-3">
    <div class="flex items-center gap-3">
      <button
        class="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 hover:bg-white/80 text-herb-brown transition-all shadow-sm"
        @click="handleBack"
      >
        <ArrowLeft :size="20" />
      </button>

      <el-input
        v-if="project"
        v-model="project.name"
        class="font-display text-xl text-herb-brown w-64 [&_.el-input__wrapper]:bg-transparent [&_.el-input__wrapper]:shadow-none [&_.el-input__wrapper]:hover:shadow-none [&_.el-input__wrapper]:focus-within:shadow-none [&_.el-input__inner]:font-display [&_.el-input__inner]:text-xl [&_.el-input__inner]:text-herb-brown [&_.el-input__inner]:p-0"
      />

      <div class="flex-1" />

      <CanvasToolbar
        :project="project"
        @save="handleSave"
        @export="handleExport"
        @delete-selected="handleDeleteSelected"
        @upload-photo="handleUploadPhoto"
        @add-text="handleAddText"
        @group="handleGroup"
        @ungroup="handleUngroup"
      />
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onFileChange"
    />

    <div class="flex-1 flex gap-3 min-h-0">
      <div class="w-72 flex flex-col gap-3 min-h-0">
        <div class="flex bg-white/50 rounded-xl p-1 gap-1">
          <button
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
              activeTab === 'materials'
                ? 'bg-herb-green/80 text-herb-brown'
                : 'text-herb-brown/60 hover:bg-herb-green/30'
            ]"
            @click="activeTab = 'materials'"
          >
            <Palette :size="16" />
            素材
          </button>
          <button
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
              activeTab === 'labels'
                ? 'bg-herb-green/80 text-herb-brown'
                : 'text-herb-brown/60 hover:bg-herb-green/30'
            ]"
            @click="activeTab = 'labels'"
          >
            <Tag :size="16" />
            标签
          </button>
          <button
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
              activeTab === 'filters'
                ? 'bg-herb-green/80 text-herb-brown'
                : 'text-herb-brown/60 hover:bg-herb-green/30'
            ]"
            @click="activeTab = 'filters'"
          >
            <Sparkles :size="16" />
            滤镜
          </button>
          <button
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
              activeTab === 'bgremoval'
                ? 'bg-herb-green/80 text-herb-brown'
                : 'text-herb-brown/60 hover:bg-herb-green/30'
            ]"
            @click="activeTab = 'bgremoval'"
          >
            <Scissors :size="16" />
            抠图
          </button>
        </div>

        <div class="flex-1 min-h-0 overflow-hidden">
          <MaterialPanel
            v-show="activeTab === 'materials'"
            @add-to-canvas="handleAddMaterial"
            @upload-photo="handleUploadPhoto"
          />
          <LabelEditor v-show="activeTab === 'labels'" />
          <FilterPanel v-show="activeTab === 'filters'" />
          <BackgroundRemovalPanel
            v-show="activeTab === 'bgremoval'"
            :visible="activeTab === 'bgremoval'"
            @apply="handleBgRemovalApply"
          />
        </div>
      </div>

      <div class="flex-1 flex flex-col gap-3 min-h-0">
        <FabricCanvas
          ref="fabricCanvasRef"
          class="flex-1"
        />
      </div>

      <div class="w-72 flex flex-col gap-3 min-h-0">
        <LayerPanel />

        <TextPropertyPanel
          @update-text="handleUpdateText"
        />

        <div class="flex-1" />

        <div class="bg-white/60 backdrop-blur rounded-2xl p-4 border border-herb-brown-light/30">
          <h3 class="font-display text-herb-brown mb-3">属性</h3>

          <div v-if="selectedObject" class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs text-herb-brown/70">不透明度</label>
                <span class="text-xs text-herb-brown/60">{{ Math.round(selectedObject.opacity * 100) }}%</span>
              </div>
              <el-slider
                :model-value="Math.round(selectedObject.opacity * 100)"
                :min="0"
                :max="100"
                @input="handleUpdateOpacity"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs text-herb-brown/70">缩放</label>
                <span class="text-xs text-herb-brown/60">{{ Math.round(selectedObject.scaleX * 100) }}%</span>
              </div>
              <el-slider
                :model-value="Math.round(selectedObject.scaleX * 100)"
                :min="10"
                :max="300"
                @input="handleUpdateScale"
              />
            </div>

            <div class="pt-2 border-t border-herb-brown-light/20">
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="text-herb-brown/50">X:</div>
                <div class="text-herb-brown/70 text-right">{{ Math.round(selectedObject.x) }}</div>
                <div class="text-herb-brown/50">Y:</div>
                <div class="text-herb-brown/70 text-right">{{ Math.round(selectedObject.y) }}</div>
                <div class="text-herb-brown/50">旋转:</div>
                <div class="text-herb-brown/70 text-right">{{ Math.round(selectedObject.angle) }}°</div>
              </div>
            </div>
          </div>

          <div v-else class="text-herb-brown/40 text-sm text-center py-6">
            未选择对象
          </div>
        </div>

        <ColorAdjustmentPanel
          v-if="selectedObject"
          mode="object"
          @apply="handleColorAdjustmentApply"
          @reset="handleColorAdjustmentReset"
        />

        <ColorAdjustmentPanel
          mode="global"
          @apply="handleColorAdjustmentApply"
          @reset="handleColorAdjustmentReset"
        />
      </div>
    </div>
  </div>
</template>
