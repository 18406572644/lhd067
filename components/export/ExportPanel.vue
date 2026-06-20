<script setup lang="ts">
import type { ExportSettings } from '~/types'
import { useEditorStore } from '~/stores/editor'
import { Download } from 'lucide-vue-next'

const emit = defineEmits<{
  export: [settings: ExportSettings]
}>()

const editorStore = useEditorStore()

function handleExport() {
  emit('export', editorStore.exportSettings)
}
</script>

<template>
  <div class="bg-white/70 backdrop-blur rounded-2xl p-6 border border-herb-brown-light/30">
    <h2 class="font-display text-xl text-herb-brown mb-6">
      导出设置
    </h2>

    <div class="space-y-5">
      <div>
        <label class="block font-serif text-sm text-herb-brown mb-2">格式</label>
        <el-radio-group :model-value="editorStore.exportSettings.format" class="w-full" @update:model-value="(v: any) => editorStore.setExportSettings({ format: v })">
          <el-radio value="png" class="w-full">
            <span class="font-serif text-sm">PNG (透明背景)</span>
          </el-radio>
          <el-radio value="jpg" class="w-full">
            <span class="font-serif text-sm">JPG (白色背景)</span>
          </el-radio>
        </el-radio-group>
      </div>

      <div>
        <label class="block font-serif text-sm text-herb-brown mb-2">分辨率</label>
        <el-select :model-value="editorStore.exportSettings.dpi" class="w-full" @update:model-value="(v: any) => editorStore.setExportSettings({ dpi: v })">
          <el-option :value="150" label="150 DPI (快速预览)" />
          <el-option :value="300" label="300 DPI (标准打印)" />
          <el-option :value="600" label="600 DPI (高清打印)" />
        </el-select>
      </div>

      <div class="flex items-center justify-between">
        <label class="font-serif text-sm text-herb-brown">显示边框</label>
        <el-switch
          :model-value="editorStore.exportSettings.showBorder"
          @update:model-value="(v: any) => editorStore.setExportSettings({ showBorder: v })"
        />
      </div>

      <div v-if="editorStore.exportSettings.showBorder">
        <label class="block font-serif text-sm text-herb-brown mb-2">边框样式</label>
        <el-select
          :model-value="editorStore.exportSettings.borderStyle"
          class="w-full"
          @update:model-value="(v: any) => editorStore.setExportSettings({ borderStyle: v })"
        >
          <el-option value="none" label="无" />
          <el-option value="simple" label="简单" />
          <el-option value="botanical" label="植物装饰边框" />
        </el-select>
      </div>
    </div>

    <button
      class="w-full mt-6 bg-herb-green hover:bg-herb-green-dark text-herb-brown font-display text-lg py-3 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
      @click="handleExport"
    >
      <Download :size="20" />
      <span>一键导出高清标本</span>
    </button>

    <p class="text-xs text-herb-brown/50 mt-3 text-center">
      导出的图片将以 A4 尺寸生成，可直接用于打印
    </p>
  </div>
</template>
