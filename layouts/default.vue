<script setup lang="ts">
</script>

<template>
  <div class="relative min-h-screen bg-herb-cream">
    <ClientOnly>
      <WatercolorBg />
    </ClientOnly>

    <header class="sticky top-0 z-50 backdrop-blur-md bg-herb-cream/80 border-b border-herb-brown-light/50">
      <div class="container mx-auto flex items-center justify-between px-6 py-3">
        <div class="flex items-center gap-2">
          <span class="text-2xl text-herb-green-dark">🌿</span>
          <h1 class="font-display text-xl text-herb-brown tracking-wide">
            植物压花标本工作室
          </h1>
        </div>

        <nav class="flex items-center gap-6">
          <NuxtLink
            to="/"
            class="font-serif text-sm text-herb-brown/70 hover:text-herb-green-dark transition-colors duration-200 relative group"
          >
            工作台
            <span class="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-herb-green-dark transition-all duration-300 group-hover:w-full" />
          </NuxtLink>
          <NuxtLink
            to="/gallery"
            class="font-serif text-sm text-herb-brown/70 hover:text-herb-green-dark transition-colors duration-200 relative group"
          >
            素材库
            <span class="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-herb-green-dark transition-all duration-300 group-hover:w-full" />
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="relative z-10">
      <slot />
    </main>

    <div class="corner-decoration corner-tl" />
    <div class="corner-decoration corner-br" />
  </div>
</template>

<style scoped>
.corner-decoration {
  position: fixed;
  width: 120px;
  height: 120px;
  pointer-events: none;
  z-index: 5;
  opacity: 0.12;
}

.corner-tl {
  top: 60px;
  left: 16px;
  background:
    radial-gradient(ellipse at 20% 80%, rgba(168, 213, 186, 0.4) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(197, 179, 216, 0.3) 0%, transparent 50%);
  mask-image: linear-gradient(135deg, black 30%, transparent 70%);
  -webkit-mask-image: linear-gradient(135deg, black 30%, transparent 70%);
}

.corner-br {
  bottom: 16px;
  right: 16px;
  background:
    radial-gradient(ellipse at 80% 20%, rgba(168, 213, 186, 0.4) 0%, transparent 50%),
    radial-gradient(ellipse at 20% 80%, rgba(197, 179, 216, 0.3) 0%, transparent 50%);
  mask-image: linear-gradient(315deg, black 30%, transparent 70%);
  -webkit-mask-image: linear-gradient(315deg, black 30%, transparent 70%);
}
</style>
