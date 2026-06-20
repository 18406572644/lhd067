<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectStore } from '~/stores/project'
import WatercolorBg from '~/components/common/WatercolorBg.vue'
import AnimatedButton from '~/components/common/AnimatedButton.vue'
import { Plus, Pencil, Copy, Trash2, Flower, ArrowRight } from 'lucide-vue-next'

const projectStore = useProjectStore()
const router = useRouter()

onMounted(() => {
  projectStore.loadProjects()
})

const projects = computed(() => projectStore.projects)

function createNew() {
  const p = projectStore.createProject()
  projectStore.setCurrentProject(p.id)
  router.push(`/editor/${p.id}`)
}

function openProject(id: string) {
  projectStore.setCurrentProject(id)
  router.push(`/editor/${id}`)
}

async function deleteProject(id: string) {
  try {
    await ElMessageBox.confirm(
      '确定要删除此方案吗？删除后无法恢复。',
      '删除方案',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    projectStore.deleteProject(id)
    ElMessage.success('已删除')
  } catch {
  }
}

function duplicateProject(id: string) {
  projectStore.duplicateProject(id)
  ElMessage.success('已复制方案')
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-10">
    <div class="mb-12 text-center relative">
      <div class="absolute inset-0 -z-10">
        <WatercolorBg />
      </div>
      <h1 class="font-display text-4xl text-herb-brown mb-3">
        定格自然之美
      </h1>
      <p class="font-serif text-herb-brown/60 text-lg">
        植物压花标本设计 · 水彩手绘风格
      </p>
    </div>

    <div class="flex justify-center gap-4 mb-10">
      <AnimatedButton
        label="创建新方案"
        type="primary"
        :icon="Plus"
        @click="createNew"
      />
      <NuxtLink to="/gallery">
        <AnimatedButton
          label="浏览素材库"
          type="secondary"
          :icon="Flower"
        />
      </NuxtLink>
    </div>

    <div>
      <div class="flex items-center justify-between mb-5">
        <h2 class="font-display text-2xl text-herb-brown">
          我的方案
        </h2>
        <span class="text-herb-brown/50 text-sm">
          共 {{ projects.length }} 个方案
        </span>
      </div>

      <div v-if="projects.length === 0" class="flex flex-col items-center justify-center py-16">
        <div class="relative bg-white/60 backdrop-blur rounded-3xl p-10 border border-herb-brown-light/20 text-center">
          <div class="absolute inset-0 -z-10 rounded-3xl overflow-hidden">
            <WatercolorBg />
          </div>
          <Flower :size="64" class="text-herb-green-dark mx-auto mb-4 opacity-50" />
          <p class="font-serif text-herb-brown/60 mb-6">
            还没有方案，开始创作你的第一件植物标本吧
          </p>
          <AnimatedButton
            label="创建第一个方案"
            type="primary"
            :icon="Plus"
            @click="createNew"
          />
        </div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="project in projects"
          :key="project.id"
          class="bg-white/70 backdrop-blur rounded-2xl border border-herb-brown-light/20 overflow-hidden group shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div class="aspect-[4/3] bg-herb-cream relative flex items-center justify-center cursor-pointer" @click="openProject(project.id)">
            <template v-if="project.thumbnail">
              <img :src="project.thumbnail" :alt="project.name" class="w-full h-full object-cover" />
            </template>
            <template v-else>
              <svg class="w-24 h-24 text-herb-green/40" viewBox="0 0 100 100" fill="none">
                <ellipse cx="50" cy="40" rx="22" ry="28" fill="currentColor" opacity="0.4" />
                <ellipse cx="35" cy="50" rx="15" ry="20" fill="currentColor" opacity="0.3" transform="rotate(-30 35 50)" />
                <ellipse cx="65" cy="50" rx="15" ry="20" fill="currentColor" opacity="0.3" transform="rotate(30 65 50)" />
                <circle cx="50" cy="45" r="8" fill="#E8C4C4" opacity="0.5" />
                <path d="M50 55 L50 85" stroke="#6B5B4E" stroke-width="2" opacity="0.2" />
              </svg>
            </template>
            <div class="absolute inset-0 bg-herb-brown/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                class="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-herb-brown hover:bg-white hover:scale-110 transition-all"
                @click.stop="openProject(project.id)"
                title="编辑"
              >
                <Pencil :size="18" />
              </button>
              <button
                class="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-herb-brown hover:bg-white hover:scale-110 transition-all"
                @click.stop="duplicateProject(project.id)"
                title="复制"
              >
                <Copy :size="18" />
              </button>
              <button
                class="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-red-500 hover:bg-white hover:scale-110 transition-all"
                @click.stop="deleteProject(project.id)"
                title="删除"
              >
                <Trash2 :size="18" />
              </button>
            </div>
          </div>
          <div class="p-4">
            <h3 class="font-display text-lg text-herb-brown truncate">
              {{ project.name }}
            </h3>
            <p class="text-sm text-herb-brown/50 mt-1">
              更新于 {{ formatDate(project.updatedAt) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-16">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-display text-2xl text-herb-brown">
          精选素材
        </h2>
        <NuxtLink to="/gallery" class="flex items-center gap-1 text-herb-green-dark font-serif text-sm hover:gap-2 transition-all">
          <span>查看全部</span>
          <ArrowRight :size="16" />
        </NuxtLink>
      </div>
      <div class="h-32 rounded-2xl bg-white/50 border border-herb-brown-light/20 flex items-center justify-center">
        <p class="font-serif text-herb-brown/40">
          30+ 种水彩手绘植物素材等待你的发现
        </p>
      </div>
    </div>
  </div>
</template>
