<script setup lang="ts">
</script>

<template>
  <NuxtLayout>
    <NuxtPage
      :transition="{
        enterActiveClass: 'transition-all duration-500 ease-out',
        leaveActiveClass: 'transition-all duration-300 ease-in',
        enterFromClass: 'opacity-0 scale-95 blur-sm',
        leaveToClass: 'opacity-0 scale-105',
      }"
    />
  </NuxtLayout>
</template>
