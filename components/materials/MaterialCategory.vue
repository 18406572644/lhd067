<script setup lang="ts">
import type { MaterialCategory } from '~/types'
import { Flower2, Leaf, Wheat, Cherry, TreePine, Palmtree } from 'lucide-vue-next'
import { markRaw, type Component } from 'vue'

const props = defineProps<{
  category: MaterialCategory
  active: boolean
}>()

const emit = defineEmits<{
  select: [key: string]
}>()

const iconMap: Record<string, Component> = {
  Flower2: markRaw(Flower2),
  Leaf: markRaw(Leaf),
  Wheat: markRaw(Wheat),
  Cherry: markRaw(Cherry),
  TreePine: markRaw(TreePine),
  Palmtree: markRaw(Palmtree),
}

const IconComponent = computed(() => iconMap[props.category.icon] || Leaf)
</script>

<template>
  <button
    :class="[
      'rounded-full px-3 py-1 text-sm cursor-pointer transition-all inline-flex items-center gap-1',
      active
        ? 'bg-herb-green text-herb-brown font-semibold'
        : 'bg-herb-cream text-herb-brown/60 hover:bg-herb-green/30'
    ]"
    @click="emit('select', category.key)"
  >
    <component :is="IconComponent" class="w-4 h-4" />
    {{ category.label }}
  </button>
</template>
