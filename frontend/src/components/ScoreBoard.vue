<script setup lang="ts">
defineProps<{
  score: number
}>()
</script>

<template>
  <div class="flex items-center gap-1.5 sm:gap-2 bg-game-card px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg">
    <span class="text-game-accent text-sm sm:text-base">🏆</span>
    <span class="text-slate-400 text-xs sm:text-sm hidden xs:inline">得分:</span>
    <span class="text-lg sm:text-2xl font-bold text-white">{{ score }}</span>
  </div>
</template>

<style scoped>
/* 超小屏幕显示 */
@media (min-width: 400px) {
  .xs\:inline {
    display: inline !important;
  }
}
</style>