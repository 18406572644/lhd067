<script setup lang="ts">
import type { UserMaterial, UserMaterialCategory } from '~/types'
import { useMaterialStore, userMaterialCategories } from '~/stores/material'
import { Search, Upload, Edit3, Trash2, FolderOpen, X, Plus, HardDrive } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { sanitizeSvg, getSvgThumbnail, getPngThumbnail, readFileAsText, readFileAsDataURL } from '~/utils/svgSecurity'
import { formatSize } from '~/utils/userMaterialDB'

const materialStore = useMaterialStore()

const fileInput = ref<HTMLInputElement | null>(null)
const uploadDialogVisible = ref(false)
const editDialogVisible = ref(false)
const uploading = ref(false)

interface UploadForm {
  file: File | null
  name: string
  category: UserMaterialCategory
  tags: string[]
  tagsInput: string
  sanitizedSvg: string
  thumbnail: string
  dataUrl: string
  format: 'svg' | 'png'
  size: number
}

interface EditForm {
  id: string
  name: string
  category: UserMaterialCategory
  tags: string[]
  tagsInput: string
}

const uploadForm = ref<UploadForm>({
  file: null,
  name: '',
  category: 'other',
  tags: [],
  tagsInput: '',
  sanitizedSvg: '',
  thumbnail: '',
  dataUrl: '',
  format: 'svg',
  size: 0,
})

const editForm = ref<EditForm>({
  id: '',
  name: '',
  category: 'other',
  tags: [],
  tagsInput: '',
})

onMounted(() => {
  if (import.meta.client) {
    materialStore.loadUserMaterials()
  }
})

function triggerFileInput() {
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    uploading.value = true
    await prepareUpload(file)
    uploadDialogVisible.value = true
  } catch (err: any) {
    ElMessage.error(err.message || '文件处理失败')
  } finally {
    uploading.value = false
    target.value = ''
  }
}

async function prepareUpload(file: File) {
  const name = file.name.replace(/\.(svg|png)$/i, '')
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'svg') {
    const rawText = await readFileAsText(file)
    const sanitized = sanitizeSvg(rawText)
    const thumbnail = await getSvgThumbnail(sanitized, 200)

    uploadForm.value = {
      file,
      name,
      category: 'other',
      tags: [],
      tagsInput: '',
      sanitizedSvg: sanitized,
      thumbnail,
      dataUrl: sanitized,
      format: 'svg',
      size: new Blob([sanitized]).size,
    }
  } else if (ext === 'png') {
    const thumbnail = await getPngThumbnail(file, 200)
    const dataUrl = await readFileAsDataURL(file)

    uploadForm.value = {
      file,
      name,
      category: 'other',
      tags: [],
      tagsInput: '',
      sanitizedSvg: '',
      thumbnail,
      dataUrl,
      format: 'png',
      size: file.size,
    }
  } else {
    throw new Error('仅支持 SVG 和 PNG 格式')
  }
}

function addUploadTag() {
  const tag = uploadForm.value.tagsInput.trim()
  if (tag && !uploadForm.value.tags.includes(tag)) {
    uploadForm.value.tags.push(tag)
  }
  uploadForm.value.tagsInput = ''
}

function removeUploadTag(tag: string) {
  const idx = uploadForm.value.tags.indexOf(tag)
  if (idx >= 0) uploadForm.value.tags.splice(idx, 1)
}

function addEditTag() {
  const tag = editForm.value.tagsInput.trim()
  if (tag && !editForm.value.tags.includes(tag)) {
    editForm.value.tags.push(tag)
  }
  editForm.value.tagsInput = ''
}

function removeEditTag(tag: string) {
  const idx = editForm.value.tags.indexOf(tag)
  if (idx >= 0) editForm.value.tags.splice(idx, 1)
}

async function confirmUpload() {
  if (!uploadForm.value.name.trim()) {
    ElMessage.warning('请输入素材名称')
    return
  }

  try {
    uploading.value = true
    await materialStore.addUserMaterial({
      name: uploadForm.value.name.trim(),
      category: uploadForm.value.category,
      format: uploadForm.value.format,
      thumbnail: uploadForm.value.thumbnail,
      data: uploadForm.value.dataUrl,
      tags: [...uploadForm.value.tags],
      size: uploadForm.value.size,
    })
    ElMessage.success('素材上传成功！')
    resetUploadForm()
    uploadDialogVisible.value = false
  } catch (err: any) {
    ElMessage.error(err.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

function resetUploadForm() {
  uploadForm.value = {
    file: null,
    name: '',
    category: 'other',
    tags: [],
    tagsInput: '',
    sanitizedSvg: '',
    thumbnail: '',
    dataUrl: '',
    format: 'svg',
    size: 0,
  }
}

function openEdit(mat: UserMaterial) {
  editForm.value = {
    id: mat.id,
    name: mat.name,
    category: mat.category,
    tags: [...mat.tags],
    tagsInput: '',
  }
  editDialogVisible.value = true
}

async function confirmEdit() {
  if (!editForm.value.name.trim()) {
    ElMessage.warning('请输入素材名称')
    return
  }

  try {
    await materialStore.updateUserMaterial(editForm.value.id, {
      name: editForm.value.name.trim(),
      category: editForm.value.category,
      tags: [...editForm.value.tags],
    })
    ElMessage.success('素材信息已更新')
    editDialogVisible.value = false
  } catch (err: any) {
    ElMessage.error(err.message || '更新失败')
  }
}

async function handleDelete(mat: UserMaterial) {
  try {
    await ElMessageBox.confirm(
      `确定要删除素材「${mat.name}」吗？此操作不可撤销。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    await materialStore.deleteUserMaterial(mat.id)
    ElMessage.success('素材已删除')
  } catch {
    // cancelled
  }
}

function categoryLabel(key: string): string {
  const cat = userMaterialCategories.find(c => c.key === key)
  return cat?.label || key
}

const stats = computed(() => materialStore.storeStats)
const storagePercent = computed(() => {
  if (!stats.value) return 0
  return Math.min(100, (stats.value.totalSize / stats.value.maxSize) * 100)
})

const emit = defineEmits<{
  'add-user-material': [material: UserMaterial]
}>()

function handleAddToCanvas(mat: UserMaterial) {
  emit('add-user-material', mat)
}
</script>

<template>
  <div class="h-full flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="font-display text-herb-brown text-lg">我的素材</h2>
      <el-button
        size="small"
        type="primary"
        :icon="Upload"
        @click="triggerFileInput"
        :loading="uploading"
      >
        上传素材
      </el-button>
      <input
        ref="fileInput"
        type="file"
        accept=".svg,.png,image/svg+xml,image/png"
        class="hidden"
        @change="onFileChange"
      />
    </div>

    <div class="bg-white/40 rounded-lg p-3 text-xs space-y-2">
      <div class="flex items-center justify-between text-herb-brown/70">
        <span class="flex items-center gap-1">
          <HardDrive :size="14" />
          存储空间
        </span>
        <span>
          {{ stats ? formatSize(stats.totalSize) : '...' }}
          /
          {{ stats ? formatSize(stats.maxSize) : '20 MB' }}
          ({{ stats ? stats.count : 0 }} 个)
        </span>
      </div>
      <div class="w-full bg-herb-brown/10 rounded-full h-2 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="storagePercent > 90 ? 'bg-red-400' : 'bg-herb-green'"
          :style="{ width: `${storagePercent}%` }"
        />
      </div>
    </div>

    <el-input
      :model-value="materialStore.userSearchQuery"
      placeholder="搜索我的素材..."
      clearable
      size="small"
      :prefix-icon="Search"
      @update:model-value="materialStore.setUserSearch"
    />

    <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        :class="[
          'rounded-full px-3 py-1 text-xs cursor-pointer transition-all inline-flex items-center gap-1 whitespace-nowrap',
          !materialStore.userSelectedCategory
            ? 'bg-herb-green text-herb-brown font-semibold'
            : 'bg-herb-cream text-herb-brown/60 hover:bg-herb-green/30'
        ]"
        @click="materialStore.setUserCategory(null)"
      >
        <FolderOpen :size="14" />
        全部
      </button>
      <MaterialCategory
        v-for="cat in materialStore.userCategories"
        :key="cat.key"
        :category="cat"
        :active="materialStore.userSelectedCategory === cat.key"
        @select="materialStore.setUserCategory"
      />
    </div>

    <div class="grid grid-cols-2 gap-3 flex-1 content-start overflow-y-auto pr-1">
      <div
        v-for="mat in materialStore.filteredUserMaterials"
        :key="mat.id"
        class="group relative cursor-pointer transition-all duration-200 p-2 rounded-xl border bg-white/50 hover:bg-herb-green/10 hover:scale-[1.02] hover:shadow-md hover:border-herb-green/50 border-herb-brown-light/20"
        draggable="true"
        @click="handleAddToCanvas(mat)"
      >
        <div class="w-full aspect-square flex items-center justify-center overflow-hidden rounded-lg bg-white/60">
          <template v-if="mat.format === 'svg'">
            <div v-html="mat.data" class="w-full h-full" />
          </template>
          <template v-else>
            <img :src="mat.thumbnail" :alt="mat.name" class="w-full h-full object-contain" />
          </template>
        </div>
        <p class="text-xs text-herb-brown text-center mt-1 truncate font-serif">
          {{ mat.name }}
        </p>
        <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            class="w-6 h-6 rounded-full bg-white/90 hover:bg-herb-green flex items-center justify-center text-herb-brown shadow-sm"
            title="编辑"
            @click.stop="openEdit(mat)"
          >
            <Edit3 :size="12" />
          </button>
          <button
            class="w-6 h-6 rounded-full bg-white/90 hover:bg-red-100 text-red-500 flex items-center justify-center shadow-sm"
            title="删除"
            @click.stop="handleDelete(mat)"
          >
            <Trash2 :size="12" />
          </button>
        </div>
        <div class="absolute top-1 left-1">
          <span class="text-[10px px-1.5 py-0.5 rounded-full bg-white/80 text-herb-brown/70 font-serif">
            {{ categoryLabel(mat.category) }}
          </span>
        </div>
      </div>

      <div
        v-if="!materialStore.loadingUserMaterials && materialStore.filteredUserMaterials.length === 0"
        class="col-span-2 py-12 text-center text-herb-brown/50 text-sm"
      >
        <div class="mb-2 opacity-60">
          <FolderOpen :size="48" class="mx-auto" />
        </div>
        <p class="font-serif">还没有自定义素材</p>
        <p class="text-xs mt-1 opacity-70">点击「上传素材」添加 SVG 或 PNG</p>
      </div>

      <div
        v-if="materialStore.loadingUserMaterials"
        class="col-span-2 py-12 text-center text-herb-brown/50 text-sm"
      >
        <p class="font-serif">加载中...</p>
      </div>
    </div>

    <el-dialog
      v-model="uploadDialogVisible"
      title="上传素材"
      width="90%"
      :close-on-click-modal="false"
    >
      <div class="space-y-4">
        <div class="flex gap-4">
          <div class="w-32 h-32 flex-shrink-0 rounded-xl border-2 border-dashed border-herb-brown-light/40 flex items-center justify-center bg-white/40 overflow-hidden">
            <template v-if="uploadForm.thumbnail">
              <img v-if="uploadForm.format === 'png'" :src="uploadForm.thumbnail" class="w-full h-full object-contain" />
              <div v-else-if="uploadForm.format === 'svg'" v-html="uploadForm.sanitizedSvg" class="w-full h-full" />
            </template>
            <template v-else>
              <span class="text-herb-brown/40 text-xs">预览</span>
            </template>
          </div>
          <div class="flex-1 space-y-3">
            <div>
              <label class="block text-xs text-herb-brown/70 mb-1">素材名称 *</label>
              <el-input v-model="uploadForm.name" placeholder="输入素材名称" size="small" />
            </div>
            <div>
              <label class="block text-xs text-herb-brown/70 mb-1">分类</label>
              <el-select v-model="uploadForm.category" size="small" class="w-full">
                <el-option
                  v-for="cat in materialStore.userCategories"
                  :key="cat.key"
                  :label="cat.label"
                  :value="cat.key"
                />
              </el-select>
            </div>
            <div>
              <label class="block text-xs text-herb-brown/70 mb-1">
                文件大小: {{ formatSize(uploadForm.size) }}
              </label>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-xs text-herb-brown/70 mb-1">分类标签（回车添加）</label>
          <div class="flex flex-wrap gap-1 mb-2">
            <span
              v-for="tag in uploadForm.tags"
              :key="tag"
              class="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-herb-green/30 text-herb-brown rounded-full"
            >
              {{ tag }}
              <button class="hover:text-red-500" @click="removeUploadTag(tag)">
                <X :size="12" />
              </button>
            </span>
          </div>
          <el-input
            v-model="uploadForm.tagsInput"
            placeholder="输入标签后按回车"
            size="small"
            @keyup.enter="addUploadTag"
            :append-inner-icon="Plus"
            @click:append-inner="addUploadTag"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="uploadDialogVisible = false; resetUploadForm()">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="confirmUpload">
          确认上传
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑素材"
      width="90%"
      :close-on-click-modal="false"
    >
      <div class="space-y-3">
        <div>
          <label class="block text-xs text-herb-brown/70 mb-1">素材名称 *</label>
          <el-input v-model="editForm.name" placeholder="输入素材名称" size="small" />
        </div>
        <div>
          <label class="block text-xs text-herb-brown/70 mb-1">分类</label>
          <el-select v-model="editForm.category" size="small" class="w-full">
            <el-option
              v-for="cat in materialStore.userCategories"
              :key="cat.key"
              :label="cat.label"
              :value="cat.key"
            />
          </el-select>
        </div>
        <div>
          <label class="block text-xs text-herb-brown/70 mb-1">分类标签（回车添加）</label>
          <div class="flex flex-wrap gap-1 mb-2">
            <span
              v-for="tag in editForm.tags"
              :key="tag"
              class="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-herb-green/30 text-herb-brown rounded-full"
            >
              {{ tag }}
              <button class="hover:text-red-500" @click="removeEditTag(tag)">
                <X :size="12" />
              </button>
            </span>
          </div>
          <el-input
            v-model="editForm.tagsInput"
            placeholder="输入标签后按回车"
            size="small"
            @keyup.enter="addEditTag"
            :append-inner-icon="Plus"
            @click:append-inner="addEditTag"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
