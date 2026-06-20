<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '~/stores/project'
import { useEditorStore } from '~/stores/editor'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Download, Printer } from 'lucide-vue-next'
import { downloadBlob } from '~/utils/exportUtils'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const editorStore = useEditorStore()

const isExporting = ref(false)
const a4PreviewRef = ref()

const project = computed(() => projectStore.getCurrentProject)
const labels = computed(() => editorStore.labels)
const settings = computed(() => editorStore.exportSettings)
const canvasObjects = computed(() => editorStore.canvasObjects)
const canvasObjectCount = computed(() => editorStore.canvasObjects.length)
const filters = computed(() => editorStore.filters)

onMounted(() => {
  if (import.meta.client) {
    projectStore.loadProjects()
    const id = route.params.id as string
    projectStore.setCurrentProject(id)
    if (project.value) {
      editorStore.loadFromProject(project.value)
    }
  }
})

async function handleExport() {
  if (!a4PreviewRef.value) return

  isExporting.value = true
  try {
    const blob = await a4PreviewRef.value.getHighResExport(settings.value)
    const filename = project.value
      ? `${project.value.name}_A4_${settings.value.dpi}DPI.${settings.value.format}`
      : `herbarium_A4_${settings.value.dpi}DPI.${settings.value.format}`
    downloadBlob(blob, filename)
    ElMessage.success('导出成功！')
  } catch (err) {
    console.error('Export error:', err)
    ElMessage.error('导出失败，请重试')
  } finally {
    isExporting.value = false
  }
}

function handlePrint() {
  if (!a4PreviewRef.value) return

  a4PreviewRef.value.getHighResExport({ ...settings.value, dpi: 300 }).then((blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>打印 - ${project.value?.name || '植物压花标本'}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; display: flex; justify-content: center; align-items: center; }
            img { max-width: 100%; max-height: 100vh; }
          </style>
        </head>
        <body>
          <img src="${url}" onload="window.print()" />
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }).catch(() => {
    ElMessage.error('打印预览生成失败')
  })
}

function handleBack() {
  router.push(`/editor/${route.params.id}`)
}
</script>

<template>
  <div class="h-[calc(100vh-57px)] flex gap-6 p-6">
    <div class="flex-1 flex flex-col items-center justify-center bg-herb-cream-dark/20 rounded-3xl overflow-auto">
      <div class="mb-6 flex items-center gap-3">
        <button
          class="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 hover:bg-white/80 text-herb-brown transition-all shadow-sm"
          @click="handleBack"
        >
          <ArrowLeft :size="20" />
        </button>
        <h2 class="font-display text-2xl text-herb-brown">A4 排版预览</h2>
      </div>

      <div class="flex-1 flex items-center justify-center w-full py-4">
        <ClientOnly>
          <A4Preview
            ref="a4PreviewRef"
            :canvas-objects="canvasObjects"
            :labels="labels"
            :show-border="settings.showBorder"
            :border-style="settings.borderStyle"
            :filters="filters"
          />
        </ClientOnly>
      </div>
    </div>

    <div class="w-80 flex flex-col gap-4 overflow-y-auto">
      <div class="bg-white/60 backdrop-blur rounded-2xl p-4 border border-herb-brown-light/30">
        <h3 class="font-display text-herb-brown mb-3">方案信息</h3>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-herb-brown/60">方案名称</span>
            <span class="text-sm text-herb-brown font-medium truncate max-w-[160px]">{{ project?.name || '未命名方案' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-herb-brown/60">素材数量</span>
            <span class="text-sm text-herb-brown font-medium">{{ canvasObjectCount }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-herb-brown/60">标签数量</span>
            <span class="text-sm text-herb-brown font-medium">{{ labels.length }}</span>
          </div>
        </div>
      </div>

      <ExportPanel
        :settings="settings"
        :is-exporting="isExporting"
        @update:settings="editorStore.setExportSettings"
        @export="handleExport"
      />

      <button
        class="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-serif text-sm font-semibold transition-all duration-300 ease-out shadow-sm hover:shadow-lg active:scale-[0.97] bg-herb-purple/10 border-2 border-herb-purple text-herb-purple hover:bg-herb-purple/20"
        @click="handlePrint"
      >
        <Printer class="w-4 h-4" />
        <span>打印预览</span>
      </button>

      <div class="flex-1" />

      <button
        class="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-serif text-sm font-semibold transition-all duration-300 ease-out shadow-sm hover:shadow-lg active:scale-[0.97] bg-transparent border-2 border-herb-green text-herb-green hover:bg-herb-green/10 hover:scale-[1.03]"
        @click="handleBack"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>返回编辑</span>
      </button>
    </div>
  </div>
</template>
