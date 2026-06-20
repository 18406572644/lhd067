<script setup lang="ts">
</script>

<template>
  <div class="absolute inset-0 overflow-hidden pointer-events-none watercolor-bg">
    <div class="watercolor-blob blob-1" />
    <div class="watercolor-blob blob-2" />
    <div class="watercolor-blob blob-3" />
    <div class="watercolor-blob blob-4" />
    <div class="watercolor-blob blob-5" />
  </div>
</template>

<style scoped>
.watercolor-bg {
  will-change: auto;
  contain: layout paint;
}

.watercolor-blob {
  position: absolute;
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  filter: blur(24px);
  will-change: transform, border-radius;
  contain: layout paint style;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.blob-1 {
  width: 60%;
  height: 60%;
  top: -15%;
  left: -10%;
  background: radial-gradient(ellipse at center, rgba(168, 213, 186, 0.15) 0%, rgba(168, 213, 186, 0.05) 50%, transparent 70%);
  animation-delay: 0s;
  animation-duration: 8s;
}

.blob-2 {
  width: 50%;
  height: 55%;
  top: 20%;
  right: -10%;
  background: radial-gradient(ellipse at center, rgba(197, 179, 216, 0.15) 0%, rgba(197, 179, 216, 0.05) 50%, transparent 70%);
  animation-delay: 1.2s;
  animation-duration: 10s;
}

.blob-3 {
  width: 45%;
  height: 45%;
  bottom: -10%;
  left: 15%;
  background: radial-gradient(ellipse at center, rgba(245, 240, 232, 0.2) 0%, rgba(245, 240, 232, 0.05) 50%, transparent 70%);
  animation-delay: 2.4s;
  animation-duration: 9s;
}

.blob-4 {
  width: 35%;
  height: 40%;
  top: 40%;
  left: 30%;
  background: radial-gradient(ellipse at center, rgba(168, 213, 186, 0.1) 0%, rgba(197, 179, 216, 0.08) 50%, transparent 70%);
  animation-delay: 3.6s;
  animation-duration: 11s;
}

.blob-5 {
  width: 40%;
  height: 35%;
  bottom: 10%;
  right: 5%;
  background: radial-gradient(ellipse at center, rgba(232, 196, 196, 0.12) 0%, rgba(197, 179, 216, 0.06) 50%, transparent 70%);
  animation-delay: 4.8s;
  animation-duration: 9.5s;
}

@keyframes morph {
  0%, 100% {
    border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
    transform: translateY(0) scale(1);
  }
  25% {
    border-radius: 58% 42% 56% 44% / 58% 56% 44% 42%;
    transform: translateY(-4px) scale(1.02);
  }
  50% {
    border-radius: 50% 50% 34% 66% / 56% 68% 32% 44%;
    transform: translateY(0) scale(1);
  }
  75% {
    border-radius: 42% 58% 64% 36% / 48% 32% 68% 52%;
    transform: translateY(4px) scale(0.98);
  }
}

.watercolor-blob {
  animation: morph 8s ease-in-out infinite;
}
</style>
