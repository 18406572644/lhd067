<script setup lang="ts">
import type { Component } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  type?: 'primary' | 'secondary' | 'danger'
  icon?: Component
  disabled?: boolean
}>(), {
  type: 'primary',
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (e: MouseEvent) => {
  if (!props.disabled) {
    emit('click', e)
  }
}

const typeClasses: Record<string, string> = {
  primary: 'bg-herb-green text-herb-brown hover:shadow-herb-green/30 hover:scale-[1.03]',
  secondary: 'bg-transparent border-2 border-herb-purple text-herb-purple hover:bg-herb-purple/10 hover:scale-[1.03]',
  danger: 'bg-herb-pink text-herb-brown hover:shadow-herb-pink/30 hover:scale-[1.03]',
}
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-serif text-sm font-semibold transition-all duration-300 ease-out shadow-sm hover:shadow-lg active:scale-[0.97]',
      typeClasses[type],
      disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
    ]"
    :disabled="disabled"
    @click="handleClick"
  >
    <component :is="icon" v-if="icon" class="w-4 h-4" />
    <span>{{ label }}</span>
  </button>
</template>
