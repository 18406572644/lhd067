<script setup lang="ts">
import type { PlantMaterial } from '~/types'

const props = defineProps<{
  material: PlantMaterial
  index: number
}>()

const emit = defineEmits<{
  'add-to-canvas': [material: PlantMaterial]
}>()

const visible = ref(false)

onMounted(() => {
  setTimeout(() => {
    visible.value = true
  }, props.index * 60)
})

function onDragStart(e: DragEvent) {
  e.dataTransfer!.setData('text/plain', props.material.id)
}
</script>

<template>
  <div
    :class="[
      'cursor-pointer transition-all duration-200 p-2 rounded-xl border bg-white/50 hover:bg-herb-green/10 hover:scale-105 hover:shadow-md hover:border-herb-green/50',
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      'border-herb-brown-light/20'
    ]"
    :style="{ transitionDelay: `${index * 60}ms` }"
    draggable="true"
    @dragstart="onDragStart"
    @click="emit('add-to-canvas', material)"
  >
    <div class="w-full aspect-square flex items-center justify-center overflow-hidden">
      <div v-html="material.svgData" class="w-full h-full" />
    </div>
    <p class="text-xs text-herb-brown text-center mt-1 truncate font-serif">
      {{ material.name }}
    </p>
  </div>
</template>
