<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref, onMounted, watch, computed } from 'vue'
import { getSettings } from '@/services/audio'
import type { SkinType } from '@/types'

const currentSkin = ref<SkinType>('default')

// 监听localStorage变化更新皮肤
function updateSkin() {
  currentSkin.value = getSettings().skin || 'default'
}

onMounted(() => {
  updateSkin()
  // 监听storage事件以响应设置变化
  window.addEventListener('storage', updateSkin)
})

// 皮肤class
const skinClass = computed(() => `skin-${currentSkin.value}`)

// 提供一个全局更新皮肤的方法
;(window as any).__updateSkin = updateSkin
</script>

<template>
  <div class="min-h-screen" :class="skinClass">
    <RouterView />
  </div>
</template>

<style scoped>
</style>