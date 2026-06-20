<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '~/stores/editor'
import type { SpecimenLabel } from '~/types'
import { Plus, Trash2 } from 'lucide-vue-next'

const editorStore = useEditorStore()

const expandedIds = ref<Set<string>>(new Set())
const animatingId = ref<string | null>(null)

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
}

function addLabel() {
  const id = `label_${Date.now()}`
  const newLabel: SpecimenLabel = {
    id,
    plantName: '',
    scientificName: '',
    collectionLocation: '',
    collectionDate: '',
    collectorName: '',
    notes: '',
  }
  editorStore.addLabel(newLabel)
  expandedIds.value.add(id)
  animatingId.value = id
  setTimeout(() => {
    animatingId.value = null
  }, 800)
}

function deleteLabel(id: string) {
  editorStore.removeLabel(id)
  expandedIds.value.delete(id)
}

function updateField(id: string, field: keyof SpecimenLabel, value: string) {
  editorStore.updateLabel(id, { [field]: value })
}

function saveLabel(id: string) {
  editorStore.saveToProject()
}
</script>

<template>
  <div class="w-72 bg-white/60 backdrop-blur rounded-2xl border border-herb-brown-light/30 p-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-display text-herb-brown text-lg">标本标签</h2>
      <button
        class="w-7 h-7 flex items-center justify-center rounded-full bg-herb-green/30 hover:bg-herb-green/50 text-herb-green-dark transition-colors"
        @click="addLabel"
      >
        <Plus :size="16" />
      </button>
    </div>

    <div class="space-y-2">
      <div
        v-for="label in editorStore.labels"
        :key="label.id"
        class="rounded-lg border border-herb-brown-light/30 overflow-hidden transition-all duration-300"
        :class="[animatingId === label.id ? 'animate-handwrite' : '']"
      >
        <div
          class="flex items-center justify-between px-3 py-2 cursor-pointer bg-herb-cream/40 hover:bg-herb-cream/60 transition-colors"
          @click="toggleExpand(label.id)"
        >
          <span class="font-display text-herb-brown text-sm truncate">
            {{ label.plantName || '未命名标签' }}
          </span>
          <span class="text-herb-brown/40 text-xs">
            {{ expandedIds.has(label.id) ? '▲' : '▼' }}
          </span>
        </div>

        <div v-if="expandedIds.has(label.id)" class="p-3 space-y-3">
          <div>
            <label class="text-xs text-herb-brown/70 block mb-1">植物名称</label>
            <el-input
              :model-value="label.plantName"
              @update:model-value="(val: string) => updateField(label.id, 'plantName', val)"
              placeholder="输入植物名称"
              class="[&_.el-input__wrapper]:focus-within:border-herb-green [&_.el-input__wrapper]:focus-within:shadow-[0_0_0_1px_var(--herb-green)]"
            />
          </div>

          <div>
            <label class="text-xs text-herb-brown/70 block mb-1">
              学名 <span class="italic text-herb-brown/40">(斜体)</span>
            </label>
            <el-input
              :model-value="label.scientificName"
              @update:model-value="(val: string) => updateField(label.id, 'scientificName', val)"
              placeholder="输入拉丁学名"
              class="[&_.el-input__wrapper]:focus-within:border-herb-green [&_.el-input__wrapper]:focus-within:shadow-[0_0_0_1px_var(--herb-green)]"
            />
          </div>

          <div>
            <label class="text-xs text-herb-brown/70 block mb-1">采集地点</label>
            <el-input
              :model-value="label.collectionLocation"
              @update:model-value="(val: string) => updateField(label.id, 'collectionLocation', val)"
              placeholder="输入采集地点"
              class="[&_.el-input__wrapper]:focus-within:border-herb-green [&_.el-input__wrapper]:focus-within:shadow-[0_0_0_1px_var(--herb-green)]"
            />
          </div>

          <div>
            <label class="text-xs text-herb-brown/70 block mb-1">采集日期</label>
            <el-date-picker
              :model-value="label.collectionDate"
              @update:model-value="(val: string) => updateField(label.id, 'collectionDate', val || '')"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="w-full [&_.el-input__wrapper]:focus-within:border-herb-green"
            />
          </div>

          <div>
            <label class="text-xs text-herb-brown/70 block mb-1">采集人</label>
            <el-input
              :model-value="label.collectorName"
              @update:model-value="(val: string) => updateField(label.id, 'collectorName', val)"
              placeholder="输入采集人姓名"
              class="[&_.el-input__wrapper]:focus-within:border-herb-green [&_.el-input__wrapper]:focus-within:shadow-[0_0_0_1px_var(--herb-green)]"
            />
          </div>

          <div>
            <label class="text-xs text-herb-brown/70 block mb-1">备注</label>
            <el-input
              :model-value="label.notes"
              @update:model-value="(val: string) => updateField(label.id, 'notes', val)"
              type="textarea"
              :rows="2"
              placeholder="输入备注信息"
              class="[&_.el-textarea__inner]:focus:border-herb-green [&_.el-textarea__inner]:focus:shadow-[0_0_0_1px_var(--herb-green)]"
            />
          </div>

          <div class="flex items-center justify-between pt-1">
            <button
              class="text-herb-brown/40 hover:text-red-400 transition-colors"
              @click="deleteLabel(label.id)"
            >
              <Trash2 :size="16" />
            </button>
            <button
              class="px-3 py-1 text-xs rounded-lg bg-herb-green/40 hover:bg-herb-green/60 text-herb-green-dark transition-colors"
              @click="saveLabel(label.id)"
            >
              保存
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="editorStore.labels.length === 0"
        class="text-center py-6 text-herb-brown/40 text-xs"
      >
        暂无标签，点击上方 + 添加
      </div>
    </div>
  </div>
</template>
